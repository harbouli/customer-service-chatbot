import { Product } from '../../domain/entities/product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { CustomError } from '../../shared/errors/custom-error';
import { ProductModel } from '../database/models/product.modal';

// Repository Implementation
export class MongoDBProductRepository implements IProductRepository {
  constructor() {
    // Initialize with sample data if collection is empty
    this.initializeSampleData();
  }

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

  private async initializeSampleData(): Promise<void> {
    try {
      const count = await ProductModel.countDocuments();
      if (count > 0) {
        console.log('📦 Products already exist in database');
        return;
      }

      console.log('🌱 Initializing sample product data...');

      const sampleProducts = [
        {
          productId: 'laptop-001',
          name: 'UltraBook Pro 15',
          description:
            'High-performance laptop with 16GB RAM, 512GB SSD, and Intel Core i7 processor. Perfect for professional work and gaming.',
          price: 1299.99,
          category: 'Electronics',
          inStock: true,
          tags: ['laptop', 'computer', 'gaming', 'professional'],
          imageUrl: 'https://example.com/images/laptop-001.jpg',
          specifications: {
            processor: 'Intel Core i7-12700H',
            ram: '16GB DDR4',
            storage: '512GB NVMe SSD',
            display: '15.6" 4K OLED',
            graphics: 'NVIDIA RTX 3060',
            weight: '2.1kg',
          },
        },
        {
          productId: 'smartphone-001',
          name: 'Galaxy S23 Ultra',
          description:
            'Latest flagship smartphone with advanced camera system, 5G connectivity, and all-day battery life.',
          price: 899.99,
          category: 'Electronics',
          inStock: true,
          tags: ['smartphone', 'mobile', '5g', 'camera'],
          imageUrl: 'https://example.com/images/smartphone-001.jpg',
          specifications: {
            display: '6.8" Dynamic AMOLED 2X',
            processor: 'Snapdragon 8 Gen 2',
            ram: '12GB',
            storage: '256GB',
            camera: '200MP + 12MP + 10MP + 10MP',
            battery: '5000mAh',
          },
        },
        {
          productId: 'headphones-001',
          name: 'Wireless Pro Headphones',
          description:
            'Premium noise-cancelling wireless headphones with 30-hour battery life and superior sound quality.',
          price: 299.99,
          category: 'Audio',
          inStock: true,
          tags: ['headphones', 'wireless', 'noise-cancelling', 'audio'],
          imageUrl: 'https://example.com/images/headphones-001.jpg',
          specifications: {
            driver: '40mm dynamic',
            frequency: '20Hz - 20kHz',
            battery: '30 hours',
            connectivity: 'Bluetooth 5.2',
            weight: '250g',
          },
        },
        {
          productId: 'chair-001',
          name: 'Ergonomic Office Chair',
          description:
            'Comfortable ergonomic office chair with lumbar support, adjustable height, and breathable mesh back.',
          price: 399.99,
          category: 'Furniture',
          inStock: false,
          tags: ['chair', 'office', 'ergonomic', 'furniture'],
          imageUrl: 'https://example.com/images/chair-001.jpg',
          specifications: {
            material: 'Mesh and fabric',
            weight_capacity: '150kg',
            adjustable_height: '45-55cm',
            armrests: 'Adjustable',
            warranty: '5 years',
          },
        },
        {
          productId: 'tablet-001',
          name: 'iPad Pro 12.9"',
          description:
            'Professional tablet with M2 chip, Liquid Retina XDR display, and support for Apple Pencil.',
          price: 1099.99,
          category: 'Electronics',
          inStock: true,
          tags: ['tablet', 'ipad', 'professional', 'creative'],
          imageUrl: 'https://example.com/images/tablet-001.jpg',
          specifications: {
            chip: 'Apple M2',
            display: '12.9" Liquid Retina XDR',
            storage: '128GB',
            connectivity: 'Wi-Fi 6E + 5G',
            camera: '12MP + 10MP',
            battery: '10,758mAh',
            pencil: 'Apple Pencil 2nd generation',
          },
        },
      ];

      await ProductModel.insertMany(sampleProducts);
      console.log(`✅ Initialized ${sampleProducts.length} sample products`);
    } catch (error) {
      console.error('❌ Failed to initialize sample data:', error);
    }
  }
}
