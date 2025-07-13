import { ChatMessage } from "./chat-message";
import { Customer } from "./customer";
import { Product } from "./product";

export class ChatContext {
  constructor(
    public readonly sessionId: string,
    public readonly customerId: string,
    public readonly recentMessages: ChatMessage[],
    public readonly customerProfile: Customer,
    public readonly relevantProducts: Product[]
  ) {}
}
