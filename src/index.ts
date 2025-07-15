import cors from 'cors';
import dotenv from 'dotenv';
import type { Express } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { GetCustomerSessions } from './application/use-cases/customer/get-customer-sessions';
import { InitializeProductEmbeddings } from './application/use-cases/embeddings/initialize-product-embeddings';
import { GetSessionHistory } from './application/use-cases/get-session-history';
import { ProcessChatMessage } from './application/use-cases/process-chat-message';
import { metricsMiddleware } from './infrastructure/middleware/metrics-middleware';

// MongoDB Repositories
import { MongoDBChatRepository } from './infrastructure/repositories/mongodb-chat-repository';

// Fallback to in-memory repositories for vector store
import { WeaviateVectorRepository } from './infrastructure/repositories/weaviate-vector-repository';

import { EnhancedChatbotService } from './infrastructure/services/enhanced-chatbot-service';
import { GoogleGenerativeAIService } from './infrastructure/services/google-generative-ai-service';

// Import presentation layer
import { ChatController } from './presentation/controllers/chat-controller';
import { errorHandler } from './presentation/middleware/error-handler';
import { createChatRoutes } from './presentation/routes/chat-routes';
import { createCustomerRoutes } from './presentation/routes/customer-routes';

import { connectDB, disconnectDB, isDBConnected } from './infrastructure/database';
import { MongoDBCustomerRepository } from './infrastructure/repositories/mongodb-customer-repository';
import { MongoDBProductRepository } from './infrastructure/repositories/mongodb-product-repository';
import { createDocsRoutes, createMainRouter } from './presentation/routes';
import { setupRouteLogging } from './utils/setup-route-logging';

const app: Express = express();

dotenv.config();

const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Metrics middleware
app.use(metricsMiddleware());

async function initializeServer() {
  try {
    console.log('🏗️ Initializing server with MongoDB repositories...');

    // MongoDB-based dependency injection setup
    const customerRepository = new MongoDBCustomerRepository();
    const productRepository = new MongoDBProductRepository();
    const chatRepository = new MongoDBChatRepository();

    console.log('✅ MongoDB repositories initialized');

    // Initialize AI and Vector services
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      console.warn(
        'Warning: GOOGLE_AI_API_KEY not found. AI features will use fallback responses.'
      );
    }

    const weaviateUrl = process.env.WEAVIATE_URL || 'http://localhost:8080';
    const vectorRepository = new WeaviateVectorRepository(weaviateUrl);

    let aiService: GoogleGenerativeAIService | null = null;
    let chatbotService: EnhancedChatbotService;

    if (googleApiKey) {
      aiService = new GoogleGenerativeAIService(googleApiKey);
      chatbotService = new EnhancedChatbotService(productRepository, vectorRepository, aiService);
    } else {
      // Create a mock AI service for fallback
      const mockAiService = new GoogleGenerativeAIService('dummy-key');
      chatbotService = new EnhancedChatbotService(
        productRepository,
        vectorRepository,
        mockAiService
      );
    }

    console.log('✅ AI and Vector services initialized');

    // Initialize use cases with MongoDB repositories
    const processChatMessage = new ProcessChatMessage(
      chatRepository,
      customerRepository,
      chatbotService
    );

    const getSessionHistory = new GetSessionHistory(chatRepository);
    const getCustomerSessions = new GetCustomerSessions(chatRepository);

    // Initialize product embeddings if AI service is available
    let initializeEmbeddings: InitializeProductEmbeddings | null = null;
    if (aiService) {
      initializeEmbeddings = new InitializeProductEmbeddings(
        productRepository,
        vectorRepository,
        aiService
      );
    }

    // Initialize controllers
    const chatController = new ChatController(
      processChatMessage,
      getSessionHistory,
      getCustomerSessions
    );

    // Setup routes
    const mainRouter = createMainRouter();
    app.use('/api', mainRouter);

    // Mount routes
    app.use('/api/chat', createChatRoutes(chatController));
    app.use('/api/customers', createCustomerRoutes());
    app.use('/', createDocsRoutes());

    console.log('✅ Routes configured');

    // Health check
    app.get('/health', async (_, res) => {
      const chatStats = await chatRepository.getChatStatistics().catch(() => null);
      const productStats = await productRepository.getProductStatistics().catch(() => null);

      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
          ai: !!aiService,
          database: isDBConnected() ? 'connected' : 'disconnected',
          vector: true,
        },
        statistics: {
          chat: chatStats,
          products: productStats,
        },
      });
    });

    // API Info endpoint
    app.get('/api', (_, res) => {
      res.json({
        name: 'Customer Support Chatbot API (MongoDB)',
        version: '2.0.0',
        database: 'MongoDB',
        endpoints: {
          // EXISTING endpoints
          chat: '/api/chat/message',
          customers: '/api/customers',
          health: '/health',
          // NEW authentication endpoints
          auth: {
            register: '/auth/register',
            login: '/auth/login',
            refresh: '/auth/refresh',
            profile: '/auth/profile',
            logout: '/auth/logout',
          },
          // NEW user management endpoints
          users: '/api/users (admin only)',
          // NEW utility endpoints
          routes: '/api/routes',
          docs: '/docs',
        },
        features: {
          aiPowered: !!aiService,
          vectorSearch: true,
          contextualResponses: true,
          customerManagement: true,
          persistentStorage: true, // NEW - MongoDB storage
          chatHistory: true, // NEW - Persistent chat history
          productCatalog: true, // NEW - Persistent product catalog
          userAuthentication: true,
          roleBasedAccess: true,
          refreshTokens: true,
          passwordReset: true,
        },
        authentication: {
          type: 'JWT Bearer Token',
          accessTokenExpiry: '15 minutes',
          refreshTokenExpiry: '7 days',
          mockTokens:
            process.env.NODE_ENV === 'development'
              ? {
                  admin: 'mock-admin-token',
                  user: 'mock-user-token',
                  moderator: 'mock-moderator-token',
                }
              : undefined,
        },
        storage: {
          database: 'MongoDB',
          collections: ['customers', 'products', 'chatsessions', 'chatmessages', 'users'],
          features: ['indexing', 'aggregation', 'text_search', 'persistence'],
        },
      });
    });

    setupRouteLogging(app);

    // Error handling
    app.use(errorHandler);

    // 404 handler
    app.use('*', (_, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Initialize vector repository
    try {
      await vectorRepository.initialize();
      console.log('✅ Vector database initialized');
    } catch (error) {
      console.error('❌ Vector database initialization failed:', error);
      console.log('⚠️  Continuing without vector database...');
    }

    // Initialize product embeddings if available
    if (initializeEmbeddings && aiService) {
      try {
        console.log('🔄 Initializing product embeddings...');
        await initializeEmbeddings.execute({
          batchSize: 5,
          delayBetweenBatches: 1000,
          maxRetries: 2,
        });
        console.log('✅ Product embeddings initialized');
      } catch (error) {
        console.error('❌ Product embeddings initialization failed:', error);
        console.log('⚠️  Continuing without embeddings...');
      }
    } else {
      console.log('⚠️  AI service not available - skipping embedding initialization');
    }

    console.log('✅ Server initialization completed with MongoDB storage');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    // Connect to MongoDB first
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully');

    // Then initialize the server
    await initializeServer();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Customer Support Chatbot server running on port ${PORT}`);
      console.log(`📊 Using MongoDB for persistent storage`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API docs: http://localhost:${PORT}/docs`);
      console.log(`💾 Database: ${isDBConnected() ? 'Connected' : 'Disconnected'}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📋 Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        console.log('🔌 Closing database connections...');
        await disconnectDB();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('⏰ Force closing server after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await disconnectDB();
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

export default app;
