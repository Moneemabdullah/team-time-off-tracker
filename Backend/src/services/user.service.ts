import { userModel } from '../models/user.model';
import { hashPassword, toPublicUser } from './auth.service';
import { badRequest, conflict, notFound } from '../utils/AppError';
import { sendEmailSafely } from '../utils/emailService';

const DEFAULT_LEAVE_BALANCE = 20;

export async function listUsers() {
  //return all user exept admin
  const users = await userModel.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
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

/** Creates a user and mails them their temporary credentials. */
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

  // The account exists by this point, so a mail failure must not fail the
  // request. Safe to ignore the result; it is logged inside the helper.
  await sendEmailSafely({
    to: user.email,
    subject: 'Your Team Time-Off Tracker account',
    template: 'EmployeeCredientials',
    templateData: {
      name: user.name,
      email: user.email,
      password: input.password,
    },
  });

  return toPublicUser(user);
}

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}


type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: 'EMPLOYEE' | 'ADMIN';
};

export async function updateUser(id: string, input: UpdateUserInput) {
  if (!isValidObjectId(id)) {
    throw badRequest('Invalid user id');
  }

  const user = await userModel.findById(id);
  if (!user) {
    throw notFound('User not found');
  }

  // Removing the last admin would leave nobody able to administer anything.
  if (input.role !== undefined && user.role === 'ADMIN' && input.role !== 'ADMIN') {
    const remaining = await userModel.countDocuments({ role: 'ADMIN' });
    if (remaining <= 1) {
      throw badRequest('Cannot demote the last remaining admin');
    }
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.password !== undefined) updateData.passwordHash = await hashPassword(input.password);
  if (input.role !== undefined) updateData.role = input.role;

  if (input.email !== undefined && input.email !== user.email) {
    const taken = await userModel.exists({ email: input.email, _id: { $ne: id } });
    if (taken) {
      throw conflict('An account with this email already exists');
    }
    updateData.email = input.email;
  }

  const updated = await userModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw notFound('User not found');
  }

  return toPublicUser(updated);
}

export async function deleteUser(id: string, actingUserId: string) {
  if (!isValidObjectId(id)) {
    throw badRequest('Invalid user id');
  }

  const user = await userModel.findById(id);
  if (!user) {
    throw notFound('User not found');
  }

  // Deleting the account you are signed in as would lock you out immediately.
  if (user._id.toString() === actingUserId) {
    throw badRequest('You cannot delete your own account');
  }

  if (user.role === 'ADMIN') {
    const remaining = await userModel.countDocuments({ role: 'ADMIN' });
    if (remaining <= 1) {
      throw badRequest('Cannot delete the last remaining admin');
    }
  }

  await userModel.deleteOne({ _id: id });

  return { id: user._id.toString() };
}
