import { NextFunction, Request, Response } from 'express';

export function createTimeoutMiddleware(timeoutMs: number = 30000) {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  return (_req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: `Request took longer than ${timeoutMs}ms to complete`,
          timestamp: new Date().toISOString(),
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}
