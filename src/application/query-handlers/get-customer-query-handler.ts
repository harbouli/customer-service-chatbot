import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { NotFoundError, ValidationError } from '../../shared/errors/custom-error';

import { CustomerDto } from '../dtos/customer-dto';
import { CustomerMapper } from '../mappers/customer-mapper';

export interface GetCustomerQuery {
  customerId?: string;
  email?: string;
}

export class GetCustomerQueryHandler {
  constructor(private customerRepository: ICustomerRepository) {}

  async handle(query: GetCustomerQuery): Promise<CustomerDto> {
    let customer;

    if (query.customerId) {
      customer = await this.customerRepository.findById(query.customerId);
    } else if (query.email) {
      customer = await this.customerRepository.findByEmail(query.email);
    } else {
      throw new ValidationError('Either customerId or email must be provided');
    }

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return CustomerMapper.toDto(customer);
  }
}
