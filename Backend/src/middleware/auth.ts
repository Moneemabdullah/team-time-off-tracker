import type { NextFunction, Request, Response } from 'express';

import { userModel, type UserRole } from '../models/user.model';
import { verifyToken } from '../services/auth.service';
import { forbidden, unauthorized } from '../utils/AppError';

export type AuthUser = {
  id: string;
  role: UserRole;
};

/** Reads the authenticated user that `requireAuth` attached, or fails closed. */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) {
    throw unauthorized('Authentication required');
  }
  return req.user;
}

function readBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header) {
    throw unauthorized('Authentication required');
  }

  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    throw unauthorized('Authorization header must be: Bearer <token>');
  }

  return token;
}

/**
 * Verifies the bearer token and confirms the user still exists, so a token for
 * a deleted account cannot keep working until it expires.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = readBearerToken(req);
    const { sub, role } = verifyToken(token);

    const user = await userModel.findById(sub);
    if (!user) {
      throw unauthorized('Invalid or expired token');
    }

    // The role comes from the database, not the token, so a role change takes
    // effect immediately instead of waiting for the token to expire.
    req.user = { id: user._id.toString(), role: user.role as UserRole };
    next();
  } catch (err) {
    next(err);
  }
}

/** Authorization guard. Always used after `requireAuth`. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getAuthUser(req);
    if (!roles.includes(user.role)) {
      next(forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
