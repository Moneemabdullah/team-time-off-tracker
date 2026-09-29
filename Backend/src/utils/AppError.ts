/**
 * Error type carrying an HTTP status code, so services can signal the exact
 * response the controller should send without knowing HTTP details.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export const badRequest = (message: string): AppError =>
  new AppError(message, 400);

export const notFound = (message: string): AppError =>
  new AppError(message, 404);

export const conflict = (message: string): AppError =>
  new AppError(message, 409);

export const unauthorized = (message: string): AppError =>
  new AppError(message, 401);

export const forbidden = (message: string): AppError =>
  new AppError(message, 403);

export const isAppError = (err: unknown): err is AppError =>
  err instanceof AppError;
