import mongoose from 'mongoose';

export class MongoDB {
  private static instance: MongoDB;
  private connected = false;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static getInstance(): MongoDB {
    if (!MongoDB.instance) {
      MongoDB.instance = new MongoDB();
    }
    return MongoDB.instance;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      console.log('🟡 MongoDB already connected');
      return;
    }

    try {
      // Default URI with proper authentication database
      const uri =
        process.env.MONGODB_URI ||
        'mongodb://admin:password123@localhost:27017/productdb?authSource=admin';

      console.log('🔌 Connecting to MongoDB...');
      console.log('🔗 URI:', uri.replace(/password123/g, '****'));

      await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.connected = true;
      console.log('✅ MongoDB connected successfully');

      // Handle events
      mongoose.connection.on('error', error => {
        console.error('🔴 MongoDB error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🟡 MongoDB disconnected');
        this.connected = false;
      });
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      await mongoose.disconnect();
      this.connected = false;
      console.log('✅ MongoDB disconnected');
    } catch (error) {
      console.error('❌ MongoDB disconnect failed:', error);
    }
  }

  isConnected(): boolean {
    return this.connected && mongoose.connection.readyState === 1;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  getConnection() {
    return mongoose.connection;
  }
}

export default MongoDB.getInstance();
