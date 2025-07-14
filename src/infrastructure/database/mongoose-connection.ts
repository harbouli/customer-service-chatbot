import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { IDatabaseConnection } from './database-connection';

export interface MongooseConfig {
  host: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  authSource?: string;
  replicaSet?: string | undefined;
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  serverSelectionTimeoutMS?: number;
  socketTimeoutMS?: number;
  connectTimeoutMS?: number;
  retryWrites?: boolean;
  journal?: boolean;
}

export class MongooseConnection implements IDatabaseConnection {
  private connection: Connection | null = null;
  private connected = false;

  constructor(private config: MongooseConfig) {}

  async connect(): Promise<void> {
    try {
      console.log(
        `🔌 Connecting to MongoDB via Mongoose at ${this.config.host}:${this.config.port || 27017}`
      );

      const uri = this.buildConnectionString();
      const options = this.buildConnectionOptions();

      await mongoose.connect(uri, options);

      this.connection = mongoose.connection;
      this.connected = true;

      // Set up connection event listeners
      this.setupEventListeners();

      console.log('✅ Mongoose connected successfully');
    } catch (error) {
      console.error('❌ Mongoose connection failed:', error);
      throw new Error(`Failed to connect to MongoDB via Mongoose: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      console.log('🔌 Disconnecting from MongoDB via Mongoose...');
      await mongoose.disconnect();
      this.connection = null;
      this.connected = false;
      console.log('✅ Mongoose disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected && mongoose.connection.readyState === 1;
  }

  getConnection(): Connection {
    if (!this.connection) {
      throw new Error('Mongoose not connected');
    }
    return this.connection;
  }

  getMongoose(): typeof mongoose {
    return mongoose;
  }

  // Legacy method for interface compatibility (throws error for MongoDB)
  async query<T>(): Promise<T[]> {
    throw new Error("MongoDB doesn't support SQL queries. Use Mongoose models instead.");
  }

  // Transaction support using Mongoose
  async transaction<T>(callback: (session: any) => Promise<T>): Promise<T> {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    const session = await mongoose.startSession();

    try {
      console.log('📋 Starting Mongoose transaction');

      let result: T;
      await session.withTransaction(async () => {
        result = await callback(session);
      });

      console.log('✅ Mongoose transaction committed');
      return result!;
    } catch (error) {
      console.log('❌ Mongoose transaction aborted');
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private buildConnectionString(): string {
    const { host, port = 27017, username, password, database } = this.config;

    let uri = 'mongodb://';

    if (username && password) {
      uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }

    uri += `${host}:${port}/${database}`;

    return uri;
  }

  private buildConnectionOptions(): ConnectOptions {
    const options: ConnectOptions = {};

    if (this.config.authSource) {
      options.authSource = this.config.authSource;
    }

    if (this.config.replicaSet) {
      options.replicaSet = this.config.replicaSet;
    }

    if (this.config.maxPoolSize) {
      options.maxPoolSize = this.config.maxPoolSize;
    }

    if (this.config.minPoolSize) {
      options.minPoolSize = this.config.minPoolSize;
    }

    if (this.config.maxIdleTimeMS) {
      options.maxIdleTimeMS = this.config.maxIdleTimeMS;
    }

    if (this.config.serverSelectionTimeoutMS) {
      options.serverSelectionTimeoutMS = this.config.serverSelectionTimeoutMS;
    }

    if (this.config.socketTimeoutMS) {
      options.socketTimeoutMS = this.config.socketTimeoutMS;
    }

    if (this.config.connectTimeoutMS) {
      options.connectTimeoutMS = this.config.connectTimeoutMS;
    }

    if (this.config.retryWrites !== undefined) {
      options.retryWrites = this.config.retryWrites;
    }

    if (this.config.journal !== undefined) {
      options.writeConcern = { ...options.writeConcern, journal: this.config.journal };
    }

    if (this.config.ssl) {
      options.ssl = this.config.ssl;
    }

    return options;
  }

  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', error => {
      console.error('❌ Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.connected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
      this.connected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  // Health check method
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    details?: any;
  }> {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          message: 'Mongoose connection not established',
        };
      }

      // Test the connection
      await mongoose.connection.db?.admin().ping();

      return {
        status: 'healthy',
        message: 'Mongoose connection is healthy',
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Mongoose health check failed: ${error}`,
        details: { error },
      };
    }
  }
}

// Connection manager singleton
export class MongooseConnectionManager {
  private static instance: MongooseConnectionManager;
  private connection: MongooseConnection | null = null;

  static getInstance(): MongooseConnectionManager {
    if (!MongooseConnectionManager.instance) {
      MongooseConnectionManager.instance = new MongooseConnectionManager();
    }
    return MongooseConnectionManager.instance;
  }

  async initialize(config: MongooseConfig): Promise<MongooseConnection> {
    if (!this.connection) {
      this.connection = new MongooseConnection(config);
      await this.connection.connect();
    }
    return this.connection;
  }

  getConnection(): MongooseConnection {
    if (!this.connection) {
      throw new Error('Mongoose connection not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  async shutdown(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }
}

export default MongooseConnection;
