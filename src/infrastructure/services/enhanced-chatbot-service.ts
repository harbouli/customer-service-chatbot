import { ChatContext } from '../../domain/entities/chat-context';
import { Product } from '../../domain/entities/product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { IVectorRepository } from '../../domain/repositories/IVectorRepository';
import { IChatbotService, IGenerativeAIService } from '../../domain/services/chatbot-service';

export class EnhancedChatbotService implements IChatbotService {
  constructor(
    private productRepository: IProductRepository,
    private vectorRepository: IVectorRepository,
    private aiService: IGenerativeAIService
  ) {}

  async processMessage(message: string, context: ChatContext): Promise<string> {
    try {
      // Build comprehensive prompt with context
      const prompt = this.buildPrompt(message, context);

      // Generate AI response
      const response = await this.aiService.generateResponse(prompt);

      return response;
    } catch (error) {
      console.error('Failed to process message with AI:', error);
      // Fallback to rule-based processing
      return await this.fallbackProcessing(message, context);
    }
  }

  async findProducts(query: string): Promise<Product[]> {
    return await this.productRepository.findByName(query);
  }

  async getProductInfo(productId: string): Promise<Product | null> {
    return await this.productRepository.findById(productId);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return await this.aiService.generateEmbedding(text);
  }

  async findSimilarProducts(query: string, limit: number = 5): Promise<Product[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      return await this.vectorRepository.searchSimilarProducts(queryEmbedding, limit);
    } catch (error) {
      console.error('Failed to find similar products:', error);
      // Fallback to text-based search
      return await this.productRepository.findByName(query);
    }
  }

  private buildPrompt(message: string, context: ChatContext): string {
    const { customerProfile, recentMessages, relevantProducts } = context;

    const prompt = `You are a helpful customer support assistant for an e-commerce platform. 

Customer Information:
- Name: ${customerProfile.name}
- Email: ${customerProfile.email}

Recent Conversation:
${recentMessages
  .slice(-5)
  .map(msg => `${msg.type}: ${msg.content}`)
  .join('\n')}

Current Customer Message: "${message}"

Relevant Products:
${relevantProducts
  .slice(0, 3)
  .map(
    p => `- ${p.name} (${p.price}) - ${p.description} [${p.inStock ? 'In Stock' : 'Out of Stock'}]`
  )
  .join('\n')}

Instructions:
1. Respond in a friendly, helpful manner
2. If the customer asks about products, reference the relevant products above
3. Provide accurate information about stock availability and pricing
4. If you don't have specific information, acknowledge it and offer to help find it
5. Keep responses concise but informative (max 200 words)
6. If the customer seems frustrated, be extra empathetic
7. Always end with a question or offer to help further

Response:`;

    return prompt;
  }

  private async fallbackProcessing(message: string, context: ChatContext): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Greeting patterns
    if (this.isGreeting(lowerMessage)) {
      return `Hello ${context.customerProfile.name}! I'm here to help you with your products and orders. How can I assist you today?`;
    }

    // Product search patterns
    if (this.isProductSearch(lowerMessage)) {
      return await this.handleProductSearch(lowerMessage, context.relevantProducts);
    }

    // Order patterns
    if (this.isOrderInquiry(lowerMessage)) {
      return 'I can help you with order-related questions. Please provide your order number or tell me what specific information you need about your order.';
    }

    // Stock check patterns
    if (this.isStockCheck(lowerMessage)) {
      return await this.handleStockCheck(lowerMessage, context.relevantProducts);
    }

    // Default response with context
    return `I understand you're looking for help, ${context.customerProfile.name}. I can assist you with product information, order status, stock availability, and general support. Could you please be more specific about what you need?`;
  }

  private isGreeting(message: string): boolean {
    const greetingPatterns = [
      'hello',
      'hi',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
    ];
    return greetingPatterns.some(pattern => message.includes(pattern));
  }

  private isProductSearch(message: string): boolean {
    const productPatterns = ['product', 'item', 'find', 'search', 'looking for', 'need'];
    return productPatterns.some(pattern => message.includes(pattern));
  }

  private isOrderInquiry(message: string): boolean {
    const orderPatterns = ['order', 'purchase', 'bought', 'track', 'delivery', 'shipping'];
    return orderPatterns.some(pattern => message.includes(pattern));
  }

  private isStockCheck(message: string): boolean {
    const stockPatterns = ['stock', 'available', 'in stock', 'out of stock', 'availability'];
    return stockPatterns.some(pattern => message.includes(pattern));
  }

  private async handleProductSearch(
    _message: string,
    relevantProducts: Product[]
  ): Promise<string> {
    if (relevantProducts.length === 0) {
      return "I couldn't find any products matching your search. Could you try different keywords or browse our categories?";
    }

    const productList = relevantProducts
      .slice(0, 3)
      .map(
        product =>
          `• ${product.name} - ${product.price} (${
            product.inStock ? 'In Stock' : 'Out of Stock'
          })\n  ${product.description}`
      )
      .join('\n\n');

    return `Here are some products that might interest you:\n\n${productList}\n\nWould you like more details about any of these products?`;
  }

  private async handleStockCheck(_message: string, relevantProducts: Product[]): Promise<string> {
    if (relevantProducts.length > 0) {
      const stockInfo = relevantProducts
        .map(product => `• ${product.name}: ${product.inStock ? 'In Stock' : 'Out of Stock'}`)
        .join('\n');

      return `Here's the current stock status for relevant products:\n\n${stockInfo}\n\nWould you like me to check the availability of a specific product?`;
    }

    const allProducts = await this.productRepository.findAll();
    const inStockProducts = allProducts.filter(product => product.inStock);

    return `We currently have ${inStockProducts.length} products in stock. Would you like me to check the availability of a specific product?`;
  }
}
