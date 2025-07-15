import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ChatResponseDto } from '../../application/index';
import {
  GetCustomerSessions,
  GetSessionHistory,
  ProcessChatMessage,
} from '../../application/use-cases';
import { ChatRequestDto, MetricsCollector } from '../../infrastructure/';
import { CustomError } from '../../shared/errors/custom-error';

export class ChatController {
  constructor(
    private processChatMessage: ProcessChatMessage,
    private getSessionHistoryUseCase: GetSessionHistory,
    private getCustomerSessionsUseCase: GetCustomerSessions
  ) {}

  async sendMessage(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const metrics = MetricsCollector.getInstance();

    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { customerId, message, sessionId } = req.body;
      const request: ChatRequestDto = { customerId, message, sessionId };

      // Process chat message
      const response: ChatResponseDto = await this.processChatMessage.execute(request);

      // Record metrics
      const responseTime = Date.now() - startTime;
      metrics.recordChatMessage(responseTime);
      metrics.recordRequest(true, responseTime);

      res.status(200).json({
        success: true,
        data: response,
        meta: {
          processingTime: responseTime,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      metrics.recordRequest(false, responseTime);

      console.error('Chat message error:', error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to process chat message',
          message: 'An internal error occurred while processing your message',
        });
      }
    }
  }

  async getSessionHistory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { sessionId } = req.params;

      const sessionHistory = await this.getSessionHistoryUseCase.execute(sessionId ?? '');

      res.status(200).json({
        success: true,
        data: sessionHistory,
      });
    } catch (error) {
      console.error('Get session history error:', error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve session history',
        });
      }
    }
  }

  async getCustomerSessions(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { customerId } = req.params;

      const sessions = await this.getCustomerSessionsUseCase.execute(customerId ?? '');

      res.status(200).json({
        success: true,
        data: sessions,
        meta: {
          count: sessions.length,
        },
      });
    } catch (error) {
      console.error('Get customer sessions error:', error);

      if (error instanceof CustomError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve customer sessions',
        });
      }
    }
  }

  async endSession(_req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement end session use case
      // await this.endSessionUseCase.execute(sessionId);

      res.status(200).json({
        success: true,
        message: 'Session ended successfully',
      });
    } catch (error) {
      console.error('End session error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to end session',
      });
    }
  }
}
