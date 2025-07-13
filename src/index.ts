// src/index.ts
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// Import infrastructure using relative paths
import { InitializeProductEmbeddings } from "./application/use-cases/initialize-product-embeddings";
import { ProcessChatMessage } from "./application/use-cases/process-chat-message";
import { metricsMiddleware } from "./infrastructure/middleware/metrics-middleware";
import { InMemoryChatRepository } from "./infrastructure/repositories/in-memory-chat-repository";
import { InMemoryCustomerRepository } from "./infrastructure/repositories/in-memory-customer-repository";
import { InMemoryProductRepository } from "./infrastructure/repositories/in-memory-product-repository";
import { WeaviateVectorRepository } from "./infrastructure/repositories/weaviate-vector-repository";
import { EnhancedChatbotService } from "./infrastructure/services/enhanced-chatbot-service";
import { GoogleGenerativeAIService } from "./infrastructure/services/google-generative-ai-service";

// Import application layer

// Import presentation layer
import { ChatController } from "./presentation/controllers/chat-controller";
import { errorHandler } from "./presentation/middleware/error-handler";
import { createChatRoutes } from "./presentation/routes/chat-routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting with new version
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use("/api/", limiter);

// Metrics middleware
app.use(metricsMiddleware());

async function initializeServer() {
  try {
    console.log("🏗️ Initializing server...");

    // Dependency injection setup
    const customerRepository = new InMemoryCustomerRepository();
    const productRepository = new InMemoryProductRepository();
    const chatRepository = new InMemoryChatRepository();

    // Initialize AI and Vector services
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      console.warn(
        "Warning: GOOGLE_AI_API_KEY not found. AI features will use fallback responses."
      );
    }

    const weaviateUrl = process.env.WEAVIATE_URL || "http://localhost:8080";
    const vectorRepository = new WeaviateVectorRepository(weaviateUrl);

    let aiService: GoogleGenerativeAIService | null = null;
    let chatbotService: EnhancedChatbotService;

    if (googleApiKey) {
      aiService = new GoogleGenerativeAIService(googleApiKey);
      chatbotService = new EnhancedChatbotService(
        productRepository,
        vectorRepository,
        aiService
      );
    } else {
      // Create a mock AI service for fallback
      const mockAiService = new GoogleGenerativeAIService("dummy-key");
      chatbotService = new EnhancedChatbotService(
        productRepository,
        vectorRepository,
        mockAiService
      );
    }

    const processChatMessage = new ProcessChatMessage(
      chatRepository,
      customerRepository,
      chatbotService
    );

    // Initialize product embeddings if AI service is available
    let initializeEmbeddings: InitializeProductEmbeddings | null = null;
    if (aiService) {
      initializeEmbeddings = new InitializeProductEmbeddings(
        productRepository,
        vectorRepository,
        aiService
      );
    }

    const chatController = new ChatController(
      processChatMessage,
      // Mock use cases for now - you can implement these later
      {} as any, // GetSessionHistory
      {} as any // GetCustomerSessions
    );

    // Routes
    app.use("/api/chat", createChatRoutes(chatController));

    // Health check
    app.get("/health", (req, res) => {
      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        services: {
          ai: !!aiService,
          vector: true,
          database: true,
        },
      });
    });

    // API Info endpoint
    app.get("/api", (req, res) => {
      res.json({
        name: "Customer Support Chatbot API",
        version: "1.0.0",
        endpoints: {
          chat: "/api/chat/message",
          health: "/health",
        },
        features: {
          aiPowered: !!aiService,
          vectorSearch: true,
          contextualResponses: true,
          multiLanguage: false,
        },
      });
    });

    // Error handling
    app.use(errorHandler);

    // 404 handler
    app.use("*", (req, res) => {
      res.status(404).json({ error: "Route not found" });
    });

    // Initialize vector repository
    try {
      await vectorRepository.initialize();
      console.log("✅ Vector database initialized");
    } catch (error) {
      console.error("❌ Vector database initialization failed:", error);
      console.log("⚠️  Continuing without vector database...");
    }

    // Initialize product embeddings if available
    if (initializeEmbeddings && aiService) {
      try {
        console.log("🔄 Initializing product embeddings...");
        await initializeEmbeddings.execute({
          batchSize: 5,
          delayBetweenBatches: 1000,
          maxRetries: 2,
        });
        console.log("✅ Product embeddings initialized");
      } catch (error) {
        console.error("❌ Product embeddings initialization failed:", error);
        console.log("⚠️  Continuing without embeddings...");
      }
    } else {
      console.log(
        "⚠️  AI service not available - skipping embedding initialization"
      );
    }

    console.log("✅ Server initialization completed");
  } catch (error) {
    console.error("❌ Server initialization failed:", error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    await initializeServer();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Customer Support Chatbot server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
      console.log(`📊 API Info: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📋 Received ${signal}, starting graceful shutdown...`);

      server.close(() => {
        console.log("🔌 HTTP server closed");
        console.log("✅ Graceful shutdown completed");
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error("⏰ Force closing server after timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
startServer();

export default app;
