/**
 * SERVICE REGISTRY
 * Centralized service registration for dependency injection
 */

import { container, SERVICE_IDENTIFIERS } from './DIContainer';
import { ShadowBoardManager } from '../shadowboard/ShadowBoardManager';
import { VoiceSystemManager } from '../voice/VoiceSystemManager';
import { CRMIntegrationSystem } from '../integrations/CRMIntegrationSystem';
import { EmailOrchestrationExecutives } from '../integrations/EmailOrchestrationExecutives';
import { EmailIntegrationSystem } from '../integrations/EmailIntegrationSystem';
import { TTSBackendService } from '../services/TTSBackendService';
import { AuthenticationSystem } from '../auth/AuthenticationSystem';
import { SecurityMiddleware } from '../../middleware/security';
import { SOVRENAICore } from '../sovren/SOVRENAICore';
import { ErrorHandler } from '../errors/ErrorHandler';
import { createClient, RedisClientType } from 'redis';

/**
 * Application configuration interface (deprecated - use ConfigurationManager)
 * @deprecated Use ConfigurationManager instead
 */
export interface AppConfig {
  redis: {
    url: string;
    maxRetries: number;
    retryDelay: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  voice: {
    enabled: boolean;
    maxConcurrentSynthesis: number;
  };
  shadowBoard: {
    enabled: boolean;
    maxExecutives: number;
  };
  security: {
    rateLimitEnabled: boolean;
    corsEnabled: boolean;
    cspEnabled: boolean;
  };
}

/**
 * Default application configuration (deprecated - use ConfigurationManager)
 * @deprecated Use ConfigurationManager instead
 */
const defaultConfig: AppConfig = {
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetries: 3,
    retryDelay: 1000
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'sovren-ai-production-secret',
    expiresIn: '24h'
  },
  voice: {
    enabled: true,
    maxConcurrentSynthesis: 5
  },
  shadowBoard: {
    enabled: true,
    maxExecutives: 8
  },
  security: {
    rateLimitEnabled: true,
    corsEnabled: true,
    cspEnabled: true
  }
};

/**
 * Logger interface
 */
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

/**
 * Production logger implementation
 */
class ProductionLogger implements Logger {
  info(message: string, meta?: any): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
}

/**
 * Register all application services
 */
export function registerServices(): void {
  // Configuration
  container.registerInstance(SERVICE_IDENTIFIERS.APP_CONFIG, defaultConfig);

  // Logger
  container.registerInstance(SERVICE_IDENTIFIERS.LOGGER, new ProductionLogger());

  // Error Handler
  container.register(
    SERVICE_IDENTIFIERS.ERROR_HANDLER,
    () => {
      const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      return new ErrorHandler(logger);
    },
    {
      singleton: true,
      dependencies: [SERVICE_IDENTIFIERS.LOGGER]
    }
  );

  // Redis client
  container.register(
    SERVICE_IDENTIFIERS.REDIS_CLIENT,
    () => {
      const config = container.resolve<AppConfig>(SERVICE_IDENTIFIERS.APP_CONFIG);
      const client = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 5000
        }
      });

      client.on('error', (err) => {
        const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
        logger.error('Redis client error:', err);
      });

      return client;
    },
    { singleton: true }
  );

  // Authentication system
  container.registerClass(
    SERVICE_IDENTIFIERS.AUTHENTICATION_SYSTEM,
    AuthenticationSystem,
    { singleton: true }
  );

  // Security middleware
  container.register(
    SERVICE_IDENTIFIERS.SECURITY_MIDDLEWARE,
    () => {
      const config = container.resolve<AppConfig>(SERVICE_IDENTIFIERS.APP_CONFIG);
      return new SecurityMiddleware({
        enableRateLimit: config.security.rateLimitEnabled,
        enableCORS: config.security.corsEnabled,
        enableCSP: config.security.cspEnabled,
        enableInputSanitization: true,
        enableJWTValidation: true,
        allowedOrigins: [
          'https://sovren.ai',
          'https://app.sovren.ai',
          'https://api.sovren.ai'
        ],
        maxRequestsPerMinute: 100
      });
    },
    { singleton: true }
  );

  // TTS Backend Service
  container.registerClass(
    SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE,
    TTSBackendService,
    { 
      singleton: true,
      dependencies: [SERVICE_IDENTIFIERS.LOGGER]
    }
  );

  // Voice System Manager
  container.register(
    SERVICE_IDENTIFIERS.VOICE_SYSTEM_MANAGER,
    () => {
      const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      const ttsService = container.resolve(SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE);
      const config = container.resolve<AppConfig>(SERVICE_IDENTIFIERS.APP_CONFIG);

      // Create voice system config
      const voiceConfig = {
        subscriptionTier: 'sovren_proof' as const,
        sip: {
          uri: `sip:${process.env.SIP_USERNAME || 'sovren_ai'}@${process.env.SIP_DOMAIN || 'sovren.ai'}`,
          transportOptions: {
            server: process.env.SIP_SERVER_URL || 'wss://sip.sovren.ai',
            connectionTimeout: 5000,
            maxReconnectionAttempts: 3,
            reconnectionTimeout: 2000
          },
          authorizationUsername: process.env.SIP_USERNAME || 'sovren_ai',
          authorizationPassword: process.env.SIP_PASSWORD || '',
          displayName: 'SOVREN AI'
        },
        audio: {
          sampleRate: 16000,
          bufferSize: 1024,
          enableNoiseReduction: true,
          enableEchoCancellation: true,
          enableAutoGainControl: true,
          spatialAudioEnabled: false
        },
        synthesis: {
          enabled: config.voice.enabled,
          modelsPath: './voice-models',
          cacheSize: 100
        },
        recording: {
          enabled: true,
          format: 'wav' as const,
          quality: 'high' as const
        },
        transcription: {
          enabled: true,
          language: 'en-US',
          realTime: true
        }
      };

      return new VoiceSystemManager(voiceConfig);
    },
    {
      singleton: true,
      dependencies: [SERVICE_IDENTIFIERS.LOGGER, SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE, SERVICE_IDENTIFIERS.APP_CONFIG]
    }
  );

  // CRM Integration System
  container.register(
    SERVICE_IDENTIFIERS.CRM_INTEGRATION_SYSTEM,
    () => {
      const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      return new CRMIntegrationSystem();
    },
    { 
      singleton: true,
      dependencies: [SERVICE_IDENTIFIERS.LOGGER]
    }
  );

  // Email Orchestration Executives
  container.register(
    SERVICE_IDENTIFIERS.EMAIL_ORCHESTRATION_EXECUTIVES,
    () => {
      const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      // Create EmailIntegrationSystem directly
      const emailIntegration = new EmailIntegrationSystem();
      return new EmailOrchestrationExecutives(emailIntegration);
    },
    {
      singleton: true,
      dependencies: [SERVICE_IDENTIFIERS.LOGGER]
    }
  );

  // Shadow Board Manager
  container.register(
    SERVICE_IDENTIFIERS.SHADOW_BOARD_MANAGER,
    () => {
      const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      const config = container.resolve<AppConfig>(SERVICE_IDENTIFIERS.APP_CONFIG);

      // Create a mock GlobalNameRegistry
      const mockGlobalNameRegistry = {
        reserveUniqueName: async (role: string, userId: string) => {
          const names = {
            'CFO': ['Sarah Chen', 'Michael Torres', 'Jennifer Walsh'],
            'CMO': ['Marcus Rivera', 'Alexandra Richmond', 'David Kim'],
            'CTO': ['Alex Kim', 'Priya Patel', 'James Wilson'],
            'CLO': ['Diana Patel', 'Robert Martinez', 'Lisa Thompson']
          };
          const roleNames = names[role as keyof typeof names] || ['Executive Name'];
          return roleNames[Math.floor(Math.random() * roleNames.length)];
        },
        releaseName: async (name: string, role: string) => {
          logger.info(`Released name ${name} for role ${role}`);
        },
        isNameAvailable: async (firstName: string, lastName: string, role: string) => {
          return Math.random() > 0.5; // Random availability
        },
        getReservedNames: async (userId: string) => {
          return [];
        }
      };

      return new ShadowBoardManager(mockGlobalNameRegistry);
    },
    {
      singleton: true,
      dependencies: [SERVICE_IDENTIFIERS.LOGGER, SERVICE_IDENTIFIERS.APP_CONFIG]
    }
  );

  // SOVREN AI Core (main orchestrator)
  container.register(
    SERVICE_IDENTIFIERS.SOVREN_AI_CORE,
    () => {
      const shadowBoard = container.resolve<ShadowBoardManager>(SERVICE_IDENTIFIERS.SHADOW_BOARD_MANAGER);
      const voiceSystem = container.resolve<VoiceSystemManager>(SERVICE_IDENTIFIERS.VOICE_SYSTEM_MANAGER);
      const crmSystem = container.resolve<CRMIntegrationSystem>(SERVICE_IDENTIFIERS.CRM_INTEGRATION_SYSTEM);
      const emailOrchestrator = container.resolve<EmailOrchestrationExecutives>(SERVICE_IDENTIFIERS.EMAIL_ORCHESTRATION_EXECUTIVES);
      const ttsService = container.resolve<TTSBackendService>(SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE);
      const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      const errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);

      return new SOVRENAICore(
        shadowBoard,
        voiceSystem,
        crmSystem,
        emailOrchestrator,
        ttsService,
        logger,
        errorHandler
      );
    },
    {
      singleton: true,
      dependencies: [
        SERVICE_IDENTIFIERS.SHADOW_BOARD_MANAGER,
        SERVICE_IDENTIFIERS.VOICE_SYSTEM_MANAGER,
        SERVICE_IDENTIFIERS.CRM_INTEGRATION_SYSTEM,
        SERVICE_IDENTIFIERS.EMAIL_ORCHESTRATION_EXECUTIVES,
        SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE,
        SERVICE_IDENTIFIERS.LOGGER,
        SERVICE_IDENTIFIERS.ERROR_HANDLER
      ]
    }
  );
}

/**
 * Initialize all services
 */
export async function initializeServices(): Promise<void> {
  const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
  
  try {
    logger.info('Initializing SOVREN AI services...');
    
    // Initialize Redis connection
    const redisClient = container.resolve(SERVICE_IDENTIFIERS.REDIS_CLIENT) as RedisClientType;
    if (redisClient && typeof redisClient.connect === 'function') {
      await redisClient.connect();
      logger.info('Redis connection established');
    }
    
    // Initialize authentication system
    const authSystem = container.resolve<AuthenticationSystem>(SERVICE_IDENTIFIERS.AUTHENTICATION_SYSTEM);
    logger.info('Authentication system initialized');
    
    // Initialize other services as needed
    logger.info('All services initialized successfully');
    
  } catch (error) {
    logger.error('Service initialization failed:', error);
    throw error;
  }
}

/**
 * Cleanup all services
 */
export async function cleanupServices(): Promise<void> {
  const logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
  
  try {
    logger.info('Cleaning up SOVREN AI services...');
    
    // Cleanup Redis connection
    const redisClient = container.resolve(SERVICE_IDENTIFIERS.REDIS_CLIENT) as RedisClientType;
    if (redisClient && typeof redisClient.quit === 'function') {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
    
    // Clear container
    container.clear();
    
    logger.info('All services cleaned up successfully');
    
  } catch (error) {
    logger.error('Service cleanup failed:', error);
  }
}
