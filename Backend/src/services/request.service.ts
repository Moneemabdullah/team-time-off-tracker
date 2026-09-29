import mongoose from 'mongoose';

import { userModel, type UserRole } from '../models/user.model';
import { timeOffRequestModel } from '../models/timeOffRequest.model';
import {
  type CreateRequestInput,
  type ListRequestsQuery,
  type RequestStatus,
  type UpdateRequestStatusInput,
} from '../schemas/request.schema';
import { badRequest, conflict, forbidden, notFound } from '../utils/AppError';
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
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
    reason: input.reason,
    days,
    status: 'pending',
  });

  return toResponse(await findPopulated(created._id));
}

/** Employees are always scoped to their own requests; admins may filter. */
export async function getRequests(query: ListRequestsQuery, authUser: { id: string; role: UserRole }) {
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;

  if (authUser.role === 'ADMIN') {
    if (query.userId) filter.user = query.userId;
  } else {
    if (query.userId && query.userId !== authUser.id) {
      throw forbidden('You can only view your own leave requests');
    }
    filter.user = authUser.id;
  }

  const requests = await timeOffRequestModel
    .find(filter)
    .populate('user', USER_FIELDS)
    .sort({ createdAt: -1 });

  return requests.map((request) => toResponse(request));
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

    return toResponse(await findPopulated(objectId));
  } finally {
    await session.endSession();
  }
}
