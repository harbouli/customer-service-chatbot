import { ICustomerRepository } from "@domain/repositories/ICustomerRepository";
import { NotFoundError, ValidationError } from "@shared/errors/custom-error";

import { UpdateCustomerDto, CustomerDto } from "../dtos/customer-dto";
import { CustomerMapper } from "../mappers/customer-mapper";

export class UpdateCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(
    customerId: string,
    dto: UpdateCustomerDto
  ): Promise<CustomerDto> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    // Check email uniqueness if email is being updated
    if (dto.email && dto.email !== customer.email) {
      const existingCustomer = await this.customerRepository.findByEmail(
        dto.email
      );
      if (existingCustomer) {
        throw new ValidationError("Customer with this email already exists");
      }
    }

    const updatedCustomer = CustomerMapper.updateDomain(customer, dto);
    await this.customerRepository.save(updatedCustomer);

    return CustomerMapper.toDto(updatedCustomer);
  }
}
