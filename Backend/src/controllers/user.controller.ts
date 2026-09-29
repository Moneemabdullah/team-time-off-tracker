import type { NextFunction, Request, Response } from 'express';

import { getAuthUser } from '../middleware/auth';
import * as userService from '../services/user.service';
import { sendError } from './auth.controller';

export async function list(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await userService.listUsers();
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
    const data = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Lets a signed-in user read their own profile and balance. */
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = getAuthUser(req);
    const data = await userService.getUserById(id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function reassignAnnualLeave(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { number } = req.body as { number?: unknown };
    const data = await userService.reassignAnnualLeave(number);
    res.status(200).json({
      success: true,
      message: 'Annual leave reassigned successfully',
      data,
    });
  } catch (err) {
    next(err);
  }
}

export { sendError };
