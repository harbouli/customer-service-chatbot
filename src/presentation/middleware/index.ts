import { createCompressionMiddleware } from "./compression";
import { createCorsMiddleware } from "./cors";
import { healthCheckMiddleware } from "./health-check";
import {
  createAdminRateLimitMiddleware,
  createChatRateLimitMiddleware,
  createRateLimitMiddleware,
} from "./rate-limiting";
import { requestIdMiddleware } from "./request-id";
import { requestLoggingMiddleware } from "./request-logging";
import {
  additionalSecurityHeaders,
  createSecurityMiddleware,
} from "./security";
import { createTimeoutMiddleware } from "./timeout";

export * from "./validation";
export * from "./error-handler";
export * from "./authentication";
export * from "./cors";
export * from "./rate-limiting";
export * from "./request-logging";
export * from "./security";
export * from "./compression";
export * from "./request-id";
export * from "./timeout";
export * from "./body-parser";
export * from "./health-check";

export function createCommonMiddleware() {
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
export function createMiddlewareStack(
  environment: "development" | "production" | "test"
) {
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
    case "production":
      return [
        ...baseStack,
        common.rateLimit,
        common.requestLogging,
        common.healthCheck,
      ];

    case "development":
      return [...baseStack, common.requestLogging, common.healthCheck];

    case "test":
      return [common.requestId, common.cors, common.healthCheck];

    default:
      return baseStack;
  }
}
