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
    argency: z
      .string()
      .refine(
        (value) => ['low', 'medium', 'high', 'urgent'].includes(value.toLowerCase()),
        'Argency must be one of low, medium, high, urgent'
      )
      .transform((value) => value.toLowerCase())
      .optional(),  
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters long'),
  })
  .strict();

/** Page and limit are coerced because query parameters arrive as strings. */
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

// No `.catch()` here on purpose: it would silently turn `?page=abc` into page 1
// instead of rejecting it. `.default()` only fills in a genuinely absent value.
const page = z.coerce.number().int().min(1, 'page must be at least 1').default(1);
const limit = z.coerce
  .number()
  .int()
  .min(1, 'limit must be at least 1')
  .max(MAX_LIMIT, `limit must not exceed ${MAX_LIMIT}`)
  .default(DEFAULT_LIMIT);

const statusFilter = z
  .string()
  .refine(
    (value) => REQUEST_STATUSES.includes(value.toLowerCase() as RequestStatus),
    'Status must be one of PENDING, APPROVED, REJECTED'
  )
  .transform(toStoredStatus)
  .optional();

/**
 * `GET /requests` — the caller's own requests. There is deliberately no
 * `userId` here: the owner comes from the token, so the filter cannot be used
 * to reach another account.
 */
export const listMyRequestsQuerySchema = z
  .object({
    status: statusFilter,
    page,
    limit,
  })
  .strict();

/** `GET /admin/requests` — every request, filterable by owner. */
export const listAllRequestsQuerySchema = z
  .object({
    status: statusFilter,
    /** Only admins may filter by owner. */
    userId: objectId.optional(),
    page,
    limit,
  })
  .strict();

export type ListMyRequestsQuery = z.infer<typeof listMyRequestsQuerySchema>;
export type ListAllRequestsQuery = z.infer<typeof listAllRequestsQuerySchema>;

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
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
