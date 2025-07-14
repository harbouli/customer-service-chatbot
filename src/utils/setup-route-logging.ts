/* eslint-disable @typescript-eslint/no-unused-vars */
import { Express } from 'express';
import { getRoutes, getRoutesText, logAllRoutes } from './route-logger';

/**
 * Setup route logging for the application
 * Call this after all routes have been mounted
 */
export function setupRouteLogging(app: Express): void {
  // Log routes on startup
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Initializing route discovery...');

    // Add a small delay to ensure all routes are mounted
    setTimeout(() => {
      logAllRoutes(app);
    }, 100);
  }

  // Add a route to view all routes at runtime
  app.get('/api/routes', (_req, res) => {
    try {
      const routes = getRoutes(app);
      res.json({
        success: true,
        message: 'Available routes retrieved successfully',
        data: {
          routes,
          total: routes.reduce((sum, group) => sum + group.routes.length, 0),
          groups: routes.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve routes',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Add a text-based route listing
  app.get('/api/routes/text', (_req, res) => {
    try {
      const routesText = getRoutesText(app);
      res.type('text/plain').send(routesText);
    } catch (error) {
      res.status(500).send('Failed to retrieve routes');
    }
  });
}

// Alternative: Manual route logging function for your main app file
export function logRoutesOnStartup(app: Express, port: number | string): void {
  console.log(`\n🚀 Server starting on port ${port}...`);

  // Log routes after server starts
  process.nextTick(() => {
    logAllRoutes(app);
  });
}
