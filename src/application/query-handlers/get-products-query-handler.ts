import { IProductRepository } from '../../domain/repositories/IProductRepository';

import { ProductDto, ProductSearchDto } from '../dtos/product-dto';
import { ProductMapper } from '../mappers/product-mapper';

export interface GetProductsQuery {
  search?: ProductSearchDto;
  includeOutOfStock?: boolean;
}

export class GetProductsQueryHandler {
  constructor(private productRepository: IProductRepository) {}

  async handle(query: GetProductsQuery): Promise<ProductDto[]> {
    let products = await this.productRepository.findAll();

    // Apply filters
    if (query.search?.category) {
      products = products.filter(p => p.category === query.search!.category);
    }

    if (query.search?.minPrice !== undefined) {
      products = products.filter(p => p.price >= query.search!.minPrice!);
    }

    if (query.search?.maxPrice !== undefined) {
      products = products.filter(p => p.price <= query.search!.maxPrice!);
    }

    if (query.includeOutOfStock === false) {
      products = products.filter(p => p.inStock);
    }

    if (query.search?.tags && query.search.tags.length > 0) {
      products = products.filter(p => query.search!.tags!.some(tag => p.tags.includes(tag)));
    }

    // Apply pagination
    if (query.search?.offset !== undefined) {
      products = products.slice(query.search.offset);
    }

    if (query.search?.limit !== undefined) {
      products = products.slice(0, query.search.limit);
    }

    return products.map(ProductMapper.toDto);
  }
}
