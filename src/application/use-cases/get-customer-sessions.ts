import { IChatRepository } from "@domain/repositories/IChatRepository";

import { SessionDto } from "../dtos/session-dto";

export class GetCustomerSessions {
  constructor(private chatRepository: IChatRepository) {}

  async execute(customerId: string): Promise<SessionDto[]> {
    // This would require extending the IChatRepository interface
    // For now, we'll return a placeholder implementation

    // TODO: Add method to IChatRepository to get sessions by customer ID
    // const sessions = await this.chatRepository.findSessionsByCustomerId(customerId);

    // Placeholder - return empty array
    return [];
  }
}
