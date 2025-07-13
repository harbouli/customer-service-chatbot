// src/application/use-cases/InitializeProductEmbeddings.ts
import { Product } from "@domain/entities/product";
import { ProductEmbedding } from "@domain/entities/product-embedding";
import { IProductRepository } from "@domain/repositories/IProductRepository";
import { IVectorRepository } from "@domain/repositories/IVectorRepository";
import { IGenerativeAIService } from "@domain/services/chatbot-service";
import { v4 as uuidv4 } from "uuid";

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

  // Default options
  private readonly defaultOptions: Required<EmbeddingInitializationOptions> = {
    batchSize: 10,
    delayBetweenBatches: 1000, // 1 second
    maxRetries: 3,
    skipExisting: true,
    forceRegenerate: false,
  };

  constructor(dependencies: InitializeProductEmbeddingsDependencies);
  constructor(
    productRepository: IProductRepository,
    vectorRepository: IVectorRepository,
    aiService: IGenerativeAIService
  );
  constructor(
    productRepositoryOrDeps:
      | IProductRepository
      | InitializeProductEmbeddingsDependencies,
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

  private isDependenciesObject(
    obj: any
  ): obj is InitializeProductEmbeddingsDependencies {
    return obj && typeof obj === "object" && "productRepository" in obj;
  }

  /**
   * Initialize embeddings for all products
   */
  async execute(
    options: EmbeddingInitializationOptions = {}
  ): Promise<EmbeddingInitializationResult> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    console.log("🚀 Starting product embeddings initialization...");
    console.log(`📊 Configuration:`, {
      batchSize: mergedOptions.batchSize,
      delayBetweenBatches: mergedOptions.delayBetweenBatches,
      maxRetries: mergedOptions.maxRetries,
      skipExisting: mergedOptions.skipExisting,
      forceRegenerate: mergedOptions.forceRegenerate,
    });

    try {
      // Initialize vector repository if needed
      await this.vectorRepository.initialize();
      console.log("✅ Vector repository initialized");

      // Get all products
      const products = await this.productRepository.findAll();
      console.log(`📦 Found ${products.length} products to process`);

      if (products.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // Filter products if skipExisting is enabled
      const productsToProcess = mergedOptions.forceRegenerate
        ? products
        : await this.filterProductsToProcess(
            products,
            mergedOptions.skipExisting
          );

      console.log(`🔄 Processing ${productsToProcess.length} products`);

      // Process products in batches
      const result = await this.procesProductsInBatches(
        productsToProcess,
        mergedOptions
      );

      const duration = Date.now() - startTime;
      const finalResult = {
        ...result,
        totalProducts: products.length,
        duration,
      };

      this.logResults(finalResult);
      return finalResult;
    } catch (error) {
      console.error("❌ Failed to initialize product embeddings:", error);
      throw new Error(
        `Embedding initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

    console.log(
      `🎯 Initializing embeddings for ${productIds.length} specific products...`
    );

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
        mergedOptions
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
      console.error(
        "❌ Failed to initialize embeddings for specific products:",
        error
      );
      throw new Error(
        `Specific embedding initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
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

    console.log("🔄 Starting incremental embedding initialization...");
    return await this.execute(mergedOptions);
  }

  private async filterProductsToProcess(
    products: Product[],
    skipExisting: boolean
  ): Promise<Product[]> {
    if (!skipExisting) {
      return products;
    }

    // For now, we'll assume all products need processing
    // In a real implementation, you would check which products already have embeddings
    console.log("📋 Checking existing embeddings...");

    // TODO: Implement logic to check existing embeddings in vector repository
    // This would require extending the IVectorRepository interface

    return products;
  }

  private async procesProductsInBatches(
    products: Product[],
    options: Required<EmbeddingInitializationOptions>
  ): Promise<
    Omit<EmbeddingInitializationResult, "totalProducts" | "duration">
  > {
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

      console.log(
        `🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`
      );

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map((product) =>
          this.processProductEmbedding(product, options.maxRetries)
        )
      );

      // Analyze batch results
      batchResults.forEach((result, index) => {
        const product = batch[index];

        if (result.status === "fulfilled") {
          if (result.value.success) {
            successful++;
            processedProducts.push({
              productId: product.id,
              productName: product.name,
              embeddingDimensions: result.value.dimensions,
            });
            console.log(`  ✅ ${product.name}`);
          } else {
            skipped++;
            console.log(`  ⏭️ ${product.name} (skipped)`);
          }
        } else {
          failed++;
          const errorMessage =
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error";
          errors.push({
            productId: product.id,
            productName: product.name,
            error: errorMessage,
          });
          console.log(`  ❌ ${product.name}: ${errorMessage}`);
        }
      });

      // Delay between batches (except for the last batch)
      if (
        i + options.batchSize < products.length &&
        options.delayBetweenBatches > 0
      ) {
        console.log(
          `⏳ Waiting ${options.delayBetweenBatches}ms before next batch...`
        );
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

  private async processProductEmbedding(
    product: Product,
    maxRetries: number
  ): Promise<{ success: boolean; dimensions: number }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generate embedding from product's searchable content
        const searchableText = this.prepareSearchableText(product);
        const embedding = await this.aiService.generateEmbedding(
          searchableText
        );

        // Validate embedding
        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error("Invalid embedding generated");
        }

        // Create product embedding entity
        const productEmbedding = new ProductEmbedding(
          uuidv4(),
          product.id,
          embedding,
          this.createEmbeddingMetadata(product)
        );

        // Store in vector repository
        await this.vectorRepository.storeProductEmbedding(productEmbedding);

        return { success: true, dimensions: embedding.length };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (attempt < maxRetries) {
          console.log(
            `    🔄 Retry ${attempt}/${maxRetries} for ${product.name}: ${lastError.message}`
          );
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw (
      lastError || new Error("Failed to process embedding after all retries")
    );
  }

  private prepareSearchableText(product: Product): string {
    // Create comprehensive searchable text from product data
    const parts = [
      product.name,
      product.description,
      product.category,
      ...product.features,
      ...product.tags,
      // Include specifications as text
      ...Object.entries(product.specifications).map(
        ([key, value]) => `${key}: ${value}`
      ),
    ];

    return parts
      .filter((part) => part && typeof part === "string")
      .join(" ")
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    console.log("\n📊 Embedding Initialization Results:");
    console.log(`   Total Products: ${result.totalProducts}`);
    console.log(`   ✅ Successful: ${result.successful}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    console.log(`   ⏭️ Skipped: ${result.skipped}`);
    console.log(`   ⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.errors.length > 0) {
      console.log("\n❌ Errors:");
      result.errors.forEach((error) => {
        console.log(
          `   • ${error.productName} (${error.productId}): ${error.error}`
        );
      });
    }

    if (result.processedProducts.length > 0) {
      console.log("\n✅ Successfully Processed:");
      result.processedProducts.forEach((product) => {
        console.log(
          `   • ${product.productName} (${product.embeddingDimensions}D)`
        );
      });
    }

    const successRate =
      result.totalProducts > 0
        ? ((result.successful / result.totalProducts) * 100).toFixed(1)
        : "0";

    console.log(`\n🎯 Success Rate: ${successRate}%`);
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

      // TODO: Implement logic to check which products have embeddings
      // This would require extending the IVectorRepository interface

      return {
        totalProducts: products.length,
        withEmbeddings: 0, // Placeholder
        withoutEmbeddings: products.length, // Placeholder
        lastInitialized: undefined,
      };
    } catch (error) {
      console.error("Failed to get initialization status:", error);
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
    // TODO: Implement embedding validation logic
    // This would check for corrupted, missing, or invalid embeddings

    return {
      validEmbeddings: 0,
      invalidEmbeddings: 0,
      missingEmbeddings: 0,
      issues: [],
    };
  }
}
