/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  VERBOSE = 4,
  DEBUG = 5,
  SILLY = 6,
}

export interface LogEntry {
  level: keyof typeof LogLevel;
  message: string;
  timestamp: string;
  meta?: any;
  requestId?: string | undefined;
  userId?: string | undefined;
  service?: string;
  module?: string;
  environment?: string;
  pid?: number;
  hostname?: string;
  stack?: string;
}

export interface LogTransport {
  name: string;
  log(entry: LogEntry): void | Promise<void>;
  destroy?(): void | Promise<void>;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LoggingConfig {
  level: LogLevel;
  transports: LogTransport[];
  defaultMeta?: Record<string, any>;
  exitOnError?: boolean;
  silent?: boolean;
  maxMetaSize?: number;
}

// ===========================
// LOG FORMATTERS
// ===========================

export class JSONFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    try {
      return JSON.stringify(entry);
    } catch (error) {
      return JSON.stringify({
        ...entry,
        meta: '[Circular or Non-Serializable]',
        error: 'JSON serialization failed',
      });
    }
  }
}

export class SimpleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const { timestamp, level, message, meta } = entry;
    let metaStr = '';

    if (meta && Object.keys(meta).length > 0) {
      try {
        metaStr = ` ${JSON.stringify(meta)}`;
      } catch (error) {
        metaStr = ' [Meta: Non-Serializable]';
      }
    }

    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
  }
}

export class DetailedFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const { timestamp, level, message, meta, requestId, userId, service, module, stack } = entry;

    let formatted = `${timestamp} [${level.toUpperCase()}]`;

    if (service) formatted += ` [${service}]`;
    if (module) formatted += ` [${module}]`;
    if (requestId) formatted += ` [${requestId}]`;
    if (userId) formatted += ` [User: ${userId}]`;

    formatted += `: ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      try {
        formatted += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
      } catch (error) {
        formatted += `\nMeta: [Non-Serializable Object]`;
      }
    }

    if (stack) {
      formatted += `\nStack: ${stack}`;
    }

    return formatted;
  }
}

export class ColorFormatter implements LogFormatter {
  private colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m', // Yellow
    INFO: '\x1b[36m', // Cyan
    HTTP: '\x1b[35m', // Magenta
    VERBOSE: '\x1b[37m', // White
    DEBUG: '\x1b[32m', // Green
    SILLY: '\x1b[90m', // Gray
    RESET: '\x1b[0m', // Reset
  };

  format(entry: LogEntry): string {
    const { timestamp, level, message, meta } = entry;
    const color = this.colors[level.toUpperCase() as keyof typeof this.colors] || this.colors.INFO;
    const reset = this.colors.RESET;

    let formatted = `${color}${timestamp} [${level.toUpperCase()}]${reset}: ${message}`;

    if (meta && Object.keys(meta).length > 0) {
      try {
        formatted += ` ${JSON.stringify(meta)}`;
      } catch (error) {
        formatted += ` [Meta: Non-Serializable]`;
      }
    }

    return formatted;
  }
}

// ===========================
// LOG TRANSPORTS
// ===========================

export class ConsoleTransport implements LogTransport {
  name = 'console';

  constructor(
    private formatter: LogFormatter = new ColorFormatter(),
    private logToStderr: boolean = false
  ) {}

  log(entry: LogEntry): void {
    try {
      const formatted = this.formatter.format(entry);

      if (this.logToStderr || entry.level === 'ERROR' || entry.level === 'WARN') {
        console.error(formatted);
      } else {
        console.log(formatted);
      }
    } catch (error) {
      console.error('Console transport error:', error);
    }
  }
}

export class FileTransport implements LogTransport {
  name = 'file';
  private writeStream?: fs.WriteStream | undefined;

  constructor(
    private filename: string,
    private formatter: LogFormatter = new JSONFormatter(),
    private maxSize: number = 10 * 1024 * 1024, // 10MB
    private maxFiles: number = 5
  ) {
    this.initializeStream();
  }

  private initializeStream(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filename);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.writeStream = fs.createWriteStream(this.filename, { flags: 'a' });

      // Handle stream errors
      this.writeStream.on('error', (error: Error) => {
        console.error('File transport error:', error);
      });
    } catch (error) {
      console.error('Failed to initialize file transport:', error);
    }
  }

  log(entry: LogEntry): void {
    if (!this.writeStream) return;

    try {
      const formatted = this.formatter.format(entry);
      this.writeStream.write(`${formatted}\n`);

      // Check file size and rotate if necessary
      this.checkRotation();
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }

  private checkRotation(): void {
    try {
      if (!fs.existsSync(this.filename)) return;

      const stats = fs.statSync(this.filename);
      if (stats.size > this.maxSize) {
        this.rotateFile();
      }
    } catch (error) {
      console.error('Error checking file rotation:', error);
    }
  }

  private rotateFile(): void {
    try {
      // Close current stream
      this.writeStream?.end();

      // Rotate existing files
      const ext = path.extname(this.filename);
      const basename = path.basename(this.filename, ext);
      const dirname = path.dirname(this.filename);

      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = path.join(dirname, `${basename}.${i}${ext}`);
        const newFile = path.join(dirname, `${basename}.${i + 1}${ext}`);

        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }

      // Move current file to .1
      const rotatedFile = path.join(dirname, `${basename}.1${ext}`);
      if (fs.existsSync(this.filename)) {
        fs.renameSync(this.filename, rotatedFile);
      }

      // Recreate stream
      this.initializeStream();
    } catch (error) {
      console.error('Error rotating log file:', error);
      this.initializeStream(); // Try to recreate stream
    }
  }

  destroy(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = undefined;
    }
  }
}

export class HttpTransport implements LogTransport {
  name = 'http';
  private batch: LogEntry[] = [];
  private batchTimer?: NodeJS.Timeout | undefined;

  constructor(
    private url: string,
    private formatter: LogFormatter = new JSONFormatter(),
    private batchSize: number = 10,
    private flushInterval: number = 5000 // 5 seconds
  ) {
    this.startBatchProcessor();
  }

  log(entry: LogEntry): void {
    this.batch.push(entry);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const logsToSend = [...this.batch];
    this.batch = [];

    try {
      // Use dynamic import for node-fetch if available, fallback to fetch if in browser
      let fetchFn: any;

      if (typeof fetch !== 'undefined') {
        fetchFn = fetch;
      } else {
        try {
          const nodeFetch = await import('node-fetch');
          fetchFn = nodeFetch.default;
        } catch (error) {
          console.error('HTTP transport requires node-fetch to be installed');
          return;
        }
      }

      await fetchFn(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend.map(entry => this.formatter.format(entry)),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send logs to HTTP endpoint:', error);
      // Re-add failed logs to batch for retry (limit to prevent memory issues)
      if (this.batch.length < 1000) {
        this.batch.unshift(...logsToSend);
      }
    }
  }

  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Send remaining logs
    if (this.batch.length > 0) {
      this.flush().catch(error => {
        console.error('Error flushing remaining logs:', error);
      });
    }
  }
}

// ===========================
// MAIN LOGGING SERVICE
// ===========================

export class LoggingService {
  private static instance: LoggingService;
  private config: LoggingConfig;
  private defaultMeta: Record<string, any>;
  private isDestroyed = false;

  private constructor(config?: Partial<LoggingConfig>) {
    this.config = {
      level: LogLevel.INFO,
      transports: [new ConsoleTransport()],
      defaultMeta: {},
      exitOnError: false,
      silent: false,
      maxMetaSize: 1024 * 1024, // 1MB
      ...config,
    };

    this.defaultMeta = {
      service: 'customer-support-chatbot',
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid,
      hostname: os.hostname(),
      ...this.config.defaultMeta,
    };

    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      this.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      if (this.config.exitOnError) {
        setTimeout(() => process.exit(1), 1000); // Give time for logs to flush
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', reason => {
      this.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
      if (this.config.exitOnError) {
        setTimeout(() => process.exit(1), 1000); // Give time for logs to flush
      }
    });
  }

  static getInstance(config?: Partial<LoggingConfig>): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService(config);
    }
    return LoggingService.instance;
  }

  static configure(config: Partial<LoggingConfig>): LoggingService {
    LoggingService.instance = new LoggingService(config);
    return LoggingService.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return !this.isDestroyed && !this.config.silent && level <= this.config.level;
  }

  private sanitizeMeta(meta: any): any {
    if (!meta) return meta;

    try {
      // Handle circular references and non-serializable objects
      const seen = new WeakSet();
      const sanitized = JSON.parse(
        JSON.stringify(meta, (_key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          if (typeof value === 'function') {
            return '[Function]';
          }
          if (typeof value === 'symbol') {
            return '[Symbol]';
          }
          return value;
        })
      );

      const serialized = JSON.stringify(sanitized);
      if (serialized.length > this.config.maxMetaSize!) {
        return {
          ...sanitized,
          _truncated: true,
          _originalSize: serialized.length,
        };
      }

      return sanitized;
    } catch (error) {
      return {
        _serializationError: 'Failed to serialize meta object',
        _error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private createLogEntry(
    level: keyof typeof LogLevel,
    message: string,
    meta?: any,
    requestId?: string,
    userId?: string
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      meta: this.sanitizeMeta(meta),
      requestId,
      userId,
      ...this.defaultMeta,
    };
  }

  private log(
    level: keyof typeof LogLevel,
    message: string,
    meta?: any,
    requestId?: string,
    userId?: string
  ): void {
    const logLevel = LogLevel[level];

    if (!this.shouldLog(logLevel)) {
      return;
    }

    const entry = this.createLogEntry(level, message, meta, requestId, userId);

    // Send to all transports
    this.config.transports.forEach(transport => {
      try {
        const result = transport.log(entry);
        // Handle async transports
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Error in async transport ${transport.name}:`, error);
          });
        }
      } catch (error) {
        console.error(`Error in transport ${transport.name}:`, error);
      }
    });
  }

  // Public logging methods
  error(message: string, meta?: any, requestId?: string, userId?: string): void {
    // If meta is an Error object, extract useful information
    if (meta instanceof Error) {
      meta = {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
      };
    }

    this.log('ERROR', message, meta, requestId, userId);
  }

  warn(message: string, meta?: any, requestId?: string, userId?: string): void {
    this.log('WARN', message, meta, requestId, userId);
  }

  info(message: string, meta?: any, requestId?: string, userId?: string): void {
    this.log('INFO', message, meta, requestId, userId);
  }

  http(message: string, meta?: any, requestId?: string, userId?: string): void {
    this.log('HTTP', message, meta, requestId, userId);
  }

  verbose(message: string, meta?: any, requestId?: string, userId?: string): void {
    this.log('VERBOSE', message, meta, requestId, userId);
  }

  debug(message: string, meta?: any, requestId?: string, userId?: string): void {
    this.log('DEBUG', message, meta, requestId, userId);
  }

  silly(message: string, meta?: any, requestId?: string, userId?: string): void {
    this.log('SILLY', message, meta, requestId, userId);
  }

  // Utility methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  removeTransport(transportName: string): void {
    const index = this.config.transports.findIndex(t => t.name === transportName);
    if (index >= 0) {
      const transport = this.config.transports[index];
      if (transport?.destroy) {
        const result = transport.destroy();
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Error destroying transport ${transportName}:`, error);
          });
        }
      }
      this.config.transports.splice(index, 1);
    }
  }

  setSilent(silent: boolean): void {
    this.config.silent = silent;
  }

  // Create child logger with additional context
  child(additionalMeta: Record<string, any>): LoggingService {
    const childConfig = {
      ...this.config,
      defaultMeta: {
        ...this.config.defaultMeta,
        ...additionalMeta,
      },
    };

    return new LoggingService(childConfig);
  }

  // Profile a function execution
  profile<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = Date.now();
    this.debug(`Starting ${name}`);

    const logCompletion = (duration: number, error?: Error) => {
      if (error) {
        this.error(`${name} failed`, { duration, error: error.message });
      } else {
        this.debug(`${name} completed`, { duration });
      }
    };

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then(value => {
            logCompletion(Date.now() - start);
            return value;
          })
          .catch(error => {
            logCompletion(Date.now() - start, error);
            throw error;
          });
      } else {
        logCompletion(Date.now() - start);
        return result;
      }
    } catch (error) {
      logCompletion(Date.now() - start, error as Error);
      throw error;
    }
  }

  // Log with specific module context
  module(moduleName: string) {
    return {
      error: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.error(message, { ...meta, module: moduleName }, requestId, userId),
      warn: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.warn(message, { ...meta, module: moduleName }, requestId, userId),
      info: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.info(message, { ...meta, module: moduleName }, requestId, userId),
      debug: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.debug(message, { ...meta, module: moduleName }, requestId, userId),
      verbose: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.verbose(message, { ...meta, module: moduleName }, requestId, userId),
      http: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.http(message, { ...meta, module: moduleName }, requestId, userId),
      silly: (message: string, meta?: any, requestId?: string, userId?: string) =>
        this.silly(message, { ...meta, module: moduleName }, requestId, userId),
    };
  }

  // Destroy all transports
  async destroy(): Promise<void> {
    this.isDestroyed = true;

    const destroyPromises = this.config.transports.map(transport => {
      if (transport.destroy) {
        const result = transport.destroy();
        return result instanceof Promise ? result : Promise.resolve();
      }
      return Promise.resolve();
    });

    try {
      await Promise.all(destroyPromises);
    } catch (error) {
      console.error('Error destroying some transports:', error);
    }

    this.config.transports = [];
  }
}

// ===========================
// FACTORY FUNCTIONS
// ===========================

export function createLogger(config?: Partial<LoggingConfig>): LoggingService {
  return LoggingService.getInstance(config);
}

export function createProductionLogger(): LoggingService {
  return LoggingService.configure({
    level: LogLevel.INFO,
    transports: [
      new ConsoleTransport(new JSONFormatter()),
      new FileTransport('./logs/app.log', new JSONFormatter()),
      new FileTransport('./logs/error.log', new JSONFormatter()),
    ],
    exitOnError: false,
  });
}

export function createDevelopmentLogger(): LoggingService {
  return LoggingService.configure({
    level: LogLevel.DEBUG,
    transports: [
      new ConsoleTransport(new ColorFormatter()),
      new FileTransport('./logs/dev.log', new DetailedFormatter()),
    ],
    exitOnError: false,
  });
}

export function createTestLogger(): LoggingService {
  return LoggingService.configure({
    level: LogLevel.ERROR,
    transports: [new ConsoleTransport(new SimpleFormatter())],
    silent: true,
  });
}

// ===========================
// MIDDLEWARE INTEGRATION
// ===========================

export function createRequestLogger() {
  const logger = LoggingService.getInstance();

  return (req: any, res: any, next: any) => {
    const requestId = req.id || req.headers['x-request-id'] || 'unknown';
    const userId = req.user?.id;

    // Log request
    logger.http(
      'Incoming request',
      {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
      },
      requestId,
      userId
    );

    // Log response
    const originalSend = res.send;
    res.send = function (body: any) {
      logger.http(
        'Request completed',
        {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseSize: body
            ? typeof body === 'string'
              ? body.length
              : JSON.stringify(body).length
            : 0,
        },
        requestId,
        userId
      );

      return originalSend.call(this, body);
    };

    next();
  };
}

// ===========================
// EXPORT DEFAULT INSTANCE
// ===========================

// Create default instance based on environment
const defaultLogger = (() => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return createProductionLogger();
    case 'test':
      return createTestLogger();
    default:
      return createDevelopmentLogger();
  }
})();

export default defaultLogger;
