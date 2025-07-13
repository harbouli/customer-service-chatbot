import { ChatAnalyticsDto, ProductAnalyticsDto } from "../dtos/analytics-dto";
import { GetChatAnalytics } from "../use-cases/get-chat-analytics";

export class AnalyticsService {
  constructor(private chatAnalyticsUseCase: GetChatAnalytics) {}

  async getChatAnalytics(): Promise<ChatAnalyticsDto> {
    return await this.chatAnalyticsUseCase.executeChatAnalytics();
  }

  async getProductAnalytics(): Promise<ProductAnalyticsDto> {
    return await this.chatAnalyticsUseCase.executeProductAnalytics();
  }
}
