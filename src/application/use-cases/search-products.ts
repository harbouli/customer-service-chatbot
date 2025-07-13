import { IProductRepository } from "@domain/repositories/IProductRepository";
import { IChatbotService } from "@domain/services/chatbot-service";

import { ProductSearchDto, ProductDto } from "../dtos/product-dto";
import { ProductMapper } from "../mappers/product-mapper";

export class SearchProducts {
  constructor(
    private productRepository: IProductRepository,
    private chatbotService: IChatbotService
  ) {}

  async execute(searchDto: ProductSearchDto): Promise<ProductDto[]> {
    let products;

    if (searchDto.query) {
      // Use semantic search if query is provided
      products = await this.chatbotService.findSimilarProducts(
        searchDto.query,
        searchDto.limit || 10
      );
    } else if (searchDto.category) {
      // Search by category
      products = await this.productRepository.findByCategory(
        searchDto.category
      );
    } else {
      // Get all products
      products = await this.productRepository.findAll();
    }

    // Apply filters
    let filteredProducts = products;

    if (searchDto.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(
        (p) => p.price >= searchDto.minPrice!
      );
    }

    if (searchDto.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(
        (p) => p.price <= searchDto.maxPrice!
      );
    }

    if (searchDto.inStock !== undefined) {
      filteredProducts = filteredProducts.filter(
        (p) => p.inStock === searchDto.inStock
      );
    }

    if (searchDto.tags && searchDto.tags.length > 0) {
      filteredProducts = filteredProducts.filter((p) =>
        searchDto.tags!.some((tag) => p.tags.includes(tag))
      );
    }

    // Apply pagination
    if (searchDto.offset !== undefined) {
      filteredProducts = filteredProducts.slice(searchDto.offset);
    }

    if (searchDto.limit !== undefined) {
      filteredProducts = filteredProducts.slice(0, searchDto.limit);
    }

    return filteredProducts.map(ProductMapper.toDto);
  }
}
