export interface SessionDto {
  id: string;
  customerId: string;
  createdAt: Date;
  isActive: boolean;
  messageCount: number;
}

export interface MessageDto {
  id: string;
  content: string;
  type: "user" | "bot";
  timestamp: Date;
  sessionId: string;
}

export interface SessionHistoryDto {
  session: SessionDto;
  messages: MessageDto[];
}
