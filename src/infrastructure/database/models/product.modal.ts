import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  _id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  tags: string[];
  imageUrl?: string;
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductModel extends mongoose.Model<IProduct> {
  findByProductId(productId: string): Promise<IProduct | null>;
  findByName(name: string): Promise<IProduct[]>;
  findByCategory(category: string): Promise<IProduct[]>;
  findInStock(): Promise<IProduct[]>;
  searchProducts(query: string): Promise<IProduct[]>;
}

const productSchema = new Schema<IProduct>(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
      minlength: [2, 'Product name must be at least 2 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [2000, 'Product description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator(value: number) {
          return Number.isFinite(value) && value >= 0;
        },
        message: 'Price must be a valid positive number',
      },
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      maxlength: [100, 'Category cannot exceed 100 characters'],
      index: true,
    },
    inStock: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
      },
    ],
    imageUrl: {
      type: String,
      trim: true,
      validate: {
        validator(value: string) {
          if (!value) return true; // Optional field
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Image URL must be a valid URL',
      },
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.productId;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
productSchema.index({ name: 1 });
productSchema.index({ category: 1, inStock: 1 });
productSchema.index({ price: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });

// Text search index
productSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  tags: 'text',
});

// Static methods
productSchema.statics.findByProductId = async function (productId: string) {
  return await this.findOne({ productId });
};

productSchema.statics.findByCategory = async function (category: string) {
  return await this.find({ category }).sort({ name: 1 });
};

productSchema.statics.findInStock = function () {
  return this.find({ inStock: true }).sort({ name: 1 });
};

productSchema.statics.findByName = async function (name: string) {
  return await this.find({
    name: { $regex: name, $options: 'i' },
  }).sort({ name: 1 });
};

productSchema.statics.searchProducts = async function (query: string) {
  return await this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { category: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
  }).sort({ name: 1 });
};

// Model
export const ProductModel = mongoose.model<IProduct, IProductModel>('Product', productSchema);
