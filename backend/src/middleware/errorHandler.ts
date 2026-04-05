import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../shared/utils/apiError';
import { env } from '../config/env';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) {
    return;
  }

  if (err instanceof ApiError) {
    const errorBody: Record<string, unknown> = {
      code: err.code,
      message: err.message,
    };
    if (err.details) errorBody.details = err.details;

    return res.status(err.statusCode).json({
      success: false,
      error: errorBody,
    });
  }

  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: { target?: string[] } };

    if (prismaErr.code === 'P2002') {
      const target = prismaErr.meta?.target?.join(', ') || 'field';
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${target} already exists`,
        },
      });
    }

    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      });
    }
  }

  if (err.constructor.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid data provided',
      },
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: (err as unknown as { issues: unknown[] }).issues,
      },
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }

  console.error('Unhandled error:', err);

  const errorBody: Record<string, unknown> = {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  };
  if (env.NODE_ENV === 'development') {
    errorBody.details = err.message;
    errorBody.stack = err.stack;
  }

  return res.status(500).json({
    success: false,
    error: errorBody,
  });
}
