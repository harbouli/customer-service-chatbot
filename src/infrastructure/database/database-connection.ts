export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (connection: any) => Promise<T>): Promise<T>;
}

export class MockDatabaseConnection implements IDatabaseConnection {
  private connected = false;
  private mockData: Map<string, any[]> = new Map();

  constructor(private config: DatabaseConfig) {}

  async connect(): Promise<void> {
    console.log(
      `🔌 Connecting to database at ${this.config.host}:${this.config.port}`
    );
    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.connected = true;
    console.log("✅ Database connected successfully");
  }

  async disconnect(): Promise<void> {
    console.log("🔌 Disconnecting from database...");
    this.connected = false;
    console.log("✅ Database disconnected");
  }

  isConnected(): boolean {
    return this.connected;
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.connected) {
      throw new Error("Database not connected");
    }

    console.log(`🔍 Executing query: ${sql.substring(0, 100)}...`);

    // Mock query execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Return mock data based on query type
    if (sql.toLowerCase().includes("select")) {
      return (this.mockData.get("results") as T[]) || [];
    }

    return [] as T[];
  }

  async transaction<T>(callback: (connection: any) => Promise<T>): Promise<T> {
    if (!this.connected) {
      throw new Error("Database not connected");
    }

    console.log("📋 Starting transaction");

    try {
      const result = await callback(this);
      console.log("✅ Transaction committed");
      return result;
    } catch (error) {
      console.log("❌ Transaction rolled back");
      throw error;
    }
  }

  // Mock data methods for testing
  setMockData(table: string, data: any[]): void {
    this.mockData.set(table, data);
  }

  clearMockData(): void {
    this.mockData.clear();
  }
}
