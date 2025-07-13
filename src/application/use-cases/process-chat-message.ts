/* eslint-disable no-console */
/* eslint-disable max-lines */
/* eslint-disable max-len */
import { ChatContext } from '@domain/entities/chat-context';
import { ChatMessage, MessageType } from '@domain/entities/chat-message';
import { ChatSession } from '@domain/entities/chat-session';
import { Customer } from '@domain/entities/customer';
import { Product } from '@domain/entities/product';
import { IChatRepository } from '@domain/repositories/IChatRepository';
import { ICustomerRepository } from '@domain/repositories/ICustomerRepository';
import { IChatbotService } from '@domain/services/chatbot-service';
import { NotFoundError, ValidationError } from '@shared/errors/custom-error';
import { v4 as uuidv4 } from 'uuid';

import { ChatRequestDto } from '../dtos/chat-request-dto';
import { ChatResponseDto } from '../dtos/chat-response-dto';

export interface ProcessChatMessageDependencies {
  chatRepository: IChatRepository;
  customerRepository: ICustomerRepository;
  chatbotService: IChatbotService;
}

export class ProcessChatMessage {
  private readonly chatRepository: IChatRepository;
  private readonly customerRepository: ICustomerRepository;
  private readonly chatbotService: IChatbotService;

  constructor(dependencies: ProcessChatMessageDependencies);
  constructor(
    chatRepository: IChatRepository,
    customerRepository: ICustomerRepository,
    chatbotService: IChatbotService
  );
  constructor(
    chatRepositoryOrDeps: IChatRepository | ProcessChatMessageDependencies,
    customerRepository?: ICustomerRepository,
    chatbotService?: IChatbotService
  ) {
    if (this.isDependenciesObject(chatRepositoryOrDeps)) {
      this.chatRepository = chatRepositoryOrDeps.chatRepository;
      this.customerRepository = chatRepositoryOrDeps.customerRepository;
      this.chatbotService = chatRepositoryOrDeps.chatbotService;
    } else {
      this.chatRepository = chatRepositoryOrDeps;
      this.customerRepository = customerRepository!;
      this.chatbotService = chatbotService!;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isDependenciesObject(obj: any): obj is ProcessChatMessageDependencies {
    return obj && typeof obj === 'object' && 'chatRepository' in obj;
  }

  async execute(request: ChatRequestDto): Promise<ChatResponseDto> {
    // Input validation
    this.validateRequest(request);

    try {
      // Step 1: Validate customer exists
      const customer = await this.validateAndGetCustomer(request.customerId);

      // Step 2: Get or create chat session
      const session = await this.getOrCreateChatSession(request, customer);

      await this.saveUserMessage(request.message, session);

      // Step 4: Build context for AI processing
      const context = await this.buildChatContext(session, customer);

      // Step 5: Process message with chatbot service
      const botResponse = await this.processBotResponse(request.message, context);

      await this.saveBotMessage(botResponse, session);

      // Step 7: Generate suggested actions
      const suggestedActions = this.generateSuggestedActions(
        request.message,
        context.relevantProducts
      );

      // Step 8: Create and return response
      return this.createResponse(session, botResponse, suggestedActions);
    } catch (error) {
      console.error('Error processing chat message:', error);

      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }

      throw new Error('Failed to process chat message. Please try again.');
    }
  }

  private validateRequest(request: ChatRequestDto): void {
    if (!request.customerId || request.customerId.trim() === '') {
      throw new ValidationError('Customer ID is required');
    }

    if (!request.message || request.message.trim() === '') {
      throw new ValidationError('Message is required');
    }

    if (request.message.length > 2000) {
      throw new ValidationError('Message cannot exceed 2000 characters');
    }

    if (request.sessionId && request.sessionId.trim() === '') {
      throw new ValidationError('Session ID cannot be empty if provided');
    }
  }

  private async validateAndGetCustomer(customerId: string): Promise<Customer> {
    let customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      // Auto-create customer if they don't exist
      console.log(`Creating new customer with ID: ${customerId}`);

      customer = new Customer(
        customerId,
        `User ${customerId}`, // Default name
        `${customerId}@example.com` // Default email
      );

      await this.customerRepository.save(customer);
      console.log(`✅ Auto-created customer: ${customerId}`);
    }

    return customer;
  }

  private async getOrCreateChatSession(
    request: ChatRequestDto,
    customer: Customer
  ): Promise<ChatSession> {
    let session: ChatSession | null = null;

    // Try to find existing session
    if (request.sessionId) {
      session = await this.chatRepository.findSessionById(request.sessionId);

      // Validate session belongs to customer
      if (session && session.customerId !== customer.id) {
        throw new ValidationError('Session does not belong to the specified customer');
      }
    }

    // If no session found by ID, try to find active session for customer
    if (!session) {
      session = await this.chatRepository.findActiveSessionByCustomerId(customer.id);
    }

    // Create new session if none found
    if (!session) {
      session = this.createNewChatSession(customer.id);
      await this.chatRepository.saveSession(session);
    }

    return session;
  }

  private createNewChatSession(customerId: string): ChatSession {
    return new ChatSession(uuidv4(), customerId, [], new Date(), true);
  }

  private async saveUserMessage(
    messageContent: string,
    session: ChatSession
  ): Promise<ChatMessage> {
    const userMessage = new ChatMessage(
      uuidv4(),
      messageContent.trim(),
      MessageType.USER,
      new Date(),
      session.id
    );

    await this.chatRepository.saveMessage(userMessage);
    return userMessage;
  }

  private async buildChatContext(session: ChatSession, customer: Customer): Promise<ChatContext> {
    // Get recent messages for context (last 20 messages)
    const recentMessages = await this.chatRepository.getSessionMessages(session.id);
    const contextMessages = recentMessages
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-20);

    // Extract conversation context for product search
    const conversationText = this.extractConversationText(contextMessages);

    // Find relevant products using vector search
    const relevantProducts = await this.findRelevantProducts(conversationText);

    return new ChatContext(session.id, customer.id, contextMessages, customer, relevantProducts);
  }

  private extractConversationText(messages: ChatMessage[]): string {
    return messages
      .filter(msg => msg.type === MessageType.USER)
      .map(msg => msg.content)
      .join(' ');
  }

  private async findRelevantProducts(conversationText: string): Promise<Product[]> {
    try {
      if (!conversationText.trim()) {
        return [];
      }

      // Use the last user message for product search
      const lastUserMessage = conversationText.split(' ').slice(-50).join(' '); // Last 50 words
      return await this.chatbotService.findSimilarProducts(lastUserMessage, 5);
    } catch (error) {
      console.error('Error finding relevant products:', error);
      return [];
    }
  }

  private async processBotResponse(message: string, context: ChatContext): Promise<string> {
    try {
      return await this.chatbotService.processMessage(message, context);
    } catch (error) {
      console.error('Error processing bot response:', error);
      return this.getFallbackResponse(message, context);
    }
  }

  private getFallbackResponse(message: string, context: ChatContext): string {
    const lowerMessage = message.toLowerCase();

    // Greeting response
    if (this.isGreeting(lowerMessage)) {
      return `Hello ${context.customerProfile.name}! I'm here to help you with your questions. How can I assist you today?`;
    }

    // Product inquiry response
    if (this.isProductInquiry(lowerMessage)) {
      if (context.relevantProducts.length > 0) {
        const productNames = context.relevantProducts
          .slice(0, 3)
          .map(p => p.name)
          .join(', ');
        return `I found some products that might interest you: ${productNames}. Would you like more details about any of these?`;
      }
      return "I'd be happy to help you find products. Could you tell me more about what you're looking for?";
    }

    // Order inquiry response
    if (this.isOrderInquiry(lowerMessage)) {
      return 'I can help you with order-related questions. Please provide your order number or tell me what specific information you need about your order.';
    }

    // Support request response
    if (this.isSupportRequest(lowerMessage)) {
      return `I'm here to help, ${context.customerProfile.name}. I can assist you with product information, order status, and general questions. What would you like help with?`;
    }

    // Default response
    return `I understand you're reaching out for help, ${context.customerProfile.name}. I can assist you with product information, order inquiries, and general support. Could you please provide more details about what you need help with?`;
  }

  private isGreeting(message: string): boolean {
    const greetingPatterns = [
      'hello',
      'hi',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'greetings',
      'howdy',
    ];
    return greetingPatterns.some(pattern => message.includes(pattern));
  }

  private isProductInquiry(message: string): boolean {
    const productPatterns = [
      'product',
      'item',
      'find',
      'search',
      'looking for',
      'need',
      'want',
      'buy',
      'purchase',
      'show me',
      'catalog',
      'inventory',
    ];
    return productPatterns.some(pattern => message.includes(pattern));
  }

  private isOrderInquiry(message: string): boolean {
    const orderPatterns = [
      'order',
      'purchase',
      'bought',
      'track',
      'delivery',
      'shipping',
      'status',
      'when will',
      'receipt',
      'confirmation',
    ];
    return orderPatterns.some(pattern => message.includes(pattern));
  }

  private isSupportRequest(message: string): boolean {
    const supportPatterns = [
      'help',
      'support',
      'problem',
      'issue',
      'trouble',
      'error',
      'question',
      'assistance',
      'can you',
      'need help',
    ];
    return supportPatterns.some(pattern => message.includes(pattern));
  }

  private async saveBotMessage(
    responseContent: string,
    session: ChatSession
  ): Promise<ChatMessage> {
    const botMessage = new ChatMessage(
      uuidv4(),
      responseContent,
      MessageType.BOT,
      new Date(),
      session.id
    );

    await this.chatRepository.saveMessage(botMessage);
    return botMessage;
  }

  private generateSuggestedActions(userMessage: string, relevantProducts: Product[]): string[] {
    const lowerMessage = userMessage.toLowerCase();
    const actions: string[] = [];

    // Order-related actions
    if (this.isOrderInquiry(lowerMessage)) {
      actions.push('Track Order', 'Cancel Order', 'Return Policy', 'Contact Support');
    }

    // Product-related actions
    if (this.isProductInquiry(lowerMessage)) {
      actions.push('Browse Categories', 'View All Products', 'Check Stock');

      if (relevantProducts.length > 0) {
        actions.push('Compare Products', 'View Similar Items', 'Add to Wishlist');
      }
    }

    // Support-related actions
    if (this.isSupportRequest(lowerMessage)) {
      actions.push('Contact Support', 'FAQ', 'Live Chat', 'Report Issue');
    }

    // Context-based actions
    if (relevantProducts.length > 0) {
      const inStockProducts = relevantProducts.filter(p => p.inStock);
      if (inStockProducts.length > 0) {
        actions.push('Add to Cart', 'Check Availability');
      }
    }

    // General actions if none specific
    if (actions.length === 0) {
      actions.push('Browse Products', 'Contact Support', 'FAQ', 'My Account');
    }

    // Remove duplicates and limit to 6 actions
    return [...new Set(actions)].slice(0, 6);
  }

  private createResponse(
    session: ChatSession,
    botResponse: string,
    suggestedActions: string[]
  ): ChatResponseDto {
    return {
      sessionId: session.id,
      response: botResponse,
      timestamp: new Date(),
      suggestedActions,
    };
  }

  // Additional utility methods for testing and debugging
  async getSessionInfo(sessionId: string): Promise<{
    session: ChatSession | null;
    messageCount: number;
    lastActivity: Date | null;
  }> {
    const session = await this.chatRepository.findSessionById(sessionId);

    if (!session) {
      return {
        session: null,
        messageCount: 0,
        lastActivity: null,
      };
    }

    const messages = await this.chatRepository.getSessionMessages(sessionId);
    const lastActivity =
      messages.length > 0
        ? (messages[messages.length - 1]?.timestamp ?? new Date())
        : session.createdAt;

    return {
      session,
      messageCount: messages.length,
      lastActivity,
    };
  }

  async validateSession(sessionId: string, customerId: string): Promise<boolean> {
    const session = await this.chatRepository.findSessionById(sessionId);
    return session !== null && session.customerId === customerId && session.isActive;
  }
}
