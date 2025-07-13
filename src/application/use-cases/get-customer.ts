import { ICustomerRepository } from "@domain/repositories/ICustomerRepository";
import { NotFoundError } from "@shared/errors/custom-error";

import { CustomerDto } from "../dtos/customer-dto";
import { CustomerMapper } from "../mappers/customer-mapper";

export class GetCustomer {
  constructor(private customerRepository: ICustomerRepository) {}

  async execute(customerId: string): Promise<CustomerDto> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new NotFoundError("Customer not found");
    }

    return CustomerMapper.toDto(customer);
  }
}
