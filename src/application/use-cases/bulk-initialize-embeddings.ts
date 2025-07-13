import { ProductEmbedding } from "@domain/entities/product-embedding";
import { IProductRepository } from "@domain/repositories/IProductRepository";
import { IVectorRepository } from "@domain/repositories/IVectorRepository";
import { IGenerativeAIService } from "@domain/services/chatbot-service";
import { v4 as uuidv4 } from "uuid";

export class BulkInitializeEmbeddings {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private aiService: IGenerativeAIService
  ) {}

  async execute(
    batchSize: number = 10
  ): Promise<{ success: number; failed: number }> {
    const products = await this.productRepository.findAll();
    let success = 0;
    let failed = 0;

    console.log(
      `Starting bulk embedding initialization for ${products.length} products...`
    );

    // Process in batches to avoid overwhelming the AI service
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (product) => {
          try {
            const embedding = await this.aiService.generateEmbedding(
              product.searchableContent
            );

            const productEmbedding = new ProductEmbedding(
              uuidv4(),
              product.id,
              embedding,
              {
                productId: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                inStock: product.inStock,
                features: product.features,
                tags: product.tags,
              }
            );

            await this.vectorRepository.storeProductEmbedding(productEmbedding);
            success++;
            console.log(`✓ Embedded: ${product.name}`);
          } catch (error) {
            failed++;
            console.error(`✗ Failed to embed ${product.name}:`, error);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `Bulk embedding complete: ${success} success, ${failed} failed`
    );
    return { success, failed };
  }
}
