import { ProductEmbedding } from "@domain/entities/product-embedding";
import { IProductRepository } from "@domain/repositories/IProductRepository";
import { IVectorRepository } from "@domain/repositories/IVectorRepository";
import { IGenerativeAIService } from "@domain/services/chatbot-service";
import { v4 as uuidv4 } from "uuid";

import { CreateProductDto, ProductDto } from "../dtos/product-dto";
import { ProductMapper } from "../mappers/product-mapper";


export class CreateProduct {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private aiService: IGenerativeAIService
  ) {}

  async execute(dto: CreateProductDto): Promise<ProductDto> {
    const id = uuidv4();
    const product = ProductMapper.toDomain(dto, id);

    await this.productRepository.save(product);

    // Generate and store embeddings
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
    } catch (error) {
      console.error("Failed to create product embedding:", error);
      // Continue without embeddings - they can be generated later
    }

    return ProductMapper.toDto(product);
  }
}
