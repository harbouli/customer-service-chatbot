import { Request, Response, NextFunction } from "express";

import { MetricsCollector } from "../monitoring/metrics-collector";

export function metricsMiddleware() {
  const metrics = MetricsCollector.getInstance();

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Override the end method to capture response time
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]) {
      const responseTime = Date.now() - startTime;
      const successful = res.statusCode < 400;

      metrics.recordRequest(successful, responseTime);

      // Call the original end method
      originalEnd.apply(this, args);
    };

    next();
  };
}
