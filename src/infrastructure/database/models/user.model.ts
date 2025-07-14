import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'moderator';
  permissions: string[];
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  removeRefreshToken(token: string): void;
  addRefreshToken(token: string): void;
  clearRefreshTokens(): void;
}

export interface IUserModel extends mongoose.Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findActiveUsers(): Promise<IUser[]>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot be more than 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot be more than 50 characters'],
    },
    role: {
      type: String,
      enum: ['admin', 'user', 'moderator'],
      default: 'user',
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    refreshTokens: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        delete (ret as any).password;
        delete (ret as any).refreshTokens;
        return ret;
      },
    },
  }
);

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Set default permissions based on role
userSchema.pre('save', function (next) {
  if (this.isModified('role') || this.isNew) {
    switch (this.role) {
      case 'admin':
        this.permissions = ['*']; // All permissions
        break;
      case 'moderator':
        this.permissions = [
          'chat:read',
          'chat:write',
          'products:read',
          'products:write',
          'analytics:read',
          'customers:read',
          'customers:write',
        ];
        break;
      case 'user':
      default:
        this.permissions = ['chat:read', 'chat:write', 'products:read'];
        break;
    }
  }
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.generateAccessToken = function (): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

  return jwt.sign(
    {
      userId: this._id,
      email: this.email,
      role: this.role,
      permissions: this.permissions,
    },
    JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';

  return jwt.sign(
    {
      userId: this._id,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

userSchema.methods.addRefreshToken = function (token: string): void {
  // Limit to 5 refresh tokens per user (for multiple devices)
  this.refreshTokens.push(token);
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
};

userSchema.methods.removeRefreshToken = function (token: string): void {
  this.refreshTokens = this.refreshTokens.filter((t: string) => t !== token);
};

userSchema.methods.clearRefreshTokens = function (): void {
  this.refreshTokens = [];
};

// Static methods
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
