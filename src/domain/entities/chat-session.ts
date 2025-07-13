import { ChatMessage } from "./chat-message";

export class ChatSession {
  constructor(
    public readonly id: string,
    public readonly customerId: string,
    public readonly messages: ChatMessage[],
    public readonly createdAt: Date,
    public readonly isActive: boolean = true
  ) {}
}
