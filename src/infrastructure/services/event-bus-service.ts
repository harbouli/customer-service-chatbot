import { DomainEvent } from '../../application/events/domain-event';
import { IEventBus } from '../../application/events/IEventBus';
import { IEventHandler } from '../../application/events/IEventHandler';

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, IEventHandler<any>[]> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();
    const eventHandlers = this.handlers.get(eventName) || [];

    console.log(`📡 Publishing event: ${eventName} (${eventHandlers.length} handlers)`);

    const promises = eventHandlers.map(async handler => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`❌ Error in event handler for ${eventName}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);

    console.log(`📝 Subscribed handler for event: ${eventType}`);
  }

  unsubscribe<T extends DomainEvent>(eventType: string, handler: IEventHandler<T>): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);

    if (index >= 0) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
      console.log(`🗑️ Unsubscribed handler for event: ${eventType}`);
    }
  }

  getHandlerCount(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }

  getAllEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  clear(): void {
    this.handlers.clear();
    console.log('🧹 Cleared all event handlers');
  }
}
