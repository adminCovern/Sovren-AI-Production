/**
 * DEPENDENCY INJECTION CONTAINER
 * Production-ready IoC container for SOVREN AI system
 */

export type Constructor<T = {}> = new (...args: any[]) => T;
export type Factory<T> = () => T | Promise<T>;
export type ServiceIdentifier<T = any> = string | symbol | Constructor<T>;

export interface ServiceDescriptor<T = any> {
  identifier: ServiceIdentifier<T>;
  factory: Factory<T>;
  singleton: boolean;
  dependencies?: ServiceIdentifier[];
}

export class DIContainer {
  private services = new Map<ServiceIdentifier, ServiceDescriptor>();
  private instances = new Map<ServiceIdentifier, any>();
  private resolving = new Set<ServiceIdentifier>();

  /**
   * Register a service with the container
   */
  register<T>(
    identifier: ServiceIdentifier<T>,
    factory: Factory<T>,
    options: { singleton?: boolean; dependencies?: ServiceIdentifier[] } = {}
  ): void {
    this.services.set(identifier, {
      identifier,
      factory,
      singleton: options.singleton ?? true,
      dependencies: options.dependencies ?? []
    });
  }

  /**
   * Register a class constructor
   */
  registerClass<T>(
    identifier: ServiceIdentifier<T>,
    constructor: Constructor<T>,
    options: { singleton?: boolean; dependencies?: ServiceIdentifier[] } = {}
  ): void {
    this.register(
      identifier,
      () => {
        const deps = options.dependencies?.map(dep => this.resolve(dep)) ?? [];
        return new constructor(...deps);
      },
      options
    );
  }

  /**
   * Register a singleton instance
   */
  registerInstance<T>(identifier: ServiceIdentifier<T>, instance: T): void {
    this.instances.set(identifier, instance);
    this.services.set(identifier, {
      identifier,
      factory: () => instance,
      singleton: true,
      dependencies: []
    });
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(identifier: ServiceIdentifier<T>): T {
    // Check for circular dependencies
    if (this.resolving.has(identifier)) {
      throw new Error(`Circular dependency detected for ${String(identifier)}`);
    }

    // Return existing singleton instance
    if (this.instances.has(identifier)) {
      return this.instances.get(identifier);
    }

    const descriptor = this.services.get(identifier);
    if (!descriptor) {
      throw new Error(`Service ${String(identifier)} not registered`);
    }

    this.resolving.add(identifier);

    try {
      // Resolve dependencies first
      const dependencies = descriptor.dependencies?.map(dep => this.resolve(dep)) ?? [];
      
      // Create instance
      const instance = descriptor.factory();
      
      // Store singleton instance
      if (descriptor.singleton) {
        this.instances.set(identifier, instance);
      }

      return instance;
    } finally {
      this.resolving.delete(identifier);
    }
  }

  /**
   * Check if a service is registered
   */
  has(identifier: ServiceIdentifier): boolean {
    return this.services.has(identifier);
  }

  /**
   * Clear all services and instances
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.resolving.clear();
  }

  /**
   * Get all registered service identifiers
   */
  getRegisteredServices(): ServiceIdentifier[] {
    return Array.from(this.services.keys());
  }
}

// Service identifiers (symbols for type safety)
export const SERVICE_IDENTIFIERS = {
  // Core services
  SHADOW_BOARD_MANAGER: Symbol('ShadowBoardManager'),
  VOICE_SYSTEM_MANAGER: Symbol('VoiceSystemManager'),
  CRM_INTEGRATION_SYSTEM: Symbol('CRMIntegrationSystem'),
  EMAIL_ORCHESTRATION_EXECUTIVES: Symbol('EmailOrchestrationExecutives'),
  TTS_BACKEND_SERVICE: Symbol('TTSBackendService'),
  
  // Authentication and security
  AUTHENTICATION_SYSTEM: Symbol('AuthenticationSystem'),
  SECURITY_MIDDLEWARE: Symbol('SecurityMiddleware'),
  
  // Infrastructure
  REDIS_CLIENT: Symbol('RedisClient'),
  DATABASE_CONNECTION: Symbol('DatabaseConnection'),
  
  // Configuration
  APP_CONFIG: Symbol('AppConfig'),

  // Logging
  LOGGER: Symbol('Logger'),

  // Error Handling
  ERROR_HANDLER: Symbol('ErrorHandler'),

  // Core AI System
  SOVREN_AI_CORE: Symbol('SOVRENAICore')
} as const;

// Global container instance
export const container = new DIContainer();

/**
 * Decorator for automatic dependency injection
 */
export function Injectable<T extends Constructor>(dependencies: ServiceIdentifier[] = []) {
  return function(target: T): T {
    // Store dependency metadata
    Reflect.defineMetadata('dependencies', dependencies, target);
    return target;
  };
}

/**
 * Decorator for injecting dependencies into properties
 */
export function Inject(identifier: ServiceIdentifier) {
  return function(target: any, propertyKey: string | symbol) {
    // Store injection metadata
    const existingTokens = Reflect.getMetadata('inject:tokens', target) || [];
    existingTokens.push({ propertyKey, identifier });
    Reflect.defineMetadata('inject:tokens', existingTokens, target);
  };
}

/**
 * Auto-wire dependencies for a class instance
 */
export function autoWire<T>(instance: T): T {
  const tokens = Reflect.getMetadata('inject:tokens', instance) || [];
  
  for (const { propertyKey, identifier } of tokens) {
    (instance as any)[propertyKey] = container.resolve(identifier);
  }
  
  return instance;
}

// Type definitions for better TypeScript support
declare global {
  namespace Reflect {
    function defineMetadata(key: string, value: any, target: any): void;
    function getMetadata(key: string, target: any): any;
  }
}

// Polyfill for reflect-metadata if not available
if (typeof Reflect === 'undefined' || !Reflect.defineMetadata) {
  const metadataMap = new WeakMap();
  
  (global as any).Reflect = {
    ...((global as any).Reflect || {}),
    defineMetadata(key: string, value: any, target: any) {
      if (!metadataMap.has(target)) {
        metadataMap.set(target, new Map());
      }
      metadataMap.get(target).set(key, value);
    },
    getMetadata(key: string, target: any) {
      const metadata = metadataMap.get(target);
      return metadata ? metadata.get(key) : undefined;
    }
  };
}
