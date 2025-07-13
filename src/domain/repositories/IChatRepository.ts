import { ChatMessage } from "../entities/chat-message";
import { ChatSession } from "../entities/chat-session";

export interface IChatRepository {
  findSessionById(id: string): Promise<ChatSession | null>;
  findActiveSessionByCustomerId(
    customerId: string
  ): Promise<ChatSession | null>;
  saveSession(session: ChatSession): Promise<void>;
  saveMessage(message: ChatMessage): Promise<void>;
  getSessionMessages(sessionId: string): Promise<ChatMessage[]>;
}
