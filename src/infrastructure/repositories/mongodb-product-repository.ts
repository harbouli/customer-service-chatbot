import { Product } from '../../domain/entities/product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { CustomError } from '../../shared/errors/custom-error';
import { ProductModel } from '../database/models/product.modal';

// Repository Implementation
export class MongoDBProductRepository implements IProductRepository {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  async findById(productId: string): Promise<Product | null> {
    try {
      const productDoc = await ProductModel.findByProductId(productId);

      if (!productDoc) {
        return null;
      }

      return this.mapDocumentToEntity(productDoc);
    } catch (error) {
      console.error(`❌ Failed to find product: ${productId}`, error);
      return null;
    }
  }

  async findAll(): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.find().sort({ name: 1 }).lean();
      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error('❌ Failed to find all products', error);
      return [];
    }
  }

  async findByName(name: string): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.findByName(name);
      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error(`❌ Failed to find products by name: ${name}`, error);
      return [];
    }
  }

  async findByCategory(category: string): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.findByCategory(category);
      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error(`❌ Failed to find products by category: ${category}`, error);
      return [];
    }
  }

  async findInStock(): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.findInStock();
      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error('❌ Failed to find in-stock products', error);
      return [];
    }
  }

  async search(query: string): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.searchProducts(query);
      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error(`❌ Failed to search products: ${query}`, error);
      return [];
    }
  }

  async save(product: Product): Promise<void> {
    try {
      const existingProduct = await ProductModel.findByProductId(product.id);

      if (existingProduct) {
        // Update existing product
        await ProductModel.findOneAndUpdate(
          { productId: product.id },
          {
            $set: {
              name: product.name,
              description: product.description,
              price: product.price,
              category: product.category,
              inStock: product.inStock,
              tags: product.tags,
              specifications: product.specifications,
            },
          }
        );
      } else {
        // Create new product
        const productDoc = new ProductModel({
          productId: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          inStock: product.inStock,
          tags: product.tags,
          specifications: product.specifications,
        });

        await productDoc.save();
      }

      console.log(`✅ Product saved: ${product.id}`);
    } catch (error) {
      console.error(`❌ Failed to save product: ${product.id}`, error);
      throw new CustomError('Failed to save product', 500, 'PRODUCT_SAVE_FAILED');
    }
  }

  async delete(productId: string): Promise<void> {
    try {
      const result = await ProductModel.findOneAndDelete({ productId });

      if (!result) {
        throw new CustomError(`Product not found: ${productId}`, 404, 'PRODUCT_NOT_FOUND');
      }

      console.log(`✅ Product deleted: ${productId}`);
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      console.error(`❌ Failed to delete product: ${productId}`, error);
      throw new CustomError('Failed to delete product', 500, 'PRODUCT_DELETE_FAILED');
    }
  }

  async updateStock(productId: string, inStock: boolean): Promise<void> {
    try {
      const result = await ProductModel.findOneAndUpdate(
        { productId },
        { $set: { inStock } },
        { new: true }
      );

      if (!result) {
        throw new CustomError(`Product not found: ${productId}`, 404, 'PRODUCT_NOT_FOUND');
      }

      console.log(`✅ Product stock updated: ${productId} -> ${inStock}`);
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      console.error(`❌ Failed to update product stock: ${productId}`, error);
      throw new CustomError('Failed to update product stock', 500, 'PRODUCT_UPDATE_FAILED');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const categories = await ProductModel.distinct('category');
      return categories.sort();
    } catch (error) {
      console.error('❌ Failed to get categories', error);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async getProductStatistics() {
    try {
      const stats = await ProductModel.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            inStockProducts: {
              $sum: { $cond: [{ $eq: ['$inStock', true] }, 1, 0] },
            },
            outOfStockProducts: {
              $sum: { $cond: [{ $eq: ['$inStock', false] }, 1, 0] },
            },
            averagePrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            categoriesCount: { $addToSet: '$category' },
          },
        },
        {
          $project: {
            totalProducts: 1,
            inStockProducts: 1,
            outOfStockProducts: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            minPrice: 1,
            maxPrice: 1,
            totalCategories: { $size: '$categoriesCount' },
          },
        },
      ]);

      return (
        stats[0] || {
          totalProducts: 0,
          inStockProducts: 0,
          outOfStockProducts: 0,
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalCategories: 0,
        }
      );
    } catch (error) {
      console.error('❌ Failed to get product statistics', error);
      throw new CustomError('Failed to get product statistics', 500, 'STATS_FETCH_FAILED');
    }
  }

  async findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.find({
        price: { $gte: minPrice, $lte: maxPrice },
      })
        .sort({ price: 1 })
        .lean();

      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error(`❌ Failed to find products by price range: ${minPrice}-${maxPrice}`, error);
      return [];
    }
  }

  async findByTags(tags: string[]): Promise<Product[]> {
    try {
      const productDocs = await ProductModel.find({
        tags: { $in: tags },
      })
        .sort({ name: 1 })
        .lean();

      return productDocs.map(doc => this.mapDocumentToEntity(doc));
    } catch (error) {
      console.error(`❌ Failed to find products by tags: ${tags.join(', ')}`, error);
      return [];
    }
  }

  private mapDocumentToEntity(doc: any): Product {
    return new Product(
      doc.productId,
      doc.name,
      doc.description,
      doc.price,
      doc.category,
      doc.inStock,
      doc.tags || [],
      doc.imageUrl,
      doc.specifications || {}
    );
  }
}
