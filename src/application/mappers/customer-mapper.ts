import { Customer } from '@domain/entities/customer';

import { CreateCustomerDto, CustomerDto, UpdateCustomerDto } from '../dtos/customer-dto';

export class CustomerMapper {
  static toDto(customer: Customer): CustomerDto {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? '',
    };
  }

  static toDomain(dto: CreateCustomerDto, id: string): Customer {
    return new Customer(id, dto.name, dto.email, dto.phone);
  }

  static updateDomain(customer: Customer, dto: UpdateCustomerDto): Customer {
    return new Customer(
      customer.id,
      dto.name ?? customer.name,
      dto.email ?? customer.email,
      dto.phone ?? customer.phone
    );
  }
}
