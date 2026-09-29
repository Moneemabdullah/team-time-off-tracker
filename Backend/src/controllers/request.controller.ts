import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import {
  createRequestSchema,
  listRequestsQuerySchema,
  updateRequestStatusSchema,
} from '../schemas/request.schema';
import * as requestService from '../services/request.service';
import { isAppError } from '../utils/AppError';

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.join('.') || 'request';
      return `${field}: ${issue.message}`;
    })
    .join(', ');
}

/** Maps any thrown value onto the single error shape the API uses. */
function sendError(res: Response, err: unknown): void {
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

export async function createRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createRequestSchema.parse(req.body);
    const data = await requestService.createRequest(input);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRequests(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = listRequestsQuerySchema.parse(req.query);
    const data = await requestService.getRequests(query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateRequestStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = updateRequestStatusSchema.parse(req.body);
    const data = await requestService.updateRequestStatus(req.params.id, input);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendError(res, err);
}
