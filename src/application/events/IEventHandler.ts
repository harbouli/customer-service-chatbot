import { DomainEvent } from "./domain-event";

export interface IEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}
