import { ChatResponseDto } from "../dtos/chat-response-dto";

import { DomainEvent } from "./domain-event";

export class ChatMessageSentEvent extends DomainEvent {
  constructor(
    public readonly customerId: string,
    public readonly sessionId: string,
    public readonly message: string,
    public readonly response: ChatResponseDto
  ) {
    super();
  }

  getEventName(): string {
    return "ChatMessageSent";
  }
}
