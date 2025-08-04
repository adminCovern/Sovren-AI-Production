/**
 * CENTRALIZED CONFIGURATION MANAGER
 * Production-ready configuration system with environment-specific settings
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '../di/DIContainer';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface DatabaseConfiguration {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  poolMin: number;
  poolMax: number;
  idleTimeoutMillis: number;
}

export interface RedisConfiguration {
  url: string;
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: 4 | 6;
}

export interface SecurityConfiguration {
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
    algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  };
  bcrypt: {
    rounds: number;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: boolean;
    legacyHeaders: boolean;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  cors: {
    enabled: boolean;
    origin: string[] | boolean;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
    preflightContinue: boolean;
    optionsSuccessStatus: number;
  };
  csp: {
    enabled: boolean;
    directives: Record<string, string[]>;
    reportOnly: boolean;
    reportUri?: string;
  };
  headers: {
    hsts: {
      enabled: boolean;
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
    xContentTypeOptions: boolean;
    xXSSProtection: boolean;
    referrerPolicy: string;
    permissionsPolicy: Record<string, string[]>;
  };
}

export interface TTSConfiguration {
  enabled: boolean;
  modelsPath: string;
  outputPath: string;
  pythonPath: string;
  styleTTS2Path: string;
  maxConcurrentSynthesis: number;
  maxTextLength: number;
  defaultVoice: string;
  cacheEnabled: boolean;
  cacheMaxSize: number;
  cacheTTL: number;
  supportedFormats: string[];
  defaultFormat: string;
  defaultSampleRate: number;
  qualitySettings: {
    low: { sampleRate: number; bitRate: number };
    medium: { sampleRate: number; bitRate: number };
    high: { sampleRate: number; bitRate: number };
    premium: { sampleRate: number; bitRate: number };
  };
}

export interface ShadowBoardConfiguration {
  enabled: boolean;
  maxExecutives: number;
  defaultTier: 'SMB' | 'ENTERPRISE';
  voiceModelsPath: string;
  personalityConfigPath: string;
  executiveRoles: string[];
  defaultExecutives: {
    role: string;
    name: string;
    voiceModel: string;
    personality: string;
  }[];
}

export interface EmailConfiguration {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  from: string;
  replyTo?: string;
  templates: {
    welcome: string;
    passwordReset: string;
    accountLocked: string;
    systemAlert: string;
  };
}

export interface StorageConfiguration {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    basePath: string;
    publicUrl: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicUrl?: string;
  };
  gcs?: {
    bucket: string;
    projectId: string;
    keyFilename: string;
    publicUrl?: string;
  };
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
    publicUrl?: string;
  };
}

export interface MonitoringConfiguration {
  enabled: boolean;
  metricsPort: number;
  healthCheckInterval: number;
  alerting: {
    enabled: boolean;
    email: string;
    webhookUrl?: string;
    thresholds: {
      cpuUsage: number;
      memoryUsage: number;
      responseTime: number;
      errorRate: number;
    };
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    file: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: number;
    };
    console: {
      enabled: boolean;
      colorize: boolean;
    };
  };
}

export interface PerformanceConfiguration {
  optimization: {
    enabled: boolean;
    cacheMaxSize: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
    keepAliveTimeout: number;
  };
  clustering: {
    enabled: boolean;
    workers: number | 'auto';
  };
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  staticFiles: {
    maxAge: number;
    etag: boolean;
    lastModified: boolean;
  };
}

export interface FeatureFlags {
  voiceSynthesis: boolean;
  shadowBoard: boolean;
  crmIntegration: boolean;
  emailOrchestration: boolean;
  realTimeAnalysis: boolean;
  quantumDecisionMaking: boolean;
  memoryPersistence: boolean;
  learningAdaptation: boolean;
  performanceOptimization: boolean;
  advancedSecurity: boolean;
  multiTenant: boolean;
  apiVersioning: boolean;
}

export interface SystemLimits {
  maxConcurrentUsers: number;
  maxRequestsPerMinute: number;
  maxFileSize: number;
  maxAudioDuration: number;
  maxExecutivesPerUser: number;
  maxIntegrationsPerUser: number;
  maxSessionDuration: number;
  maxUploadSize: number;
}

export interface SOVRENConfiguration {
  // Core settings
  environment: Environment;
  version: string;
  port: number;
  host: string;
  baseUrl: string;
  
  // Feature configuration
  features: FeatureFlags;
  limits: SystemLimits;
  
  // Service configurations
  database: DatabaseConfiguration;
  redis: RedisConfiguration;
  security: SecurityConfiguration;
  tts: TTSConfiguration;
  shadowBoard: ShadowBoardConfiguration;
  email: EmailConfiguration;
  storage: StorageConfiguration;
  monitoring: MonitoringConfiguration;
  performance: PerformanceConfiguration;
}

/**
 * Centralized Configuration Manager
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: SOVRENConfiguration;
  private errorHandler: ErrorHandler;
  private configPath: string;
  private environment: Environment;

  private constructor() {
    this.environment = (process.env.NODE_ENV as Environment) || 'development';
    this.configPath = process.env.CONFIG_PATH || './config';
    this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
    this.config = this.loadConfiguration();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Get complete configuration
   */
  public getConfig(): SOVRENConfiguration {
    return this.config;
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig(): DatabaseConfiguration {
    return this.config.database;
  }

  /**
   * Get Redis configuration
   */
  public getRedisConfig(): RedisConfiguration {
    return this.config.redis;
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig(): SecurityConfiguration {
    return this.config.security;
  }

  /**
   * Get TTS configuration
   */
  public getTTSConfig(): TTSConfiguration {
    return this.config.tts;
  }

  /**
   * Get Shadow Board configuration
   */
  public getShadowBoardConfig(): ShadowBoardConfiguration {
    return this.config.shadowBoard;
  }

  /**
   * Get email configuration
   */
  public getEmailConfig(): EmailConfiguration {
    return this.config.email;
  }

  /**
   * Get storage configuration
   */
  public getStorageConfig(): StorageConfiguration {
    return this.config.storage;
  }

  /**
   * Get monitoring configuration
   */
  public getMonitoringConfig(): MonitoringConfiguration {
    return this.config.monitoring;
  }

  /**
   * Get performance configuration
   */
  public getPerformanceConfig(): PerformanceConfiguration {
    return this.config.performance;
  }

  /**
   * Get feature flags
   */
  public getFeatureFlags(): FeatureFlags {
    return this.config.features;
  }

  /**
   * Get system limits
   */
  public getSystemLimits(): SystemLimits {
    return this.config.limits;
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }

  /**
   * Get environment
   */
  public getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Check if production environment
   */
  public isProduction(): boolean {
    return this.environment === 'production';
  }

  /**
   * Check if development environment
   */
  public isDevelopment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Validate configuration
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required environment variables
    const requiredEnvVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Validate JWT secret strength
    if (this.config.security.jwt.secret.length < 32) {
      errors.push('JWT secret must be at least 32 characters long');
    }

    // Validate database configuration
    if (!this.config.database.host || !this.config.database.database) {
      errors.push('Database host and database name are required');
    }

    // Validate Redis configuration
    if (!this.config.redis.url && (!this.config.redis.host || !this.config.redis.port)) {
      errors.push('Redis URL or host/port configuration is required');
    }

    // Validate TTS configuration
    if (this.config.features.voiceSynthesis && !existsSync(this.config.tts.modelsPath)) {
      errors.push(`TTS models path does not exist: ${this.config.tts.modelsPath}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Load configuration from files and environment
   */
  private loadConfiguration(): SOVRENConfiguration {
    try {
      // Load base configuration
      const baseConfig = this.loadConfigFile('base.json');
      
      // Load environment-specific configuration
      const envConfig = this.loadConfigFile(`${this.environment}.json`);
      
      // Merge configurations with environment variables
      const config = this.mergeConfigurations(baseConfig, envConfig);
      
      // Apply environment variable overrides
      return this.applyEnvironmentOverrides(config);
      
    } catch (error) {
      const sovrenError = this.errorHandler.createError(
        'CONFIG_LOAD_FAILED',
        'Failed to load configuration',
        ErrorCategory.CONFIGURATION,
        ErrorSeverity.CRITICAL,
        {},
        {
          userMessage: 'System configuration could not be loaded.',
          suggestedActions: ['Check configuration files', 'Verify environment variables'],
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      );
      
      throw sovrenError;
    }
  }

  /**
   * Load configuration file
   */
  private loadConfigFile(filename: string): Partial<SOVRENConfiguration> {
    const filePath = join(this.configPath, filename);
    
    if (!existsSync(filePath)) {
      if (filename === 'base.json') {
        // Return default configuration if base config doesn't exist
        return this.getDefaultConfiguration();
      }
      return {};
    }
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse configuration file ${filename}: ${error}`);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): SOVRENConfiguration {
    return {
      environment: this.environment,
      version: process.env.npm_package_version || '1.0.0',
      port: 3000,
      host: '0.0.0.0',
      baseUrl: 'http://localhost:3000',
      
      features: {
        voiceSynthesis: true,
        shadowBoard: true,
        crmIntegration: true,
        emailOrchestration: true,
        realTimeAnalysis: true,
        quantumDecisionMaking: false,
        memoryPersistence: true,
        learningAdaptation: true,
        performanceOptimization: true,
        advancedSecurity: true,
        multiTenant: false,
        apiVersioning: true
      },
      
      limits: {
        maxConcurrentUsers: 1000,
        maxRequestsPerMinute: 10000,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxAudioDuration: 300, // 5 minutes
        maxExecutivesPerUser: 8,
        maxIntegrationsPerUser: 10,
        maxSessionDuration: 24 * 60 * 60 * 1000, // 24 hours
        maxUploadSize: 50 * 1024 * 1024 // 50MB
      },
      
      database: {
        host: 'localhost',
        port: 5432,
        database: 'sovren_ai',
        username: 'sovren',
        password: 'password',
        ssl: false,
        maxConnections: 100,
        connectionTimeout: 30000,
        queryTimeout: 60000,
        poolMin: 2,
        poolMax: 10,
        idleTimeoutMillis: 30000
      },
      
      redis: {
        url: 'redis://localhost:6379',
        host: 'localhost',
        port: 6379,
        db: 0,
        maxRetries: 3,
        retryDelay: 1000,
        connectTimeout: 10000,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4
      },
      
      security: {
        jwt: {
          secret: this.generateSecureJWTSecret(),
          expiresIn: '24h',
          issuer: 'sovren-ai',
          audience: 'sovren-ai-users',
          algorithm: 'HS256'
        },
        bcrypt: {
          rounds: 12
        },
        rateLimiting: {
          enabled: true,
          windowMs: 15 * 60 * 1000,
          max: 1000,
          message: 'Too many requests from this IP',
          standardHeaders: true,
          legacyHeaders: false,
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        },
        cors: {
          enabled: true,
          origin: ['http://localhost:3000'],
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization'],
          credentials: true,
          maxAge: 86400,
          preflightContinue: false,
          optionsSuccessStatus: 204
        },
        csp: {
          enabled: true,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", 'data:', 'https:'],
            'font-src': ["'self'"],
            'connect-src': ["'self'"],
            'media-src': ["'self'"],
            'object-src': ["'none'"],
            'frame-src': ["'none'"]
          },
          reportOnly: false
        },
        headers: {
          hsts: {
            enabled: true,
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          },
          xFrameOptions: 'DENY',
          xContentTypeOptions: true,
          xXSSProtection: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          permissionsPolicy: {
            camera: ['none'],
            microphone: ['none'],
            geolocation: ['none']
          }
        }
      },
      
      tts: {
        enabled: true,
        modelsPath: './models/styletts2',
        outputPath: './public/audio/generated',
        pythonPath: '/usr/bin/python3',
        styleTTS2Path: '/opt/styletts2',
        maxConcurrentSynthesis: 5,
        maxTextLength: 5000,
        defaultVoice: 'sovren-ai-neural',
        cacheEnabled: true,
        cacheMaxSize: 1000,
        cacheTTL: 3600000, // 1 hour
        supportedFormats: ['wav', 'mp3', 'ogg'],
        defaultFormat: 'wav',
        defaultSampleRate: 22050,
        qualitySettings: {
          low: { sampleRate: 16000, bitRate: 64 },
          medium: { sampleRate: 22050, bitRate: 128 },
          high: { sampleRate: 44100, bitRate: 256 },
          premium: { sampleRate: 48000, bitRate: 320 }
        }
      },
      
      shadowBoard: {
        enabled: true,
        maxExecutives: 8,
        defaultTier: 'SMB',
        voiceModelsPath: './models/executives',
        personalityConfigPath: './config/personalities',
        executiveRoles: ['cfo', 'cmo', 'cto', 'legal', 'sovren'],
        defaultExecutives: [
          { role: 'cfo', name: 'Sarah Chen', voiceModel: 'cfo-analytical', personality: 'analytical' },
          { role: 'cmo', name: 'Marcus Rivera', voiceModel: 'cmo-persuasive', personality: 'persuasive' },
          { role: 'cto', name: 'Alex Kim', voiceModel: 'cto-technical', personality: 'technical' },
          { role: 'legal', name: 'Diana Blackstone', voiceModel: 'legal-diplomatic', personality: 'diplomatic' }
        ]
      },
      
      email: {
        provider: 'smtp',
        smtp: {
          host: 'localhost',
          port: 587,
          secure: false,
          auth: {
            user: 'user',
            pass: 'password'
          }
        },
        from: 'noreply@sovren.ai',
        templates: {
          welcome: 'welcome',
          passwordReset: 'password-reset',
          accountLocked: 'account-locked',
          systemAlert: 'system-alert'
        }
      },
      
      storage: {
        provider: 'local',
        local: {
          basePath: './storage',
          publicUrl: '/storage'
        }
      },
      
      monitoring: {
        enabled: true,
        metricsPort: 9090,
        healthCheckInterval: 30000,
        alerting: {
          enabled: false,
          email: 'admin@sovren.ai',
          thresholds: {
            cpuUsage: 80,
            memoryUsage: 85,
            responseTime: 1000,
            errorRate: 5
          }
        },
        logging: {
          level: 'info',
          format: 'json',
          file: {
            enabled: true,
            path: './logs',
            maxSize: '10m',
            maxFiles: 5
          },
          console: {
            enabled: true,
            colorize: true
          }
        }
      },
      
      performance: {
        optimization: {
          enabled: true,
          cacheMaxSize: 1000,
          maxConcurrentRequests: 100,
          requestTimeout: 30000,
          keepAliveTimeout: 5000
        },
        clustering: {
          enabled: false,
          workers: 'auto'
        },
        compression: {
          enabled: true,
          level: 6,
          threshold: 1024
        },
        staticFiles: {
          maxAge: 31536000,
          etag: true,
          lastModified: true
        }
      }
    };
  }

  /**
   * Merge configurations with priority: env > base
   */
  private mergeConfigurations(
    base: Partial<SOVRENConfiguration>,
    env: Partial<SOVRENConfiguration>
  ): SOVRENConfiguration {
    // Deep merge implementation
    const merge = (target: any, source: any): any => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = merge(target[key] || {}, source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };

    const defaultConfig = this.getDefaultConfiguration();
    let merged = merge({}, defaultConfig);
    merged = merge(merged, base);
    merged = merge(merged, env);

    return merged;
  }

  /**
   * Generate cryptographically secure JWT secret
   */
  private generateSecureJWTSecret(): string {
    // Only generate if no environment variable is set
    if (process.env.JWT_SECRET) {
      if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET environment variable must be at least 32 characters long');
      }
      return process.env.JWT_SECRET;
    }

    // Generate cryptographically secure random secret
    const crypto = require('crypto');
    const secret = crypto.randomBytes(64).toString('hex');

    console.warn('⚠️  WARNING: Generated JWT secret at runtime. Set JWT_SECRET environment variable for production!');
    return secret;
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: SOVRENConfiguration): SOVRENConfiguration {
    // Core settings
    config.port = parseInt(process.env.PORT || config.port.toString());
    config.host = process.env.HOST || config.host;
    config.baseUrl = process.env.BASE_URL || config.baseUrl;

    // Database
    if (process.env.DATABASE_URL) {
      const dbUrl = new URL(process.env.DATABASE_URL);
      config.database.host = dbUrl.hostname;
      config.database.port = parseInt(dbUrl.port) || 5432;
      config.database.database = dbUrl.pathname.slice(1);
      config.database.username = dbUrl.username;
      config.database.password = dbUrl.password;
      config.database.ssl = dbUrl.searchParams.get('ssl') === 'true' || config.environment === 'production';
    }

    // Redis
    config.redis.url = process.env.REDIS_URL || config.redis.url;
    if (process.env.REDIS_HOST) config.redis.host = process.env.REDIS_HOST;
    if (process.env.REDIS_PORT) config.redis.port = parseInt(process.env.REDIS_PORT);
    if (process.env.REDIS_PASSWORD) config.redis.password = process.env.REDIS_PASSWORD;

    // Security
    config.security.jwt.secret = process.env.JWT_SECRET || config.security.jwt.secret;
    if (process.env.JWT_EXPIRES_IN) config.security.jwt.expiresIn = process.env.JWT_EXPIRES_IN;
    if (process.env.BCRYPT_ROUNDS) config.security.bcrypt.rounds = parseInt(process.env.BCRYPT_ROUNDS);

    // TTS
    config.tts.modelsPath = process.env.TTS_MODELS_PATH || config.tts.modelsPath;
    config.tts.outputPath = process.env.TTS_OUTPUT_PATH || config.tts.outputPath;
    config.tts.pythonPath = process.env.PYTHON_PATH || config.tts.pythonPath;
    config.tts.styleTTS2Path = process.env.STYLETTS2_PATH || config.tts.styleTTS2Path;

    // Email
    if (process.env.SMTP_HOST) {
      config.email.smtp = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || ''
        }
      };
    }

    // Monitoring
    if (process.env.LOG_LEVEL) config.monitoring.logging.level = process.env.LOG_LEVEL as any;
    if (process.env.METRICS_PORT) config.monitoring.metricsPort = parseInt(process.env.METRICS_PORT);

    return config;
  }
}

// Export singleton instance
export const configManager = ConfigurationManager.getInstance();
