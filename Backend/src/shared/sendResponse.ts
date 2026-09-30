import { Response } from "express";

interface IResponseData<T> {
    httpStatusCode: number;
    success: boolean;
    /** Optional so successful responses stay `{ success, data }` with no message. */
    message?: string;
    data?: T;
    /** Optional pagination block, emitted alongside `data` when present. */
    meta?: unknown;
}

export const sendResponse = <T>(
    res: Response,
    responseData: IResponseData<T>,
) => {
    const { httpStatusCode, success, message, data, meta } = responseData;

    if (message === undefined) {
        res.status(httpStatusCode).json(
            meta === undefined ? { success, data } : { success, data, meta },
        );
        return;
    }

    res.status(httpStatusCode).json({
        success,
        message,
        data,
        ...(meta === undefined ? {} : { meta }),
    });
};
