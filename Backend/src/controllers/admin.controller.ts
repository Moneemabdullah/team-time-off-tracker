import type { Request, Response } from 'express';

import catchAsync from '../shared/catchAsync';
import { sendResponse } from '../shared/sendResponse';
import { listAllRequestsQuerySchema } from '../schemas/request.schema';
import * as requestService from '../services/request.service';

/** `GET /admin/requests` — paginated list of every request across all users. */
export const getAllRequests = catchAsync(async (req: Request, res: Response) => {
  const query = listAllRequestsQuerySchema.parse(req.query);
  const { items, meta } = await requestService.getAllRequests(query);
  sendResponse(res, { httpStatusCode: 200, success: true, data: items, meta });
});
