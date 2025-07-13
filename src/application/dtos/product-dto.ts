export interface ProductDto {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  inStock: boolean;
  features: string[];
  specifications: Record<string, any>;
  tags: string[];
}

export interface CreateProductDto {
  name: string;
  description: string;
  category: string;
  price: number;
  inStock: boolean;
  features?: string[];
  specifications?: Record<string, any>;
  tags?: string[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  inStock?: boolean;
  features?: string[];
  specifications?: Record<string, any>;
  tags?: string[];
}

export interface ProductSearchDto {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
}
