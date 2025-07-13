import { ValidationError } from "@shared/errors/custom-error";

import { ChatRequestDto } from "../dtos/chat-request-dto";

export class ChatValidator {
  static validateChatRequest(dto: ChatRequestDto): void {
    if (!dto.customerId || dto.customerId.trim() === "") {
      throw new ValidationError("Customer ID is required");
    }

    if (!dto.message || dto.message.trim() === "") {
      throw new ValidationError("Message is required");
    }

    if (dto.message.length > 1000) {
      throw new ValidationError("Message cannot exceed 1000 characters");
    }

    if (dto.sessionId && dto.sessionId.trim() === "") {
      throw new ValidationError("Session ID cannot be empty if provided");
    }
  }
}
