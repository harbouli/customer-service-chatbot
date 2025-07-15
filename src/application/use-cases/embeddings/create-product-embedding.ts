import { v4 as uuidv4 } from 'uuid';
import { Product } from '../../../domain/entities/product';
import { ProductEmbedding } from '../../../domain/entities/product-embedding';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { IVectorRepository } from '../../../domain/repositories/IVectorRepository';
import { IGenerativeAIService } from '../../../domain/services/chatbot-service';
import { ValidationError } from '../../../shared/errors/custom-error';

export interface EmbeddingResult {
  success: boolean;
  productId: string;
  productName: string;
  dimensions?: number;
  skipped?: boolean;
  error?: string;
  retryCount?: number;
}

export interface CreateEmbeddingOptions {
  allowOverwrite?: boolean;
  maxRetries?: number;
}

export class CreateProductEmbedding {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private aiService: IGenerativeAIService
  ) {}

  async execute(productId: string, options: CreateEmbeddingOptions = {}): Promise<EmbeddingResult> {
    const { allowOverwrite = false, maxRetries = 3 } = options;

    try {
      // Validate input
      if (!productId || productId.trim() === '') {
        throw new ValidationError('Product ID is required');
      }

      // Validate product exists
      const product = await this.productRepository.findById(productId);
      if (!product) {
        return {
          success: false,
          productId,
          productName: 'Unknown',
          error: `Product not found: ${productId}`,
        };
      }

      // Check if embedding already exists
      if (!allowOverwrite) {
        const exists = await this.vectorRepository.hasProductEmbedding(productId);
        if (exists) {
          console.log(`⏭️ Embedding already exists for ${product.name}`);
          return {
            success: true,
            productId,
            productName: product.name,
            skipped: true,
          };
        }
      }

      // Generate embedding with retries
      return await this.generateEmbeddingWithRetry(product, allowOverwrite, maxRetries);
    } catch (error) {
      console.error(`❌ Failed to create embedding for product ${productId}:`, error);
      return {
        success: false,
        productId,
        productName: 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async generateEmbeddingWithRetry(
    product: Product,
    allowOverwrite: boolean,
    maxRetries: number
  ): Promise<EmbeddingResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Generating embedding for ${product.name} (attempt ${attempt}/${maxRetries})`
        );

        // Generate embedding from product's searchable content
        const searchableText = this.prepareSearchableText(product);
        const embedding = await this.aiService.generateEmbedding(searchableText);

        // Validate embedding
        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Invalid embedding generated - empty or non-array result');
        }

        if (embedding.some(val => typeof val !== 'number' || !isFinite(val))) {
          throw new Error('Invalid embedding generated - contains non-numeric or infinite values');
        }

        console.log(`✅ Generated ${embedding.length}-dimensional embedding for ${product.name}`);

        // Create product embedding entity
        const productEmbedding = new ProductEmbedding(
          uuidv4(),
          product.id,
          embedding,
          this.createEmbeddingMetadata(product)
        );

        // Store in vector repository
        await this.vectorRepository.storeProductEmbedding(productEmbedding, allowOverwrite);

        console.log(`✅ Successfully stored embedding for ${product.name}`);

        return {
          success: true,
          productId: product.id,
          productName: product.name,
          dimensions: embedding.length,
          ...(attempt > 1 ? { retryCount: attempt } : {}),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delayMs = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
          console.warn(`⚠️ Attempt ${attempt} failed for ${product.name}: ${lastError.message}`);
          console.log(`⏳ Retrying in ${delayMs}ms...`);
          await this.delay(delayMs);
        } else {
          console.error(`❌ All ${maxRetries} attempts failed for ${product.name}`);
        }
      }
    }

    return {
      success: false,
      productId: product.id,
      productName: product.name,
      error: lastError?.message || 'Unknown error after max retries',
      retryCount: maxRetries,
    };
  }

  private prepareSearchableText(product: Product): string {
    const parts = [
      product.name,
      product.description,
      product.category,
      ...product.features,
      ...product.tags,
    ];

    // Add specifications as key-value pairs
    if (product.specifications && typeof product.specifications === 'object') {
      Object.entries(product.specifications).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          parts.push(`${key}: ${String(value)}`);
        }
      });
    }

    // Clean and filter parts
    const cleanedParts = parts
      .filter(Boolean)
      .map(part => String(part).trim())
      .filter(part => part.length > 0);

    const searchableText = cleanedParts.join(' ');

    // Validate minimum content
    if (searchableText.length < 10) {
      console.warn(`⚠️ Very short searchable text for ${product.name}: "${searchableText}"`);
    }

    return searchableText;
  }

  private createEmbeddingMetadata(product: Product): Record<string, any> {
    return {
      productId: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      inStock: product.inStock,
      features: product.features || [],
      tags: product.tags || [],
      specifications: product.specifications || {},
      createdAt: new Date().toISOString(),
      embeddingVersion: '1.0',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to check if a product can have an embedding created
  async canCreateEmbedding(productId: string): Promise<{
    canCreate: boolean;
    reason?: string;
    productExists: boolean;
    embeddingExists: boolean;
  }> {
    try {
      // Check if product exists
      const product = await this.productRepository.findById(productId);
      if (!product) {
        return {
          canCreate: false,
          reason: 'Product not found',
          productExists: false,
          embeddingExists: false,
        };
      }

      // Check if embedding already exists
      const embeddingExists = await this.vectorRepository.hasProductEmbedding(productId);

      return {
        canCreate: !embeddingExists,
        ...(embeddingExists ? { reason: 'Embedding already exists' } : {}),
        productExists: true,
        embeddingExists,
      };
    } catch (error) {
      return {
        canCreate: false,
        reason: `Error checking embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        productExists: false,
        embeddingExists: false,
      };
    }
  }
}
