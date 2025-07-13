import { ChatResponseDto } from "@application/dtos/chat-response-dto";

import { ChatRequestDto } from "../dtos/chat-request-dto";
import { ChatMessageSentEvent } from "../events/chat-message-sent-event";
import { IEventBus } from "../events/IEventBus";
import { ProcessChatMessage } from "../use-cases/process-chat-message";
import { ChatValidator } from "../validators/chat-validator";


export interface SendChatMessageCommand {
  request: ChatRequestDto;
}

export class SendChatMessageCommandHandler {
  constructor(
    private processChatMessage: ProcessChatMessage,
    private eventBus: IEventBus
  ) {}

  async handle(command: SendChatMessageCommand): Promise<ChatResponseDto> {
    // Validate input
    ChatValidator.validateChatRequest(command.request);

    // Execute use case
    const response = await this.processChatMessage.execute(command.request);

    // Publish event
    await this.eventBus.publish(
      new ChatMessageSentEvent(
        command.request.customerId,
        response.sessionId,
        command.request.message,
        response
      )
    );

    return response;
  }
}
