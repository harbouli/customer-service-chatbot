import { ICustomerRepository } from '../../../domain/repositories/ICustomerRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/custom-error';

import { CustomerDto, UpdateCustomerDto } from '../../dtos/customer-dto';
import { CustomerMapper } from '../../mappers/customer-mapper';
import { CustomerValidator } from '../../validators/customer-validator';

export class UpdateCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string, dto: UpdateCustomerDto): Promise<CustomerDto> {
    // Validate input data
    if (!customerId || customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    CustomerValidator.validateUpdateCustomer(dto);

    // Find existing customer
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundError(`Customer not found with ID: ${customerId}`);
    }

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== customer.email) {
      const existingCustomer = await this.customerRepository.findByEmail(dto.email);
      if (existingCustomer) {
        throw new ValidationError('Customer with this email already exists');
      }
    }

    // Update customer
    const updatedCustomer = CustomerMapper.updateDomain(customer, dto);
    await this.customerRepository.save(updatedCustomer);

    console.log(`✅ Customer updated: ${updatedCustomer.email} (ID: ${updatedCustomer.id})`);
    return CustomerMapper.toDto(updatedCustomer);
  }
}
