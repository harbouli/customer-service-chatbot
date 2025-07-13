import { ProductDto } from "../dtos/product-dto";

import { DomainEvent } from "./domain-event";

export class ProductCreatedEvent extends DomainEvent {
  constructor(public readonly product: ProductDto) {
    super();
  }

  getEventName(): string {
    return "ProductCreated";
  }
}
