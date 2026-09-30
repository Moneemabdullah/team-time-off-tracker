import type { Response } from 'express';

import { env } from '../config/env';
import { jwtUtils } from './jwt';

/**
 * Session lifetime is derived from the JWT expiry so the cookie cannot
 * meaningfully outlive the token it carries.
 */
function cookieMaxAgeMs(): number {
  const match = /^(\d+)([smhd])$/.exec(env.jwtExpiresIn.trim());
  if (!match) return 60 * 60 * 1000; // 1h fallback for an unparseable duration
  const value = Number(match[1]);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return value * unitMs;
}

/** Name of the session cookie, shared with the auth middleware. */
export const AUTH_COOKIE = 'authToken';

/** Options shared by every auth cookie so they are cleared identically. */
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: cookieMaxAgeMs(),
  };
}

const createSessionToken = (userId: string): string =>
  jwtUtils.createToken({ sub: userId }, env.jwtSecret, {
    // jsonwebtoken types the duration as a template literal; the value here is
    // the validated string from config, so the cast is safe.
    expiresIn: env.jwtExpiresIn as Parameters<typeof jwtUtils.createToken>[2]['expiresIn'],
  });

const getAccessToken = (userId: string): string => createSessionToken(userId);

const getAtuhToken = (userId: string): string => createSessionToken(userId);

const setAuthToken = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE, token, baseCookieOptions());
};

const setAccessToken = (res: Response, token: string): void => {
  res.cookie('accessToken', token, baseCookieOptions());
};

const clearAuthToken = (res: Response): void => {
  // Clearing requires the same attributes the cookie was set with, minus maxAge.
  const { maxAge: _maxAge, ...options } = baseCookieOptions();
  res.clearCookie(AUTH_COOKIE, options);
};

export const tokenUtils = {
  getAccessToken,
  getAtuhToken,
  setAuthToken,
  setAccessToken,
  clearAuthToken,
};
