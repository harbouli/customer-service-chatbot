import { Customer } from '@domain/entities/customer';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';

import { CustomerDto } from '../../dtos/customer-dto';
import { CustomerMapper } from '../../mappers/customer-mapper';

export interface GetAllCustomersFilters {
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GetAllCustomersResult {
  customers: CustomerDto[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class GetAllCustomers {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(filters: GetAllCustomersFilters = {}): Promise<GetAllCustomersResult> {
    const { limit = 20, offset = 0 } = filters;
    const page = Math.floor(offset / limit) + 1;

    // Get customers with filters (if repository supports it)
    let customers: Customer[] = [];
    let total = 0;

    if (typeof (this.customerRepository as any).findAll === 'function') {
      if (filters.search && typeof (this.customerRepository as any).search === 'function') {
        customers = await (this.customerRepository as any).search(filters.search);
      } else if (
        filters.isActive !== undefined &&
        typeof (this.customerRepository as any).findActiveCustomers === 'function'
      ) {
        customers = filters.isActive
          ? await (this.customerRepository as any).findActiveCustomers()
          : await (this.customerRepository as any).findAll();
      } else {
        customers = await (this.customerRepository as any).findAll();
      }

      // Apply pagination
      total = customers.length;
      customers = customers.slice(offset, offset + limit);
    } else {
      throw new Error('Find all operation not supported by this repository');
    }

    const customerDtos = customers.map(customer => CustomerMapper.toDto(customer));

    return {
      customers: customerDtos,
      total,
      page,
      pageSize: limit,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0,
    };
  }
}
