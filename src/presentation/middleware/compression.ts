import compression from 'compression';
import { RequestHandler } from 'express';

export function createCompressionMiddleware(): RequestHandler {
  return compression({
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Don't compress images, videos, or already compressed files
      const contentType = res.getHeader('content-type') as string;
      if (contentType) {
        if (
          contentType.includes('image/') ||
          contentType.includes('video/') ||
          contentType.includes('application/zip') ||
          contentType.includes('application/gzip')
        ) {
          return false;
        }
      }

      return compression.filter(req, res);
    },
    level: 6, // Good balance between compression ratio and speed
    threshold: 1024, // Only compress files larger than 1KB
    chunkSize: 1024, // Process in 1KB chunks
    windowBits: 15,
    memLevel: 8,
  });
}
