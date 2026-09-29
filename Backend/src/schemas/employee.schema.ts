import { z } from 'zod';

/**
 * `annualLeaveBalance` is intentionally absent. The schema is strict, so
 * sending it (under either name) is rejected rather than silently ignored.
 */
export const createEmployeeSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters long'),
    email: z.string().trim().toLowerCase().email('Must be a valid email address'),
  })
  .strict();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
