import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { NotFoundError, ValidationError } from '@shared/errors/custom-error';

import { CustomerDto } from '../../dtos/customer-dto';
import { CustomerMapper } from '../../mappers/customer-mapper';

export class DeleteCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string): Promise<void> {
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    // Check if customer exists
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    // Delete customer (if repository supports it)
    if (typeof (this.customerRepository as any).delete === 'function') {
      await (this.customerRepository as any).delete(customerId);
      console.log(`✅ Customer deleted: ${customer.email} (ID: ${customerId})`);
    } else {
      throw new Error('Delete operation not supported by this repository');
    }
  }
}

// ============================================================================
// GET CUSTOMER BY EMAIL USE CASE (New)
// ============================================================================

export class GetCustomerByEmail {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(email: string): Promise<CustomerDto> {
    if (!email || email.trim() === '') {
      throw new ValidationError('Email is required');
    }

    const customer = await this.customerRepository.findByEmail(email);

    if (!customer) {
      throw new NotFoundError(`Customer not found with email: ${email}`);
    }

    return CustomerMapper.toDto(customer);
  }
}
