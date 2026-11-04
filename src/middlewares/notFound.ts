import type { NextFunction, Request, Response } from 'express';

export const notFound = (
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  res.status(404).json({
    status: false,
    message: 'Endpoint tidak ditemukan',
  });
};
