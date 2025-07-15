import { NextFunction, Request, Response } from 'express';

export function metricsMiddleware() {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Override the end method to capture response time

    next();
  };
}
