import mongoose from 'mongoose';
import { MongooseConfigService } from '../config/mongoose-config';
import { MongooseConnection, MongooseConnectionManager } from '../database/mongoose-connection';

export class MongooseService {
  private static instance: MongooseService;
  private connection: MongooseConnection | null = null;
  private configService: MongooseConfigService;

  private constructor() {
    this.configService = MongooseConfigService.getInstance();
  }

  static getInstance(): MongooseService {
    if (!MongooseService.instance) {
      MongooseService.instance = new MongooseService();
    }
    return MongooseService.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Mongoose service...');

      // Validate configuration
      this.configService.validateConfig();

      // Get connection
      const config = this.configService.getMongooseConfig();
      this.connection = await MongooseConnectionManager.getInstance().initialize(config);

      console.log('✅ Mongoose service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Mongoose service:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      console.log('🔄 Shutting down Mongoose service...');

      await MongooseConnectionManager.getInstance().shutdown();
      this.connection = null;

      console.log('✅ Mongoose service shutdown complete');
    } catch (error) {
      console.error('❌ Error during Mongoose service shutdown:', error);
      throw error;
    }
  }

  getConnection(): MongooseConnection {
    if (!this.connection) {
      throw new Error('Mongoose service not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  getMongoose(): typeof mongoose {
    return this.getConnection().getMongoose();
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    details?: any;
  }> {
    try {
      if (!this.connection) {
        return {
          status: 'unhealthy',
          message: 'Mongoose service not initialized',
        };
      }

      return await this.connection.healthCheck();
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Mongoose service health check failed: ${error}`,
        details: { error },
      };
    }
  }

  // Transaction wrapper
  async runTransaction<T>(callback: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
    return this.connection!.transaction<T>(callback);
  }
}
