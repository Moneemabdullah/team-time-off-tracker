import { z } from 'zod';

import { isValidDateOnly } from '../utils/date';

/**
 * The model stores status in lower case (`pending | approved | rejected`).
 * The API speaks upper case, so input is accepted case-insensitively and
 * normalised before it reaches the database. The model is left untouched.
 */
export const REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function toStoredStatus(value: string): RequestStatus {
  return value.toLowerCase() as RequestStatus;
}

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

const objectId = z
  .string()
  .regex(OBJECT_ID_PATTERN, 'Must be a valid 24-character ObjectId');

const dateOnly = z
  .string()
  .refine(isValidDateOnly, 'Must be a real calendar date in YYYY-MM-DD format');

/**
 * The submitting user comes from the JWT, never the body, so only the leave
 * details are accepted here. `days`, `status` and `userId` are intentionally
 * absent, and `.strict()` rejects them.
 */
export const createRequestSchema = z
  .object({
    startDate: dateOnly,
    endDate: dateOnly,
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters long'),
  })
  .strict();

export const listRequestsQuerySchema = z
  .object({
    status: z
      .string()
      .refine(
        (value) => REQUEST_STATUSES.includes(value.toLowerCase() as RequestStatus),
        'Status must be one of PENDING, APPROVED, REJECTED'
      )
      .transform(toStoredStatus)
      .optional(),
    /** Only honoured for admins; employees are always scoped to themselves. */
    userId: objectId.optional(),
  })
  .strict();

export const updateRequestStatusSchema = z
  .object({
    status: z
      .string()
      .refine(
        (value) => ['APPROVED', 'REJECTED'].includes(value.toUpperCase()),
        'Status must be APPROVED or REJECTED'
      )
      .transform((value) => value.toUpperCase()),
  })
  .strict();

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
