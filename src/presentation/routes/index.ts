import {
  BulkInitializeEmbeddings,
  CreateCustomer,
  CreateProduct,
  DeleteProduct,
  GetChatAnalytics,
  GetCustomer,
  GetCustomerSessions,
  GetSessionHistory,
  InitializeProductEmbeddings,
  ProcessChatMessage,
  SearchProducts,
  UpdateCustomer,
  UpdateProduct,
} from "@application/use-cases";
import { ServiceContainer } from "@infrastructure/index";
import { Router } from "express";

// Import route creators
import { AdminController } from "../controllers/admin-controller";
import { AnalyticsController } from "../controllers/analytics-controller";
import { ChatController } from "../controllers/chat-controller";
import { CustomerController } from "../controllers/customer-controller";
import { ProductController } from "../controllers/product-controller";

import { createAdminRoutes } from "./admin-routes";
import { createAnalyticsRoutes } from "./analytics-routes";
import { createChatRoutes } from "./chat-routes";
import { createCustomerRoutes } from "./customer-routes";
import { createProductRoutes } from "./product-routes";
import { createPublicRoutes } from "./public-routes";

// Import controllers


export function createApiRoutes(container: ServiceContainer): Router {
  const router = Router();

  // Get repositories and services from container
  const customerRepository = container.getCustomerRepository();
  const productRepository = container.getProductRepository();
  const chatRepository = container.getChatRepository();
  const vectorRepository = container.getVectorRepository();
  const chatbotService = container.getChatbotService();
  const aiService = container.getAIService();

  // Initialize use cases
  const processChatMessage = new ProcessChatMessage(
    chatRepository,
    customerRepository,
    chatbotService
  );

  const getSessionHistory = new GetSessionHistory(chatRepository);
  const getCustomerSessions = new GetCustomerSessions(chatRepository);

  const createCustomer = new CreateCustomer(customerRepository);
  const getCustomer = new GetCustomer(customerRepository);
  const updateCustomer = new UpdateCustomer(customerRepository);

  const createProduct = new CreateProduct(
    productRepository,
    vectorRepository,
    aiService
  );
  const updateProduct = new UpdateProduct(
    productRepository,
    vectorRepository,
    aiService
  );
  const searchProducts = new SearchProducts(productRepository, chatbotService);
  const deleteProduct = new DeleteProduct(productRepository, vectorRepository);

  const getChatAnalytics = new GetChatAnalytics(
    chatRepository,
    productRepository
  );

  const initializeProductEmbeddings = new InitializeProductEmbeddings(
    productRepository,
    vectorRepository,
    aiService
  );

  const bulkInitializeEmbeddings = new BulkInitializeEmbeddings(
    productRepository,
    vectorRepository,
    aiService
  );

  // Initialize controllers
  const chatController = new ChatController(
    processChatMessage,
    getSessionHistory,
    getCustomerSessions
  );

  const customerController = new CustomerController(
    createCustomer,
    getCustomer,
    updateCustomer
  );

  const productController = new ProductController(
    createProduct,
    updateProduct,
    searchProducts,
    deleteProduct
  );

  const analyticsController = new AnalyticsController(getChatAnalytics);

  const adminController = new AdminController(
    initializeProductEmbeddings,
    bulkInitializeEmbeddings
  );

  // Mount route groups
  router.use("/chat", createChatRoutes(chatController));
  router.use("/customers", createCustomerRoutes(customerController));
  router.use("/products", createProductRoutes(productController));
  router.use("/analytics", createAnalyticsRoutes(analyticsController));
  router.use("/admin", createAdminRoutes(adminController));

  return router;
}

// Main router factory
export function createMainRouter(container: ServiceContainer): Router {
  const router = Router();

  // Mount public routes
  router.use("/", createPublicRoutes());

  // Mount API routes
  router.use("/api", createApiRoutes(container));

  // 404 handler for API routes
  router.use("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: "API endpoint not found",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        "/api/info",
        "/api/chat",
        "/api/customers",
        "/api/products",
        "/api/analytics",
        "/api/admin",
        "/health",
      ],
    });
  });

  return router;
}

// Export individual route creators for flexibility
export {
  createChatRoutes,
  createCustomerRoutes,
  createProductRoutes,
  createAnalyticsRoutes,
  createAdminRoutes,
  createPublicRoutes,
};
