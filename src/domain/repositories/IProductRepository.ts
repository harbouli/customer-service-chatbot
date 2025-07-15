import { Product } from '../entities/product';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(productId: string): Promise<void>;
  findByName(name: string): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;
  findInStock(): Promise<Product[]>;
  search(query: string): Promise<Product[]>;
  findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]>;
  findByTags(tags: string[]): Promise<Product[]>;

  updateStock(productId: string, inStock: boolean): Promise<void>;
  getCategories(): Promise<string[]>;
  getProductStatistics(): Promise<{
    totalProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalCategories: number;
  }>;
}
