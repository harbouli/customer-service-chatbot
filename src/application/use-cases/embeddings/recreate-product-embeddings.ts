import { IProductRepository } from '@domain/repositories/IProductRepository';
import { IVectorRepository } from '@domain/repositories/IVectorRepository';
import { IGenerativeAIService } from '@domain/services/chatbot-service';
import { ValidationError } from '@shared/errors/custom-error';
import {
  EmbeddingInitializationOptions,
  EmbeddingInitializationResult,
  InitializeProductEmbeddings,
} from './initialize-product-embeddings';

export interface RecreateEmbeddingsOptions {
  productIds?: string[] | undefined;
  reason?: string | undefined;
  validateBefore?: boolean | undefined;
  validateAfter?: boolean | undefined;
  conservativeSettings?: boolean | undefined;
  batchSize?: number | undefined;
  delayBetweenBatches?: number | undefined;
  maxRetries?: number | undefined;
}

export interface RecreationResult extends EmbeddingInitializationResult {
  recreationInfo: {
    reason: string;
    productsTargeted: number;
    existingEmbeddingsFound: number;
    recreated: number;
    failed: number;
    validationResults?:
      | {
          beforeRecreation: {
            validEmbeddings: number;
            invalidEmbeddings: number;
            missingEmbeddings: number;
            issues: Array<{ productId: string; issue: string }>;
          };
          afterRecreation: {
            validEmbeddings: number;
            invalidEmbeddings: number;
            missingEmbeddings: number;
            issues: Array<{ productId: string; issue: string }>;
          };
        }
      | undefined;
  };
}

export class RecreateProductEmbeddings {
  private readonly initialize: InitializeProductEmbeddings;

  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private aiService: IGenerativeAIService
  ) {
    this.initialize = new InitializeProductEmbeddings(
      productRepository,
      vectorRepository,
      aiService
    );
  }

  async execute(options: RecreateEmbeddingsOptions = {}): Promise<RecreationResult> {
    const {
      productIds,
      reason = 'Manual recreation requested',
      validateBefore = true,
      validateAfter = true,
      conservativeSettings = true,
      batchSize,
      delayBetweenBatches,
      maxRetries,
    } = options;

    console.log('🔄 Starting product embeddings recreation...');
    console.log(`📋 Reason: ${reason}`);

    if (productIds) {
      console.log(`🎯 Target products: ${productIds.length} specific products`);
    } else {
      console.log('🌐 Target: All products');
    }

    try {
      // Test AI service connectivity before proceeding
      await this.testAIServiceConnectivity();

      // Validate inputs
      this.validateInputs(options);

      // Get target products and their status
      const { targetProducts, existingEmbeddingsCount } =
        await this.getTargetProductsInfo(productIds);

      if (targetProducts.length === 0) {
        throw new ValidationError('No target products found for recreation');
      }

      console.log(`📊 Found ${targetProducts.length} products to potentially recreate`);
      console.log(`📈 Existing embeddings: ${existingEmbeddingsCount}`);

      // Validate existing embeddings before recreation
      let validationBefore;
      if (validateBefore) {
        console.log('🔍 Validating existing embeddings before recreation...');
        validationBefore = await this.initialize.validateEmbeddings();
        this.logValidationResults('BEFORE', validationBefore);
      }

      // Prepare recreation options with force regenerate
      const recreationOptions: EmbeddingInitializationOptions = {
        ...this.getRecreationSettings(
          conservativeSettings,
          batchSize,
          delayBetweenBatches,
          maxRetries
        ),
        skipExisting: false,
        forceRegenerate: true, // Force recreation of existing embeddings
      };

      console.log('⚙️ Recreation settings:');
      console.log(`   Batch size: ${recreationOptions.batchSize}`);
      console.log(`   Delay between batches: ${recreationOptions.delayBetweenBatches}ms`);
      console.log(`   Max retries: ${recreationOptions.maxRetries}`);
      console.log(`   Force regenerate: ${recreationOptions.forceRegenerate}`);
      console.log(`   Skip existing: ${recreationOptions.skipExisting}`);

      // Execute recreation using your InitializeProductEmbeddings
      console.log('🚀 Starting recreation process...');
      let batchResult: EmbeddingInitializationResult;

      if (productIds && productIds.length > 0) {
        // Recreate specific products
        batchResult = await this.initialize.executeForProducts(productIds, recreationOptions);
      } else {
        // Recreate all products
        batchResult = await this.initialize.execute(recreationOptions);
      }

      // Validate after recreation
      let validationAfter;
      if (validateAfter) {
        console.log('🔍 Validating embeddings after recreation...');
        validationAfter = await this.initialize.validateEmbeddings();
        this.logValidationResults('AFTER', validationAfter);
      }

      // Create recreation result
      const recreationResult: RecreationResult = {
        ...batchResult,
        recreationInfo: {
          reason,
          productsTargeted: targetProducts.length,
          existingEmbeddingsFound: existingEmbeddingsCount,
          recreated: batchResult.successful,
          failed: batchResult.failed,
          validationResults:
            validateBefore && validateAfter && validationBefore && validationAfter
              ? {
                  beforeRecreation: validationBefore,
                  afterRecreation: validationAfter,
                }
              : undefined,
        },
      };

      console.log('🎉 Recreation completed!');
      this.logRecreationSummary(recreationResult);

      return recreationResult;
    } catch (error) {
      console.error('❌ Embeddings recreation failed:', error);
      throw error;
    }
  }

  // AI Service utility methods
  private async testAIServiceConnectivity(): Promise<void> {
    try {
      console.log('🔍 Testing AI service connectivity...');

      // Test with a simple embedding generation
      const testEmbedding = await this.aiService.generateEmbedding(
        'test connectivity for recreation'
      );

      if (!Array.isArray(testEmbedding) || testEmbedding.length === 0) {
        throw new Error('AI service returned invalid embedding format');
      }

      console.log(`✅ AI service responsive (${testEmbedding.length} dimensions)`);
    } catch (error) {
      const errorMsg = `AI service connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  // Utility method to check AI service health before recreation
  async checkAIServiceHealth(): Promise<{
    responsive: boolean;
    embeddingDimensions?: number;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const testEmbedding = await this.aiService.generateEmbedding('health check test');
      const responseTime = Date.now() - startTime;

      if (Array.isArray(testEmbedding) && testEmbedding.length > 0) {
        return {
          responsive: true,
          embeddingDimensions: testEmbedding.length,
          responseTime,
        };
      } else {
        return {
          responsive: false,
          error: 'Invalid embedding response format',
        };
      }
    } catch (error) {
      return {
        responsive: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private validateInputs(options: RecreateEmbeddingsOptions): void {
    if (options.productIds) {
      if (!Array.isArray(options.productIds)) {
        throw new ValidationError('Product IDs must be an array');
      }

      if (options.productIds.length === 0) {
        throw new ValidationError('Product IDs array cannot be empty');
      }

      if (options.productIds.length > 1000) {
        throw new ValidationError('Cannot recreate more than 1000 products at once');
      }

      // Check for duplicates
      const uniqueIds = new Set(options.productIds);
      if (uniqueIds.size !== options.productIds.length) {
        throw new ValidationError('Product IDs array contains duplicates');
      }
    }

    if (options.reason && options.reason.trim().length === 0) {
      throw new ValidationError('Reason cannot be empty');
    }

    if (options.batchSize && (options.batchSize < 1 || options.batchSize > 50)) {
      throw new ValidationError('Batch size must be between 1 and 50');
    }
  }

  private async getTargetProductsInfo(productIds?: string[]) {
    let targetProducts;

    if (productIds && productIds.length > 0) {
      targetProducts = [];
      const notFound = [];

      for (const productId of productIds) {
        const product = await this.productRepository.findById(productId);
        if (product) {
          targetProducts.push(product);
        } else {
          notFound.push(productId);
        }
      }

      if (notFound.length > 0) {
        console.warn(`⚠️ Products not found: ${notFound.join(', ')}`);
      }
    } else {
      targetProducts = await this.productRepository.findAll();
    }

    // Get count of existing embeddings for target products
    let existingEmbeddingsCount = 0;
    try {
      const existingProductIds = await this.vectorRepository.getExistingProductIds();
      const existingSet = new Set(existingProductIds);

      existingEmbeddingsCount = targetProducts.filter(product =>
        existingSet.has(product.id)
      ).length;
    } catch (error) {
      console.warn('⚠️ Could not check existing embeddings count:', error);
    }

    return { targetProducts, existingEmbeddingsCount };
  }

  private getRecreationSettings(
    conservative: boolean,
    batchSize?: number,
    delayBetweenBatches?: number,
    maxRetries?: number
  ): EmbeddingInitializationOptions {
    if (conservative) {
      return {
        batchSize: batchSize || 3,
        delayBetweenBatches: delayBetweenBatches || 2500,
        maxRetries: maxRetries || 5,
      };
    } else {
      return {
        batchSize: batchSize || 5,
        delayBetweenBatches: delayBetweenBatches || 1500,
        maxRetries: maxRetries || 3,
      };
    }
  }

  private logValidationResults(
    phase: 'BEFORE' | 'AFTER',
    validation: {
      validEmbeddings: number;
      invalidEmbeddings: number;
      missingEmbeddings: number;
      issues: Array<{ productId: string; issue: string }>;
    }
  ): void {
    console.log(`📊 Validation Results ${phase} Recreation:`);
    console.log(`   ✅ Valid embeddings: ${validation.validEmbeddings}`);
    console.log(`   ❌ Invalid embeddings: ${validation.invalidEmbeddings}`);
    console.log(`   📭 Missing embeddings: ${validation.missingEmbeddings}`);

    if (validation.issues.length > 0) {
      console.log(`   🚨 Issues found: ${validation.issues.length}`);
      validation.issues.slice(0, 3).forEach((issue, index) => {
        console.log(`      ${index + 1}. ${issue.productId}: ${issue.issue}`);
      });
      if (validation.issues.length > 3) {
        console.log(`      ... and ${validation.issues.length - 3} more issues`);
      }
    }
  }

  private logRecreationSummary(result: RecreationResult): void {
    console.log('📋 Recreation Summary:');
    console.log(`   🎯 Products targeted: ${result.recreationInfo.productsTargeted}`);
    console.log(
      `   🔍 Existing embeddings found: ${result.recreationInfo.existingEmbeddingsFound}`
    );
    console.log(`   ✅ Successfully recreated: ${result.recreationInfo.recreated}`);
    console.log(`   ❌ Failed to recreate: ${result.recreationInfo.failed}`);
    console.log(`   ⏭️ Skipped: ${result.skipped}`);
    console.log(`   ⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   📊 Reason: ${result.recreationInfo.reason}`);

    if (result.recreationInfo.validationResults) {
      const { beforeRecreation, afterRecreation } = result.recreationInfo.validationResults;
      console.log(`\n📈 Validation Comparison:`);
      console.log(
        `   Valid embeddings: ${beforeRecreation.validEmbeddings} → ${afterRecreation.validEmbeddings}`
      );
      console.log(
        `   Invalid embeddings: ${beforeRecreation.invalidEmbeddings} → ${afterRecreation.invalidEmbeddings}`
      );
      console.log(
        `   Missing embeddings: ${beforeRecreation.missingEmbeddings} → ${afterRecreation.missingEmbeddings}`
      );

      const improvement = afterRecreation.validEmbeddings - beforeRecreation.validEmbeddings;
      if (improvement > 0) {
        console.log(`   📈 Improvement: +${improvement} valid embeddings`);
      } else if (improvement < 0) {
        console.log(`   📉 Regression: ${improvement} valid embeddings`);
      } else {
        console.log(`   ➡️ No change in valid embeddings count`);
      }
    }

    const successRate =
      result.recreationInfo.productsTargeted > 0
        ? (result.recreationInfo.recreated / result.recreationInfo.productsTargeted) * 100
        : 0;

    console.log(`\n📊 Recreation success rate: ${successRate.toFixed(1)}%`);

    if (successRate >= 95) {
      console.log('   🎉 Excellent recreation success rate!');
    } else if (successRate >= 80) {
      console.log('   ✅ Good recreation success rate');
    } else if (successRate >= 60) {
      console.log('   ⚠️ Moderate success rate - review any failures');
    } else {
      console.log('   🚨 Low success rate - investigate issues');
    }

    if (result.errors.length > 0) {
      console.log(`\n❌ Recreation Errors:`);
      result.errors.slice(0, 3).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.productName}: ${error.error}`);
      });
      if (result.errors.length > 3) {
        console.log(`   ... and ${result.errors.length - 3} more errors`);
      }
    }
  }

  // Utility method to recreate embeddings for products with issues
  async recreateProblematicEmbeddings(): Promise<RecreationResult> {
    console.log('🔍 Identifying problematic embeddings...');

    try {
      // Use the validation method from your InitializeProductEmbeddings
      const validation = await this.initialize.validateEmbeddings();

      // Get all products to identify which ones have issues
      const allProducts = await this.productRepository.findAll();
      const problematicIds: string[] = [];

      // Add products with missing embeddings
      const existingProductIds = await this.vectorRepository.getExistingProductIds();
      const existingSet = new Set(existingProductIds);

      allProducts.forEach(product => {
        if (!existingSet.has(product.id)) {
          problematicIds.push(product.id);
        }
      });

      // Add products with validation issues
      validation.issues.forEach(issue => {
        if (!problematicIds.includes(issue.productId)) {
          problematicIds.push(issue.productId);
        }
      });

      console.log(`🎯 Found ${problematicIds.length} products with embedding issues`);
      console.log(`   📭 Missing embeddings: ${validation.missingEmbeddings}`);
      console.log(`   ❌ Invalid embeddings: ${validation.invalidEmbeddings}`);
      console.log(`   🚨 Issues found: ${validation.issues.length}`);

      if (problematicIds.length === 0) {
        console.log('✅ No problematic embeddings found');

        // Return empty result
        return {
          totalProducts: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          errors: [],
          processedProducts: [],
          duration: 0,
          recreationInfo: {
            reason: 'No problematic embeddings found',
            productsTargeted: 0,
            existingEmbeddingsFound: 0,
            recreated: 0,
            failed: 0,
          },
        };
      }

      // Recreate problematic embeddings with conservative settings
      return await this.execute({
        productIds: problematicIds,
        reason: 'Recreating problematic embeddings (missing, invalid, or with issues)',
        validateBefore: true,
        validateAfter: true,
        conservativeSettings: true,
      });
    } catch (error) {
      console.error('❌ Failed to recreate problematic embeddings:', error);
      throw error;
    }
  }

  // Utility method to recreate all embeddings (use with extreme caution)
  async recreateAllEmbeddings(
    reason: string = 'Full recreation requested'
  ): Promise<RecreationResult> {
    console.log('⚠️ WARNING: This will recreate ALL product embeddings!');
    console.log(`📋 Reason: ${reason}`);

    // Get confirmation that this is intentional by requiring explicit reason
    if (!reason || reason.trim().length < 10) {
      throw new ValidationError(
        'A detailed reason (at least 10 characters) is required for full recreation'
      );
    }

    return await this.execute({
      productIds: undefined, // All products
      reason,
      validateBefore: true,
      validateAfter: true,
      conservativeSettings: true, // Use conservative settings for safety
    });
  }

  // Utility method to get recreation status/estimates
  async getRecreationEstimate(productIds?: string[]): Promise<{
    totalProducts: number;
    productsToRecreate: number;
    existingEmbeddings: number;
    estimatedDurationMinutes: number;
    recommendation: string;
  }> {
    try {
      const { targetProducts, existingEmbeddingsCount } =
        await this.getTargetProductsInfo(productIds);

      // Conservative estimate: 3 seconds per product
      const estimatedDurationMinutes = Math.ceil((targetProducts.length * 3) / 60);

      let recommendation = '';
      if (targetProducts.length === 0) {
        recommendation = 'No products found to recreate';
      } else if (existingEmbeddingsCount === 0) {
        recommendation = 'No existing embeddings found - consider using initialization instead';
      } else if (existingEmbeddingsCount === targetProducts.length) {
        recommendation = 'All products have embeddings - recreation will overwrite existing data';
      } else {
        recommendation = `${existingEmbeddingsCount} products have existing embeddings that will be overwritten`;
      }

      return {
        totalProducts: targetProducts.length,
        productsToRecreate: targetProducts.length,
        existingEmbeddings: existingEmbeddingsCount,
        estimatedDurationMinutes,
        recommendation,
      };
    } catch (error) {
      console.error('❌ Failed to get recreation estimate:', error);
      throw error;
    }
  }
}
