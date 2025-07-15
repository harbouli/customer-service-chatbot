import { ChatMessage, MessageType } from '../../domain/entities/chat-message';
import { ChatSession } from '../../domain/entities/chat-session';
import { IChatRepository } from '../../domain/repositories/IChatRepository';
import { CustomError } from '../../shared/errors/custom-error';
import { ChatMessageModel, ChatSessionModel } from '../database/models/chat.modal';

// Repository Implementation
export class MongoDBChatRepository implements IChatRepository {
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      const chatMessageDoc = new ChatMessageModel({
        messageId: message.id,
        content: message.content,
        type: message.type,
        timestamp: message.timestamp,
        sessionId: message.sessionId,
      });

      await chatMessageDoc.save();

      // Add message ID to session
      await ChatSessionModel.findOneAndUpdate(
        { sessionId: message.sessionId },
        { $push: { messageIds: message.id } },
        { upsert: false }
      );

      console.log(`✅ Message saved: ${message.id}`);
    } catch (error) {
      console.error(`❌ Failed to save message: ${message.id}`, error);
      throw new CustomError('Failed to save message', 500, 'MESSAGE_SAVE_FAILED');
    }
  }

  async saveSession(session: ChatSession): Promise<void> {
    try {
      const existingSession = await ChatSessionModel.findOne({
        sessionId: session.id,
      });

      if (existingSession) {
        // Update existing session
        await ChatSessionModel.findOneAndUpdate(
          { sessionId: session.id },
          {
            $set: {
              customerId: session.customerId,
              isActive: session.isActive,
              // Don't update messageIds here as they're managed by saveMessage
            },
          }
        );
      } else {
        // Create new session
        const chatSessionDoc = new ChatSessionModel({
          sessionId: session.id,
          customerId: session.customerId,
          messageIds: [], // Start with empty array, messages will be added by saveMessage
          createdAt: session.createdAt,
          isActive: session.isActive,
        });

        await chatSessionDoc.save();
      }

      console.log(`✅ Session saved: ${session.id}`);
    } catch (error) {
      console.error(`❌ Failed to save session: ${session.id}`, error);
      throw new CustomError('Failed to save session', 500, 'SESSION_SAVE_FAILED');
    }
  }

  async findSessionById(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessionDoc = await ChatSessionModel.findOne({ sessionId });

      if (!sessionDoc) {
        return null;
      }

      // Get the actual messages for this session
      const messages = await this.getSessionMessages(sessionId);

      return new ChatSession(
        sessionDoc.sessionId,
        sessionDoc.customerId,
        messages,
        sessionDoc.createdAt,
        sessionDoc.isActive
      );
    } catch (error) {
      console.error(`❌ Failed to find session: ${sessionId}`, error);
      return null;
    }
  }

  async findActiveSessionByCustomerId(customerId: string): Promise<ChatSession | null> {
    try {
      const sessionDoc = await ChatSessionModel.findOne({
        customerId,
        isActive: true,
      }).sort({ createdAt: -1 });

      if (!sessionDoc) {
        return null;
      }

      // Get the actual messages for this session
      const messages = await this.getSessionMessages(sessionDoc.sessionId);

      return new ChatSession(
        sessionDoc.sessionId,
        sessionDoc.customerId,
        messages,
        sessionDoc.createdAt,
        sessionDoc.isActive
      );
    } catch (error) {
      console.error(`❌ Failed to find active session for customer: ${customerId}`, error);
      return null;
    }
  }

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const messagesDocs = await ChatMessageModel.find({ sessionId }).sort({ timestamp: 1 }).lean();

      return messagesDocs.map(
        doc => new ChatMessage(doc.messageId, doc.content, doc.type, doc.timestamp, doc.sessionId)
      );
    } catch (error) {
      console.error(`❌ Failed to get session messages: ${sessionId}`, error);
      throw new CustomError('Failed to get session messages', 500, 'MESSAGES_FETCH_FAILED');
    }
  }

  async getSessionsByCustomerId(customerId: string): Promise<ChatSession[]> {
    try {
      const sessionsDocs = await ChatSessionModel.find({ customerId })
        .sort({ createdAt: -1 })
        .lean();

      // Get messages for each session
      const sessions = await Promise.all(
        sessionsDocs.map(async doc => {
          const messages = await this.getSessionMessages(doc.sessionId);
          return new ChatSession(
            doc.sessionId,
            doc.customerId,
            messages,
            doc.createdAt,
            doc.isActive
          );
        })
      );

      return sessions;
    } catch (error) {
      console.error(`❌ Failed to get sessions for customer: ${customerId}`, error);
      throw new CustomError('Failed to get customer sessions', 500, 'SESSIONS_FETCH_FAILED');
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete all messages in the session
      await ChatMessageModel.deleteMany({ sessionId });

      // Delete the session
      await ChatSessionModel.findOneAndDelete({ sessionId });

      console.log(`✅ Session deleted: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to delete session: ${sessionId}`, error);
      throw new CustomError('Failed to delete session', 500, 'SESSION_DELETE_FAILED');
    }
  }

  async deactivateSession(sessionId: string): Promise<void> {
    try {
      await ChatSessionModel.findOneAndUpdate({ sessionId }, { $set: { isActive: false } });

      console.log(`✅ Session deactivated: ${sessionId}`);
    } catch (error) {
      console.error(`❌ Failed to deactivate session: ${sessionId}`, error);
      throw new CustomError('Failed to deactivate session', 500, 'SESSION_DEACTIVATE_FAILED');
    }
  }

  async getMessageById(messageId: string): Promise<ChatMessage | null> {
    try {
      const messageDoc = await ChatMessageModel.findOne({ messageId });

      if (!messageDoc) {
        return null;
      }

      return new ChatMessage(
        messageDoc.messageId,
        messageDoc.content,
        messageDoc.type,
        messageDoc.timestamp,
        messageDoc.sessionId
      );
    } catch (error) {
      console.error(`❌ Failed to find message: ${messageId}`, error);
      return null;
    }
  }

  async getRecentSessions(limit: number = 50): Promise<ChatSession[]> {
    try {
      const sessionsDocs = await ChatSessionModel.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      // Get messages for each session
      const sessions = await Promise.all(
        sessionsDocs.map(async doc => {
          const messages = await this.getSessionMessages(doc.sessionId);
          return new ChatSession(
            doc.sessionId,
            doc.customerId,
            messages,
            doc.createdAt,
            doc.isActive
          );
        })
      );

      return sessions;
    } catch (error) {
      console.error('❌ Failed to get recent sessions', error);
      throw new CustomError('Failed to get recent sessions', 500, 'SESSIONS_FETCH_FAILED');
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async getChatStatistics() {
    try {
      const stats = await ChatSessionModel.aggregate([
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
            },
            avgMessagesPerSession: {
              $avg: { $size: '$messageIds' },
            },
          },
        },
      ]);

      const messageStats = await ChatMessageModel.aggregate([
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            userMessages: {
              $sum: { $cond: [{ $eq: ['$type', MessageType.USER] }, 1, 0] },
            },
            botMessages: {
              $sum: { $cond: [{ $eq: ['$type', MessageType.BOT] }, 1, 0] },
            },
          },
        },
      ]);

      return {
        sessions: stats[0] || {
          totalSessions: 0,
          activeSessions: 0,
          avgMessagesPerSession: 0,
        },
        messages: messageStats[0] || {
          totalMessages: 0,
          userMessages: 0,
          botMessages: 0,
        },
      };
    } catch (error) {
      console.error('❌ Failed to get chat statistics', error);
      throw new CustomError('Failed to get chat statistics', 500, 'STATS_FETCH_FAILED');
    }
  }

  async searchMessages(query: string, limit: number = 20): Promise<ChatMessage[]> {
    try {
      const messagesDocs = await ChatMessageModel.find({
        content: { $regex: query, $options: 'i' },
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      return messagesDocs.map(
        doc => new ChatMessage(doc.messageId, doc.content, doc.type, doc.timestamp, doc.sessionId)
      );
    } catch (error) {
      console.error(`❌ Failed to search messages: ${query}`, error);
      throw new CustomError('Failed to search messages', 500, 'MESSAGE_SEARCH_FAILED');
    }
  }
}
