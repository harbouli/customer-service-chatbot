import { Product } from "@domain/entities/product";
import { ProductEmbedding } from "@domain/entities/product-embedding";
import { IVectorRepository } from "@domain/repositories/IVectorRepository";
import weaviate, { WeaviateClient } from "weaviate-ts-client";

export class WeaviateVectorRepository implements IVectorRepository {
  private client: WeaviateClient;
  private className = "Product";
  private isInitialized = false;

  constructor(
    private weaviateUrl: string = "http://localhost:8080",
    private apiKey?: string
  ) {
    const config: any = {
      scheme: weaviateUrl.includes("https") ? "https" : "http",
      host: weaviateUrl.replace("http://", "").replace("https://", ""),
    };

    if (apiKey) {
      config.apiKey = new weaviate.ApiKey(apiKey);
    }

    this.client = weaviate.client(config);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("🔄 Initializing Weaviate connection...");

      // Test connection
      await this.testConnection();

      // Check if schema exists
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some(
        (cls) => cls.class === this.className
      );

      if (!classExists) {
        console.log("📋 Creating Weaviate schema...");
        await this.createSchema();
      }

      this.isInitialized = true;
      console.log("✅ Weaviate initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Weaviate:", error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      await this.client.misc.liveChecker().do();
    } catch (error) {
      throw new Error(
        `Failed to connect to Weaviate at ${this.weaviateUrl}: ${error}`
      );
    }
  }

  private async createSchema(): Promise<void> {
    const classObj = {
      class: this.className,
      description:
        "Product information with vector embeddings for semantic search",
      vectorizer: "none", // We provide our own vectors
      properties: [
        {
          name: "productId",
          dataType: ["string"],
          description: "Unique product identifier",
          indexInverted: true,
        },
        {
          name: "name",
          dataType: ["string"],
          description: "Product name",
          indexInverted: true,
        },
        {
          name: "description",
          dataType: ["text"],
          description: "Product description",
          indexInverted: true,
        },
        {
          name: "category",
          dataType: ["string"],
          description: "Product category",
          indexInverted: true,
        },
        {
          name: "price",
          dataType: ["number"],
          description: "Product price in USD",
        },
        {
          name: "inStock",
          dataType: ["boolean"],
          description: "Product availability",
        },
        {
          name: "features",
          dataType: ["string[]"],
          description: "Product features list",
        },
        {
          name: "tags",
          dataType: ["string[]"],
          description: "Product tags for categorization",
        },
        {
          name: "specifications",
          dataType: ["object"],
          description: "Product technical specifications",
        },
        {
          name: "createdAt",
          dataType: ["string"],
          description: "Embedding creation timestamp",
        },
      ],
    };

    try {
      await this.client.schema.classCreator().withClass(classObj).do();
      console.log(`✅ Created Weaviate class: ${this.className}`);
    } catch (error) {
      console.error("❌ Failed to create Weaviate schema:", error);
      throw error;
    }
  }

  async storeProductEmbedding(embedding: ProductEmbedding): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.data
        .creator()
        .withClassName(this.className)
        .withId(embedding.id)
        .withVector(embedding.embedding)
        .withProperties(embedding.metadata)
        .do();
    } catch (error) {
      console.error(
        `❌ Failed to store embedding for product ${embedding.productId}:`,
        error
      );
      throw error;
    }
  }

  async searchSimilarProducts(
    queryEmbedding: number[],
    limit: number = 5
  ): Promise<Product[]> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields(
          "productId name description category price inStock features tags specifications"
        )
        .withNearVector({
          vector: queryEmbedding,
          certainty: 0.6, // Minimum similarity threshold
        })
        .withLimit(limit)
        .do();

      const data = result.data?.Get?.[this.className] || [];

      return data.map(
        (item: any) =>
          new Product(
            item.productId,
            item.name,
            item.description,
            item.category,
            item.price,
            item.inStock,
            item.features || [],
            item.specifications || {},
            item.tags || []
          )
      );
    } catch (error) {
      console.error("❌ Failed to search similar products:", error);
      return [];
    }
  }

  async updateProductEmbedding(
    productId: string,
    embedding: number[]
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Find the object by productId
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields("productId")
        .withWhere({
          path: ["productId"],
          operator: "Equal",
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
    } catch (error) {
      console.error(
        `❌ Failed to update embedding for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  async deleteProductEmbedding(productId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.data
        .deleter()
        .withClassName(this.className)
        .withWhere({
          path: ["productId"],
          operator: "Equal",
          valueString: productId,
        })
        .do();
    } catch (error) {
      console.error(
        `❌ Failed to delete embedding for product ${productId}:`,
        error
      );
      throw error;
    }
  }

  async getEmbeddingCount(): Promise<number> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .aggregate()
        .withClassName(this.className)
        .withFields("meta { count }")
        .do();

      return result.data?.Aggregate?.[this.className]?.[0]?.meta?.count || 0;
    } catch (error) {
      console.error("❌ Failed to get embedding count:", error);
      return 0;
    }
  }

  async findEmbeddingByProductId(
    productId: string
  ): Promise<ProductEmbedding | null> {
    await this.ensureInitialized();

    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields("productId")
        .withWhere({
          path: ["productId"],
          operator: "Equal",
          valueString: productId,
        })
        .withLimit(1)
        .do();

      const objects = result.data?.Get?.[this.className] || [];

      if (objects.length === 0) {
        return null;
      }

      // Note: This is a simplified return - in practice you'd need to fetch the full embedding
      return new ProductEmbedding(
        objects[0]._additional?.id || "",
        productId,
        [], // Vector not included in this query
        objects[0]
      );
    } catch (error) {
      console.error(
        `❌ Failed to find embedding for product ${productId}:`,
        error
      );
      return null;
    }
  }

  async clearAllEmbeddings(): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.client.schema
        .classDeleter()
        .withClassName(this.className)
        .do();
      await this.createSchema();
      console.log("🗑️ Cleared all embeddings");
    } catch (error) {
      console.error("❌ Failed to clear embeddings:", error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean;
    schemaExists: boolean;
    embeddingCount: number;
  }> {
    try {
      await this.testConnection();
      const connected = true;

      const schema = await this.client.schema.getter().do();
      const schemaExists =
        schema.classes?.some((cls) => cls.class === this.className) || false;

      const embeddingCount = await this.getEmbeddingCount();

      return { connected, schemaExists, embeddingCount };
    } catch (error) {
      return { connected: false, schemaExists: false, embeddingCount: 0 };
    }
  }
}
