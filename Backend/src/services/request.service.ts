import mongoose from 'mongoose';

import { userModel, type UserRole } from '../models/user.model';
import { timeOffRequestModel } from '../models/timeOffRequest.model';
import {
  type CreateRequestInput,
  type ListAllRequestsQuery,
  type ListMyRequestsQuery,
  type RequestStatus,
  type UpdateRequestStatusInput,
} from '../schemas/request.schema';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError';
import { sendEmailSafely } from '../utils/emailService';
import { countWeekdays, parseDateOnly, todayDateOnly, toDateOnlyString } from '../utils/date';

/** A request in one of these states blocks the user's calendar. */
const BLOCKING_STATUSES: RequestStatus[] = ['pending', 'approved'];

const USER_FIELDS = 'name email role annualLeaveBalance';

type PopulatedUser = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  annualLeaveBalance: number;
};

type UserRef = mongoose.Types.ObjectId | PopulatedUser | null;

function isPopulatedUser(value: UserRef): value is PopulatedUser {
  return typeof value === 'object' && value !== null && '_id' in value;
}

type PopulatedRequest = NonNullable<Awaited<ReturnType<typeof findPopulated>>>;

async function findPopulated(id: mongoose.Types.ObjectId) {
  const request = await timeOffRequestModel.findById(id).populate('user', USER_FIELDS);

  if (!request) {
    throw notFound('Leave request not found');
  }

  return request;
}

/** Shapes a request for the API. Kept in one place so all endpoints agree. */
function toResponse(request: PopulatedRequest): Record<string, unknown> {
  const doc = request as unknown as {
    _id: mongoose.Types.ObjectId;
    user: UserRef;
    startDate: Date;
    endDate: Date;
    reason: string;
    days: number;
    status: string;
    argency?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };

  const user = doc.user;

  return {
    id: doc._id.toString(),
    user: isPopulatedUser(user)
      ? {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          annualLeaveBalance: user.annualLeaveBalance,
        }
      : { id: String(user) },
    startDate: toDateOnlyString(new Date(doc.startDate)),
    endDate: toDateOnlyString(new Date(doc.endDate)),
    reason: doc.reason,
    days: doc.days,
    status: doc.status.toUpperCase(),
    argency: doc.argency ?? 'normal',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Emails the affected employee that their request was approved or rejected. */
async function notifyStatusChange(response: Record<string, unknown>): Promise<void> {
  const user = response.user as { id?: string; name?: string; email?: string; annualLeaveBalance?: number } | undefined;
  const status = String(response.status);

  if (!user?.email) return;

  await sendEmailSafely({
    to: user.email,
    subject: `Your leave request was ${status.toLowerCase()}`,
    template: 'LeaveRequestUpdate',
    templateData: {
      name: user.name,
      email: user.email,
      status,
      startDate: response.startDate,
      endDate: response.endDate,
      argency: response.argency,
      days: response.days,
      reason: response.reason,
      annualLeaveBalance: user.annualLeaveBalance,
    },
  });
}

export async function createRequest(input: CreateRequestInput, userId: string) {
  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);

  if (startDate.getTime() > endDate.getTime()) {
    throw badRequest('startDate cannot be after endDate');
  }

  if (startDate.getTime() < todayDateOnly().getTime()) {
    throw badRequest('Leave requests cannot start in the past');
  }

  const days = countWeekdays(startDate, endDate);
  if (days === 0) {
    throw badRequest('Leave request must span at least one working day (Mon-Fri)');
  }

  const overlapping = await timeOffRequestModel.exists({
    user: userId,
    status: { $in: BLOCKING_STATUSES },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });

  if (overlapping) {
    throw conflict('Overlapping leave request exists');
  }

  const created = await timeOffRequestModel.create({
    user: userId,
    startDate,
    endDate,
    argency: input.argency ?? 'normal',
    reason: input.reason,
    days,
    status: 'pending',
  });

  return toResponse(await findPopulated(created._id));
}

/** Employees are always scoped to their own requests; admins may filter. */
type PaginationQuery = { page: number; limit: number };

type PaginatedRequests = {
  items: Record<string, unknown>[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

/**
 * Shared count + skip/limit so both list routes page identically.
 * Sorting by `createdAt` descending is unchanged from the pre-pagination list.
 */
async function paginate(
  filter: Record<string, unknown>,
  query: PaginationQuery
): Promise<PaginatedRequests> {
  const { page, limit } = query;

  const [total, requests] = await Promise.all([
    timeOffRequestModel.countDocuments(filter),
    timeOffRequestModel
      .find(filter)
      .populate('user', USER_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  return {
    items: requests.map((request) => toResponse(request)),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/** `GET /requests` — always scoped to the caller. */
export async function getMyRequests(
  userId: string,
  query: ListMyRequestsQuery
): Promise<PaginatedRequests> {
  const filter: Record<string, unknown> = { user: userId };
  if (query.status) filter.status = query.status;

  return paginate(filter, query);
}

/** `GET /admin/requests` — every request, optionally filtered by owner. */
export async function getAllRequests(query: ListAllRequestsQuery): Promise<PaginatedRequests> {
  const filter: Record<string, unknown> = {};

  //return Urgent requests first and then normal requests
  if (query.status) {
    filter.status = query.status;
  }

  if (query.userId) {
    filter.user = query.userId;
  }

  return paginate(filter, query);
}


export async function updateRequestStatus(
  id: string,
  input: UpdateRequestStatusInput
) {
  if (!mongoose.isValidObjectId(id)) {
    throw badRequest('Invalid request id');
  }

  const objectId = new mongoose.Types.ObjectId(id);
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const request = await timeOffRequestModel.findById(objectId).session(session);
      if (!request) {
        throw notFound('Leave request not found');
      }

      const currentStatus = request.status as RequestStatus;

      if (input.status === 'APPROVED') {
        if (currentStatus !== 'pending') {
          throw conflict('Invalid status transition');
        }

        // The `$gte` guard makes the check-and-decrement atomic, so parallel
        // approvals can never drive a balance negative.
        const deducted = await userModel.updateOne(
          { _id: request.user, annualLeaveBalance: { $gte: request.days } },
          { $inc: { annualLeaveBalance: -request.days } },
          { session }
        );

        if (deducted.modifiedCount === 0) {
          throw conflict('Insufficient leave balance');
        }

        request.status = 'approved';
      } else if (currentStatus === 'pending') {
        // Rejecting a pending request never touched the balance.
        request.status = 'rejected';
      } else if (currentStatus === 'approved') {
        // Give the deducted days back.
        await userModel.updateOne(
          { _id: request.user },
          { $inc: { annualLeaveBalance: request.days } },
          { session }
        );
        request.status = 'rejected';
      } else {
        throw conflict('Invalid status transition');
      }

      await request.save({ session });
    });

    // Sent only after the transaction has committed, so an SMTP round trip
    // never holds the write open, and never inside the retry loop.
    const updated = toResponse(await findPopulated(objectId));
    await notifyStatusChange(updated);

    return updated;
  } finally {
    await session.endSession();
  }
}
