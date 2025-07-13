import { ChatContext } from "@domain/entities/chat-context";
import { Product } from "@domain/entities/product";
import { IProductRepository } from "@domain/repositories/IProductRepository";
import { IVectorRepository } from "@domain/repositories/IVectorRepository";
import {
  IChatbotService,
  IGenerativeAIService,
} from "@domain/services/chatbot-service";

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
      console.error("Failed to process message with AI:", error);
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

  async findSimilarProducts(
    query: string,
    limit: number = 5
  ): Promise<Product[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      return await this.vectorRepository.searchSimilarProducts(
        queryEmbedding,
        limit
      );
    } catch (error) {
      console.error("Failed to find similar products:", error);
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
  .map((msg) => `${msg.type}: ${msg.content}`)
  .join("\n")}

Current Customer Message: "${message}"

Relevant Products:
${relevantProducts
  .slice(0, 3)
  .map(
    (p) =>
      `- ${p.name} (${p.price}) - ${p.description} [${
        p.inStock ? "In Stock" : "Out of Stock"
      }]`
  )
  .join("\n")}

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

  private async fallbackProcessing(
    message: string,
    context: ChatContext
  ): Promise<string> {
    const lowerMessage = message.toLowerCase();

    // Greeting patterns
    if (this.isGreeting(lowerMessage)) {
      return `Hello ${context.customerProfile.name}! I'm here to help you with your products and orders. How can I assist you today?`;
    }

    // Product search patterns
    if (this.isProductSearch(lowerMessage)) {
      return await this.handleProductSearch(
        lowerMessage,
        context.relevantProducts
      );
    }

    // Order patterns
    if (this.isOrderInquiry(lowerMessage)) {
      return "I can help you with order-related questions. Please provide your order number or tell me what specific information you need about your order.";
    }

    // Stock check patterns
    if (this.isStockCheck(lowerMessage)) {
      return await this.handleStockCheck(
        lowerMessage,
        context.relevantProducts
      );
    }

    // Default response with context
    return `I understand you're looking for help, ${context.customerProfile.name}. I can assist you with product information, order status, stock availability, and general support. Could you please be more specific about what you need?`;
  }

  private isGreeting(message: string): boolean {
    const greetingPatterns = [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
    ];
    return greetingPatterns.some((pattern) => message.includes(pattern));
  }

  private isProductSearch(message: string): boolean {
    const productPatterns = [
      "product",
      "item",
      "find",
      "search",
      "looking for",
      "need",
    ];
    return productPatterns.some((pattern) => message.includes(pattern));
  }

  private isOrderInquiry(message: string): boolean {
    const orderPatterns = [
      "order",
      "purchase",
      "bought",
      "track",
      "delivery",
      "shipping",
    ];
    return orderPatterns.some((pattern) => message.includes(pattern));
  }

  private isStockCheck(message: string): boolean {
    const stockPatterns = [
      "stock",
      "available",
      "in stock",
      "out of stock",
      "availability",
    ];
    return stockPatterns.some((pattern) => message.includes(pattern));
  }

  private async handleProductSearch(
    message: string,
    relevantProducts: Product[]
  ): Promise<string> {
    if (relevantProducts.length === 0) {
      return "I couldn't find any products matching your search. Could you try different keywords or browse our categories?";
    }

    const productList = relevantProducts
      .slice(0, 3)
      .map(
        (product) =>
          `• ${product.name} - ${product.price} (${
            product.inStock ? "In Stock" : "Out of Stock"
          })\n  ${product.description}`
      )
      .join("\n\n");

    return `Here are some products that might interest you:\n\n${productList}\n\nWould you like more details about any of these products?`;
  }

  private async handleStockCheck(
    message: string,
    relevantProducts: Product[]
  ): Promise<string> {
    if (relevantProducts.length > 0) {
      const stockInfo = relevantProducts
        .map(
          (product) =>
            `• ${product.name}: ${
              product.inStock ? "In Stock" : "Out of Stock"
            }`
        )
        .join("\n");

      return `Here's the current stock status for relevant products:\n\n${stockInfo}\n\nWould you like me to check the availability of a specific product?`;
    }

    const allProducts = await this.productRepository.findAll();
    const inStockProducts = allProducts.filter((product) => product.inStock);

    return `We currently have ${inStockProducts.length} products in stock. Would you like me to check the availability of a specific product?`;
  }
}

// src/infrastructure/services/EmailService.ts
import { IEmailService } from "@application/interfaces/IEmailService";

export class EmailService implements IEmailService {
  constructor(
    private smtpHost: string = "localhost",
    private smtpPort: number = 587,
    private smtpUser?: string,
    private smtpPassword?: string,
    private fromEmail: string = "noreply@chatbot.com"
  ) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    try {
      // In a real implementation, you would use a service like SendGrid, AWS SES, or nodemailer
      console.log(`📧 Sending email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      console.log(`📧 Body: ${body.substring(0, 100)}...`);

      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw new Error(`Email sending failed: ${error}`);
    }
  }

  async sendWelcomeEmail(
    customerEmail: string,
    customerName: string
  ): Promise<void> {
    const subject = "Welcome to Our Store!";
    const body = `
Dear ${customerName},

Welcome to our store! We're excited to have you as a customer.

Our AI-powered chatbot is available 24/7 to help you with:
- Product recommendations
- Order tracking
- Customer support
- General inquiries

If you have any questions, don't hesitate to start a chat with us.

Best regards,
The Support Team
    `.trim();

    await this.sendEmail(customerEmail, subject, body);
  }

  async sendSupportTicketEmail(
    customerEmail: string,
    ticketId: string
  ): Promise<void> {
    const subject = `Support Ticket Created - ${ticketId}`;
    const body = `
Dear Customer,

Your support ticket has been created successfully.

Ticket ID: ${ticketId}
Status: Open
Expected Response Time: 24 hours

You can track your ticket status in your account dashboard or reply to this email.

Best regards,
The Support Team
    `.trim();

    await this.sendEmail(customerEmail, subject, body);
  }
}

// src/infrastructure/services/NotificationService.ts
import { INotificationService } from "@application/interfaces/INotificationService";

export class NotificationService implements INotificationService {
  private notifications: Map<
    string,
    Array<{
      id: string;
      message: string;
      type: "info" | "warning" | "error";
      timestamp: Date;
      read: boolean;
    }>
  > = new Map();

  async sendNotification(
    userId: string,
    message: string,
    type: "info" | "warning" | "error"
  ): Promise<void> {
    const notification = {
      id: this.generateId(),
      message,
      type,
      timestamp: new Date(),
      read: false,
    };

    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.unshift(notification);

    // Keep only the last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(100);
    }

    this.notifications.set(userId, userNotifications);

    console.log(`🔔 Notification sent to ${userId}: ${message} (${type})`);

    // In a real implementation, you would:
    // - Send push notifications
    // - Send WebSocket messages
    // - Store in database
    // - Send to external notification services
  }

  async sendBulkNotification(
    userIds: string[],
    message: string,
    type: "info" | "warning" | "error"
  ): Promise<void> {
    const promises = userIds.map((userId) =>
      this.sendNotification(userId, message, type)
    );

    await Promise.allSettled(promises);
    console.log(`📢 Bulk notification sent to ${userIds.length} users`);
  }

  // Additional methods for notification management
  async getUserNotifications(userId: string): Promise<
    Array<{
      id: string;
      message: string;
      type: "info" | "warning" | "error";
      timestamp: Date;
      read: boolean;
    }>
  > {
    return this.notifications.get(userId) || [];
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach((notification) => {
      notification.read = true;
    });
  }

  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex((n) => n.id === notificationId);
    if (index >= 0) {
      userNotifications.splice(index, 1);
    }
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// src/infrastructure/services/CacheService.ts
import { ICacheService } from "@application/interfaces/ICacheService";

export class InMemoryCacheService implements ICacheService {
  private cache: Map<
    string,
    {
      value: any;
      expiresAt: number;
    }
  > = new Map();

  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = 3600
  ): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}
