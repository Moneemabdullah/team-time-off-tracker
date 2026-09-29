import { userModel } from '../models/user.model';
import { hashPassword, toPublicUser } from './auth.service';
import { badRequest, notFound } from '../utils/AppError';

const DEFAULT_LEAVE_BALANCE = 20;

export async function listUsers() {
  const users = await userModel.find().sort({ createdAt: -1 });
  return users.map((user) => toPublicUser(user));
}

export async function getUserById(id: string) {
  if (!isValidObjectId(id)) {
    throw badRequest('Invalid user id');
  }

  const user = await userModel.findById(id);
  if (!user) {
    throw notFound('User not found');
  }

  return toPublicUser(user);
}

/**
 * Bulk operation: adds a signed number of days to every user's balance.
 * Admin only, and the input is validated here because unlike the rest of the
 * API this endpoint has no Zod schema in front of it.
 */
export async function reassignAnnualLeave(rawValue: unknown) {
  // No string coercion: a quoted number previously reached the balance as text
  // and produced concatenated values. Types are checked, not converted.
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    throw badRequest('number must be a finite number');
  }
  if (!Number.isInteger(rawValue)) {
    throw badRequest('number must be a whole number of days');
  }
  if (rawValue === 0) {
    throw badRequest('number must not be zero');
  }

  const value = rawValue;

  // Validate the resulting balance rather than clamping, so a bulk operation
  // can never drive a user negative.
  const users = await userModel.find().select('_id annualLeaveBalance');
  const wouldGoNegative = users.filter(
    (user) => user.annualLeaveBalance + value < 0
  );

  if (wouldGoNegative.length > 0) {
    throw badRequest(
      `Reassigning ${value} would leave ${wouldGoNegative.length} user(s) with a negative balance`
    );
  }

  const result = await userModel.updateMany(
    { _id: { $in: users.map((user) => user._id) } },
    { $inc: { annualLeaveBalance: value } }
  );

  return { updated: result.modifiedCount };
}

/** Used only by the admin seed; and making a new employee */
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: 'EMPLOYEE' | 'ADMIN';
}) {
  const user = await userModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role ?? 'EMPLOYEE',
    annualLeaveBalance: DEFAULT_LEAVE_BALANCE,
  });

  return toPublicUser(user);
}

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
