import { IChatRepository } from "@domain/repositories/IChatRepository";
import { IProductRepository } from "@domain/repositories/IProductRepository";

import { ChatAnalyticsDto, ProductAnalyticsDto } from "../dtos/analytics-dto";

export class GetChatAnalytics {
  constructor(
    private chatRepository: IChatRepository,
    private productRepository: IProductRepository
  ) {}

  async executeChatAnalytics(): Promise<ChatAnalyticsDto> {
    // This would require extending repositories to support analytics
    // For now, return placeholder data

    return {
      totalSessions: 0,
      totalMessages: 0,
      averageSessionLength: 0,
      mostCommonQueries: [],
      customerSatisfactionScore: undefined,
    };
  }

  async executeProductAnalytics(): Promise<ProductAnalyticsDto> {
    const products = await this.productRepository.findAll();
    const productsInStock = products.filter((p) => p.inStock);

    // Count products by category
    const categoryCount = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCount)
      .map(([category, productCount]) => ({ category, productCount }))
      .sort((a, b) => b.productCount - a.productCount);

    return {
      totalProducts: products.length,
      productsInStock: productsInStock.length,
      mostSearchedProducts: [], // Would need search tracking
      topCategories,
    };
  }
}
