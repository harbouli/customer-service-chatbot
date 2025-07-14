import { CreateCustomerDto, UpdateCustomerDto, CustomerDto } from '../dtos/customer-dto';
import { CreateCustomer } from '../use-cases/create-customer';
import { GetCustomer } from '../use-cases/get-customer';
import { UpdateCustomer } from '../use-cases/update-customer';

export class CustomerService {
  constructor(
    private createCustomer: CreateCustomer,
    private getCustomer: GetCustomer,
    private updateCustomer: UpdateCustomer
  ) {}

  async create(dto: CreateCustomerDto): Promise<CustomerDto> {
    return await this.createCustomer.execute(dto);
  }

  async getById(customerId: string): Promise<CustomerDto> {
    return await this.getCustomer.execute(customerId);
  }

  async update(customerId: string, dto: UpdateCustomerDto): Promise<CustomerDto> {
    return await this.updateCustomer.execute(customerId, dto);
  }
}
