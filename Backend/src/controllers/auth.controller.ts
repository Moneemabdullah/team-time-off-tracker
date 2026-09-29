import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { loginSchema } from '../schemas/user.schema';
import * as authService from '../services/auth.service';
import { isAppError } from '../utils/AppError';

function sendError(res: Response, err: unknown): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join(', ');
    res.status(400).json({ success: false, message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';
  res.status(500).json({ success: false, message });
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const data = await authService.login(email, password);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { sendError };
