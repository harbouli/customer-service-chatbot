import { CustomError } from '@shared/errors/custom-error';
import { IUser, User } from '../database/models/user.model';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'user' | 'moderator';
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'moderator';
  permissions?: string[];
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  search?: string; // Search in firstName, lastName, email
}

export class UserAlreadyExistsError extends CustomError {
  constructor(email: string) {
    super(`User with email ${email} already exists`, 409, 'USER_ALREADY_EXISTS');
  }
}

export class UserNotFoundError extends CustomError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, 404, 'USER_NOT_FOUND');
  }
}

export class MongoDBUserRepository {
  async createUser(userData: CreateUserData): Promise<IUser> {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new UserAlreadyExistsError(userData.email);
      }

      const user = new User(userData);
      await user.save();

      console.log(`✅ User created: ${user.email} with role: ${user.role}`);
      return user;
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw error;
      }

      console.error('❌ Failed to create user:', error);
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 11000
      ) {
        throw new UserAlreadyExistsError(userData.email);
      }

      throw new CustomError('Failed to create user', 500, 'USER_CREATION_FAILED');
    }
  }

  async findUserById(userId: string): Promise<IUser | null> {
    try {
      const user = await User.findById(userId).select('+password');
      return user;
    } catch (error) {
      console.error(`❌ Failed to find user by ID: ${userId}`, error);
      return null;
    }
  }

  async findUserByEmail(email: string): Promise<IUser | null> {
    try {
      const user = await User.findByEmail(email);
      return user;
    } catch (error) {
      console.error(`❌ Failed to find user by email: ${email}`, error);
      return null;
    }
  }

  async updateUser(userId: string, updateData: UpdateUserData): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      console.log(`✅ User updated: ${user.email}`);
      return user;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to update user: ${userId}`, error);
      throw new CustomError('Failed to update user', 500, 'USER_UPDATE_FAILED');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      console.log(`✅ User deleted: ${user.email}`);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to delete user: ${userId}`, error);
      throw new CustomError('Failed to delete user', 500, 'USER_DELETION_FAILED');
    }
  }

  async findUsers(
    filters: UserFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{
    users: IUser[];
    total: number;
    page: number;
    pages: number;
  }> {
    try {
      const query: any = {};

      // Apply filters
      if (filters.role) {
        query.role = filters.role;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.emailVerified !== undefined) {
        query.emailVerified = filters.emailVerified;
      }

      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        users,
        total,
        page,
        pages,
      };
    } catch (error) {
      console.error('❌ Failed to find users:', error);
      throw new CustomError('Failed to retrieve users', 500, 'USER_RETRIEVAL_FAILED');
    }
  }

  async addRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      user.addRefreshToken(refreshToken);
      await user.save();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to add refresh token for user: ${userId}`, error);
      throw new CustomError('Failed to add refresh token', 500, 'REFRESH_TOKEN_ADD_FAILED');
    }
  }

  async removeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      user.removeRefreshToken(refreshToken);
      await user.save();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to remove refresh token for user: ${userId}`, error);
      throw new CustomError('Failed to remove refresh token', 500, 'REFRESH_TOKEN_REMOVE_FAILED');
    }
  }

  async clearRefreshTokens(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      user.clearRefreshTokens();
      await user.save();
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }

      console.error(`❌ Failed to clear refresh tokens for user: ${userId}`, error);
      throw new CustomError('Failed to clear refresh tokens', 500, 'REFRESH_TOKEN_CLEAR_FAILED');
    }
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return false;
      }

      return user.refreshTokens.includes(refreshToken);
    } catch (error) {
      console.error(`❌ Failed to validate refresh token for user: ${userId}`, error);
      return false;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
    } catch (error) {
      console.error(`❌ Failed to update last login for user: ${userId}`, error);
      // Don't throw error, this is not critical
    }
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    verified: number;
    byRole: Record<string, number>;
  }> {
    try {
      const [total, active, verified, roleStats] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ emailVerified: true }),
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      ]);

      const byRole = roleStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {});

      return {
        total,
        active,
        verified,
        byRole,
      };
    } catch (error) {
      console.error('❌ Failed to get user stats:', error);
      throw new CustomError('Failed to get user statistics', 500, 'USER_STATS_FAILED');
    }
  }
}
