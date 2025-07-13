import { CreateCustomerDto, CustomerDto } from "../dtos/customer-dto";
import { CustomerCreatedEvent } from "../events/customer-created-event";
import { IEventBus } from "../events/IEventBus";
import { CreateCustomer } from "../use-cases/create-customer";
import { CustomerValidator } from "../validators/customer-validator";

export interface CreateCustomerCommand {
  customer: CreateCustomerDto;
}

export class CreateCustomerCommandHandler {
  constructor(
    private createCustomer: CreateCustomer,
    private eventBus: IEventBus
  ) {}

  async handle(command: CreateCustomerCommand): Promise<CustomerDto> {
    // Validate input
    CustomerValidator.validateCreateCustomer(command.customer);

    // Execute use case
    const customer = await this.createCustomer.execute(command.customer);

    // Publish event
    await this.eventBus.publish(new CustomerCreatedEvent(customer));

    return customer;
  }
}
