import { ConfigService } from "@infrastructure/config/app-config";
import { CustomError } from "@shared/errors/custom-error";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "user" | "moderator";
    permissions?: string[];
  };
}

export class AuthenticationError extends CustomError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class TokenExpiredError extends CustomError {
  constructor(message: string = "Token has expired") {
    super(message, 401, "TOKEN_EXPIRED");
  }
}

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Mock user database (replace with real database)
const mockUsers = new Map([
  [
    "admin-1",
    {
      id: "admin-1",
      email: "admin@example.com",
      role: "admin" as const,
      permissions: ["*"], // All permissions
    },
  ],
  [
    "user-1",
    {
      id: "user-1",
      email: "user@example.com",
      role: "user" as const,
      permissions: ["chat:read", "chat:write", "products:read"],
    },
  ],
  [
    "moderator-1",
    {
      id: "moderator-1",
      email: "moderator@example.com",
      role: "moderator" as const,
      permissions: [
        "chat:read",
        "chat:write",
        "products:read",
        "products:write",
        "analytics:read",
      ],
    },
  ],
]);

// Authentication middleware
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);

    // Handle mock tokens for development
    const config = ConfigService.getInstance();
    if (config.isDevelopment()) {
      if (token === "mock-admin-token") {
        req.user = mockUsers.get("admin-1")!;
        return next();
      } else if (token === "mock-user-token") {
        req.user = mockUsers.get("user-1")!;
        return next();
      } else if (token === "mock-moderator-token") {
        req.user = mockUsers.get("moderator-1")!;
        return next();
      }
    }

    // Real JWT verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = mockUsers.get(decoded.userId);

      if (!user) {
        throw new AuthenticationError("User not found");
      }

      req.user = user;
      next();
    } catch (jwtError: any) {
      if (jwtError.name === "TokenExpiredError") {
        throw new TokenExpiredError();
      } else if (jwtError.name === "JsonWebTokenError") {
        throw new AuthenticationError("Invalid token");
      } else {
        throw new AuthenticationError("Token verification failed");
      }
    }
  } catch (error) {
    next(error);
  }
};

// Authorization middleware
export const authorize = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError("User not authenticated");
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        throw new AuthorizationError(`Required roles: ${roles.join(", ")}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Permission-based authorization
export const requirePermissions = (...permissions: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError("User not authenticated");
      }

      const userPermissions = req.user.permissions || [];

      // Admin has all permissions
      if (userPermissions.includes("*")) {
        return next();
      }

      // Check if user has required permissions
      const hasPermissions = permissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasPermissions) {
        throw new AuthorizationError(
          `Required permissions: ${permissions.join(", ")}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Role-based shortcuts
export const adminOnly = authorize("admin");
export const moderatorOrAdmin = authorize("moderator", "admin");
export const userOrAbove = authorize("user", "moderator", "admin");

// Optional authentication (doesn't throw if no token)
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // Continue without user
  }

  // Use the main authenticate middleware
  authenticate(req, res, (error) => {
    if (error) {
      // Log the error but don't throw it
      console.warn("Optional authentication failed:", error.message);
    }
    next(); // Continue regardless of auth result
  });
};

// Generate JWT token (for login endpoints)
export const generateToken = (
  userId: string,
  expiresIn: string = "24h"
): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
};

// Refresh token middleware
export const refreshToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError("User not authenticated");
    }

    // Generate new token
    const newToken = generateToken(req.user.id, "24h");

    // Add new token to response headers
    res.setHeader("X-New-Token", newToken);

    next();
  } catch (error) {
    next(error);
  }
};
