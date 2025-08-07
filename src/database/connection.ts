import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { EventEmitter } from 'events';

/**
 * Production-Grade Database Connection Manager
 * NO PLACEHOLDERS - Full implementation with connection pooling, monitoring, and error handling
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class DatabaseManager extends EventEmitter {
  private pool: Pool;
  private config: DatabaseConfig;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  
  // Connection monitoring
  private connectionMetrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    activeConnections: 0,
    totalConnections: 0
  };

  constructor(config: DatabaseConfig) {
    super();
    this.config = {
      maxConnections: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...config
    };
    
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });

    this.setupPoolEventHandlers();
    this.startHealthMonitoring();
  }

  /**
   * Initialize database connection
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🔌 Initializing database connection...');
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('✅ Database connection established');
      this.emit('connected');
      
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ Database connection failed (attempt ${this.connectionAttempts}):`, error);
      
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`🔄 Retrying connection in 5 seconds...`);
        setTimeout(() => this.initialize(), 5000);
      } else {
        this.emit('connectionFailed', error);
        throw error;
      }
    }
  }

  /**
   * Execute query with monitoring and error handling
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      this.connectionMetrics.totalQueries++;
      
      console.log(`🔍 Executing query ${queryId}: ${text.substring(0, 100)}...`);
      
      const result = await this.executeWithRetry(text, params, options);
      
      const queryTime = Date.now() - startTime;
      this.connectionMetrics.successfulQueries++;
      this.updateAverageQueryTime(queryTime);
      
      console.log(`✅ Query ${queryId} completed in ${queryTime}ms`);
      this.emit('queryCompleted', { queryId, queryTime, rowCount: result.rowCount });
      
      return result;
      
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.connectionMetrics.failedQueries++;
      
      console.error(`❌ Query ${queryId} failed after ${queryTime}ms:`, error);
      this.emit('queryFailed', { queryId, queryTime, error });
      
      throw error;
    }
  }

  /**
   * Execute query with retry logic
   */
  private async executeWithRetry<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.pool.connect();
        
        try {
          this.connectionMetrics.activeConnections++;
          
          const result = await client.query<T>(text, params);
          client.release();
          
          this.connectionMetrics.activeConnections--;
          return result;
          
        } catch (queryError) {
          client.release();
          this.connectionMetrics.activeConnections--;
          
          if (attempt === maxRetries) {
            throw queryError;
          }
          
          console.warn(`⚠️ Query attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
      } catch (connectionError) {
        if (attempt === maxRetries) {
          throw connectionError;
        }
        
        console.warn(`⚠️ Connection attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Execute transaction
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      console.log('✅ Transaction completed successfully');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Transaction rolled back:', error);
      throw error;
      
    } finally {
      client.release();
    }
  }

  /**
   * Setup pool event handlers
   */
  private setupPoolEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      this.connectionMetrics.totalConnections++;
      console.log('🔗 New database client connected');
    });

    this.pool.on('error', (error: Error) => {
      console.error('❌ Database pool error:', error);
      this.emit('poolError', error);
    });

    this.pool.on('remove', () => {
      console.log('🔌 Database client removed from pool');
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error: unknown) {
        console.error('❌ Database health check failed:', error);
      }
    }, 30000); // Every 30 seconds

    // Store interval reference for cleanup if needed
    (this as any).healthCheckInterval = healthCheckInterval;
  }

  /**
   * Perform health check
   */
  public async healthCheck(): Promise<{
    isHealthy: boolean;
    metrics: {
      totalQueries: number;
      successfulQueries: number;
      failedQueries: number;
      averageQueryTime: number;
      activeConnections: number;
      totalConnections: number;
    };
    poolInfo: any;
  }> {
    try {
      const startTime = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      const poolInfo = {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      };
      
      const isHealthy = responseTime < 1000 && this.isConnected;
      
      if (!isHealthy) {
        console.warn('⚠️ Database health check warning:', { responseTime, poolInfo });
      }
      
      return {
        isHealthy,
        metrics: { ...this.connectionMetrics },
        poolInfo
      };
      
    } catch (error: unknown) {
      console.error('❌ Database health check failed:', error);
      return {
        isHealthy: false,
        metrics: { ...this.connectionMetrics },
        poolInfo: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Update average query time
   */
  private updateAverageQueryTime(queryTime: number): void {
    const totalQueries = this.connectionMetrics.successfulQueries;
    const currentAverage = this.connectionMetrics.averageQueryTime;
    
    this.connectionMetrics.averageQueryTime = 
      ((currentAverage * (totalQueries - 1)) + queryTime) / totalQueries;
  }

  /**
   * Get connection metrics
   */
  public getMetrics(): {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageQueryTime: number;
    activeConnections: number;
    totalConnections: number;
  } {
    return { ...this.connectionMetrics };
  }

  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    try {
      console.log('🔌 Closing database connections...');

      // Clear health check interval if it exists
      if ((this as any).healthCheckInterval) {
        clearInterval((this as any).healthCheckInterval);
      }

      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Database connections closed');
      this.emit('disconnected');

    } catch (error: unknown) {
      console.error('❌ Error closing database connections:', error);
      throw error;
    }
  }
}

// Singleton database manager
let databaseManager: DatabaseManager | null = null;

export function createDatabaseManager(config: DatabaseConfig): DatabaseManager {
  if (!databaseManager) {
    databaseManager = new DatabaseManager(config);
  }
  return databaseManager;
}

export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager) {
    throw new Error('Database manager not initialized. Call createDatabaseManager first.');
  }
  return databaseManager;
}

// Production database configuration
export const productionDatabaseConfig: DatabaseConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'sovren_ai_production',
  user: process.env.DATABASE_USER || 'sovren_app',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production',
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000')
};
