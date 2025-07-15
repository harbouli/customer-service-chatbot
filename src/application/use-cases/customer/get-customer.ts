import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/custom-error';

import { CustomerDto } from '../../dtos/customer-dto';
import { CustomerMapper } from '../../mappers/customer-mapper';

export class GetCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string): Promise<CustomerDto> {
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    return CustomerMapper.toDto(customer);
  }
}
