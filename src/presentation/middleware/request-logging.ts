import { LoggingService } from "@infrastructure/services/logging-service";
import { Request, Response, NextFunction } from "express";

export function requestLoggingMiddleware() {
  const logger = LoggingService.getInstance();

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = (req as any).id || "unknown";

    // Log incoming request
    logger.info("Incoming request", {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      contentType: req.get("Content-Type"),
      contentLength: req.get("Content-Length"),
      origin: req.get("Origin"),
      referer: req.get("Referer"),
      // Log body for non-GET requests (excluding sensitive data)
      body: req.method !== "GET" ? sanitizeRequestBody(req.body) : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    });

    // Capture response data
    const originalSend = res.send;
    const originalJson = res.json;

    let responseBody: any;

    res.send = function (body) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    res.json = function (body) {
      responseBody = body;
      return originalJson.call(this, body);
    };

    // Override end to log response
    const originalEnd = res.end;
    res.end = function (this: Response, ...args: any[]) {
      const duration = Date.now() - startTime;

      // Log response
      logger.info("Request completed", {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get("Content-Length"),
        responseSize:
          typeof responseBody === "string"
            ? responseBody.length
            : responseBody
            ? JSON.stringify(responseBody).length
            : 0,
        // Log response body for errors or in debug mode
        responseBody:
          res.statusCode >= 400 || process.env.LOG_LEVEL === "debug"
            ? sanitizeResponseBody(responseBody)
            : undefined,
      });

      originalEnd.apply(this, args);
    };

    next();
  };
}

// Sanitize request body to remove sensitive information
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  const sensitiveFields = ["password", "token", "secret", "key", "auth"];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

// Sanitize response body to remove sensitive information
function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== "object") return body;

  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    const sensitiveFields = ["password", "token", "secret", "key"];

    const sanitized = { ...parsed };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  } catch {
    return body;
  }
}
