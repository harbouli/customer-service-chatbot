import { Product } from "@domain/entities/product";

import {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
} from "../dtos/product-dto";

export class ProductMapper {
  static toDto(product: Product): ProductDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      inStock: product.inStock,
      features: product.features,
      specifications: product.specifications,
      tags: product.tags,
    };
  }

  static toDomain(dto: CreateProductDto, id: string): Product {
    return new Product(
      id,
      dto.name,
      dto.description,
      dto.category,
      dto.price,
      dto.inStock,
      dto.features || [],
      dto.specifications || {},
      dto.tags || []
    );
  }

  static updateDomain(product: Product, dto: UpdateProductDto): Product {
    return new Product(
      product.id,
      dto.name ?? product.name,
      dto.description ?? product.description,
      dto.category ?? product.category,
      dto.price ?? product.price,
      dto.inStock ?? product.inStock,
      dto.features ?? product.features,
      dto.specifications ?? product.specifications,
      dto.tags ?? product.tags
    );
  }
}
