import { Router } from "express";

import { ChatController } from "../controllers/chat-controller";
import {
  validateChatMessage,
  validateSessionId,
  validateCustomerId,
} from "../middleware/validation";

export function createChatRoutes(chatController: ChatController): Router {
  const router = Router();

  // Send chat message
  router.post(
    "/message",
    validateChatMessage,
    chatController.sendMessage.bind(chatController)
  );

  // Get session history
  router.get(
    "/session/:sessionId/history",
    validateSessionId,
    chatController.getSessionHistory.bind(chatController)
  );

  // Get customer sessions
  router.get(
    "/customer/:customerId/sessions",
    validateCustomerId,
    chatController.getCustomerSessions.bind(chatController)
  );

  // End session
  router.patch(
    "/session/:sessionId/end",
    validateSessionId,
    chatController.endSession.bind(chatController)
  );

  return router;
}
