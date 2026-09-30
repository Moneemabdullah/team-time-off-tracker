/**
 * Central, typed access to environment variables.
 *
 * `JWT_SECRET` and `MONGODB_URI` are required and their absence is fatal: the
 * app must never fall back to a hardcoded secret or a different database. The
 * remaining values have safe defaults so the server can boot in development.
 */
import { z } from 'zod';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export const env = {
  port: z.number().int().positive().default(5000).parse(Number(optional('PORT', '5000'))),
  mongoUri: z.string().min(1).parse(required('MONGODB_URI')),

  /**
   * Credentialed cookies cannot be combined with a wildcard origin, so the
   * allowed origin is explicit. Comma-separated for multiple origins.
   */
  corsOrigin: z.string().min(1).default('http://localhost:5173').parse(optional('CORS_ORIGIN', 'http://localhost:5173')),

  jwtSecret: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .parse(required('JWT_SECRET')),
  jwtExpiresIn: z.string().default('1h').parse(optional('JWT_EXPIRES_IN', '1h')),

  admin: {
    name: z
      .string()
      .trim()
      .min(3, 'ADMIN_NAME must be at least 3 characters long')
      .default('System Admin')
      .parse(optional('ADMIN_NAME', 'System Admin')),
    email: z
      .string()
      .email()
      .default('admin@example.com')
      .parse(optional('ADMIN_EMAIL', 'admin@example.com')),
    password: z
      .string()
      .min(8, 'ADMIN_PASSWORD must be at least 8 characters long')
      .default('')
      .parse(optional('ADMIN_PASSWORD', '')),
  },
};

export type Env = typeof env;
