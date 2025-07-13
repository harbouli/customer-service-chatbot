import { IChatRepository } from "@domain/repositories/IChatRepository";
import { NotFoundError } from "@shared/errors/custom-error";

import { SessionHistoryDto } from "../dtos/session-dto";
import { SessionMapper } from "../mappers/session-mapper";

export class GetSessionHistory {
  constructor(private chatRepository: IChatRepository) {}

  async execute(sessionId: string): Promise<SessionHistoryDto> {
    const session = await this.chatRepository.findSessionById(sessionId);

    if (!session) {
      throw new NotFoundError("Session not found");
    }

    const messages = await this.chatRepository.getSessionMessages(sessionId);

    return SessionMapper.toSessionHistoryDto(session, messages);
  }
}
