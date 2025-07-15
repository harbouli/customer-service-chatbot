/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
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
import { MongoDBUserRepository } from '@infrastructure/repositories/mongodb-user-repository'; // NEW
import { WeaviateVectorRepository } from '@infrastructure/repositories/weaviate-vector-repository';
import { EnhancedChatbotService } from '@infrastructure/services/enhanced-chatbot-service';
import { InMemoryEventBus } from '@infrastructure/services/event-bus-service';
import { GoogleGenerativeAIService } from '@infrastructure/services/google-generative-ai-service';
import { MongoDBCustomerRepository } from '../repositories/mongodb-customer-repository';
import { InMemoryCacheService } from '../services/cache-service';
import { NotificationService } from '../services/notification-service';

// Import Customer Use Cases
import { GetCustomer, UpdateCustomer } from '@application/use-cases';
import { CreateCustomer } from '@application/use-cases/customer/create-customer';
import {
  ActivateCustomer,
  DeactivateCustomer,
  GetCustomerStatistics,
} from '@application/use-cases/customer/customer';
import {
  DeleteCustomer,
  GetCustomerByEmail,
} from '@application/use-cases/customer/delete-customer';
import { GetAllCustomers } from '@application/use-cases/customer/get-all-customers';

// Import Customer Controller
import { CustomerController } from '@presentation/controllers/customer-controller';
import { MongoDBProductRepository } from '../repositories/mongodb-product-repository';

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private isInitialized = false;

  // Customer-related instances
  private customerController?: CustomerController | undefined;
  private customerUseCases?:
    | {
        createCustomer: CreateCustomer;
        getCustomer: GetCustomer;
        updateCustomer: UpdateCustomer;
        deleteCustomer: DeleteCustomer;
        getCustomerByEmail: GetCustomerByEmail;
        getAllCustomers: GetAllCustomers;
        activateCustomer: ActivateCustomer;
        deactivateCustomer: DeactivateCustomer;
        getCustomerStatistics: GetCustomerStatistics;
      }
    | undefined;

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

      // Initialize customer use cases and controller
      await this.initializeCustomerServices();

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
    const customerRepository = new MongoDBCustomerRepository();
    this.register('customerRepository', customerRepository);

    // Product Repository
    const productRepository = new MongoDBProductRepository();
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
    console.log('🤖 Initializing AI services...');

    const aiConfig = config.getAI();

    // DEBUG: Log the configuration
    console.log('🔍 AI Configuration:', {
      hasApiKey: !!aiConfig.googleApiKey,
      apiKeyLength: aiConfig.googleApiKey?.length || 0,
      modelName: aiConfig.modelName,
      embeddingModelName: aiConfig.embeddingModelName,
    });

    // Check if API key exists
    if (!aiConfig.googleApiKey) {
      console.error('❌ GOOGLE_AI_API_KEY is missing from environment variables');
      console.log('💡 To fix this:');
      console.log('   1. Get API key from https://makersuite.google.com/app/apikey');
      console.log('   2. Add GOOGLE_AI_API_KEY=your_key_here to your .env file');
      console.log('   3. Restart the application');
      return;
    }

    if (aiConfig.googleApiKey.startsWith('your_') || aiConfig.googleApiKey === 'dummy-key') {
      console.error('❌ Please replace placeholder API key with real Google AI API key');
      return;
    }

    try {
      // AI Service
      console.log('🔄 Creating Google AI service...');
      const aiService = new GoogleGenerativeAIService(
        aiConfig.googleApiKey,
        aiConfig.modelName,
        aiConfig.embeddingModelName
      );

      console.log('🔄 Initializing AI service...');
      await aiService.initialize();
      this.register('aiService', aiService);
      console.log('✅ AI service initialized successfully');

      // Chatbot Service
      console.log('🔄 Creating chatbot service...');
      const chatbotService = new EnhancedChatbotService(
        this.get('productRepository'),
        this.get('vectorRepository'),
        aiService
      );
      this.register('chatbotService', chatbotService);
      console.log('✅ Chatbot service initialized successfully');

      console.log('✅ All AI services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI services:', error);

      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          console.error('💡 Your Google AI API key appears to be invalid');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          console.error('💡 Your Google AI API quota has been exceeded');
        } else if (error.message.includes('PERMISSION_DENIED')) {
          console.error('💡 Your Google AI API key lacks required permissions');
        }
      }

      // Don't throw - allow app to continue without AI
      console.warn('⚠️ Continuing without AI services...');
    }
  }

  private async initializeCustomerServices(): Promise<void> {
    console.log('👥 Initializing customer services...');

    try {
      // Get customer repository
      const customerRepository = this.getCustomerRepository();

      // Initialize customer use cases
      this.customerUseCases = {
        createCustomer: new CreateCustomer(customerRepository),
        getCustomer: new GetCustomer(customerRepository),
        updateCustomer: new UpdateCustomer(customerRepository),
        deleteCustomer: new DeleteCustomer(customerRepository),
        getCustomerByEmail: new GetCustomerByEmail(customerRepository),
        getAllCustomers: new GetAllCustomers(customerRepository),
        activateCustomer: new ActivateCustomer(customerRepository),
        deactivateCustomer: new DeactivateCustomer(customerRepository),
        getCustomerStatistics: new GetCustomerStatistics(customerRepository),
      };

      // Initialize customer controller
      this.customerController = new CustomerController(
        this.customerUseCases.createCustomer,
        this.customerUseCases.getCustomer,
        this.customerUseCases.updateCustomer,
        this.customerUseCases.deleteCustomer,
        this.customerUseCases.getCustomerByEmail,
        this.customerUseCases.getAllCustomers,
        this.customerUseCases.activateCustomer,
        this.customerUseCases.deactivateCustomer,
        this.customerUseCases.getCustomerStatistics
      );

      // Register services
      this.register('customerUseCases', this.customerUseCases);
      this.register('customerController', this.customerController);

      console.log('✅ Customer services initialized');
    } catch (error) {
      console.error('❌ Failed to initialize customer services:', error);
      throw error;
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

  // NEW Customer getters
  getCustomerController(): CustomerController {
    if (!this.customerController) {
      throw new Error('Customer controller not initialized. Call initialize() first.');
    }
    return this.customerController;
  }

  getCustomerUseCases(): {
    createCustomer: CreateCustomer;
    getCustomer: GetCustomer;
    updateCustomer: UpdateCustomer;
    deleteCustomer: DeleteCustomer;
    getCustomerByEmail: GetCustomerByEmail;
    getAllCustomers: GetAllCustomers;
    activateCustomer: ActivateCustomer;
    deactivateCustomer: DeactivateCustomer;
    getCustomerStatistics: GetCustomerStatistics;
  } {
    if (!this.customerUseCases) {
      throw new Error('Customer use cases not initialized. Call initialize() first.');
    }
    return this.customerUseCases;
  }

  // Individual customer use case getters for flexibility
  getCreateCustomerUseCase(): CreateCustomer {
    return this.getCustomerUseCases().createCustomer;
  }

  getGetCustomerUseCase(): GetCustomer {
    return this.getCustomerUseCases().getCustomer;
  }

  getUpdateCustomerUseCase(): UpdateCustomer {
    return this.getCustomerUseCases().updateCustomer;
  }

  getDeleteCustomerUseCase(): DeleteCustomer {
    return this.getCustomerUseCases().deleteCustomer;
  }

  getGetCustomerByEmailUseCase(): GetCustomerByEmail {
    return this.getCustomerUseCases().getCustomerByEmail;
  }

  getGetAllCustomersUseCase(): GetAllCustomers {
    return this.getCustomerUseCases().getAllCustomers;
  }

  getActivateCustomerUseCase(): ActivateCustomer {
    return this.getCustomerUseCases().activateCustomer;
  }

  getDeactivateCustomerUseCase(): DeactivateCustomer {
    return this.getCustomerUseCases().deactivateCustomer;
  }

  getGetCustomerStatisticsUseCase(): GetCustomerStatistics {
    return this.getCustomerUseCases().getCustomerStatistics;
  }

  // EXISTING dispose method (keeping compatibility)
  async dispose(): Promise<void> {
    console.log('🧹 Disposing service container...');

    // Clear customer services
    this.customerController = undefined;
    this.customerUseCases = undefined;

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

  // Utility method to get service health status
  getServiceHealthStatus(): {
    initialized: boolean;
    mongodb: boolean;
    repositories: boolean;
    customerServices: boolean;
    authServices: boolean;
    aiServices: boolean;
  } {
    return {
      initialized: this.isInitialized,
      mongodb: this.has('mongodb'),
      repositories: this.has('customerRepository') && this.has('productRepository'),
      customerServices: !!this.customerController && !!this.customerUseCases,
      authServices: this.has('authService') && this.has('userRepository'),
      aiServices: this.has('aiService') && this.has('chatbotService'),
    };
  }
}
