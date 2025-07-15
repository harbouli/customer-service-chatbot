import mongoose, { Document, Schema } from 'mongoose';
import { MessageType } from '../../../domain/entities/chat-message';

// MongoDB Schemas
export interface IChatMessage extends Document {
  _id: string;
  messageId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface IChatSession extends Document {
  _id: string;
  sessionId: string;
  customerId: string;
  messageIds: string[];
  createdAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [2000, 'Message content cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      required: [true, 'Message type is required'],
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.messageId;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

const chatSessionSchema = new Schema<IChatSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      index: true,
    },
    messageIds: [
      {
        type: String,
        ref: 'ChatMessage',
      },
    ],
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.sessionId;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
chatMessageSchema.index({ sessionId: 1, timestamp: -1 });
chatMessageSchema.index({ type: 1 });
chatMessageSchema.index({ timestamp: -1 });

chatSessionSchema.index({ customerId: 1, isActive: 1 });
chatSessionSchema.index({ createdAt: -1 });

// Models
export const ChatMessageModel = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
export const ChatSessionModel = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
