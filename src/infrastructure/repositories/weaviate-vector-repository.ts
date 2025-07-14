/* eslint-disable @typescript-eslint/no-unused-vars */

import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { Product } from '../../domain/entities/product';
import { ProductEmbedding } from '../../domain/entities/product-embedding';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';

export class WeaviateVectorRepository implements IVectorRepository {
  private client: WeaviateClient;
  private className = 'Product';
  private isInitialized = false;
  private expectedDimensions = 768;

  constructor(
    private weaviateUrl: string = 'http://localhost:8080',
    apiKey?: string
  ) {
    const config: any = {
      scheme: weaviateUrl.includes('https') ? 'https' : 'http',
      host: weaviateUrl.replace('http://', '').replace('https://', ''),
    };

    if (apiKey) {
      config.apiKey = new weaviate.ApiKey(apiKey);
    }

    this.client = weaviate.client(config);
  }

  // Existing initialize method
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Initializing Weaviate connection...');
      await this.testConnection();

      const schema = await this.client.schema.getter().do();
      const existingClass = schema.classes?.find(cls => cls.class === this.className);

      if (existingClass) {
        console.log('📋 Existing Product class found');

        try {
          const result = await this.client.graphql
            .get()
            .withClassName(this.className)
            .withFields('_additional { vector }')
            .withLimit(1)
            .do();

          const objects = result.data?.Get?.[this.className] || [];
          if (objects.length > 0 && objects[0]._additional?.vector) {
            const existingDimensions = objects[0]._additional.vector.length;

            if (existingDimensions !== this.expectedDimensions) {
              console.warn(
                `⚠️ Dimension mismatch detected: existing=${existingDimensions}, expected=${this.expectedDimensions}`
              );
              console.log('🗑️ Recreating schema with correct dimensions...');

              await this.client.schema.classDeleter().withClassName(this.className).do();
              await new Promise(resolve => setTimeout(resolve, 2000));
              await this.createSchema();
            }
          }
        } catch (error) {
          console.log('ℹ️ Could not check existing dimensions, schema might be empty');
        }
      } else {
        console.log('📋 Creating new Weaviate schema...');
        await this.createSchema();
      }

      this.isInitialized = true;
      console.log('✅ Weaviate initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Weaviate:', error);
      throw error;
    }
  }

  // NEW: Check if a product embedding exists
  async hasProductEmbedding(productId: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('productId')
        .withWhere({
          path: ['productId'],
          operator: 'Equal',
          valueString: productId,
        })
        .withLimit(1)
        .do();

      const objects = result.data?.Get?.[this.className] || [];
      return objects.length > 0;
    } catch (error) {
      console.error(`❌ Failed to check embedding existence for product ${productId}:`, error);
      return false; // Assume doesn't exist if we can't check
    }
  }

  // NEW: Get all product IDs that have embeddings
  async getExistingProductIds(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('productId')
        .withLimit(10000) // Adjust based on your expected product count
        .do();

      const objects = result.data?.Get?.[this.className] || [];
      return objects.map((obj: any) => obj.productId).filter(Boolean);
    } catch (error) {
      console.error('❌ Failed to get existing product IDs:', error);
      return [];
    }
  }

  // NEW: Get detailed embedding info
  async getEmbeddingInfo(productId: string): Promise<{
    exists: boolean;
    dimensions?: number;
    createdAt?: string;
  }> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('productId createdAt _additional { vector }')
        .withWhere({
          path: ['productId'],
          operator: 'Equal',
          valueString: productId,
        })
        .withLimit(1)
        .do();

      const objects = result.data?.Get?.[this.className] || [];

      if (objects.length === 0) {
        return { exists: false };
      }

      const obj = objects[0];
      return {
        exists: true,
        dimensions: obj._additional?.vector?.length,
        createdAt: obj.createdAt,
      };
    } catch (error) {
      console.error(`❌ Failed to get embedding info for product ${productId}:`, error);
      return { exists: false };
    }
  }

  // UPDATED: Store with overwrite protection
  async storeProductEmbedding(
    embedding: ProductEmbedding,
    allowOverwrite: boolean = false
  ): Promise<void> {
    await this.ensureInitialized();

    // Check if embedding already exists (unless overwrite is allowed)
    if (!allowOverwrite) {
      const exists = await this.hasProductEmbedding(embedding.productId);
      if (exists) {
        throw new Error(
          `Product embedding already exists for product ${embedding.productId}. ` +
            `Use allowOverwrite=true or forceRegenerate option to update.`
        );
      }
    }

    // Validate embedding dimensions
    if (embedding.embedding.length !== this.expectedDimensions) {
      throw new Error(
        `Embedding dimension mismatch: got ${embedding.embedding.length}, expected ${this.expectedDimensions}`
      );
    }

    try {
      // If overwrite is allowed and product exists, update instead of create
      if (allowOverwrite) {
        const exists = await this.hasProductEmbedding(embedding.productId);
        if (exists) {
          console.log(`🔄 Updating existing embedding for product ${embedding.productId}`);
          await this.updateProductEmbedding(embedding.productId, embedding.embedding);
          return;
        }
      }

      // Convert specifications object to JSON string for storage
      const metadata = {
        ...embedding.metadata,
        specifications: embedding.metadata.specifications
          ? JSON.stringify(embedding.metadata.specifications)
          : '',
        createdAt: new Date().toISOString(),
      };

      await this.client.data
        .creator()
        .withClassName(this.className)
        .withId(embedding.id)
        .withVector(embedding.embedding)
        .withProperties(metadata)
        .do();

      console.log(`✅ Stored new embedding for product ${embedding.productId}`);
    } catch (error) {
      console.error(`❌ Failed to store embedding for product ${embedding.productId}:`, error);
      throw error;
    }
  }

  // Existing methods remain the same...
  async searchSimilarProducts(queryEmbedding: number[], limit: number = 5): Promise<Product[]> {
    await this.ensureInitialized();

    if (queryEmbedding.length !== this.expectedDimensions) {
      throw new Error(
        `Query embedding dimension mismatch: got ${queryEmbedding.length}, expected ${this.expectedDimensions}`
      );
    }

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields(
          'productId name description category price inStock features tags specifications'
        )
        .withNearVector({
          vector: queryEmbedding,
          certainty: 0.6,
        })
        .withLimit(limit)
        .do();

      const data = result.data?.Get?.[this.className] || [];

      return data.map((item: any) => {
        let specifications = {};
        if (item.specifications) {
          try {
            specifications = JSON.parse(item.specifications);
          } catch (error) {
            console.warn('Failed to parse specifications JSON:', error);
            specifications = {};
          }
        }

        return new Product(
          item.productId,
          item.name,
          item.description,
          item.category,
          item.price,
          item.inStock,
          item.features || [],
          specifications,
          item.tags || []
        );
      });
    } catch (error) {
      console.error('❌ Failed to search similar products:', error);
      return [];
    }
  }

  async updateProductEmbedding(productId: string, embedding: number[]): Promise<void> {
    await this.ensureInitialized();

    if (embedding.length !== this.expectedDimensions) {
      throw new Error(
        `Embedding dimension mismatch: got ${embedding.length}, expected ${this.expectedDimensions}`
      );
    }

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('_additional { id }')
        .withWhere({
          path: ['productId'],
          operator: 'Equal',
          valueString: productId,
        })
        .withLimit(1)
        .do();

      const objects = result.data?.Get?.[this.className] || [];

      if (objects.length === 0) {
        throw new Error(`No embedding found for product ${productId}`);
      }

      const objectId = objects[0]._additional?.id;
      if (!objectId) {
        throw new Error(`Could not get object ID for product ${productId}`);
      }

      await this.client.data
        .updater()
        .withClassName(this.className)
        .withId(objectId)
        .withVector(embedding)
        .do();

      console.log(`✅ Updated embedding for product ${productId}`);
    } catch (error) {
      console.error(`❌ Failed to update embedding for product ${productId}:`, error);
      throw error;
    }
  }

  async deleteProductEmbedding(productId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('_additional { id }')
        .withWhere({
          path: ['productId'],
          operator: 'Equal',
          valueString: productId,
        })
        .withLimit(1)
        .do();

      const objects = result.data?.Get?.[this.className] || [];

      if (objects.length === 0) {
        console.warn(`⚠️ No embedding found for product ${productId} to delete`);
        return;
      }

      const objectId = objects[0]._additional?.id;
      if (!objectId) {
        throw new Error(`Could not get object ID for product ${productId}`);
      }

      await this.client.data.deleter().withClassName(this.className).withId(objectId).do();

      console.log(`✅ Deleted embedding for product ${productId}`);
    } catch (error) {
      console.error(`❌ Failed to delete embedding for product ${productId}:`, error);
      throw error;
    }
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private async testConnection(): Promise<void> {
    try {
      await this.client.misc.liveChecker().do();
    } catch (error) {
      throw new Error(`Failed to connect to Weaviate at ${this.weaviateUrl}: ${error}`);
    }
  }

  private async createSchema(): Promise<void> {
    const classObj = {
      class: this.className,
      description: 'Product information with vector embeddings for semantic search',
      vectorizer: 'none',
      vectorIndexConfig: {
        distance: 'cosine',
        dimensions: this.expectedDimensions,
      },
      properties: [
        {
          name: 'productId',
          dataType: ['string'],
          description: 'Unique product identifier',
          indexInverted: true,
        },
        {
          name: 'name',
          dataType: ['string'],
          description: 'Product name',
          indexInverted: true,
        },
        {
          name: 'description',
          dataType: ['text'],
          description: 'Product description',
          indexInverted: true,
        },
        {
          name: 'category',
          dataType: ['string'],
          description: 'Product category',
          indexInverted: true,
        },
        {
          name: 'price',
          dataType: ['number'],
          description: 'Product price in USD',
        },
        {
          name: 'inStock',
          dataType: ['boolean'],
          description: 'Product availability',
        },
        {
          name: 'features',
          dataType: ['string[]'],
          description: 'Product features list',
        },
        {
          name: 'tags',
          dataType: ['string[]'],
          description: 'Product tags for categorization',
        },
        {
          name: 'specifications',
          dataType: ['text'],
          description: 'Product technical specifications as JSON string',
        },
        {
          name: 'createdAt',
          dataType: ['string'],
          description: 'Embedding creation timestamp',
        },
      ],
    };

    try {
      await this.client.schema.classCreator().withClass(classObj).do();
      console.log(
        `✅ Created Weaviate class: ${this.className} with ${this.expectedDimensions} dimensions`
      );
    } catch (error) {
      console.error('❌ Failed to create Weaviate schema:', error);
      throw error;
    }
  }
}
