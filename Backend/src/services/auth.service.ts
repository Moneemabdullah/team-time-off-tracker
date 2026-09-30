import bcrypt from 'bcryptjs';

import { userModel, type UserRole } from '../models/user.model';
import { unauthorized } from '../utils/AppError';
import { tokenUtils } from '../utils/token';

const SALT_ROUNDS = 10;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  annualLeaveBalance: number;
};

/** The only place a user is turned into a response body; never includes the hash. */
export function toPublicUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  annualLeaveBalance: number;
}): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    annualLeaveBalance: user.annualLeaveBalance,
  };
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function login(email: string, password: string) {
  const user = await userModel.findOne({ email }).select('+passwordHash');

  // A missing user and a wrong password give the same message and both go
  // through a hash comparison, so the response cannot enumerate accounts.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const matches = await bcrypt.compare(password, hash);

  if (!user || !matches) {
    throw unauthorized('Invalid email or password');
  }

  const publicUser = toPublicUser(user);
  return { token: tokenUtils.getAccessToken(publicUser.id), user: publicUser };
}
