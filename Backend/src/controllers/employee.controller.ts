import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { createEmployeeSchema } from '../schemas/employee.schema';
import * as employeeService from '../services/employee.service';
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

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = createEmployeeSchema.parse(req.body);
    const data = await employeeService.createEmployee(input);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function list(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await employeeService.listEmployees();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await employeeService.getEmployeeById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export { sendError };
