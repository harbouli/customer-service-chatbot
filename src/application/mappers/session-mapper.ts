import { ChatMessage } from '../../domain/entities/chat-message';
import { ChatSession } from '../../domain/entities/chat-session';

import { MessageDto, SessionDto, SessionHistoryDto } from '../dtos/session-dto';

export class SessionMapper {
  static toSessionDto(session: ChatSession): SessionDto {
    return {
      id: session.id,
      customerId: session.customerId,
      createdAt: session.createdAt,
      isActive: session.isActive,
      messageCount: session.messages.length,
    };
  }

  static toMessageDto(message: ChatMessage): MessageDto {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      sessionId: message.sessionId,
    };
  }

  static toSessionHistoryDto(session: ChatSession, messages: ChatMessage[]): SessionHistoryDto {
    return {
      session: this.toSessionDto(session),
      messages: messages.map(msg => this.toMessageDto(msg)),
    };
  }
}
