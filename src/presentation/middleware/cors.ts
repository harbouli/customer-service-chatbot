// src/presentation/middleware/cors.ts
import { ConfigService } from "@infrastructure/config/app-config";
import cors from "cors";

export function createCorsMiddleware() {
  const config = ConfigService.getInstance();
  const serverConfig = config.getServer();

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list
      if (serverConfig.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow all origins
      if (config.isDevelopment()) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS policy"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-ID",
      "Accept",
      "Origin",
      "Cache-Control",
      "Pragma",
    ],
    exposedHeaders: [
      "X-Total-Count",
      "X-Page-Count",
      "X-Request-ID",
      "X-Rate-Limit-Remaining",
      "X-Rate-Limit-Reset",
      "X-New-Token",
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200, // Support legacy browsers
  });
}

// CORS preflight handler for complex requests
export function handleCorsPreflightAll() {
  return (req: any, res: any, next: any) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Content-Length, X-Requested-With"
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  };
}
