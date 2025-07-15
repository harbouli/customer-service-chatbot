import { NextFunction, Response } from 'express';
import {
  MongoDBUserRepository,
  UserNotFoundError,
} from '../../infrastructure/repositories/mongodb-user-repository';
import { CustomError } from '../../shared/errors/custom-error';
import { AuthenticatedRequest } from '../middleware/authentication';

export class UserManagementController {
  private userRepository: MongoDBUserRepository;

  constructor() {
    this.userRepository = new MongoDBUserRepository();
  }

  async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, role, isActive, emailVerified, page = 1, limit = 10 } = req.query;

      const filters: any = {
        search: search as string,
        role: role as string,
      };
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (emailVerified !== undefined) filters.emailVerified = emailVerified === 'true';

      const result = await this.userRepository.findUsers(filters, Number(page), Number(limit));

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await this.userRepository.findUserById(userId ?? '');

      if (!user) {
        throw new UserNotFoundError(userId ?? '');
      }

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const updateData = req.body;

      // Prevent users from updating their own role unless they're admin
      if (req.user?.id === userId && updateData.role && req.user?.role !== 'admin') {
        throw new CustomError(
          'Cannot modify your own role',
          403,
          'SELF_ROLE_MODIFICATION_FORBIDDEN'
        );
      }

      const user = await this.userRepository.updateUser(userId ?? '', updateData);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      // Prevent users from deleting themselves
      if (req.user?.id === userId) {
        throw new CustomError('Cannot delete your own account', 403, 'SELF_DELETION_FORBIDDEN');
      }

      await this.userRepository.deleteUser(userId ?? '');

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async deactivateUser(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      // Prevent users from deactivating themselves
      if (req.user?.id === userId) {
        throw new CustomError(
          'Cannot deactivate your own account',
          403,
          'SELF_DEACTIVATION_FORBIDDEN'
        );
      }

      const user = await this.userRepository.updateUser(userId ?? '', { isActive: false });

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async activateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await this.userRepository.updateUser(userId ?? '', { isActive: true });

      res.status(200).json({
        success: true,
        message: 'User activated successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async updateUserRole(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const { role, permissions } = req.body;

      // Prevent users from modifying their own role unless they're admin
      if (req.user?.id === userId && req.user?.role !== 'admin') {
        throw new CustomError(
          'Cannot modify your own role',
          403,
          'SELF_ROLE_MODIFICATION_FORBIDDEN'
        );
      }

      const updateData: any = { role };
      if (permissions) {
        updateData.permissions = permissions;
      }

      const user = await this.userRepository.updateUser(userId ?? '', updateData);

      res.status(200).json({
        success: true,
        message: 'User role updated successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async clearUserSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;

      await this.userRepository.clearRefreshTokens(userId ?? '');

      res.status(200).json({
        success: true,
        message: 'User sessions cleared successfully',
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: error.code,
        });
      } else {
        next(error);
      }
    }
  }

  async getUserStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.userRepository.getUserStats();

      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }
}
