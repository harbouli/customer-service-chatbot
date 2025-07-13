export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  chat: {
    totalMessages: number;
    totalSessions: number;
    averageMessagesPerSession: number;
    averageResponseTime: number;
  };
  ai: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
  vector: {
    totalSearches: number;
    averageSearchTime: number;
    totalEmbeddings: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metrics;
  private startTime = Date.now();
  private requestTimes: number[] = [];
  private chatTimes: number[] = [];
  private aiTimes: number[] = [];
  private vectorTimes: number[] = [];

  private constructor() {
    this.metrics = this.initializeMetrics();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private initializeMetrics(): Metrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
      },
      chat: {
        totalMessages: 0,
        totalSessions: 0,
        averageMessagesPerSession: 0,
        averageResponseTime: 0,
      },
      ai: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      },
      vector: {
        totalSearches: 0,
        averageSearchTime: 0,
        totalEmbeddings: 0,
      },
      system: {
        uptime: 0,
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  recordRequest(successful: boolean, responseTime: number): void {
    this.metrics.requests.total++;
    if (successful) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    this.requestTimes.push(responseTime);
    this.metrics.requests.averageResponseTime = this.calculateAverage(
      this.requestTimes
    );
  }

  recordChatMessage(responseTime: number): void {
    this.metrics.chat.totalMessages++;
    this.chatTimes.push(responseTime);
    this.metrics.chat.averageResponseTime = this.calculateAverage(
      this.chatTimes
    );
  }

  recordChatSession(): void {
    this.metrics.chat.totalSessions++;
    this.metrics.chat.averageMessagesPerSession =
      this.metrics.chat.totalSessions > 0
        ? this.metrics.chat.totalMessages / this.metrics.chat.totalSessions
        : 0;
  }

  recordAIRequest(successful: boolean, responseTime: number): void {
    this.metrics.ai.totalRequests++;
    if (successful) {
      this.metrics.ai.successfulRequests++;
    } else {
      this.metrics.ai.failedRequests++;
    }

    this.aiTimes.push(responseTime);
    this.metrics.ai.averageResponseTime = this.calculateAverage(this.aiTimes);
  }

  recordVectorSearch(responseTime: number): void {
    this.metrics.vector.totalSearches++;
    this.vectorTimes.push(responseTime);
    this.metrics.vector.averageSearchTime = this.calculateAverage(
      this.vectorTimes
    );
  }

  recordEmbeddingCreation(): void {
    this.metrics.vector.totalEmbeddings++;
  }

  getMetrics(): Metrics {
    // Update system metrics
    this.metrics.system.uptime = Date.now() - this.startTime;
    this.metrics.system.memoryUsage = process.memoryUsage();

    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
    this.requestTimes = [];
    this.chatTimes = [];
    this.aiTimes = [];
    this.vectorTimes = [];
  }

  private calculateAverage(times: number[]): number {
    if (times.length === 0) return 0;

    // Keep only the last 1000 measurements for rolling average
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
}
