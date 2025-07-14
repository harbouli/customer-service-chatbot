import { IUser } from '@infrastructure/database/models/user.model';
import {
  CreateUserData,
  MongoDBUserRepository,
  UserNotFoundError,
} from '@infrastructure/repositories/mongodb-user-repository';
import { CustomError } from '@shared/errors/custom-error';
import jwt from 'jsonwebtoken';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends CreateUserData {}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
  };
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export class InvalidCredentialsError extends CustomError {
  constructor() {
    super('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
}

export class InvalidTokenError extends CustomError {
  constructor(message: string = 'Invalid token') {
    super(message, 401, 'INVALID_TOKEN');
  }
}

export class TokenExpiredError extends CustomError {
  constructor(message: string = 'Token has expired') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

export class AccountDeactivatedError extends CustomError {
  constructor() {
    super('Account has been deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }
}

export class AuthenticationService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  readonly ACCESS_TOKEN_EXPIRY = '15m';
  readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor(private userRepository: MongoDBUserRepository) {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn(
        '⚠️ Using default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET in production!'
      );
    }
  }

  async register(registerData: RegisterData): Promise<AuthTokens> {
    try {
      console.log(`🔐 Registering new user: ${registerData.email}`);

      const user = await this.userRepository.createUser(registerData);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      console.log(`✅ User registered successfully: ${user.email}`);
      return tokens;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      console.log(`🔐 Login attempt for: ${credentials.email}`);

      // Find user with password
      const user = await this.userRepository.findUserByEmail(credentials.email);

      if (!user) {
        throw new InvalidCredentialsError();
      }

      // Check if account is active
      if (!user.isActive) {
        throw new AccountDeactivatedError();
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);

      if (!isPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Update last login
      await this.userRepository.updateLastLogin(user._id);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      console.log(`✅ User logged in successfully: ${user.email}`);
      return tokens;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      console.log('🔄 Refreshing tokens...');

      // Verify refresh token
      let decoded: RefreshTokenPayload;
      try {
        decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as RefreshTokenPayload;
      } catch (jwtError: any) {
        if (jwtError.name === 'TokenExpiredError') {
          throw new TokenExpiredError('Refresh token has expired');
        }
        throw new InvalidTokenError('Invalid refresh token');
      }

      // Validate token type
      if (decoded.type !== 'refresh') {
        throw new InvalidTokenError('Invalid token type');
      }

      // Find user
      const user = await this.userRepository.findUserById(decoded.userId);

      if (!user) {
        throw new UserNotFoundError(decoded.userId);
      }

      // Check if account is active
      if (!user.isActive) {
        throw new AccountDeactivatedError();
      }

      // Validate refresh token exists in user's token list
      const isValidRefreshToken = await this.userRepository.validateRefreshToken(
        user._id,
        refreshToken
      );

      if (!isValidRefreshToken) {
        throw new InvalidTokenError('Refresh token not found or revoked');
      }

      // Remove old refresh token
      await this.userRepository.removeRefreshToken(user._id, refreshToken);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      console.log(`✅ Tokens refreshed for user: ${user.email}`);
      return tokens;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    try {
      console.log(`🔐 Logging out user: ${userId}`);

      if (refreshToken) {
        // Remove specific refresh token
        await this.userRepository.removeRefreshToken(userId, refreshToken);
      } else {
        // Clear all refresh tokens (logout from all devices)
        await this.userRepository.clearRefreshTokens(userId);
      }

      console.log(`✅ User logged out: ${userId}`);
    } catch (error) {
      console.error('❌ Logout failed:', error);
      throw error;
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    try {
      console.log(`🔐 Logging out user from all devices: ${userId}`);

      await this.userRepository.clearRefreshTokens(userId);

      console.log(`✅ User logged out from all devices: ${userId}`);
    } catch (error) {
      console.error('❌ Logout all devices failed:', error);
      throw error;
    }
  }

  async verifyAccessToken(token: string): Promise<IUser> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      const user = await this.userRepository.findUserById(decoded.userId);

      if (!user) {
        throw new UserNotFoundError(decoded.userId);
      }

      if (!user.isActive) {
        throw new AccountDeactivatedError();
      }

      return user;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        throw new TokenExpiredError('Access token has expired');
      } else if (jwtError.name === 'JsonWebTokenError') {
        throw new InvalidTokenError('Invalid access token');
      } else {
        throw jwtError;
      }
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      console.log(`🔐 Changing password for user: ${userId}`);

      const user = await this.userRepository.findUserById(userId);

      if (!user) {
        throw new UserNotFoundError(userId);
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);

      if (!isCurrentPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens (force re-login on all devices)
      await this.userRepository.clearRefreshTokens(userId);

      console.log(`✅ Password changed for user: ${userId}`);
    } catch (error) {
      console.error('❌ Password change failed:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<string> {
    try {
      console.log(`🔐 Password reset requested for: ${email}`);

      const user = await this.userRepository.findUserByEmail(email);

      if (!user) {
        // Don't reveal if user exists
        console.log(`⚠️ Password reset requested for non-existent user: ${email}`);
        return 'If an account with that email exists, a password reset link has been sent.';
      }

      // Generate password reset token
      const resetToken = jwt.sign({ userId: user._id, type: 'password_reset' }, this.JWT_SECRET, {
        expiresIn: '1h',
      });

      // In a real application, you would send this token via email
      console.log(`🔗 Password reset token for ${email}: ${resetToken}`);

      return 'If an account with that email exists, a password reset link has been sent.';
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw error;
    }
  }

  async confirmPasswordReset(resetToken: string, newPassword: string): Promise<void> {
    try {
      console.log('🔐 Confirming password reset...');

      let decoded: any;
      try {
        decoded = jwt.verify(resetToken, this.JWT_SECRET);
      } catch (jwtError: any) {
        if (jwtError.name === 'TokenExpiredError') {
          throw new TokenExpiredError('Password reset token has expired');
        }
        throw new InvalidTokenError('Invalid password reset token');
      }

      if (decoded.type !== 'password_reset') {
        throw new InvalidTokenError('Invalid token type');
      }

      const user = await this.userRepository.findUserById(decoded.userId);

      if (!user) {
        throw new UserNotFoundError(decoded.userId);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens
      await this.userRepository.clearRefreshTokens(user._id);

      console.log(`✅ Password reset confirmed for user: ${user.email}`);
    } catch (error) {
      console.error('❌ Password reset confirmation failed:', error);
      throw error;
    }
  }

  private async generateTokens(user: IUser): Promise<AuthTokens> {
    // Generate access token
    const accessToken = user.generateAccessToken();

    // Generate refresh token
    const refreshToken = user.generateRefreshToken();

    // Store refresh token
    await this.userRepository.addRefreshToken(user._id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
      },
    };
  }

  // Utility method to decode token without verification (for debugging)
  decodeToken(token: string): any {
    return jwt.decode(token);
  }
}
