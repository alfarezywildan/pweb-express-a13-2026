import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      status: false,
      message: err.message,
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    'status' in err &&
    typeof err.status === 'number' &&
    err.status === 400
  ) {
    res.status(400).json({
      status: false,
      message: 'Format JSON pada request body tidak valid',
    });
    return;
  }

  console.error(err);
  const message =
    err instanceof Error ? err.message : 'Terjadi kesalahan pada server';

  res.status(500).json({
    status: false,
    message,
  });
};
