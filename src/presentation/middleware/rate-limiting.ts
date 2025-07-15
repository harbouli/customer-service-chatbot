/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ConfigService } from '@infrastructure/config/app-config';
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export function createRateLimitMiddleware() {
  const config = ConfigService.getInstance();
  const rateLimitConfig = config.getRateLimit();

  return rateLimit({
    windowMs: rateLimitConfig.windowMs,
    limit: rateLimitConfig.maxRequests,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000),
      type: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
    skipFailedRequests: rateLimitConfig.skipFailedRequests,
    keyGenerator: (req: Request) => {
      // Use forwarded IP if behind proxy, otherwise use connection IP
      return (
        req.ip ||
        (req.headers['x-forwarded-for'] as string) ||
        (req.headers['x-real-ip'] as string) ||
        req.connection.remoteAddress ||
        'unknown'
      );
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000),
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });
    },
  });
}

// Stricter rate limiting for admin endpoints
export function createAdminRateLimitMiddleware() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Much stricter for admin operations
    message: {
      success: false,
      error: 'Too many admin requests from this IP, please try again later.',
      retryAfter: 900, // 15 minutes
      type: 'ADMIN_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req: Request) => {
      // Include user ID in key for authenticated admin requests
      const userKey = (req as any).user?.id || 'anonymous';
      const ipKey = req.ip || 'unknown';
      return `admin-${userKey}-${ipKey}`;
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Admin rate limit exceeded',
        message: 'Too many admin requests from this IP/user, please try again later.',
        retryAfter: 900,
        timestamp: new Date().toISOString(),
      });
    },
  });
}

// Chat-specific rate limiting (per customer)
export function createChatRateLimitMiddleware() {
  return rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 30, // 30 messages per minute per customer
    keyGenerator: (req: Request) => {
      const customerId = req.body?.customerId || req.params?.customerId || 'anonymous';
      return `chat-${customerId}`;
    },
    message: {
      success: false,
      error: 'Too many chat messages, please slow down.',
      retryAfter: 60,
      type: 'CHAT_RATE_LIMIT_EXCEEDED',
    },
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Chat rate limit exceeded',
        message: 'You are sending messages too quickly. Please wait a moment.',
        retryAfter: 60,
        timestamp: new Date().toISOString(),
      });
    },
  });
}
