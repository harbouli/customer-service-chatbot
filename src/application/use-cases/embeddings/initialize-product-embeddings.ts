// src/application/use-cases/initialize-product-embeddings.ts
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../../../domain/entities/product';
import { ProductEmbedding } from '../../../domain/entities/product-embedding';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { IVectorRepository } from '../../../domain/repositories/IVectorRepository';
import { IGenerativeAIService } from '../../../domain/services/chatbot-service';

export interface EmbeddingInitializationOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  maxRetries?: number;
  skipExisting?: boolean;
  forceRegenerate?: boolean;
}

export interface EmbeddingInitializationResult {
  totalProducts: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    productId: string;
    productName: string;
    error: string;
  }>;
  duration: number;
  processedProducts: Array<{
    productId: string;
    productName: string;
    embeddingDimensions: number;
  }>;
}

export interface InitializeProductEmbeddingsDependencies {
  productRepository: IProductRepository;
  vectorRepository: IVectorRepository;
  aiService: IGenerativeAIService;
}

export class InitializeProductEmbeddings {
  private readonly productRepository: IProductRepository;
  private readonly vectorRepository: IVectorRepository;
  private readonly aiService: IGenerativeAIService;

  // Default options with protection enabled
  private readonly defaultOptions: Required<EmbeddingInitializationOptions> = {
    batchSize: 10,
    delayBetweenBatches: 1000, // 1 second
    maxRetries: 3,
    skipExisting: true, // ✅ Skip existing by default
    forceRegenerate: false, // ✅ Never force by default
  };

  constructor(dependencies: InitializeProductEmbeddingsDependencies);
  constructor(
    productRepository: IProductRepository,
    vectorRepository: IVectorRepository,
    aiService: IGenerativeAIService
  );
  constructor(
    productRepositoryOrDeps: IProductRepository | InitializeProductEmbeddingsDependencies,
    vectorRepository?: IVectorRepository,
    aiService?: IGenerativeAIService
  ) {
    if (this.isDependenciesObject(productRepositoryOrDeps)) {
      this.productRepository = productRepositoryOrDeps.productRepository;
      this.vectorRepository = productRepositoryOrDeps.vectorRepository;
      this.aiService = productRepositoryOrDeps.aiService;
    } else {
      this.productRepository = productRepositoryOrDeps;
      this.vectorRepository = vectorRepository!;
      this.aiService = aiService!;
    }
  }

  private isDependenciesObject(obj: any): obj is InitializeProductEmbeddingsDependencies {
    return obj && typeof obj === 'object' && 'productRepository' in obj;
  }

  /**
   * Initialize embeddings for all products with protection
   */
  async execute(
    options: EmbeddingInitializationOptions = {}
  ): Promise<EmbeddingInitializationResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Show protection status
    if (mergedOptions.skipExisting && !mergedOptions.forceRegenerate) {
      console.log('🛡️ Protection Mode: ON - Existing embeddings will be preserved');
    } else if (mergedOptions.forceRegenerate) {
      console.log('⚠️ Force Mode: ON - All embeddings will be regenerated!');
    }

    try {
      // Initialize vector repository if needed
      await this.vectorRepository.initialize();
      console.log('✅ Vector repository initialized');

      // Get all products
      const products = await this.productRepository.findAll();

      if (products.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // Enhanced filtering with proper existence checking
      const filterResult = await this.filterProductsToProcess(
        products,
        mergedOptions.skipExisting,
        mergedOptions.forceRegenerate
      );

      const { toProcess, summary } = filterResult;

      if (toProcess.length === 0) {
        const duration = Date.now() - startTime;
        return {
          totalProducts: summary.total,
          successful: 0,
          failed: 0,
          skipped: summary.existing,
          errors: [],
          processedProducts: [],
          duration,
        };
      }

      // Process only the products that need embeddings
      const result = await this.procesProductsInBatches(
        toProcess,
        mergedOptions,
        mergedOptions.forceRegenerate
      );

      const duration = Date.now() - startTime;
      const finalResult = {
        ...result,
        totalProducts: summary.total,
        skipped: result.skipped + summary.existing, // Include pre-existing as skipped
        duration,
      };

      this.logResults(finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Failed to initialize product embeddings:', error);
      throw new Error(
        `Embedding initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Filter products based on existing embeddings with detailed checking
   */
  private async filterProductsToProcess(
    products: Product[],
    skipExisting: boolean,
    forceRegenerate: boolean
  ): Promise<{
    toProcess: Product[];
    existing: Product[];
    summary: {
      total: number;
      existing: number;
      toProcess: number;
      skipped: number;
    };
  }> {
    if (forceRegenerate) {
      console.log('🔄 Force regenerate enabled - processing ALL products');
      return {
        toProcess: products,
        existing: [],
        summary: {
          total: products.length,
          existing: 0,
          toProcess: products.length,
          skipped: 0,
        },
      };
    }

    if (!skipExisting) {
      console.log('📋 Skip existing disabled - processing ALL products');
      return {
        toProcess: products,
        existing: [],
        summary: {
          total: products.length,
          existing: 0,
          toProcess: products.length,
          skipped: 0,
        },
      };
    }

    console.log('📋 Checking existing embeddings...');

    try {
      // Get all existing product IDs from vector database
      const existingProductIds = await this.vectorRepository.getExistingProductIds();
      const existingSet = new Set(existingProductIds);

      // Separate products into existing vs new
      const existing: Product[] = [];
      const toProcess: Product[] = [];

      products.forEach(product => {
        if (existingSet.has(product.id)) {
          existing.push(product);
        } else {
          toProcess.push(product);
        }
      });

      const summary = {
        total: products.length,
        existing: existing.length,
        toProcess: toProcess.length,
        skipped: existing.length,
      };

      console.log(`📊 Embedding Status:`);
      console.log(`   Total Products: ${summary.total}`);
      console.log(`   🟢 Already have embeddings: ${summary.existing}`);
      console.log(`   🔵 Need embeddings: ${summary.toProcess}`);
      console.log(`   ⏭️ Will skip: ${summary.skipped}`);

      if (existing.length > 0) {
        console.log(`\n✅ Products with existing embeddings (will be skipped):`);
        existing.slice(0, 10).forEach(product => {
          // Show first 10
          console.log(`   • ${product.name} (ID: ${product.id})`);
        });
        if (existing.length > 10) {
          console.log(`   ... and ${existing.length - 10} more`);
        }
      }

      if (toProcess.length > 0) {
        console.log(`\n🔄 Products to process:`);
        toProcess.slice(0, 10).forEach(product => {
          // Show first 10
          console.log(`   • ${product.name} (ID: ${product.id})`);
        });
        if (toProcess.length > 10) {
          console.log(`   ... and ${toProcess.length - 10} more`);
        }
      }

      return { toProcess, existing, summary };
    } catch (error) {
      console.error('❌ Failed to check existing embeddings:', error);
      console.log('⚠️ Defaulting to process all products');

      return {
        toProcess: products,
        existing: [],
        summary: {
          total: products.length,
          existing: 0,
          toProcess: products.length,
          skipped: 0,
        },
      };
    }
  }

  /**
   * Enhanced process product embedding with overwrite protection
   */
  private async processProductEmbedding(
    product: Product,
    maxRetries: number,
    allowOverwrite: boolean = false
  ): Promise<{ success: boolean; dimensions: number; skipped?: boolean }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Extra safety check - verify product doesn't have embedding
        if (!allowOverwrite) {
          const exists = await this.vectorRepository.hasProductEmbedding(product.id);
          if (exists) {
            console.log(`  ⏭️ ${product.name} (already exists)`);
            return { success: true, dimensions: 0, skipped: true };
          }
        }

        // Generate embedding from product's searchable content
        const searchableText = this.prepareSearchableText(product);
        const embedding = await this.aiService.generateEmbedding(searchableText);

        // Validate embedding
        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Invalid embedding generated');
        }

        // Create product embedding entity
        const productEmbedding = new ProductEmbedding(
          uuidv4(),
          product.id,
          embedding,
          this.createEmbeddingMetadata(product)
        );

        // Store in vector repository with overwrite protection
        await this.vectorRepository.storeProductEmbedding(productEmbedding, allowOverwrite);

        return { success: true, dimensions: embedding.length };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // If it's an "already exists" error and we're not allowing overwrites, skip
        if (lastError.message.includes('already exists') && !allowOverwrite) {
          console.log(`  ⏭️ ${product.name} (already exists)`);
          return { success: true, dimensions: 0, skipped: true };
        }

        if (attempt < maxRetries) {
          console.log(
            `    🔄 Retry ${attempt}/${maxRetries} for ${product.name}: ${lastError.message}`
          );
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Failed to process embedding after all retries');
  }

  /**
   * Enhanced batch processing with overwrite control
   */
  private async procesProductsInBatches(
    products: Product[],
    options: Required<EmbeddingInitializationOptions>,
    allowOverwrite: boolean = false
  ): Promise<Omit<EmbeddingInitializationResult, 'totalProducts' | 'duration'>> {
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{
      productId: string;
      productName: string;
      error: string;
    }> = [];
    const processedProducts: Array<{
      productId: string;
      productName: string;
      embeddingDimensions: number;
    }> = [];

    // Process in batches
    for (let i = 0; i < products.length; i += options.batchSize) {
      const batch = products.slice(i, i + options.batchSize);
      const batchNumber = Math.floor(i / options.batchSize) + 1;
      const totalBatches = Math.ceil(products.length / options.batchSize);

      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(product =>
          this.processProductEmbedding(product, options.maxRetries, allowOverwrite)
        )
      );

      // Analyze batch results
      batchResults.forEach((result, index) => {
        const product = batch[index];

        if (result.status === 'fulfilled') {
          if (result.value.success) {
            if (result.value.skipped) {
              skipped++;
            } else {
              successful++;
              processedProducts.push({
                productId: product!.id,
                productName: product!.name ?? '',
                embeddingDimensions: result.value.dimensions,
              });
              console.log(`  ✅ ${product?.name}`);
            }
          } else {
            skipped++;
            console.log(`  ⏭️ ${product?.name} (skipped)`);
          }
        } else {
          failed++;
          const errorMessage =
            result.reason instanceof Error ? result.reason.message : 'Unknown error';
          errors.push({
            productId: product!.id,
            productName: product!.name,
            error: errorMessage,
          });
          console.log(`  ❌ ${product?.name}: ${errorMessage}`);
        }
      });

      // Delay between batches (except for the last batch)
      if (i + options.batchSize < products.length && options.delayBetweenBatches > 0) {
        console.log(`⏳ Waiting ${options.delayBetweenBatches}ms before next batch...`);
        await this.delay(options.delayBetweenBatches);
      }
    }

    return {
      successful,
      failed,
      skipped,
      errors,
      processedProducts,
    };
  }

  /**
   * Reinitialize embeddings for products with outdated or missing embeddings
   */
  async executeIncremental(
    options: EmbeddingInitializationOptions = {}
  ): Promise<EmbeddingInitializationResult> {
    const mergedOptions = {
      ...this.defaultOptions,
      ...options,
      skipExisting: false, // Force check of existing embeddings
    };

    console.log('🔄 Starting incremental embedding initialization...');
    return await this.execute(mergedOptions);
  }

  /**
   * Initialize embeddings for specific products
   */
  async executeForProducts(
    productIds: string[],
    options: EmbeddingInitializationOptions = {}
  ): Promise<EmbeddingInitializationResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    console.log(`🎯 Initializing embeddings for ${productIds.length} specific products...`);

    try {
      await this.vectorRepository.initialize();

      // Get specific products
      const products: Product[] = [];
      for (const productId of productIds) {
        const product = await this.productRepository.findById(productId);
        if (product) {
          products.push(product);
        } else {
          console.warn(`⚠️ Product not found: ${productId}`);
        }
      }

      if (products.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // Process the specific products
      const result = await this.procesProductsInBatches(
        products,
        mergedOptions,
        mergedOptions.forceRegenerate
      );

      const duration = Date.now() - startTime;
      const finalResult = {
        ...result,
        totalProducts: productIds.length,
        duration,
      };

      this.logResults(finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Failed to initialize embeddings for specific products:', error);
      throw new Error(
        `Specific embedding initialization failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get status of embedding initialization
   */
  async getInitializationStatus(): Promise<{
    totalProducts: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    lastInitialized?: Date;
  }> {
    try {
      const products = await this.productRepository.findAll();
      const existingProductIds = await this.vectorRepository.getExistingProductIds();

      return {
        totalProducts: products.length,
        withEmbeddings: existingProductIds.length,
        withoutEmbeddings: products.length - existingProductIds.length,
      };
    } catch (error) {
      console.error('Failed to get initialization status:', error);
      throw error;
    }
  }

  /**
   * Validate existing embeddings
   */
  async validateEmbeddings(): Promise<{
    validEmbeddings: number;
    invalidEmbeddings: number;
    missingEmbeddings: number;
    issues: Array<{ productId: string; issue: string }>;
  }> {
    try {
      const products = await this.productRepository.findAll();
      const existingProductIds = await this.vectorRepository.getExistingProductIds();
      const issues: Array<{ productId: string; issue: string }> = [];

      let validEmbeddings = 0;
      let invalidEmbeddings = 0;

      // Check each existing embedding
      for (const productId of existingProductIds) {
        try {
          const info = await this.vectorRepository.getEmbeddingInfo?.(productId);
          if (info?.exists && info.dimensions) {
            if (info.dimensions === 768) {
              // Expected dimensions
              validEmbeddings++;
            } else {
              invalidEmbeddings++;
              issues.push({
                productId,
                issue: `Invalid dimensions: ${info.dimensions}, expected: 768`,
              });
            }
          } else {
            invalidEmbeddings++;
            issues.push({
              productId,
              issue: 'Embedding exists but cannot retrieve info',
            });
          }
        } catch (error) {
          invalidEmbeddings++;
          issues.push({
            productId,
            issue: `Validation error: ${error instanceof Error ? error.message : 'Unknown'}`,
          });
        }
      }

      const missingEmbeddings = products.length - existingProductIds.length;

      return {
        validEmbeddings,
        invalidEmbeddings,
        missingEmbeddings,
        issues,
      };
    } catch (error) {
      console.error('Failed to validate embeddings:', error);
      return {
        validEmbeddings: 0,
        invalidEmbeddings: 0,
        missingEmbeddings: 0,
        issues: [{ productId: 'unknown', issue: 'Validation failed' }],
      };
    }
  }

  // Helper methods
  private prepareSearchableText(product: Product): string {
    const parts = [
      product.name,
      product.description,
      product.category,
      ...product.features,
      ...product.tags,
      ...Object.entries(product.specifications).map(([key, value]) => `${key}: ${value}`),
    ];

    return parts
      .filter(part => part && typeof part === 'string')
      .join(' ')
      .trim();
  }

  private createEmbeddingMetadata(product: Product): Record<string, any> {
    return {
      productId: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      inStock: product.inStock,
      features: product.features,
      tags: product.tags,
      specifications: product.specifications,
      createdAt: new Date().toISOString(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createEmptyResult(startTime: number): EmbeddingInitializationResult {
    return {
      totalProducts: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      processedProducts: [],
      duration: Date.now() - startTime,
    };
  }

  private logResults(result: EmbeddingInitializationResult): void {
    console.log('\n📊 Embedding Initialization Results:');
    console.log(`   Total Products: ${result.totalProducts}`);
    console.log(`   ✅ Successful: ${result.successful}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   ⏭️ Skipped: ${result.skipped}`);
    console.log(`   ⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error.productName} (${error.productId}): ${error.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    if (result.processedProducts.length > 0) {
      console.log('\n✅ Successfully Processed:');
      result.processedProducts.slice(0, 5).forEach(product => {
        console.log(`   • ${product.productName} (${product.embeddingDimensions}D)`);
      });
      if (result.processedProducts.length > 5) {
        console.log(`   ... and ${result.processedProducts.length - 5} more products`);
      }
    }

    const successRate =
      result.totalProducts > 0
        ? ((result.successful / result.totalProducts) * 100).toFixed(1)
        : '0';

    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (result.skipped > 0) {
      console.log(`🛡️ Protection: ${result.skipped} existing embeddings preserved`);
    }
  }
}
