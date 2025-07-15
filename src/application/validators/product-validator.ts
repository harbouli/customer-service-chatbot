import { ValidationError } from '../../shared/errors/custom-error';

import { CreateProductDto, UpdateProductDto } from '../dtos/product-dto';

export class ProductValidator {
  static validateCreateProduct(dto: CreateProductDto): void {
    if (!dto.name || dto.name.trim() === '') {
      throw new ValidationError('Product name is required');
    }

    if (dto.name.length > 200) {
      throw new ValidationError('Product name cannot exceed 200 characters');
    }

    if (!dto.description || dto.description.trim() === '') {
      throw new ValidationError('Product description is required');
    }

    if (dto.description.length > 1000) {
      throw new ValidationError('Product description cannot exceed 1000 characters');
    }

    if (!dto.category || dto.category.trim() === '') {
      throw new ValidationError('Product category is required');
    }

    if (dto.price < 0) {
      throw new ValidationError('Product price cannot be negative');
    }

    if (dto.price > 1000000) {
      throw new ValidationError('Product price cannot exceed 1,000,000');
    }

    if (dto.features && dto.features.length > 50) {
      throw new ValidationError('Product cannot have more than 50 features');
    }

    if (dto.tags && dto.tags.length > 20) {
      throw new ValidationError('Product cannot have more than 20 tags');
    }
  }

  static validateUpdateProduct(dto: UpdateProductDto): void {
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim() === '') {
        throw new ValidationError('Product name cannot be empty');
      }
      if (dto.name.length > 200) {
        throw new ValidationError('Product name cannot exceed 200 characters');
      }
    }

    if (dto.description !== undefined) {
      if (!dto.description || dto.description.trim() === '') {
        throw new ValidationError('Product description cannot be empty');
      }
      if (dto.description.length > 1000) {
        throw new ValidationError('Product description cannot exceed 1000 characters');
      }
    }

    if (dto.category !== undefined && (!dto.category || dto.category.trim() === '')) {
      throw new ValidationError('Product category cannot be empty');
    }

    if (dto.price !== undefined) {
      if (dto.price < 0) {
        throw new ValidationError('Product price cannot be negative');
      }
      if (dto.price > 1000000) {
        throw new ValidationError('Product price cannot exceed 1,000,000');
      }
    }

    if (dto.features && dto.features.length > 50) {
      throw new ValidationError('Product cannot have more than 50 features');
    }

    if (dto.tags && dto.tags.length > 20) {
      throw new ValidationError('Product cannot have more than 20 tags');
    }
  }
}
