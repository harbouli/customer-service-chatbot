import { Product } from "../entities/product";
import { ProductEmbedding } from "../entities/product-embedding";

export interface IVectorRepository {
  storeProductEmbedding(embedding: ProductEmbedding): Promise<void>;
  searchSimilarProducts(
    queryEmbedding: number[],
    limit?: number
  ): Promise<Product[]>;
  updateProductEmbedding(productId: string, embedding: number[]): Promise<void>;
  deleteProductEmbedding(productId: string): Promise<void>;
  initialize(): Promise<void>;
}
