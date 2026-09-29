import { z } from 'zod';

/**
 * There is no public registration endpoint, so this schema only backs the
 * admin seed. `role` and `annualLeaveBalance` are never accepted from a client.
 */
export const createUserSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters long'),
    email: z.string().trim().toLowerCase().email('Must be a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Must be a valid email address'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
