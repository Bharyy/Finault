import morgan from 'morgan';
import { env } from '../config/env';

export const requestLogger = morgan(
  env.NODE_ENV === 'development' ? 'dev' : 'combined',
  {
    skip: (_req, _res) => env.NODE_ENV === 'test',
  }
);
