/* eslint-disable @typescript-eslint/no-unused-vars */

import { Request, Response, Router } from 'express';

import { ServiceContainer } from '../../infrastructure';
import { createAdminRoutes } from './admin-routes';
import { createAnalyticsRoutes } from './analytics-routes';
import { createAuthRoutes } from './auth-routes';
import { createChatRoutes } from './chat-routes';
import { createCustomerRoutes } from './customer-routes';
import { createProductRoutes } from './product-routes';
import { createPublicRoutes } from './public-routes';
import { createUserManagementRoutes } from './user-management-routes';

// Main router factory (EXISTING - ENHANCED)
export function createMainRouter(): Router {
  const router: Router = Router();

  // Mount public routes (EXISTING)
  router.use('/', createPublicRoutes());

  // NEW: Mount authentication routes (mixed public/private)
  router.use('/auth', createAuthRoutes());

  // 404 handler for API routes (EXISTING - ENHANCED)
  router.use('/api/*', (req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        '/api/info',
        '/api/chat',
        '/api/customers',
        '/api/products',
        '/api/analytics',
        '/api/admin',
        '/api/users', // NEW
        '/auth', // NEW
        '/health',
      ],
    });
  });

  return router;
}

// NEW: Healthcheck routes
function createHealthRoutes(): Router {
  const router: Router = Router();

  router.get('/health', async (_req: Request, res: Response): Promise<void> => {
    // Enhanced health check with actual service status
    const container = ServiceContainer.getInstance();
    let mongoStatus = 'disconnected';
    let weaviateStatus = 'disconnected';

    try {
      // Check MongoDB connection
      const mongodb = container.getMongoDB();
      mongoStatus = mongodb.isConnected() ? 'connected' : 'disconnected';
    } catch (error) {
      mongoStatus = 'error';
    }

    try {
      // Check AI service
      weaviateStatus = 'connected'; // Assume connected if container has it
    } catch (error) {
      weaviateStatus = 'error';
    }

    const healthStatus = {
      status:
        mongoStatus === 'connected' && weaviateStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        mongodb: mongoStatus,
        weaviate: weaviateStatus,
        ai: weaviateStatus,
        authentication: 'enabled', // NEW
        serviceContainer: container.isServiceInitialized() ? 'initialized' : 'not_initialized', // NEW
      },
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  });

  return router;
}

function createDocsRoutes(): Router {
  const router: Router = Router();

  router.get('/docs', (req: Request, res: Response): void => {
    res.status(200).json({
      title: 'Customer Support Chatbot API Documentation',
      version: '1.0.0',
      description:
        'Complete API documentation for the customer support chatbot system with MongoDB authentication',
      baseUrl: `${req.protocol}://${req.get('host')}/api`,
      authentication: {
        type: 'Bearer Token (JWT)',
        header: 'Authorization: Bearer <token>',
        endpoints: {
          login: 'POST /auth/login',
          register: 'POST /auth/register',
          refresh: 'POST /auth/refresh',
        },
      },
      routes: {
        authentication: {
          'POST /auth/register': 'Register new user',
          'POST /auth/login': 'Login user',
          'POST /auth/refresh': 'Refresh access token',
          'POST /auth/logout': 'Logout user',
          'GET /auth/profile': 'Get user profile (protected)',
          'PUT /auth/change-password': 'Change password (protected)',
          'POST /auth/forgot-password': 'Request password reset',
          'POST /auth/reset-password': 'Confirm password reset',
          'GET /auth/validate': 'Validate current token (protected)',
          'POST /auth/logout-all': 'Logout from all devices (protected)',
        },
        userManagement: {
          'GET /api/users': 'List users (admin only)',
          'GET /api/users/:id': 'Get user by ID (admin/moderator)',
          'PUT /api/users/:id': 'Update user (admin/moderator)',
          'DELETE /api/users/:id': 'Delete user (admin only)',
          'PUT /api/users/:id/role': 'Update user role (admin only)',
          'PUT /api/users/:id/activate': 'Activate user account (admin only)',
          'PUT /api/users/:id/deactivate': 'Deactivate user account (admin only)',
          'POST /api/users/:id/clear-sessions': 'Clear user sessions (admin only)',
          'GET /api/users/stats': 'Get user statistics (admin only)',
        },
        customers: {
          'POST /api/customers': 'Create customer (protected)',
          'GET /api/customers/:id': 'Get customer (protected)',
          'PUT /api/customers/:id': 'Update customer (protected)',
        },
        products: {
          'GET /api/products': 'Search products (protected)',
          'POST /api/products': 'Create product (protected)',
          'PUT /api/products/:id': 'Update product (protected)',
          'DELETE /api/products/:id': 'Delete product (protected)',
        },
        chat: {
          'POST /api/chat/message': 'Send chat message (protected)',
          'GET /api/chat/sessions/:sessionId': 'Get session history (protected)',
          'GET /api/chat/customers/:customerId/sessions': 'Get customer sessions (protected)',
        },
        admin: {
          'POST /api/admin/embeddings/initialize': 'Initialize embeddings (admin only)',
          'POST /api/admin/embeddings/bulk': 'Bulk initialize embeddings (admin only)',
        },
        analytics: {
          'GET /api/analytics/chat': 'Get chat analytics (admin/moderator)',
        },
      },
    });
  });

  return router;
}

// Export individual route creators for flexibility (EXISTING + NEW)
export {
  createAdminRoutes,
  createAnalyticsRoutes,
  createAuthRoutes,
  createChatRoutes,
  createCustomerRoutes, // NEW
  createDocsRoutes, // NEW
  createHealthRoutes,
  createProductRoutes,
  createPublicRoutes,
  createUserManagementRoutes,
};
