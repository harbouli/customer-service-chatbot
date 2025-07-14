import { createCompressionMiddleware } from './compression';
import { createCorsMiddleware } from './cors';
import { healthCheckMiddleware } from './health-check';
import {
  createAdminRateLimitMiddleware,
  createChatRateLimitMiddleware,
  createRateLimitMiddleware,
} from './rate-limiting';
import { requestIdMiddleware } from './request-id';
import { requestLoggingMiddleware } from './request-logging';
import { additionalSecurityHeaders, createSecurityMiddleware } from './security';
import { createTimeoutMiddleware } from './timeout';

export * from './authentication';
export * from './body-parser';
export * from './compression';
export * from './cors';
export * from './error-handler';
export * from './health-check';
export * from './rate-limiting';
export * from './request-id';
export * from './request-logging';
export * from './security';
export * from './timeout';
export * from './validation';

export function createCommonMiddleware(): Record<string, any> {
  return {
    security: createSecurityMiddleware(),
    additionalSecurity: additionalSecurityHeaders(),
    cors: createCorsMiddleware(),
    compression: createCompressionMiddleware(),
    rateLimit: createRateLimitMiddleware(),
    adminRateLimit: createAdminRateLimitMiddleware(),
    chatRateLimit: createChatRateLimitMiddleware(),
    requestId: requestIdMiddleware(),
    requestLogging: requestLoggingMiddleware(),
    timeout: createTimeoutMiddleware(),
    healthCheck: healthCheckMiddleware(),
  };
}

// Middleware configuration for different environments
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createMiddlewareStack(environment: 'development' | 'production' | 'test') {
  const common = createCommonMiddleware();

  const baseStack = [
    common.requestId,
    common.security,
    common.additionalSecurity,
    common.timeout,
    common.cors,
    common.compression,
  ];

  switch (environment) {
    case 'production':
      return [...baseStack, common.rateLimit, common.requestLogging, common.healthCheck];

    case 'development':
      return [...baseStack, common.requestLogging, common.healthCheck];

    case 'test':
      return [common.requestId, common.cors, common.healthCheck];

    default:
      return baseStack;
  }
}
