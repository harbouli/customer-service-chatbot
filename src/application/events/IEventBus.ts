import { DomainEvent } from "./domain-event";
import { IEventHandler } from "./IEventHandler";

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void;
}
