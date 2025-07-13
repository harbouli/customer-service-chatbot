import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export interface RequestWithId extends Request {
  id: string;
}

export function requestIdMiddleware() {
  return (req: RequestWithId, res: Response, next: NextFunction) => {
    // Use existing request ID from headers or generate new one
    req.id =
      (req.headers["x-request-id"] as string) ||
      (req.headers["x-correlation-id"] as string) ||
      uuidv4();

    // Set response headers
    res.setHeader("X-Request-ID", req.id);
    res.setHeader("X-Correlation-ID", req.id);

    next();
  };
}
