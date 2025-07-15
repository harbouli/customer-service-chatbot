import { Router } from 'express';
import { ConfigService, HealthChecker, MetricsCollector } from '../../infrastructure';

export function createPublicRoutes(): Router {
  const router = Router();

  // API information
  router.get('/info', (_req, res) => {
    const config = ConfigService.getInstance();

    res.json({
      name: 'Customer Support Chatbot API',
      version: '1.0.0',
      environment: config.getServer().env,
      timestamp: new Date().toISOString(),
      endpoints: {
        chat: '/api/chat',
        customers: '/api/customers',
        products: '/api/products',
        analytics: '/api/analytics',
        admin: '/api/admin',
        health: '/health',
      },
      features: {
        aiPowered: !!config.getAI().googleApiKey,
        vectorSearch: true,
        contextualResponses: true,
        analytics: true,
        rateLimit: true,
        authentication: true,
      },
      documentation: {
        swagger: '/api/docs',
        postman: '/api/postman',
      },
    });
  });

  // Health check endpoint
  router.get('/health', async (_req, res) => {
    try {
      const healthChecker = new HealthChecker();
      const health = await healthChecker.performHealthCheck();

      const statusCode =
        health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Metrics endpoint (limited data for public)
  router.get('/metrics', (_req, res) => {
    const metrics = MetricsCollector.getInstance().getMetrics();

    // Return limited metrics for public access
    res.json({
      uptime: metrics.system.uptime,
      totalRequests: metrics.requests.total,
      averageResponseTime: metrics.requests.averageResponseTime,
      timestamp: new Date().toISOString(),
    });
  });

  // API status
  router.get('/status', (_req, res) => {
    const config = ConfigService.getInstance();
    const metrics = MetricsCollector.getInstance().getMetrics();

    res.json({
      status: 'operational',
      version: '1.0.0',
      environment: config.getServer().env,
      uptime: metrics.system.uptime,
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        chat: 'operational',
        ai: config.getAI().googleApiKey ? 'operational' : 'unavailable',
        vectorDb: 'operational',
      },
    });
  });

  return router;
}
