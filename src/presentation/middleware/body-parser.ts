/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { NextFunction, Request, Response } from 'express';

export function createBodyParserMiddleware() {
  return {
    // JSON parser with size limits and error handling
    json: (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (contentLength > maxSize) {
        return res.status(413).json({
          success: false,
          error: 'Request entity too large',
          maxSize: '10MB',
        });
      }

      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
        if (body.length > maxSize) {
          res.status(413).json({
            success: false,
            error: 'Request entity too large',
          });
          return;
        }
      });

      req.on('end', () => {
        try {
          if (body) {
            req.body = JSON.parse(body);
          }
          next();
        } catch (error) {
          res.status(400).json({
            success: false,
            error: 'Invalid JSON in request body',
          });
          return;
        }
      });

      // eslint-disable-next-line no-unused-vars
      req.on('error', _error => {
        res.status(400).json({
          success: false,
          error: 'Error reading request body',
        });
      });
      return;
    },
  };
}
