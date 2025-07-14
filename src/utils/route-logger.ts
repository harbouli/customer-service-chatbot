import { Express } from 'express';

interface RouteInfo {
  method: string;
  path: string;
  middleware: string[];
  description?: string;
}

interface RouteGroup {
  prefix: string;
  routes: RouteInfo[];
}

export class RouteLogger {
  routes: RouteGroup[] = [];
  private app: Express | null = null;

  constructor(app?: Express) {
    if (app) {
      this.app = app;
    }
  }

  /**
   * Extract routes from Express app
   */
  extractRoutes(app: Express): RouteGroup[] {
    const routes: RouteGroup[] = [];

    // Get the main router stack
    const stack = app._router?.stack || [];

    for (const layer of stack) {
      if (layer.route) {
        // Direct route
        const route = layer.route;
        const methods = Object.keys(route.methods).filter(method => route.methods[method]);

        for (const method of methods) {
          routes.push({
            prefix: '',
            routes: [
              {
                method: method.toUpperCase(),
                path: route.path,
                middleware: this.getMiddlewareNames(route.stack),
                description: this.getRouteDescription(route.path, method),
              },
            ],
          });
        }
      } else if (layer.name === 'router') {
        // Nested router
        const routerRoutes = this.extractRouterRoutes(layer, layer.regexp);
        if (routerRoutes.routes.length > 0) {
          routes.push(routerRoutes);
        }
      }
    }

    return routes;
  }

  /**
   * Extract routes from a router layer
   */
  private extractRouterRoutes(layer: any, baseRegex: RegExp): RouteGroup {
    const prefix = this.extractPathFromRegex(baseRegex);
    const routes: RouteInfo[] = [];

    if (layer.handle?.stack) {
      for (const subLayer of layer.handle.stack) {
        if (subLayer.route) {
          const route = subLayer.route;
          const methods = Object.keys(route.methods).filter(method => route.methods[method]);

          for (const method of methods) {
            routes.push({
              method: method.toUpperCase(),
              path: route.path,
              middleware: this.getMiddlewareNames(route.stack),
              description: this.getRouteDescription(prefix + route.path, method),
            });
          }
        } else if (subLayer.name === 'router' && subLayer.handle?.stack) {
          // Nested router within router
          const nestedRoutes = this.extractRouterRoutes(subLayer, subLayer.regexp);
          routes.push(
            ...nestedRoutes.routes.map(r => ({
              ...r,
              path: this.extractPathFromRegex(subLayer.regexp) + r.path,
            }))
          );
        }
      }
    }

    return { prefix, routes };
  }

  /**
   * Extract path from regex (basic implementation)
   */
  private extractPathFromRegex(regex: RegExp): string {
    const source = regex.source;

    // Handle common Express regex patterns
    if (source.includes('\\/api')) {
      return '/api';
    }
    if (source.includes('\\/auth')) {
      return '/auth';
    }
    if (source.includes('\\/users')) {
      return '/users';
    }
    if (source.includes('\\/customers')) {
      return '/customers';
    }
    if (source.includes('\\/products')) {
      return '/products';
    }
    if (source.includes('\\/chat')) {
      return '/chat';
    }
    if (source.includes('\\/admin')) {
      return '/admin';
    }
    if (source.includes('\\/analytics')) {
      return '/analytics';
    }
    if (source.includes('\\/public')) {
      return '/public';
    }

    return '';
  }

  /**
   * Get middleware names from route stack
   */
  private getMiddlewareNames(stack: any[]): string[] {
    if (!stack) return [];

    return stack
      .map(layer => {
        if (layer.name && layer.name !== '<anonymous>') {
          return layer.name;
        }
        if (layer.handle?.name && layer.handle.name !== '<anonymous>') {
          return layer.handle.name;
        }
        return 'anonymous';
      })
      .filter(name => name !== 'anonymous');
  }

  /**
   * Get route description based on path and method
   */
  private getRouteDescription(path: string, method: string): string {
    const descriptions: Record<string, Record<string, string>> = {
      // Authentication routes
      '/auth/register': {
        post: 'Register new user',
      },
      '/auth/login': {
        post: 'Login user',
      },
      '/auth/refresh': {
        post: 'Refresh access token',
      },
      '/auth/logout': {
        post: 'Logout user',
      },
      '/auth/profile': {
        get: 'Get user profile',
      },
      '/auth/change-password': {
        put: 'Change user password',
      },

      // User management routes
      '/api/users': {
        get: 'List all users (admin/moderator)',
        post: 'Create new user (admin)',
      },
      '/api/users/:userId': {
        get: 'Get user by ID (admin/moderator)',
        put: 'Update user (admin/moderator)',
        delete: 'Delete user (admin)',
      },
      '/api/users/:userId/role': {
        put: 'Update user role (admin)',
      },
      '/api/users/:userId/activate': {
        put: 'Activate user account (admin)',
      },
      '/api/users/:userId/deactivate': {
        put: 'Deactivate user account (admin)',
      },
      '/api/users/stats': {
        get: 'Get user statistics (admin)',
      },

      // Customer routes
      '/api/customers': {
        post: 'Create customer',
      },
      '/api/customers/:customerId': {
        get: 'Get customer by ID',
        put: 'Update customer',
      },

      // Product routes
      '/api/products': {
        get: 'Search products',
        post: 'Create product',
      },
      '/api/products/:productId': {
        put: 'Update product',
        delete: 'Delete product',
      },

      // Chat routes
      '/api/chat/message': {
        post: 'Send chat message',
      },
      '/api/chat/sessions/:sessionId': {
        get: 'Get session history',
      },
      '/api/chat/customers/:customerId/sessions': {
        get: 'Get customer sessions',
      },

      // Admin routes
      '/api/admin/embeddings/initialize': {
        post: 'Initialize product embeddings (admin)',
      },
      '/api/admin/embeddings/bulk': {
        post: 'Bulk initialize embeddings (admin)',
      },

      // Analytics routes
      '/api/analytics/chat': {
        get: 'Get chat analytics (admin/moderator)',
      },

      // Health and info routes
      '/health': {
        get: 'Health check endpoint',
      },
      '/': {
        get: 'API information',
      },
      '/docs': {
        get: 'API documentation',
      },
    };

    return descriptions[path]?.[method.toLowerCase()] || 'No description available';
  }

  /**
   * Log all routes in a formatted table
   */
  logRoutes(app?: Express): void {
    const targetApp = app || this.app;
    if (!targetApp) {
      console.error('❌ No Express app provided for route logging');
      return;
    }

    console.log('\n🚀 ============ AVAILABLE API ROUTES ============');
    console.log('📍 Application Routes Summary\n');

    const routes = this.extractRoutes(targetApp);
    let totalRoutes = 0;

    // Group routes by prefix for better organization
    const routesByPrefix = new Map<string, RouteInfo[]>();

    routes.forEach(group => {
      const key = group.prefix || 'Root';
      if (!routesByPrefix.has(key)) {
        routesByPrefix.set(key, []);
      }
      routesByPrefix.get(key)!.push(...group.routes);
      totalRoutes += group.routes.length;
    });

    // Log routes by group
    routesByPrefix.forEach((routeList, prefix) => {
      console.log(
        `\n📂 ${prefix === 'Root' ? 'Root Level Routes' : `${prefix.toUpperCase()} Routes`}`
      );
      console.log('─'.repeat(80));

      routeList.forEach(route => {
        const method = route.method.padEnd(7);
        const fullPath = (prefix === 'Root' ? '' : prefix) + route.path;
        const path = fullPath.padEnd(35);
        const middleware =
          route.middleware.length > 0
            ? `[${route.middleware.join(', ')}]`.padEnd(25)
            : ''.padEnd(25);

        console.log(
          `${this.getMethodColor(route.method)}${method}\x1b[0m ${path} ${middleware} ${route.description}`
        );
      });
    });

    // Summary
    console.log('\n📊 ============ ROUTE SUMMARY ============');
    console.log(`Total Routes: ${totalRoutes}`);
    console.log(`Route Groups: ${routesByPrefix.size}`);

    // Method breakdown
    const methodCounts = new Map<string, number>();
    routes.forEach(group => {
      group.routes.forEach(route => {
        methodCounts.set(route.method, (methodCounts.get(route.method) || 0) + 1);
      });
    });

    console.log('\nMethods Distribution:');
    methodCounts.forEach((count, method) => {
      console.log(`  ${this.getMethodColor(method)}${method}\x1b[0m: ${count} routes`);
    });

    console.log('\n🔐 Authentication:');
    console.log('  • Mock tokens available in development mode');
    console.log('  • Bearer token required for protected routes');
    console.log('  • Admin/Moderator permissions for restricted endpoints');

    console.log(`\n🌐 Base URL: http://localhost:${process.env.PORT || 3000}`);
    console.log('📚 Documentation: /docs');
    console.log('❤️  Health Check: /health');
    console.log('══════════════════════════════════════════════\n');
  }

  /**
   * Get color code for HTTP methods
   */
  private getMethodColor(method: string): string {
    const colors = {
      GET: '\x1b[32m', // Green
      POST: '\x1b[33m', // Yellow
      PUT: '\x1b[34m', // Blue
      DELETE: '\x1b[31m', // Red
      PATCH: '\x1b[35m', // Magenta
      OPTIONS: '\x1b[36m', // Cyan
      HEAD: '\x1b[90m', // Gray
    };
    return colors[method as keyof typeof colors] || '\x1b[37m'; // Default white
  }

  /**
   * Export routes to JSON for external use
   */
  exportRoutes(app?: Express): RouteGroup[] {
    const targetApp = app || this.app;
    if (!targetApp) {
      throw new Error('No Express app provided for route export');
    }
    return this.extractRoutes(targetApp);
  }

  /**
   * Get routes as formatted text
   */
  getRoutesAsText(app?: Express): string {
    const targetApp = app || this.app;
    if (!targetApp) {
      return 'No Express app provided';
    }

    const routes = this.extractRoutes(targetApp);
    let output = 'Available API Routes:\n\n';

    routes.forEach(group => {
      if (group.routes.length > 0) {
        output += `${group.prefix || 'Root'}:\n`;
        group.routes.forEach(route => {
          const fullPath = (group.prefix || '') + route.path;
          output += `  ${route.method} ${fullPath} - ${route.description}\n`;
        });
        output += '\n';
      }
    });

    return output;
  }
}

// Export singleton instance
export const routeLogger = new RouteLogger();

// Export utility functions
export const logAllRoutes = (app: Express): void => {
  routeLogger.logRoutes(app);
};

export const getRoutes = (app: Express): RouteGroup[] => {
  return routeLogger.exportRoutes(app);
};

export const getRoutesText = (app: Express): string => {
  return routeLogger.getRoutesAsText(app);
};
