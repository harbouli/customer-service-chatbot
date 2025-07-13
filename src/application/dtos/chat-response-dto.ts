export interface ChatResponseDto {
  sessionId: string;
  response: string;
  timestamp: Date;
  suggestedActions?: string[];
}
