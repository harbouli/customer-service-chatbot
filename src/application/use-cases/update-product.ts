import { IProductRepository } from '@domain/repositories/IProductRepository';
import { IVectorRepository } from '@domain/repositories/IVectorRepository';
import { IGenerativeAIService } from '@domain/services/chatbot-service';
import { NotFoundError } from '@shared/errors/custom-error';

import { ProductDto, UpdateProductDto } from '../dtos/product-dto';
import { ProductMapper } from '../mappers/product-mapper';

export class UpdateProduct {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private aiService: IGenerativeAIService
  ) {}

  async execute(productId: string, dto: UpdateProductDto): Promise<ProductDto> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updatedProduct = ProductMapper.updateDomain(product, dto);
    await this.productRepository.save(updatedProduct);

    // Update embeddings if content changed
    try {
      const embedding = await this.aiService.generateEmbedding(updatedProduct.searchableContent);
      await this.vectorRepository.updateProductEmbedding(productId, embedding);
    } catch (error) {
      console.error('Failed to update product embedding:', error);
    }

    return ProductMapper.toDto(updatedProduct);
  }
}
