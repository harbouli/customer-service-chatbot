import { MongooseConfig } from '../database/mongoose-connection';

export interface MongooseAppConfig extends MongooseConfig {
  uri?: string | undefined; // Allow full URI override
}

export class MongooseConfigService {
  private static instance: MongooseConfigService;
  private config: MongooseAppConfig;

  private constructor() {
    this.config = this.loadMongooseConfig();
  }

  static getInstance(): MongooseConfigService {
    if (!MongooseConfigService.instance) {
      MongooseConfigService.instance = new MongooseConfigService();
    }
    return MongooseConfigService.instance;
  }

  private loadMongooseConfig(): MongooseAppConfig {
    return {
      // Allow full URI override or build from parts
      uri: process.env.MONGODB_URI,
      host: process.env.MONGODB_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PORT || '27017'),
      database: process.env.MONGODB_DATABASE || 'productdb', // Changed to match your Docker setup
      username: process.env.MONGODB_USERNAME || 'admin', // Default to your Docker username
      password: process.env.MONGODB_PASSWORD || 'password123', // Default to your Docker password
      ssl: process.env.MONGODB_SSL === 'true',
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      replicaSet: process.env.MONGODB_REPLICA_SET,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '0'),
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '0'),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000'),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '0'),
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000'),
      retryWrites: process.env.MONGODB_RETRY_WRITES !== 'false',
      journal: process.env.MONGODB_JOURNAL !== 'false',
    };
  }

  getConfig(): MongooseAppConfig {
    return this.config;
  }

  getMongooseConfig(): MongooseConfig {
    return this.config;
  }

  validateConfig(): void {
    const errors: string[] = [];

    // If URI is provided, use that; otherwise validate individual parts
    if (this.config.uri) {
      try {
        new URL(this.config.uri);
      } catch {
        errors.push('MONGODB_URI is not a valid URI');
      }
    } else {
      if (!this.config.host) {
        errors.push('MONGODB_HOST is required when MONGODB_URI is not provided');
      }

      if (!this.config.database) {
        errors.push('MONGODB_DATABASE is required when MONGODB_URI is not provided');
      }

      if (this.config.port && (this.config.port <= 0 || this.config.port > 65535)) {
        errors.push('MONGODB_PORT must be between 1 and 65535');
      }
    }

    if (this.config.maxPoolSize && this.config.maxPoolSize <= 0) {
      errors.push('MONGODB_MAX_POOL_SIZE must be greater than 0');
    }

    if (this.config.minPoolSize && this.config.minPoolSize < 0) {
      errors.push('MONGODB_MIN_POOL_SIZE must be 0 or greater');
    }

    if (this.config.connectTimeoutMS && this.config.connectTimeoutMS <= 0) {
      errors.push('MONGODB_CONNECT_TIMEOUT must be greater than 0');
    }

    if (errors.length > 0) {
      throw new Error(`Mongoose configuration errors: ${errors.join(', ')}`);
    }
  }

  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  getConnectionUri(): string {
    if (this.config.uri) {
      return this.config.uri;
    }

    const { host, port, username, password, database, ssl, authSource, replicaSet } = this.config;

    let uri = 'mongodb://';

    if (username && password) {
      uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }

    uri += `${host}:${port || 27017}/${database}`;

    const queryParams: string[] = [];

    if (ssl) {
      queryParams.push('ssl=true');
    }

    if (authSource) {
      queryParams.push(`authSource=${authSource}`);
    }

    if (replicaSet) {
      queryParams.push(`replicaSet=${replicaSet}`);
    }

    if (this.config.retryWrites !== undefined) {
      queryParams.push(`retryWrites=${this.config.retryWrites}`);
    }

    if (queryParams.length > 0) {
      uri += `?${queryParams.join('&')}`;
    }

    return uri;
  }
}

export default MongooseConfigService;
