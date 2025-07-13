import { CustomerDto } from "../dtos/customer-dto";

import { DomainEvent } from "./domain-event";

export class CustomerCreatedEvent extends DomainEvent {
  constructor(public readonly customer: CustomerDto) {
    super();
  }

  getEventName(): string {
    return "CustomerCreated";
  }
}
