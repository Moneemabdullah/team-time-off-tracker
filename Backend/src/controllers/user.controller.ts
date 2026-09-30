import { Request, Response } from 'express';

import catchAsync from '../shared/catchAsync';
import { sendResponse } from '../shared/sendResponse';
import { getAuthUser } from '../middleware/auth';
import * as userService from '../services/user.service';

export const list = catchAsync(async (_req: Request, res: Response) => {
  const data = await userService.listUsers();
  sendResponse(res, { httpStatusCode: 200, success: true, data });
});

export const getById = catchAsync(async (req: Request, res: Response) => {
  const data = await userService.getUserById(req.params.id);
  sendResponse(res, { httpStatusCode: 200, success: true, data });
});

/** Lets a signed-in user read their own profile and balance. */
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const { id } = getAuthUser(req);
  const data = await userService.getUserById(id);
  sendResponse(res, { httpStatusCode: 200, success: true, data });
});

export const reassignAnnualLeave = catchAsync(
  async (req: Request, res: Response) => {
    const { number } = req.body as { number?: unknown };
    const data = await userService.reassignAnnualLeave(number);
    sendResponse(res, {
      httpStatusCode: 200,
      success: true,
      message: 'Annual leave reassigned successfully',
      data,
    });
  }
);


export const createEmployee = catchAsync(
  async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role?: 'EMPLOYEE' | 'ADMIN';
    };
    const data = await userService.createUser({ name, email, password, role });
    sendResponse(res, {
      httpStatusCode: 201,
      success: true,
      message: 'Employee created successfully',
      data,
    });
  }
);

export const updateById = catchAsync(
  async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: 'EMPLOYEE' | 'ADMIN';
    };
    const data = await userService.updateUser(req.params.id, {
      name,
      email,
      password,
      role,
    });
    sendResponse(res, {
      httpStatusCode: 200,
      success: true,
      message: 'Employee updated successfully',
      data,
    });
  }
);

export const deleteById = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = getAuthUser(req);
    await userService.deleteUser(req.params.id, id);
    sendResponse(res, {
      httpStatusCode: 200,
      success: true,
      message: 'Employee deleted successfully',
    });
  }
);
  