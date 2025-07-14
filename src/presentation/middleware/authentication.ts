import {
  AccountDeactivatedError,
  AuthenticationService,
  InvalidTokenError,
  TokenExpiredError,
} from '@application/services/auth.service';
import { ConfigService } from '@infrastructure/config/app-config';
import { MongoDBUserRepository } from '@infrastructure/repositories/mongodb-user-repository';
import { CustomError } from '@shared/errors/custom-error';
import { NextFunction, Request, Response } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user' | 'moderator';
    permissions: string[];
    isActive: boolean;
    emailVerified: boolean;
  };
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

// Create singleton instances
const userRepository = new MongoDBUserRepository();
const authService = new AuthenticationService(userRepository);

// Mock users for development (fallback when MongoDB is not available)
const mockUsers = new Map([
  [
    'admin-1',
    {
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as const,
      permissions: ['*'], // All permissions
      isActive: true,
      emailVerified: true,
    },
  ],
  [
    'user-1',
    {
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'Regular',
      lastName: 'User',
      role: 'user' as const,
      permissions: ['chat:read', 'chat:write', 'products:read'],
      isActive: true,
      emailVerified: true,
    },
  ],
  [
    'moderator-1',
    {
      id: 'moderator-1',
      email: 'moderator@example.com',
      firstName: 'Moderator',
      lastName: 'User',
      role: 'moderator' as const,
      permissions: ['chat:read', 'chat:write', 'products:read', 'products:write', 'analytics:read'],
      isActive: true,
      emailVerified: true,
    },
  ],
]);

// Authentication middleware
export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const config = ConfigService.getInstance();

    // Handle mock tokens for development
    if (config.isDevelopment()) {
      if (token === 'mock-admin-token') {
        req.user = mockUsers.get('admin-1')!;
        return next();
      } else if (token === 'mock-user-token') {
        req.user = mockUsers.get('user-1')!;
        return next();
      } else if (token === 'mock-moderator-token') {
        req.user = mockUsers.get('moderator-1')!;
        return next();
      }
    }

    // Real JWT verification with MongoDB
    try {
      const user = await authService.verifyAccessToken(token);

      req.user = {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      };

      next();
    } catch (authError) {
      if (authError instanceof TokenExpiredError) {
        throw authError;
      } else if (authError instanceof InvalidTokenError) {
        throw new AuthenticationError('Invalid token');
      } else if (authError instanceof AccountDeactivatedError) {
        throw new AuthenticationError('Account deactivated');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  } catch (error) {
    next(error);
  }
};

// Authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        throw new AuthorizationError(`Required roles: ${roles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Permission-based authorization
export const requirePermissions = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const userPermissions = req.user.permissions || [];

      // Admin has all permissions
      if (userPermissions.includes('*')) {
        return next();
      }

      // Check if user has required permissions
      const hasPermissions = permissions.every(permission => userPermissions.includes(permission));

      if (!hasPermissions) {
        throw new AuthorizationError(`Required permissions: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Role-based shortcuts
export const adminOnly = authorize('admin');
export const moderatorOrAdmin = authorize('moderator', 'admin');
export const userOrAbove = authorize('user', 'moderator', 'admin');

// Optional authentication (doesn't throw if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user
  }

  // Use the main authenticate middleware
  await authenticate(req, res, error => {
    if (error) {
      // Log the error but don't throw it
      console.warn('Optional authentication failed:', error.message);
    }
    next(); // Continue regardless of auth result
  });
};

// Refresh token middleware
export const refreshTokenMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    const tokens = await authService.refreshTokens(refreshToken);

    // Attach new tokens to response
    res.locals.tokens = tokens;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check if user email is verified
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!req.user.emailVerified) {
      throw new AuthorizationError('Email verification required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireActiveAccount = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    if (!req.user.isActive) {
      throw new AuthorizationError('Account is deactivated');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Export auth service for use in controllers
export { authService, userRepository };
