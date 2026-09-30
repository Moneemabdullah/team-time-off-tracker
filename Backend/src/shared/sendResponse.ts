import { Response } from "express";

interface IResponseData<T> {
    httpStatusCode: number;
    success: boolean;
    /** Optional so successful responses stay `{ success, data }` with no message. */
    message?: string;
    data?: T;
}

export const sendResponse = <T>(
    res: Response,
    responseData: IResponseData<T>,
) => {
    const { httpStatusCode, success, message, data } = responseData;
    if (message === undefined) {
        res.status(httpStatusCode).json({ success, data });
        return;
    }
    res.status(httpStatusCode).json({
        success,
        message,
        data,
    });
};