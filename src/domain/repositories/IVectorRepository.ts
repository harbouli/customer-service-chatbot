import { Product } from '../entities/product';
import { ProductEmbedding } from '../entities/product-embedding';

export interface IVectorRepository {
  // Existing methods
  storeProductEmbedding(embedding: ProductEmbedding, allowOverwrite?: boolean): Promise<void>;
  searchSimilarProducts(queryEmbedding: number[], limit?: number): Promise<Product[]>;
  updateProductEmbedding(productId: string, embedding: number[]): Promise<void>;
  deleteProductEmbedding(productId: string): Promise<void>;
  initialize(): Promise<void>;

  // New protection methods
  hasProductEmbedding(productId: string): Promise<boolean>;
  getExistingProductIds(): Promise<string[]>;

  // Optional: Get embedding info without full product data
  getEmbeddingInfo?(productId: string): Promise<{
    exists: boolean;
    dimensions?: number;
    createdAt?: string;
  }>;
}
