import { Request, Response } from 'express';

import catchAsync from '../shared/catchAsync';
import { sendResponse } from '../shared/sendResponse';
import { getAuthUser } from '../middleware/auth';
import {
  createRequestSchema,
  listRequestsQuerySchema,
  updateRequestStatusSchema,
} from '../schemas/request.schema';
import * as requestService from '../services/request.service';

export const createRequest = catchAsync(async (req: Request, res: Response) => {
  const input = createRequestSchema.parse(req.body);
  // Identity comes from the verified token, never from the body.
  const { id } = getAuthUser(req);
  const data = await requestService.createRequest(input, id);
  sendResponse(res, { httpStatusCode: 201, success: true, data });
});

export const getRequests = catchAsync(async (req: Request, res: Response) => {
  const query = listRequestsQuerySchema.parse(req.query);
  const data = await requestService.getRequests(query, getAuthUser(req));
  sendResponse(res, { httpStatusCode: 200, success: true, data });
});

export const updateRequestStatus = catchAsync(
  async (req: Request, res: Response) => {
    const input = updateRequestStatusSchema.parse(req.body);
    const data = await requestService.updateRequestStatus(req.params.id, input);
    sendResponse(res, { httpStatusCode: 200, success: true, data });
  }
);
