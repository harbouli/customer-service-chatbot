import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { NotFoundError } from '../../shared/errors/custom-error';

export class DeleteProduct {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository
  ) {}

  async execute(productId: string): Promise<void> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Delete from vector database
    try {
      await this.vectorRepository.deleteProductEmbedding(productId);
    } catch (error) {
      console.error('Failed to delete product embedding:', error);
    }

    // TODO: Implement delete in IProductRepository
    // await this.productRepository.delete(productId);

    console.log(`Product ${productId} marked for deletion`);
  }
}
