import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { isAppError } from '../utils/AppError';

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.join('.') || 'request';
      return `${field}: ${issue.message}`;
    })
    .join(', ');
}

/** Terminal error handler. Mounted last in `app.ts`. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ success: false, message: formatZodError(err) });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';
  res.status(500).json({ success: false, message });
}
