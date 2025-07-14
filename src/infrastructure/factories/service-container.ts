/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
// src/infrastructure/factories/service-container.ts - Updated with MongoDB Auth
import { IEventBus } from '@application/events/IEventBus';
import { ICacheService } from '@application/interfaces/ICacheService';
import { IEmailService } from '@application/interfaces/IEmailService';
import { INotificationService } from '@application/interfaces/INotificationService';
import { AuthenticationService } from '@application/services/auth.service'; // NEW
import { IChatRepository } from '@domain/repositories/IChatRepository';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { IVectorRepository } from '@domain/repositories/IVectorRepository';
import { IChatbotService, IGenerativeAIService } from '@domain/services/chatbot-service';
import { ConfigService } from '@infrastructure/config/app-config';
import { MongoDB } from '@infrastructure/database/mongodb'; // NEW
import { InMemoryChatRepository } from '@infrastructure/repositories/in-memory-chat-repository';
import { InMemoryCustomerRepository } from '@infrastructure/repositories/in-memory-customer-repository';
import { InMemoryProductRepository } from '@infrastructure/repositories/in-memory-product-repository';
import { MongoDBUserRepository } from '@infrastructure/repositories/mongodb-user-repository'; // NEW
import { WeaviateVectorRepository } from '@infrastructure/repositories/weaviate-vector-repository';
import { EnhancedChatbotService } from '@infrastructure/services/enhanced-chatbot-service';
import { InMemoryEventBus } from '@infrastructure/services/event-bus-service';
import { GoogleGenerativeAIService } from '@infrastructure/services/google-generative-ai-service';
import { InMemoryCacheService } from '../services/cache-service';
import { NotificationService } from '../services/notification-service';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🟡 Service container already initialized');
      return;
    }

    console.log('🏗️ Initializing service container...');

    const config = ConfigService.getInstance();

    try {
      // Initialize database connections
      await this.initializeDatabases();

      // Initialize repositories
      await this.initializeRepositories(config);

      // Initialize services
      await this.initializeServices(config);

      // Initialize authentication services
      await this.initializeAuthServices();

      // Initialize AI services
      await this.initializeAIServices(config);

      this.isInitialized = true;
      console.log('✅ Service container initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize service container:', error);
      throw error;
    }
  }

  private async initializeDatabases(): Promise<void> {
    console.log('🔌 Initializing database connections...');

    // Initialize MongoDB
    const mongodb = MongoDB.getInstance();
    await mongodb.connect();
    this.register('mongodb', mongodb);

    console.log('✅ Database connections initialized');
  }

  private async initializeRepositories(config: ConfigService): Promise<void> {
    console.log('🗄️ Initializing repositories...');

    // User Repository (MongoDB) - NEW
    const userRepository = new MongoDBUserRepository();
    this.register('userRepository', userRepository);

    // Customer Repository
    const customerRepository = new InMemoryCustomerRepository();
    this.register('customerRepository', customerRepository);

    // Product Repository
    const productRepository = new InMemoryProductRepository();
    this.register('productRepository', productRepository);

    // Chat Repository
    const chatRepository = new InMemoryChatRepository();
    this.register('chatRepository', chatRepository);

    // Vector Repository
    const vectorConfig = config.getVector();
    const vectorRepository = new WeaviateVectorRepository(
      vectorConfig.weaviateUrl,
      vectorConfig.weaviateApiKey
    );
    await vectorRepository.initialize();
    this.register('vectorRepository', vectorRepository);

    console.log('✅ Repositories initialized');
  }

  private async initializeServices(_config: ConfigService): Promise<void> {
    console.log('🔧 Initializing services...');

    // Cache Service
    const cacheService = new InMemoryCacheService();
    this.register('cacheService', cacheService);

    // Notification Service
    const notificationService = new NotificationService();
    this.register('notificationService', notificationService);

    // Event Bus
    const eventBus = new InMemoryEventBus();
    this.register('eventBus', eventBus);

    console.log('✅ Infrastructure services initialized');
  }

  private async initializeAuthServices(): Promise<void> {
    console.log('🔐 Initializing authentication services...');

    // Authentication Service - NEW
    const userRepository = this.get<MongoDBUserRepository>('userRepository');
    const authService = new AuthenticationService(userRepository);
    this.register('authService', authService);

    console.log('✅ Authentication services initialized');
  }

  private async initializeAIServices(config: ConfigService): Promise<void> {
    const aiConfig = config.getAI();

    // AI Service
    if (aiConfig.googleApiKey) {
      const aiService = new GoogleGenerativeAIService(
        aiConfig.googleApiKey,
        aiConfig.modelName,
        aiConfig.embeddingModelName
      );
      await aiService.initialize();
      this.register('aiService', aiService);

      // Chatbot Service
      const chatbotService = new EnhancedChatbotService(
        this.get('productRepository'),
        this.get('vectorRepository'),
        aiService
      );
      this.register('chatbotService', chatbotService);

      console.log('✅ AI services initialized');
    } else {
      console.warn('⚠️ AI services not initialized - missing API key');
    }
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in container`);
    }
    return service as T;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  // Typed getters for commonly used services (EXISTING METHODS)
  getCustomerRepository(): ICustomerRepository {
    return this.get<ICustomerRepository>('customerRepository');
  }

  getProductRepository(): IProductRepository {
    return this.get<IProductRepository>('productRepository');
  }

  getChatRepository(): IChatRepository {
    return this.get<IChatRepository>('chatRepository');
  }

  getVectorRepository(): IVectorRepository {
    return this.get<IVectorRepository>('vectorRepository');
  }

  getChatbotService(): IChatbotService {
    return this.get<IChatbotService>('chatbotService');
  }

  getAIService(): IGenerativeAIService {
    return this.get<IGenerativeAIService>('aiService');
  }

  getCacheService(): ICacheService {
    return this.get<ICacheService>('cacheService');
  }

  getEmailService(): IEmailService {
    return this.get<IEmailService>('emailService');
  }

  getNotificationService(): INotificationService {
    return this.get<INotificationService>('notificationService');
  }

  getEventBus(): IEventBus {
    return this.get<IEventBus>('eventBus');
  }

  // NEW Authentication getters
  getUserRepository(): MongoDBUserRepository {
    return this.get<MongoDBUserRepository>('userRepository');
  }

  getAuthService(): AuthenticationService {
    return this.get<AuthenticationService>('authService');
  }

  // NEW Database getters
  getMongoDB(): MongoDB {
    return this.get<MongoDB>('mongodb');
  }

  // EXISTING dispose method (keeping compatibility)
  async dispose(): Promise<void> {
    console.log('🧹 Disposing service container...');

    // Dispose services that need cleanup
    const cacheService = this.services.get('cacheService') as InMemoryCacheService;
    if (cacheService) {
      cacheService.destroy();
    }

    // Close database connections
    try {
      const mongodb = this.services.get('mongodb') as MongoDB;
      if (mongodb) {
        await mongodb.disconnect();
      }
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error);
    }

    this.services.clear();
    this.isInitialized = false;
    console.log('✅ Service container disposed');
  }

  // NEW shutdown method (alias for dispose for consistency)
  async shutdown(): Promise<void> {
    return this.dispose();
  }

  // NEW method to check initialization status
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}
