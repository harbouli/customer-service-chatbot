import { Product } from '../entities/product';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByName(name: string): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
}
