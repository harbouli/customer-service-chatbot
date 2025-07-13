// ===========================
// REPOSITORIES

import { AppConfig, ConfigService } from "./config/app-config";
import { ServiceContainer } from "./factories/service-container";
import { HealthChecker, HealthCheckResult } from "./health/health-checker";
import { Metrics, MetricsCollector } from "./monitoring/metrics-collector";
import { InMemoryChatRepository } from "./repositories/in-memory-chat-repository";
import { InMemoryCustomerRepository } from "./repositories/in-memory-customer-repository";
import { InMemoryProductRepository } from "./repositories/in-memory-product-repository";

// ===========================
export { InMemoryCustomerRepository } from "./repositories/in-memory-customer-repository";
export { InMemoryProductRepository } from "./repositories/in-memory-product-repository";
export { InMemoryChatRepository } from "./repositories/in-memory-chat-repository";
export { WeaviateVectorRepository } from "./repositories/weaviate-vector-repository";

// ===========================
// SERVICES
// ===========================
export { GoogleGenerativeAIService } from "./services/google-generative-ai-service";
export { EnhancedChatbotService } from "./services/enhanced-chatbot-service";

// ===========================
// DATABASE
// ===========================
export {
  DatabaseConfig,
  IDatabaseConnection,
  MockDatabaseConnection,
} from "./database/database-connection";

// ===========================
// CONFIGURATION
// ===========================
export {
  ServerConfig,
  AIConfig,
  VectorConfig,
  CacheConfig,
  RateLimitConfig,
  EmailConfig,
  AppConfig,
  ConfigService,
} from "./config/app-config";

// ===========================
// HEALTH & MONITORING
// ===========================
export { HealthCheckResult, HealthChecker } from "./health/health-checker";

export { Metrics, MetricsCollector } from "./monitoring/metrics-collector";

// ===========================
// MIDDLEWARE
// ===========================
export { metricsMiddleware } from "./middleware/metrics-middleware";

// ===========================
// FACTORIES & CONTAINERS
// ===========================
export { ServiceContainer } from "./factories/service-container";

// ===========================
// TYPE DEFINITIONS
// ===========================

// Repository type exports for easier importing
export type { ICustomerRepository } from "@domain/repositories/ICustomerRepository";

export type { IProductRepository } from "@domain/repositories/IProductRepository";

export type { IChatRepository } from "@domain/repositories/IChatRepository";

export type { IVectorRepository } from "@domain/repositories/IVectorRepository";

// Service type exports
export type {
  IChatbotService,
  IGenerativeAIService,
} from "@domain/services/chatbot-service";

export type { ICacheService } from "@application/interfaces/ICacheService";

export type { IEmailService } from "@application/interfaces/IEmailService";

export type { INotificationService } from "@application/interfaces/INotificationService";

export type { IEventBus } from "@application/events/IEventBus";

export type { IEventHandler } from "@application/events/IEventHandler";

// ===========================
// INFRASTRUCTURE FACTORY
// ===========================

/**
 * Factory function to create and initialize all infrastructure components
 * This is the main entry point for setting up the infrastructure layer
 */
export async function createInfrastructure(): Promise<ServiceContainer> {
  console.log("🏗️ Creating infrastructure...");

  const container = ServiceContainer.getInstance();
  await container.initialize();

  console.log("✅ Infrastructure created successfully");
  return container;
}

/**
 * Factory function to create infrastructure with custom configuration
 */
export async function createInfrastructureWithConfig(
  configOverrides: Partial<AppConfig>
): Promise<ServiceContainer> {
  console.log("🏗️ Creating infrastructure with custom config...");

  // Apply configuration overrides
  const config = ConfigService.getInstance();
  const currentConfig = config.get();
  const mergedConfig = { ...currentConfig, ...configOverrides };

  // TODO: Implement config override functionality
  console.log("📝 Configuration overrides applied");

  const container = ServiceContainer.getInstance();
  await container.initialize();

  console.log("✅ Infrastructure with custom config created successfully");
  return container;
}

/**
 * Health check for all infrastructure components
 */
export async function checkInfrastructureHealth(): Promise<HealthCheckResult> {
  const healthChecker = new HealthChecker();
  return await healthChecker.performHealthCheck();
}

/**
 * Get current infrastructure metrics
 */
export function getInfrastructureMetrics(): Metrics {
  return MetricsCollector.getInstance().getMetrics();
}

/**
 * Cleanup function to properly dispose of infrastructure resources
 */
export async function disposeInfrastructure(): Promise<void> {
  console.log("🧹 Disposing infrastructure...");

  const container = ServiceContainer.getInstance();
  await container.dispose();

  console.log("✅ Infrastructure disposed successfully");
}

// ===========================
// INFRASTRUCTURE UTILITIES
// ===========================

/**
 * Utility to validate infrastructure configuration
 */
export function validateInfrastructureConfig(): void {
  const config = ConfigService.getInstance();
  config.validateConfig();
}

/**
 * Utility to get infrastructure configuration
 */
export function getInfrastructureConfig(): AppConfig {
  return ConfigService.getInstance().get();
}

/**
 * Utility to check if infrastructure is properly configured
 */
export function isInfrastructureConfigured(): boolean {
  try {
    validateInfrastructureConfig();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Utility to get infrastructure status summary
 */
export async function getInfrastructureStatus(): Promise<{
  configured: boolean;
  healthy: boolean;
  metrics: Metrics;
  config: AppConfig;
}> {
  const configured = isInfrastructureConfigured();
  let healthy = false;
  let metrics: Metrics;
  let config: AppConfig;

  try {
    const healthResult = await checkInfrastructureHealth();
    healthy = healthResult.status === "healthy";
    metrics = getInfrastructureMetrics();
    config = getInfrastructureConfig();
  } catch (error) {
    console.error("Failed to get infrastructure status:", error);
    metrics = MetricsCollector.getInstance().getMetrics();
    config = ConfigService.getInstance().get();
  }

  return {
    configured,
    healthy,
    metrics,
    config,
  };
}

// ===========================
// INFRASTRUCTURE CONSTANTS
// ===========================

export const INFRASTRUCTURE_CONSTANTS = {
  DEFAULT_CACHE_TTL: 3600, // 1 hour
  DEFAULT_RATE_LIMIT_WINDOW: 900000, // 15 minutes
  DEFAULT_RATE_LIMIT_MAX: 100,
  DEFAULT_EMBEDDING_DIMENSIONS: 384,
  DEFAULT_BATCH_SIZE: 10,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_CONNECTION_TIMEOUT: 60000, // 1 minute
} as const;

// ===========================
// INFRASTRUCTURE ERRORS
// ===========================

export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "InfrastructureError";
  }
}

export class ConfigurationError extends InfrastructureError {
  constructor(message: string, originalError?: Error) {
    super(message, "Configuration", originalError);
    this.name = "ConfigurationError";
  }
}

export class ServiceInitializationError extends InfrastructureError {
  constructor(serviceName: string, originalError?: Error) {
    super(
      `Failed to initialize service: ${serviceName}`,
      serviceName,
      originalError
    );
    this.name = "ServiceInitializationError";
  }
}

export class DatabaseConnectionError extends InfrastructureError {
  constructor(message: string, originalError?: Error) {
    super(message, "Database", originalError);
    this.name = "DatabaseConnectionError";
  }
}

export class VectorRepositoryError extends InfrastructureError {
  constructor(message: string, originalError?: Error) {
    super(message, "VectorRepository", originalError);
    this.name = "VectorRepositoryError";
  }
}

export class AIServiceError extends InfrastructureError {
  constructor(message: string, originalError?: Error) {
    super(message, "AIService", originalError);
    this.name = "AIServiceError";
  }
}

// ===========================
// RE-EXPORTS FOR CONVENIENCE
// ===========================

// Re-export commonly used domain interfaces for convenience
export type { Customer } from "@domain/entities/customer";
export type { Product } from "@domain/entities/product";
export type { ChatSession } from "@domain/entities/chat-session";
export type { ChatMessage, MessageType } from "@domain/entities/chat-message";
export type { ProductEmbedding } from "@domain/entities/product-embedding";
export type { ChatContext } from "@domain/entities/chat-context";

// Re-export commonly used application DTOs
export type { ChatRequestDto } from "@application/dtos/chat-request-dto";

export type {
  CustomerDto,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "@application/dtos/customer-dto";

export type {
  ProductDto,
  CreateProductDto,
  UpdateProductDto,
  ProductSearchDto,
} from "@application/dtos/product-dto";

// Re-export common shared errors
export type {
  CustomError,
  ValidationError,
  NotFoundError,
} from "@shared/errors/custom-error";

// ===========================
// VERSION INFO
// ===========================

export const INFRASTRUCTURE_VERSION = "1.0.0";
export const INFRASTRUCTURE_BUILD_DATE = new Date().toISOString();

/**
 * Get infrastructure version information
 */
export function getInfrastructureVersion(): {
  version: string;
  buildDate: string;
  nodeVersion: string;
  platform: string;
} {
  return {
    version: INFRASTRUCTURE_VERSION,
    buildDate: INFRASTRUCTURE_BUILD_DATE,
    nodeVersion: process.version,
    platform: process.platform,
  };
}

// ===========================
// DEVELOPMENT UTILITIES
// ===========================

/**
 * Development utility to seed repositories with test data
 * Only available in development environment
 */
export async function seedInfrastructureData(): Promise<void> {
  const config = ConfigService.getInstance();

  if (!config.isDevelopment()) {
    throw new Error(
      "Data seeding is only available in development environment"
    );
  }

  console.log("🌱 Seeding infrastructure with test data...");

  const container = ServiceContainer.getInstance();

  // Seed customer repository
  const customerRepo =
    container.getCustomerRepository() as InMemoryCustomerRepository;
  customerRepo.seed();

  // Seed product repository
  const productRepo =
    container.getProductRepository() as InMemoryProductRepository;
  productRepo.seed();

  console.log("✅ Infrastructure data seeded successfully");
}

/**
 * Development utility to clear all data
 * Only available in development environment
 */
export async function clearInfrastructureData(): Promise<void> {
  const config = ConfigService.getInstance();

  if (!config.isDevelopment()) {
    throw new Error(
      "Data clearing is only available in development environment"
    );
  }

  console.log("🧹 Clearing infrastructure data...");

  const container = ServiceContainer.getInstance();

  // Clear repositories
  const customerRepo =
    container.getCustomerRepository() as InMemoryCustomerRepository;
  customerRepo.clear();

  const productRepo =
    container.getProductRepository() as InMemoryProductRepository;
  productRepo.clear();

  const chatRepo = container.getChatRepository() as InMemoryChatRepository;
  chatRepo.clear();

  // Reset metrics
  MetricsCollector.getInstance().reset();

  console.log("✅ Infrastructure data cleared successfully");
}

// ===========================
// MAIN INFRASTRUCTURE EXPORT
// ===========================

/**
 * Main infrastructure object containing all components and utilities
 * This is the primary interface for working with the infrastructure layer
 */
export const Infrastructure = {
  // Core functions
  create: createInfrastructure,
  createWithConfig: createInfrastructureWithConfig,
  dispose: disposeInfrastructure,

  // Status and monitoring
  getStatus: getInfrastructureStatus,
  checkHealth: checkInfrastructureHealth,
  getMetrics: getInfrastructureMetrics,

  // Configuration
  getConfig: getInfrastructureConfig,
  validateConfig: validateInfrastructureConfig,
  isConfigured: isInfrastructureConfigured,

  // Version info
  getVersion: getInfrastructureVersion,

  // Development utilities
  seed: seedInfrastructureData,
  clear: clearInfrastructureData,

  // Constants and errors
  constants: INFRASTRUCTURE_CONSTANTS,
  errors: {
    InfrastructureError,
    ConfigurationError,
    ServiceInitializationError,
    DatabaseConnectionError,
    VectorRepositoryError,
    AIServiceError,
  },
} as const;

// Make Infrastructure the default export as well
export default Infrastructure;
