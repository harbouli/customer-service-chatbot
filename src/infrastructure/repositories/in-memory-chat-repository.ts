import { ChatMessage } from "@domain/entities/chat-message";
import { ChatSession } from "@domain/entities/chat-session";
import { IChatRepository } from "@domain/repositories/IChatRepository";

export class InMemoryChatRepository implements IChatRepository {
  private sessions: Map<string, ChatSession> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();

  async findSessionById(id: string): Promise<ChatSession | null> {
    return this.sessions.get(id) || null;
  }

  async findActiveSessionByCustomerId(
    customerId: string
  ): Promise<ChatSession | null> {
    const activeSessions = Array.from(this.sessions.values()).filter(
      (session) => session.customerId === customerId && session.isActive
    );

    // Return the most recent active session
    return (
      activeSessions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0] || null
    );
  }

  async saveSession(session: ChatSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    const sessionMessages = this.messages.get(message.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(message.sessionId, sessionMessages);
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return [...(this.messages.get(sessionId) || [])];
  }

  async findSessionsByCustomerId(customerId: string): Promise<ChatSession[]> {
    return Array.from(this.sessions.values())
      .filter((session) => session.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deactivateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      const updatedSession = new ChatSession(
        session.id,
        session.customerId,
        session.messages,
        session.createdAt,
        false
      );
      this.sessions.set(sessionId, updatedSession);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }

  async getSessionCount(): Promise<number> {
    return this.sessions.size;
  }

  async getMessageCount(): Promise<number> {
    return Array.from(this.messages.values()).reduce(
      (total, messages) => total + messages.length,
      0
    );
  }

  async getRecentSessions(limit: number = 10): Promise<ChatSession[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Utility methods
  clear(): void {
    this.sessions.clear();
    this.messages.clear();
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  getAllMessages(): ChatMessage[] {
    return Array.from(this.messages.values()).flat();
  }
}
