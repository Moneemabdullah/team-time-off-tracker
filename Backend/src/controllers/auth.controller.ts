import { Request, Response } from 'express';

import catchAsync from '../shared/catchAsync';
import { sendResponse } from '../shared/sendResponse';
import { loginSchema } from '../schemas/user.schema';
import * as authService from '../services/auth.service';
import { tokenUtils } from '../utils/token';

/** Sets the session cookie and returns the token for non-browser clients. */
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const data = await authService.login(email, password);

  tokenUtils.setAuthToken(res, data.token);

  sendResponse(res, { httpStatusCode: 200, success: true, data });
});

/** Clears the session cookie. The token itself also expires on its own. */
export const logout = catchAsync(async (_req: Request, res: Response) => {
  tokenUtils.clearAuthToken(res);
  sendResponse(res, { httpStatusCode: 200, success: true });
});
