import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { userModel, type UserRole } from '../models/user.model';
import { forbidden, unauthorized } from '../utils/AppError';
import { cookieUtils } from '../utils/cookie';
import { jwtUtils } from '../utils/jwt';
import { AUTH_COOKIE } from '../utils/token';

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

/** Cookie first, then the Authorization header, so browsers and API clients both work. */
function readToken(req: Request): string {
  const fromCookie = cookieUtils.getCookie(req, AUTH_COOKIE);
  if (fromCookie) {
    return fromCookie;
  }

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
 * Verifies the token and confirms the user still exists, so a token for a
 * deleted account cannot keep working until it expires.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = readToken(req);

    const result = jwtUtils.verifyToken(token, env.jwtSecret);
    // Expired, tampered and malformed tokens are all rejected the same way, so
    // the response cannot be used to probe why a token failed.
    if (!result.success) {
      throw unauthorized('Invalid or expired token');
    }

    const subject = (result.data as { sub?: unknown } | null)?.sub;
    if (typeof subject !== 'string') {
      throw unauthorized('Invalid or expired token');
    }

    const user = await userModel.findById(subject);
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
