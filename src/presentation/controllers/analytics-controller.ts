import { Request, Response } from 'express';
import { GetChatAnalytics } from '../../application/use-cases/get-chat-analytics';
import { HealthChecker } from '../../infrastructure/health/health-checker';
import { MetricsCollector } from '../../infrastructure/monitoring/metrics-collector';

export class AnalyticsController {
  constructor(private getChatAnalyticsUseCase: GetChatAnalytics) {}

  async getChatAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.getChatAnalyticsUseCase.executeChatAnalytics();

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get chat analytics error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chat analytics',
      });
    }
  }

  async getProductAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const analytics = await this.getChatAnalyticsUseCase.executeProductAnalytics();

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get product analytics error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve product analytics',
      });
    }
  }

  async getSystemMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = MetricsCollector.getInstance().getMetrics();

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Get system metrics error:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics',
      });
    }
  }

  async getHealthStatus(_req: Request, res: Response): Promise<void> {
    try {
      const healthChecker = new HealthChecker();
      const health = await healthChecker.performHealthCheck();

      const statusCode =
        health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status !== 'unhealthy',
        data: health,
      });
    } catch (error) {
      console.error('Health check error:', error);

      res.status(503).json({
        success: false,
        error: 'Health check failed',
      });
    }
  }
}
