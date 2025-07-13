export interface ChatAnalyticsDto {
  totalSessions: number;
  totalMessages: number;
  averageSessionLength: number;
  mostCommonQueries: { query: string; count: number }[];
  customerSatisfactionScore?: number;
}

export interface ProductAnalyticsDto {
  totalProducts: number;
  productsInStock: number;
  mostSearchedProducts: {
    productId: string;
    name: string;
    searchCount: number;
  }[];
  topCategories: { category: string; productCount: number }[];
}
