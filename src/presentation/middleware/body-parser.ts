import { Request, Response, NextFunction } from "express";

export function createBodyParserMiddleware() {
  return {
    // JSON parser with size limits and error handling
    json: (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers["content-length"] || "0");
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength > maxSize) {
        return res.status(413).json({
          success: false,
          error: "Request entity too large",
          maxSize: "10MB",
        });
      }

      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
        if (body.length > maxSize) {
          res.status(413).json({
            success: false,
            error: "Request entity too large",
          });
        }
      });

      req.on("end", () => {
        try {
          if (body) {
            req.body = JSON.parse(body);
          }
          next();
        } catch (error) {
          res.status(400).json({
            success: false,
            error: "Invalid JSON in request body",
          });
        }
      });

      req.on("error", (error) => {
        res.status(400).json({
          success: false,
          error: "Error reading request body",
        });
      });
    },
  };
}
