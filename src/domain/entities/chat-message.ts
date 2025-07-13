export enum MessageType {
  USER = "user",
  BOT = "bot",
}

export class ChatMessage {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly type: MessageType,
    public readonly timestamp: Date,
    public readonly sessionId: string
  ) {}
}
