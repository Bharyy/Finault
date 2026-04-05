import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod/v4';
import { ApiError } from '../shared/utils/apiError';

type RequestSource = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: RequestSource = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      throw ApiError.badRequest('Validation failed', errors);
    }

    // Replace with parsed & transformed data
    if (source === 'query') {
      // req.query is read-only in newer Express — mutate in place
      const q = req.query;
      for (const key of Object.keys(q)) delete q[key];
      Object.assign(q, result.data);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any)[source] = result.data;
    }
    next();
  };
}
