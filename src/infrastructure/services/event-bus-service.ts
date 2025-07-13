import { DomainEvent } from "@application/events/domain-event";
import { IEventBus } from "@application/events/IEventBus";
import { IEventHandler } from "@application/events/IEventHandler";

export class InMemoryEventBus implements IEventBus {
  private handlers: Map<string, IEventHandler<any>[]> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.getEventName();
    const eventHandlers = this.handlers.get(eventName) || [];

    console.log(
      `📡 Publishing event: ${eventName} (${eventHandlers.length} handlers)`
    );

    const promises = eventHandlers.map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`❌ Error in event handler for ${eventName}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);

    console.log(`📝 Subscribed handler for event: ${eventType}`);
  }

  unsubscribe<T extends DomainEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void {
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
    console.log("🧹 Cleared all event handlers");
  }
}

// src/infrastructure/services/LoggingService.ts
export interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

export class LoggingService {
  private static instance: LoggingService;
  private logLevel: number = 2; // INFO by default

  private constructor() {}

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  setLogLevel(level: number): void {
    this.logLevel = level;
  }

  error(message: string, meta?: any): void {
    if (this.logLevel >= 0) {
      console.error(
        `🔴 [ERROR] ${new Date().toISOString()}: ${message}`,
        meta || ""
      );
    }
  }

  warn(message: string, meta?: any): void {
    if (this.logLevel >= 1) {
      console.warn(
        `🟡 [WARN] ${new Date().toISOString()}: ${message}`,
        meta || ""
      );
    }
  }

  info(message: string, meta?: any): void {
    if (this.logLevel >= 2) {
      console.info(
        `🔵 [INFO] ${new Date().toISOString()}: ${message}`,
        meta || ""
      );
    }
  }

  debug(message: string, meta?: any): void {
    if (this.logLevel >= 3) {
      console.debug(
        `🟣 [DEBUG] ${new Date().toISOString()}: ${message}`,
        meta || ""
      );
    }
  }
}
