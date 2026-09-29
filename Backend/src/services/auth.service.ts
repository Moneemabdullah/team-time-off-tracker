import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { userModel, type UserRole } from '../models/user.model';
import { badRequest, unauthorized } from '../utils/AppError';

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

export function signToken(userId: string, role: UserRole): string {
  return jwt.sign({ sub: userId, role }, env.jwtSecret, {
    // The value is validated env config; the cast only satisfies jsonwebtoken's
    // template-literal typing, it does not change the runtime value.
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): { sub: string; role: UserRole } {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === 'string' || !payload.sub) {
      throw badRequest('Malformed token');
    }
    return { sub: String(payload.sub), role: payload.role as UserRole };
  } catch {
    // Expired, tampered and malformed tokens are all rejected the same way so
    // the response cannot be used to probe why a token failed.
    throw unauthorized('Invalid or expired token');
  }
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
  return { token: signToken(publicUser.id, publicUser.role), user: publicUser };
}
