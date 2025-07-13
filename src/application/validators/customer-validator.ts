import { ValidationError } from "@shared/errors/custom-error";

import { CreateCustomerDto, UpdateCustomerDto } from "../dtos/customer-dto";

export class CustomerValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PHONE_REGEX = /^\+?[\d\s\-\(\)]+$/;

  static validateCreateCustomer(dto: CreateCustomerDto): void {
    if (!dto.name || dto.name.trim() === "") {
      throw new ValidationError("Customer name is required");
    }

    if (dto.name.length > 100) {
      throw new ValidationError("Customer name cannot exceed 100 characters");
    }

    if (!dto.email || dto.email.trim() === "") {
      throw new ValidationError("Customer email is required");
    }

    if (!this.EMAIL_REGEX.test(dto.email)) {
      throw new ValidationError("Invalid email format");
    }

    if (dto.phone && !this.PHONE_REGEX.test(dto.phone)) {
      throw new ValidationError("Invalid phone number format");
    }
  }

  static validateUpdateCustomer(dto: UpdateCustomerDto): void {
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim() === "") {
        throw new ValidationError("Customer name cannot be empty");
      }
      if (dto.name.length > 100) {
        throw new ValidationError("Customer name cannot exceed 100 characters");
      }
    }

    if (dto.email !== undefined) {
      if (!dto.email || dto.email.trim() === "") {
        throw new ValidationError("Customer email cannot be empty");
      }
      if (!this.EMAIL_REGEX.test(dto.email)) {
        throw new ValidationError("Invalid email format");
      }
    }

    if (
      dto.phone !== undefined &&
      dto.phone &&
      !this.PHONE_REGEX.test(dto.phone)
    ) {
      throw new ValidationError("Invalid phone number format");
    }
  }
}
