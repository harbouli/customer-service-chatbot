import { Product } from '../../../domain/entities/product';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { IVectorRepository } from '../../../domain/repositories/IVectorRepository';
import { ValidationError } from '../../../shared/errors/custom-error';
import { CreateProductEmbedding, EmbeddingResult } from './create-product-embedding';

export interface CreateEmbeddingBatchOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  maxRetries?: number;
  allowOverwrite?: boolean;
  forceRegenerate?: boolean;
  specificProductIds?: string[];
  skipExisting?: boolean;
}

export interface EmbeddingProgress {
  total: number;
  processed: number;
  successful: number;
  skipped: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  currentProduct?: string;
  estimatedTimeRemaining?: number;
  averageTimePerProduct?: number;
}

export interface EmbeddingBatchResult {
  totalProducts: number;
  successful: number;
  skipped: number;
  failed: number;
  results: EmbeddingResult[];
  summary: {
    duration: number;
    averageTimePerProduct: number;
    embeddingDimensions: number;
    errors: string[];
    processingRate: number; // products per minute
  };
}

export class CreateProductEmbeddingsBatch {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private createSingleEmbedding: CreateProductEmbedding
  ) {}

  async execute(
    options: CreateEmbeddingBatchOptions = {},
    progressCallback?: (progress: EmbeddingProgress) => void
  ): Promise<EmbeddingBatchResult> {
    const {
      batchSize = 5,
      delayBetweenBatches = 1000,
      maxRetries = 3,
      allowOverwrite = false,
      forceRegenerate = false,
      specificProductIds,
      skipExisting = true,
    } = options;

    // Validate options
    this.validateOptions(options);

    const startTime = Date.now();
    console.log('🚀 Starting batch product embedding creation...');
    console.log(
      `📊 Configuration: batchSize=${batchSize}, delay=${delayBetweenBatches}ms, maxRetries=${maxRetries}`
    );

    try {
      // Get products to process
      const products = await this.getProductsToProcess(specificProductIds);

      if (products.length === 0) {
        console.log('ℹ️ No products found to process');
        return this.createEmptyResult();
      }

      console.log(`📋 Found ${products.length} products in database`);

      // Filter existing embeddings if skipExisting is true
      let productsToProcess = products;
      if (skipExisting && !forceRegenerate) {
        productsToProcess = await this.filterNewProducts(products);
        console.log(
          `🎯 ${productsToProcess.length} products need embeddings (${products.length - productsToProcess.length} already have embeddings)`
        );
      }

      if (productsToProcess.length === 0) {
        console.log('✅ All products already have embeddings');
        return this.createSkippedResult(products.length);
      }

      // Process products in batches
      const results = await this.processBatches(
        productsToProcess,
        batchSize,
        delayBetweenBatches,
        allowOverwrite || forceRegenerate,
        maxRetries,
        progressCallback
      );

      const duration = Date.now() - startTime;
      const batchResult = this.createBatchResult(products.length, results, duration);

      console.log('🎉 Batch processing completed!');
      console.log(
        `📊 Final Results: ${batchResult.successful} successful, ${batchResult.skipped} skipped, ${batchResult.failed} failed`
      );
      console.log(
        `⏱️ Total time: ${Math.round(duration / 1000)}s (${batchResult.summary.processingRate.toFixed(1)} products/min)`
      );

      return batchResult;
    } catch (error) {
      console.error('❌ Batch embedding creation failed:', error);
      throw error;
    }
  }

  private validateOptions(options: CreateEmbeddingBatchOptions): void {
    if (options.batchSize && (options.batchSize < 1 || options.batchSize > 50)) {
      throw new ValidationError('Batch size must be between 1 and 50');
    }

    if (options.delayBetweenBatches && options.delayBetweenBatches < 0) {
      throw new ValidationError('Delay between batches cannot be negative');
    }

    if (options.maxRetries && (options.maxRetries < 1 || options.maxRetries > 10)) {
      throw new ValidationError('Max retries must be between 1 and 10');
    }

    if (options.specificProductIds && options.specificProductIds.length === 0) {
      throw new ValidationError('If specifying product IDs, at least one ID must be provided');
    }
  }

  private async getProductsToProcess(specificProductIds?: string[]): Promise<Product[]> {
    if (specificProductIds && specificProductIds.length > 0) {
      console.log(`🎯 Processing specific products: ${specificProductIds.length} IDs provided`);

      // Get specific products
      const products: Product[] = [];
      const notFound: string[] = [];

      for (const productId of specificProductIds) {
        const product = await this.productRepository.findById(productId);
        if (product) {
          products.push(product);
        } else {
          notFound.push(productId);
        }
      }

      if (notFound.length > 0) {
        console.warn(`⚠️ Products not found: ${notFound.join(', ')}`);
      }

      return products;
    } else {
      console.log('📋 Processing all products from database');
      return await this.productRepository.findAll();
    }
  }

  private async filterNewProducts(products: Product[]): Promise<Product[]> {
    console.log('🔍 Checking for existing embeddings...');

    try {
      const existingProductIds = await this.vectorRepository.getExistingProductIds();
      const existingSet = new Set(existingProductIds);

      const newProducts = products.filter(product => !existingSet.has(product.id));

      console.log(
        `📈 Existing embeddings: ${existingProductIds.length}, New products to process: ${newProducts.length}`
      );

      return newProducts;
    } catch (error) {
      console.warn('⚠️ Could not check existing embeddings, processing all products:', error);
      return products;
    }
  }

  private async processBatches(
    products: Product[],
    batchSize: number,
    delayBetweenBatches: number,
    allowOverwrite: boolean,
    maxRetries: number,
    progressCallback?: (progress: EmbeddingProgress) => void
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const total = products.length;
    const totalBatches = Math.ceil(products.length / batchSize);
    let processed = 0;
    let successful = 0;
    let skipped = 0;
    let failed = 0;
    const processingTimes: number[] = [];

    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = products.slice(i, i + batchSize);
      const batchStartTime = Date.now();

      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`);
      console.log(`   Products: ${batch.map(p => p.name).join(', ')}`);

      // Process batch concurrently
      const batchPromises = batch.map(product =>
        this.createSingleEmbedding.execute(product.id, { allowOverwrite, maxRetries })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update counters and track timing
      const batchDuration = Date.now() - batchStartTime;
      processingTimes.push(batchDuration / batch.length); // Average time per product in this batch

      for (const result of batchResults) {
        processed++;
        if (result.success) {
          if (result.skipped) {
            skipped++;
          } else {
            successful++;
          }
        } else {
          failed++;
        }
      }

      // Calculate progress and estimates
      const percentage = Math.round((processed / total) * 100);
      const averageTimePerProduct =
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      const remainingProducts = total - processed;
      const estimatedTimeRemaining = remainingProducts * averageTimePerProduct;

      const progress: EmbeddingProgress = {
        total,
        processed,
        successful,
        skipped,
        failed,
        percentage,
        currentBatch: batchNumber,
        totalBatches,
        ...(batch[batch.length - 1]?.name ? { currentProduct: batch[batch.length - 1]!.name } : {}),
        estimatedTimeRemaining,
        averageTimePerProduct,
      };

      // Call progress callback
      progressCallback?.(progress);

      // Log progress
      console.log(`📈 Progress: ${percentage}% (${processed}/${total})`);
      console.log(`   ✅ Success: ${successful}, ⏭️ Skipped: ${skipped}, ❌ Failed: ${failed}`);
      if (estimatedTimeRemaining > 0) {
        const etaMinutes = Math.round(estimatedTimeRemaining / 1000 / 60);
        console.log(`   ⏱️ ETA: ${etaMinutes} minutes`);
      }

      // Delay between batches (except for the last batch)
      if (i + batchSize < products.length && delayBetweenBatches > 0) {
        console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
        await this.delay(delayBetweenBatches);
      }
    }

    return results;
  }

  private createEmptyResult(): EmbeddingBatchResult {
    return {
      totalProducts: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      results: [],
      summary: {
        duration: 0,
        averageTimePerProduct: 0,
        embeddingDimensions: 0,
        errors: [],
        processingRate: 0,
      },
    };
  }

  private createSkippedResult(totalProducts: number): EmbeddingBatchResult {
    return {
      totalProducts,
      successful: 0,
      skipped: totalProducts,
      failed: 0,
      results: [],
      summary: {
        duration: 0,
        averageTimePerProduct: 0,
        embeddingDimensions: 0,
        errors: [],
        processingRate: 0,
      },
    };
  }

  private createBatchResult(
    totalProducts: number,
    results: EmbeddingResult[],
    duration: number
  ): EmbeddingBatchResult {
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => r.error).map(r => r.error!);

    const successfulResults = results.filter(r => r.success && r.dimensions);
    const embeddingDimensions =
      successfulResults.length > 0 ? successfulResults[0]?.dimensions! : 0;

    const processingRate = totalProducts > 0 ? (totalProducts / (duration / 1000)) * 60 : 0;

    return {
      totalProducts,
      successful,
      skipped,
      failed,
      results,
      summary: {
        duration,
        averageTimePerProduct: duration / Math.max(totalProducts, 1),
        embeddingDimensions,
        errors: [...new Set(errors)], // Remove duplicates
        processingRate,
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to estimate processing time
  async estimateProcessingTime(options: CreateEmbeddingBatchOptions = {}): Promise<{
    totalProducts: number;
    productsToProcess: number;
    estimatedDurationMinutes: number;
    estimatedBatches: number;
  }> {
    const { batchSize = 5, specificProductIds, skipExisting = true } = options;

    try {
      const products = await this.getProductsToProcess(specificProductIds);
      let productsToProcess = products;

      if (skipExisting) {
        productsToProcess = await this.filterNewProducts(products);
      }

      const estimatedBatches = Math.ceil(productsToProcess.length / batchSize);
      const estimatedSecondsPerProduct = 3; // Conservative estimate
      const estimatedDurationMinutes = Math.ceil(
        (productsToProcess.length * estimatedSecondsPerProduct) / 60
      );

      return {
        totalProducts: products.length,
        productsToProcess: productsToProcess.length,
        estimatedDurationMinutes,
        estimatedBatches,
      };
    } catch (error) {
      console.error('❌ Failed to estimate processing time:', error);
      throw error;
    }
  }
}
