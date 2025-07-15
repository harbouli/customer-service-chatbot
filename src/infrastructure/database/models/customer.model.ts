import { CustomError } from '@shared/errors/custom-error';
import mongoose, { Document, Schema } from 'mongoose';

// MongoDB Schema
export interface ICustomer extends Document {
  _id: string;
  customerId: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerModel extends mongoose.Model<ICustomer> {
  findByCustomerId(customerId: string): Promise<ICustomer | null>;
  findByEmail(email: string): Promise<ICustomer | null>;
  findByPhone(phone: string): Promise<ICustomer | null>;
  findActiveCustomers(): Promise<ICustomer[]>;
  searchCustomers(query: string): Promise<ICustomer[]>;
}

const customerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot be more than 100 characters'],
      minlength: [2, 'Customer name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple null values but unique non-null values
      match: [/^[\\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.customerId;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for better performance
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ createdAt: -1 });

// Text search index for name and email
customerSchema.index({
  name: 'text',
  email: 'text',
});

// Static methods
customerSchema.statics.findByCustomerId = async function (customerId: string) {
  return await this.findOne({ customerId });
};

customerSchema.statics.findByEmail = async function (email: string) {
  return await this.findOne({ email: email.toLowerCase() });
};

customerSchema.statics.findByPhone = async function (phone: string) {
  return await this.findOne({ phone: phone.trim() });
};

customerSchema.statics.findActiveCustomers = function () {
  return this.find({ isActive: true });
};

customerSchema.statics.searchCustomers = async function (query: string) {
  return await this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
    ],
  }).sort({ name: 1 });
};

// Model
export const CustomerModel = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);

// Custom Error Classes
export class CustomerAlreadyExistsError extends CustomError {
  constructor(email: string) {
    super(`Customer with email ${email} already exists`, 409, 'CUSTOMER_ALREADY_EXISTS');
  }
}

export class CustomerNotFoundError extends CustomError {
  constructor(identifier: string) {
    super(`Customer not found: ${identifier}`, 404, 'CUSTOMER_NOT_FOUND');
  }
}
