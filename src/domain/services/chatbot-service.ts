import { ChatContext } from "../entities/chat-context";
import { Product } from "../entities/product";

export interface IChatbotService {
  processMessage(message: string, context: ChatContext): Promise<string>;
  findProducts(query: string): Promise<Product[]>;
  getProductInfo(productId: string): Promise<Product | null>;
  generateEmbedding(text: string): Promise<number[]>;
  findSimilarProducts(query: string, limit?: number): Promise<Product[]>;
}

export interface IGenerativeAIService {
  generateResponse(prompt: string, context?: any): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}
