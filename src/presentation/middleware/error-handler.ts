/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ConfigService } from '@infrastructure/config/app-config';
import { MetricsCollector } from '@infrastructure/monitoring/metrics-collector';
import { CustomError } from '@shared/errors/custom-error';
import { NextFunction, Request, Response } from 'express';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
  stack?: string;
}

export const errorHandler = (error: Error, req: Request, res: Response): void => {
  const metrics = MetricsCollector.getInstance();
  const config = ConfigService.getInstance();

  // Generate request ID if available
  const requestId = (req as any).id || 'unknown';

  // Record error metrics
  metrics.recordRequest(false, 0);

  // Base error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId,
  };

  // Handle custom application errors
  if (error instanceof CustomError) {
    errorResponse.error = error.message;

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator
  if (error.name === 'ValidationError') {
    errorResponse.error = 'Validation failed';
    errorResponse.code = 'VALIDATION_ERROR';
    errorResponse.details = error.message;

    res.status(400).json(errorResponse);
    return;
  }

  // Handle MongoDB CastError
  if (error.name === 'CastError') {
    errorResponse.error = 'Invalid ID format';
    errorResponse.code = 'INVALID_ID';

    res.status(400).json(errorResponse);
    return;
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    errorResponse.error = 'Invalid JSON in request body';
    errorResponse.code = 'INVALID_JSON';

    res.status(400).json(errorResponse);
    return;
  }

  // Handle rate limit errors
  if (error.message.includes('rate limit')) {
    errorResponse.error = 'Rate limit exceeded';
    errorResponse.code = 'RATE_LIMIT_EXCEEDED';

    res.status(429).json(errorResponse);
    return;
  }

  // Handle CORS errors
  if (error.message.includes('CORS')) {
    errorResponse.error = 'CORS policy violation';
    errorResponse.code = 'CORS_ERROR';

    res.status(403).json(errorResponse);
    return;
  }

  // Handle file upload errors
  if (error.message.includes('File too large')) {
    errorResponse.error = 'File size exceeds limit';
    errorResponse.code = 'FILE_TOO_LARGE';

    res.status(413).json(errorResponse);
    return;
  }

  // Handle timeout errors
  if (error.message.includes('timeout')) {
    errorResponse.error = 'Request timeout';
    errorResponse.code = 'TIMEOUT';

    res.status(408).json(errorResponse);
    return;
  }

  // Handle database connection errors
  if (error.message.includes('database') || error.message.includes('connection')) {
    errorResponse.error = 'Database connection error';
    errorResponse.code = 'DATABASE_ERROR';

    res.status(503).json(errorResponse);
    return;
  }

  // Include stack trace in development for unknown errors
  if (config.isDevelopment()) {
    errorResponse.error = error.message || 'Unknown error occurred';
  }

  // Default 500 error
  res.status(500).json(errorResponse);
};

// Async error wrapper
export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: Partial<ErrorResponse> = {
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  res.status(404).json(errorResponse);
};
