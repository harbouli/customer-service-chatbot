import { ChatRequestDto } from '@application/dtos/chat-request-dto';
import { ChatResponseDto } from '@application/dtos/chat-response-dto';

import { SessionHistoryDto, SessionDto } from '../dtos/session-dto';
import { GetCustomerSessions } from '../use-cases/get-customer-sessions';
import { GetSessionHistory } from '../use-cases/get-session-history';
import { ProcessChatMessage } from '../use-cases/process-chat-message';

export class ChatService {
  constructor(
    private processChatMessage: ProcessChatMessage,
    private sessionHistoryUseCase: GetSessionHistory,
    private customerSessionsUseCase: GetCustomerSessions
  ) {}

  async sendMessage(request: ChatRequestDto): Promise<ChatResponseDto> {
    return await this.processChatMessage.execute(request);
  }

  async getSessionHistory(sessionId: string): Promise<SessionHistoryDto> {
    return await this.sessionHistoryUseCase.execute(sessionId);
  }

  async getCustomerSessions(customerId: string): Promise<SessionDto[]> {
    return await this.customerSessionsUseCase.execute(customerId);
  }
}
