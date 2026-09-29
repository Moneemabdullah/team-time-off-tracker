import mongoose from 'mongoose';

import { employeeModel } from '../models/employee.model';
import { timeOffRequestModel } from '../models/timeOffRequest.model';
import {
  type CreateRequestInput,
  type ListRequestsQuery,
  type RequestStatus,
  type UpdateRequestStatusInput,
} from '../schemas/request.schema';
import { badRequest, conflict, notFound } from '../utils/AppError';
import { countWeekdays, parseDateOnly, todayDateOnly, toDateOnlyString } from '../utils/date';

/** A request in one of these states blocks the employee's calendar. */
const BLOCKING_STATUSES: RequestStatus[] = ['pending', 'approved'];

const EMPLOYEE_FIELDS = 'name email annualLeaveBalance';

type PopulatedEmployee = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  annualLeaveBalance: number;
};

type EmployeeRef = mongoose.Types.ObjectId | PopulatedEmployee | null;

function isPopulatedEmployee(value: EmployeeRef): value is PopulatedEmployee {
  return typeof value === 'object' && value !== null && '_id' in value;
}

type PopulatedRequest = NonNullable<Awaited<ReturnType<typeof findPopulated>>>;

async function findPopulated(id: mongoose.Types.ObjectId) {
  const request = await timeOffRequestModel
    .findById(id)
    .populate('employee', EMPLOYEE_FIELDS);

  if (!request) {
    throw notFound('Leave request not found');
  }

  return request;
}

/** Shapes a request for the API. Kept in one place so all endpoints agree. */
function toResponse(request: PopulatedRequest): Record<string, unknown> {
  const doc = request as unknown as {
    _id: mongoose.Types.ObjectId;
    employee: EmployeeRef;
    startDate: Date;
    endDate: Date;
    reason: string;
    days: number;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
  };

  const employee = doc.employee;

  return {
    id: doc._id.toString(),
    employee: isPopulatedEmployee(employee)
      ? {
          id: employee._id.toString(),
          name: employee.name,
          email: employee.email,
          annualLeaveBalance: employee.annualLeaveBalance,
        }
      : { id: String(employee) },
    startDate: toDateOnlyString(new Date(doc.startDate)),
    endDate: toDateOnlyString(new Date(doc.endDate)),
    reason: doc.reason,
    days: doc.days,
    status: doc.status.toUpperCase(),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createRequest(input: CreateRequestInput) {
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

  const employee = await employeeModel.findById(input.employeeId);
  if (!employee) {
    throw notFound('Employee not found');
  }

  const overlapping = await timeOffRequestModel.exists({
    employee: input.employeeId,
    status: { $in: BLOCKING_STATUSES },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });

  if (overlapping) {
    throw conflict('Employee already has a pending or approved request for these dates');
  }

  const created = await timeOffRequestModel.create({
    employee: input.employeeId,
    startDate,
    endDate,
    reason: input.reason,
    days,
    status: 'pending',
  });

  return toResponse(await findPopulated(created._id));
}

export async function listRequests(query: ListRequestsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.status) filter.status = query.status;
  if (query.employeeId) filter.employee = query.employeeId;

  const requests = await timeOffRequestModel
    .find(filter)
    .populate('employee', EMPLOYEE_FIELDS)
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
    let updatedId: mongoose.Types.ObjectId | undefined;

    // The balance change and the status change commit or roll back together.
    await session.withTransaction(async () => {
      const request = await timeOffRequestModel.findById(objectId).session(session);
      if (!request) {
        throw notFound('Leave request not found');
      }

      const currentStatus = request.status as RequestStatus;

      if (input.status === 'APPROVED') {
        if (currentStatus !== 'pending') {
          throw conflict(
            `Only pending requests can be approved (current status: ${currentStatus})`
          );
        }

        // The `$gte` guard makes the check-and-decrement atomic, so parallel
        // approvals can never drive the balance below zero.
        const deducted = await employeeModel.updateOne(
          { _id: request.employee, annualLeaveBalance: { $gte: request.days } },
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
        await employeeModel.updateOne(
          { _id: request.employee },
          { $inc: { annualLeaveBalance: request.days } },
          { session }
        );
        request.status = 'rejected';
      } else {
        throw conflict('A rejected request cannot change status');
      }

      await request.save({ session });
      updatedId = request._id;
    });

    return toResponse(await findPopulated(objectId));
  } finally {
    await session.endSession();
  }
}
