import { DatabaseConfig } from "../database/database-connection";

export interface ServerConfig {
  port: number;
  host: string;
  env: "development" | "production" | "test";
  corsOrigins: string[];
}

export interface AIConfig {
  googleApiKey: string;
  modelName: string;
  embeddingModelName: string;
  maxTokens: number;
  temperature: number;
}

export interface VectorConfig {
  weaviateUrl: string;
  weaviateApiKey?: string;
  className: string;
  embeddingDimensions: number;
}

export interface CacheConfig {
  provider: "memory" | "redis";
  host?: string;
  port?: number;
  ttl: number;
  maxSize: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface EmailConfig {
  provider: "smtp" | "sendgrid" | "ses";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  ai: AIConfig;
  vector: VectorConfig;
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  email: EmailConfig;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): AppConfig {
    return {
      server: {
        port: parseInt(process.env.PORT || "3000"),
        host: process.env.HOST || "localhost",
        env: (process.env.NODE_ENV as any) || "development",
        corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
          "http://localhost:3000",
        ],
      },
      database: {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "chatbot",
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "password",
        ssl: process.env.DB_SSL === "true",
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "10"),
        connectionTimeout: parseInt(
          process.env.DB_CONNECTION_TIMEOUT || "60000"
        ),
      },
      ai: {
        googleApiKey: process.env.GOOGLE_AI_API_KEY || "",
        modelName: process.env.AI_MODEL_NAME || "gemini-1.5-flash",
        embeddingModelName:
          process.env.AI_EMBEDDING_MODEL || "text-embedding-004",
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || "1000"),
        temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
      },
      vector: {
        weaviateUrl: process.env.WEAVIATE_URL || "http://localhost:8080",
        weaviateApiKey: process.env.WEAVIATE_API_KEY,
        className: process.env.WEAVIATE_CLASS_NAME || "Product",
        embeddingDimensions: parseInt(
          process.env.EMBEDDING_DIMENSIONS || "384"
        ),
      },
      cache: {
        provider: (process.env.CACHE_PROVIDER as any) || "memory",
        host: process.env.CACHE_HOST || "localhost",
        port: parseInt(process.env.CACHE_PORT || "6379"),
        ttl: parseInt(process.env.CACHE_TTL || "3600"),
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000"),
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
        skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === "true",
        skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === "true",
      },
      email: {
        provider: (process.env.EMAIL_PROVIDER as any) || "smtp",
        host: process.env.EMAIL_HOST || "localhost",
        port: parseInt(process.env.EMAIL_PORT || "587"),
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
        apiKey: process.env.EMAIL_API_KEY,
        fromEmail: process.env.EMAIL_FROM || "noreply@chatbot.com",
        fromName: process.env.EMAIL_FROM_NAME || "Customer Support Bot",
      },
    };
  }

  get(): AppConfig {
    return this.config;
  }

  getServer(): ServerConfig {
    return this.config.server;
  }

  getDatabase(): DatabaseConfig {
    return this.config.database;
  }

  getAI(): AIConfig {
    return this.config.ai;
  }

  getVector(): VectorConfig {
    return this.config.vector;
  }

  getCache(): CacheConfig {
    return this.config.cache;
  }

  getRateLimit(): RateLimitConfig {
    return this.config.rateLimit;
  }

  getEmail(): EmailConfig {
    return this.config.email;
  }

  isDevelopment(): boolean {
    return this.config.server.env === "development";
  }

  isProduction(): boolean {
    return this.config.server.env === "production";
  }

  isTest(): boolean {
    return this.config.server.env === "test";
  }

  validateConfig(): void {
    const errors: string[] = [];

    // Validate required AI configuration
    if (!this.config.ai.googleApiKey) {
      errors.push("GOOGLE_AI_API_KEY is required");
    }

    // Validate server configuration
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push("Invalid server port");
    }

    // Validate vector configuration
    if (!this.config.vector.weaviateUrl) {
      errors.push("WEAVIATE_URL is required");
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
    }
  }
}
