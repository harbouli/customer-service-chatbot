import { NextFunction, Request, Response } from 'express';
import {
  AuthenticationService,
  InvalidCredentialsError,
  InvalidTokenError,
  TokenExpiredError,
} from '../../application/services/auth.service';
import {
  MongoDBUserRepository,
  UserAlreadyExistsError,
} from '../../infrastructure/repositories/mongodb-user-repository';
import { CustomError } from '../../shared/errors/custom-error';
import { AuthenticatedRequest } from '../middleware/authentication';

export class AuthController {
  private authService: AuthenticationService;

  constructor() {
    const userRepository = new MongoDBUserRepository();
    this.authService = new AuthenticationService(userRepository);
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new CustomError('Missing required fields', 400, 'MISSING_FIELDS');
      }

      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        throw new CustomError('Invalid email format', 400, 'INVALID_EMAIL');
      }

      // Validate password strength
      if (password.length < 6) {
        throw new CustomError('Password must be at least 6 characters long', 400, 'WEAK_PASSWORD');
      }

      // Register user
      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        role: role || 'user',
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        res.status(409).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw new CustomError('Email and password are required', 400, 'MISSING_CREDENTIALS');
      }

      // Login user
      const result = await this.authService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new CustomError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
      }

      const result = await this.authService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        },
      });
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof InvalidTokenError) {
        res.status(401).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new CustomError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      await this.authService.logout(userId, refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAllDevices(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new CustomError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      await this.authService.logoutAllDevices(userId);

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;

      if (!user) {
        throw new CustomError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            permissions: user.permissions,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new CustomError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      if (!currentPassword || !newPassword) {
        throw new CustomError(
          'Current password and new password are required',
          400,
          'MISSING_PASSWORDS'
        );
      }

      if (newPassword.length < 6) {
        throw new CustomError(
          'New password must be at least 6 characters long',
          400,
          'WEAK_PASSWORD'
        );
      }

      await this.authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again on all devices.',
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new CustomError('Email is required', 400, 'MISSING_EMAIL');
      }

      const message = await this.authService.resetPassword(email);

      res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new CustomError('Reset token and new password are required', 400, 'MISSING_FIELDS');
      }

      if (newPassword.length < 6) {
        throw new CustomError('Password must be at least 6 characters long', 400, 'WEAK_PASSWORD');
      }

      await this.authService.confirmPasswordReset(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.',
      });
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof InvalidTokenError) {
        res.status(401).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async validateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // If we reach here, the token is valid (middleware already validated it)
      const user = req.user;

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: {
          user: {
            id: user?.id,
            email: user?.email,
            firstName: user?.firstName,
            lastName: user?.lastName,
            role: user?.role,
            permissions: user?.permissions,
            isActive: user?.isActive,
            emailVerified: user?.emailVerified,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
