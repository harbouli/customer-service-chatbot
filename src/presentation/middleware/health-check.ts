import { NextFunction, Request, Response } from 'express';
import { HealthChecker } from '../../infrastructure/health/health-checker';

export function healthCheckMiddleware() {
  const healthChecker = new HealthChecker();
  let lastHealthCheck: any = null;
  let lastCheckTime = 0;
  const CACHE_DURATION = 30000; // 30 seconds

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only run for health check endpoint
    if (req.path !== '/health') {
      return next();
    }

    try {
      const now = Date.now();

      // Use cached result if recent
      if (lastHealthCheck && now - lastCheckTime < CACHE_DURATION) {
        const statusCode =
          lastHealthCheck.status === 'healthy'
            ? 200
            : lastHealthCheck.status === 'degraded'
              ? 200
              : 503;
        return res.status(statusCode).json(lastHealthCheck);
      }

      // Perform new health check
      const health = await healthChecker.performHealthCheck();
      lastHealthCheck = health;
      lastCheckTime = now;

      const statusCode =
        health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}
