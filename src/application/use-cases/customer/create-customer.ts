import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { ValidationError } from '@shared/errors/custom-error';
import { v4 as uuidv4 } from 'uuid';
import { CreateCustomerDto, CustomerDto } from '../../dtos/customer-dto';
import { CustomerMapper } from '../../mappers/customer-mapper';
import { CustomerValidator } from '../../validators/customer-validator';

export class CreateCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(dto: CreateCustomerDto): Promise<CustomerDto> {
    // Validate input data
    CustomerValidator.validateCreateCustomer(dto);

    // Check if customer already exists by email
    const existingCustomer = await this.customerRepository.findByEmail(dto.email);
    if (existingCustomer) {
      throw new ValidationError('Customer with this email already exists');
    }

    // Create new customer
    const id = uuidv4();
    const customer = CustomerMapper.toDomain(dto, id);

    await this.customerRepository.save(customer);

    console.log(`✅ Customer created: ${customer.email} (ID: ${customer.id})`);
    return CustomerMapper.toDto(customer);
  }
}
