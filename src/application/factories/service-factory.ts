import {
  CreateProduct,
  DeleteProduct,
  GetChatAnalytics,
  GetCustomerSessions,
  GetSessionHistory,
  ProcessChatMessage,
  SearchProducts,
  UpdateCustomer,
  UpdateProduct,
} from '@application/use-cases';
import { IChatRepository } from '@domain/repositories/IChatRepository';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { IProductRepository } from '@domain/repositories/IProductRepository';
import { IVectorRepository } from '@domain/repositories/IVectorRepository';
import { IChatbotService, IGenerativeAIService } from '@domain/services/chatbot-service';

// Use cases
import { AnalyticsService } from '../services/analytics.service';
import { ChatService } from '../services/chat.service';
import { CustomerService } from '../services/customer.service';
import { ProductService } from '../services/product.service';
import { CreateCustomer } from '../use-cases/customer/create-customer';
import { GetCustomer } from '../use-cases/customer/get-customer';

// Services

export class ServiceFactory {
  private customerService?: CustomerService;
  private productService?: ProductService;
  private chatService?: ChatService;
  private analyticsService?: AnalyticsService;

  constructor(
    private customerRepository: ICustomerRepository,
    private productRepository: IProductRepository,
    private chatRepository: IChatRepository,
    private vectorRepository: IVectorRepository,
    private chatbotService: IChatbotService,
    private aiService: IGenerativeAIService
  ) {}

  getCustomerService(): CustomerService {
    if (!this.customerService) {
      const createCustomer = new CreateCustomer(this.customerRepository);
      const getCustomer = new GetCustomer(this.customerRepository);
      const updateCustomer = new UpdateCustomer(this.customerRepository);

      this.customerService = new CustomerService(createCustomer, getCustomer, updateCustomer);
    }
    return this.customerService;
  }

  getProductService(): ProductService {
    if (!this.productService) {
      const createProduct = new CreateProduct(
        this.productRepository,
        this.vectorRepository,
        this.aiService
      );
      const updateProduct = new UpdateProduct(
        this.productRepository,
        this.vectorRepository,
        this.aiService
      );
      const searchProducts = new SearchProducts(this.productRepository, this.chatbotService);
      const deleteProduct = new DeleteProduct(this.productRepository, this.vectorRepository);

      this.productService = new ProductService(
        createProduct,
        updateProduct,
        searchProducts,
        deleteProduct
      );
    }
    return this.productService;
  }

  getChatService(): ChatService {
    if (!this.chatService) {
      const processChatMessage = new ProcessChatMessage(
        this.chatRepository,
        this.customerRepository,
        this.chatbotService
      );
      const sessionHistoryUseCase = new GetSessionHistory(this.chatRepository);
      const customerSessionsUseCase = new GetCustomerSessions();

      this.chatService = new ChatService(
        processChatMessage,
        sessionHistoryUseCase,
        customerSessionsUseCase
      );
    }
    return this.chatService;
  }

  getAnalyticsService(): AnalyticsService {
    if (!this.analyticsService) {
      const chatAnalyticsUseCase = new GetChatAnalytics(this.productRepository);

      this.analyticsService = new AnalyticsService(chatAnalyticsUseCase);
    }
    return this.analyticsService;
  }
}
