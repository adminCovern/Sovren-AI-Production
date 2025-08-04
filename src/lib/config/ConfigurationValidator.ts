/**
 * CONFIGURATION VALIDATOR
 * Comprehensive validation for production configuration settings
 */

import { existsSync, accessSync, constants } from 'fs';
import { resolve } from 'path';
import { SOVRENConfiguration, Environment } from './ConfigurationManager';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '../di/DIContainer';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100 configuration quality score
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion: string;
  category: 'security' | 'performance' | 'functionality' | 'compliance';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
  category: 'security' | 'performance' | 'functionality' | 'compliance';
}

export interface SecurityAuditResult {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
}

export interface SecurityVulnerability {
  field: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  remediation: string;
}

export interface SecurityRecommendation {
  category: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Configuration Validator for production readiness
 */
export class ConfigurationValidator {
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
  }

  /**
   * Validate complete configuration
   */
  public validateConfiguration(config: SOVRENConfiguration): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Core validation
    this.validateCoreSettings(config, errors, warnings);
    
    // Security validation
    this.validateSecuritySettings(config, errors, warnings);
    
    // Database validation
    this.validateDatabaseSettings(config, errors, warnings);
    
    // Redis validation
    this.validateRedisSettings(config, errors, warnings);
    
    // TTS validation
    this.validateTTSSettings(config, errors, warnings);
    
    // Email validation
    this.validateEmailSettings(config, errors, warnings);
    
    // Storage validation
    this.validateStorageSettings(config, errors, warnings);
    
    // Performance validation
    this.validatePerformanceSettings(config, errors, warnings);
    
    // Feature flags validation
    this.validateFeatureFlags(config, errors, warnings);
    
    // Environment-specific validation
    this.validateEnvironmentSpecific(config, errors, warnings);

    const score = this.calculateConfigurationScore(errors, warnings);

    return {
      valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      score
    };
  }

  /**
   * Perform security audit
   */
  public performSecurityAudit(config: SOVRENConfiguration): SecurityAuditResult {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: SecurityRecommendation[] = [];

    // JWT Security Audit
    this.auditJWTSecurity(config, vulnerabilities, recommendations);
    
    // Password Security Audit
    this.auditPasswordSecurity(config, vulnerabilities, recommendations);
    
    // CORS Security Audit
    this.auditCORSSecurity(config, vulnerabilities, recommendations);
    
    // CSP Security Audit
    this.auditCSPSecurity(config, vulnerabilities, recommendations);
    
    // Database Security Audit
    this.auditDatabaseSecurity(config, vulnerabilities, recommendations);
    
    // Redis Security Audit
    this.auditRedisSecurity(config, vulnerabilities, recommendations);

    const score = this.calculateSecurityScore(vulnerabilities);

    return {
      score,
      vulnerabilities,
      recommendations
    };
  }

  /**
   * Validate core settings
   */
  private validateCoreSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Environment validation
    const validEnvironments: Environment[] = ['development', 'staging', 'production', 'test'];
    if (!validEnvironments.includes(config.environment)) {
      errors.push({
        field: 'environment',
        message: `Invalid environment: ${config.environment}`,
        severity: 'critical',
        suggestion: `Use one of: ${validEnvironments.join(', ')}`,
        category: 'functionality'
      });
    }

    // Port validation
    if (config.port < 1 || config.port > 65535) {
      errors.push({
        field: 'port',
        message: `Invalid port number: ${config.port}`,
        severity: 'high',
        suggestion: 'Use a port number between 1 and 65535',
        category: 'functionality'
      });
    }

    // Base URL validation
    if (!config.baseUrl || !this.isValidURL(config.baseUrl)) {
      errors.push({
        field: 'baseUrl',
        message: 'Invalid or missing base URL',
        severity: 'high',
        suggestion: 'Provide a valid base URL (e.g., https://api.sovren.ai)',
        category: 'functionality'
      });
    }

    // Production-specific validations
    if (config.environment === 'production') {
      if (config.baseUrl.startsWith('http://')) {
        warnings.push({
          field: 'baseUrl',
          message: 'Using HTTP in production is not recommended',
          suggestion: 'Use HTTPS for production deployments',
          category: 'security'
        });
      }
    }
  }

  /**
   * Validate security settings
   */
  private validateSecuritySettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const security = config.security;

    // JWT Secret validation
    if (!security.jwt.secret || security.jwt.secret.length < 32) {
      errors.push({
        field: 'security.jwt.secret',
        message: 'JWT secret must be at least 32 characters long',
        severity: 'critical',
        suggestion: 'Generate a strong, random JWT secret with at least 32 characters',
        category: 'security'
      });
    }

    // Default JWT secret check
    if (security.jwt.secret.includes('change') || security.jwt.secret.includes('default')) {
      errors.push({
        field: 'security.jwt.secret',
        message: 'Using default or placeholder JWT secret',
        severity: 'critical',
        suggestion: 'Generate a unique, secure JWT secret for production',
        category: 'security'
      });
    }

    // Bcrypt rounds validation
    if (security.bcrypt.rounds < 10) {
      warnings.push({
        field: 'security.bcrypt.rounds',
        message: 'Bcrypt rounds below 10 may be insufficient for production',
        suggestion: 'Use at least 12 rounds for production security',
        category: 'security'
      });
    }

    if (security.bcrypt.rounds > 15) {
      warnings.push({
        field: 'security.bcrypt.rounds',
        message: 'Bcrypt rounds above 15 may impact performance',
        suggestion: 'Consider using 12-14 rounds for optimal security/performance balance',
        category: 'performance'
      });
    }

    // CORS validation
    if (security.cors.origin === true && config.environment === 'production') {
      errors.push({
        field: 'security.cors.origin',
        message: 'CORS origin set to allow all origins in production',
        severity: 'high',
        suggestion: 'Specify exact allowed origins for production',
        category: 'security'
      });
    }

    // CSP validation
    if (!security.csp.enabled && config.environment === 'production') {
      warnings.push({
        field: 'security.csp.enabled',
        message: 'Content Security Policy disabled in production',
        suggestion: 'Enable CSP for enhanced security',
        category: 'security'
      });
    }
  }

  /**
   * Validate database settings
   */
  private validateDatabaseSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const db = config.database;

    // Required fields
    if (!db.host || !db.database || !db.username) {
      errors.push({
        field: 'database',
        message: 'Missing required database configuration',
        severity: 'critical',
        suggestion: 'Provide host, database name, and username',
        category: 'functionality'
      });
    }

    // SSL in production
    if (config.environment === 'production' && !db.ssl) {
      warnings.push({
        field: 'database.ssl',
        message: 'SSL disabled for database in production',
        suggestion: 'Enable SSL for production database connections',
        category: 'security'
      });
    }

    // Connection pool validation
    if (db.maxConnections < db.poolMax) {
      errors.push({
        field: 'database.maxConnections',
        message: 'Max connections less than pool max',
        severity: 'medium',
        suggestion: 'Ensure maxConnections >= poolMax',
        category: 'functionality'
      });
    }

    // Performance warnings
    if (db.maxConnections > 200) {
      warnings.push({
        field: 'database.maxConnections',
        message: 'Very high max connections may impact performance',
        suggestion: 'Consider if this many connections are necessary',
        category: 'performance'
      });
    }
  }

  /**
   * Validate Redis settings
   */
  private validateRedisSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const redis = config.redis;

    // URL or host/port validation
    if (!redis.url && (!redis.host || !redis.port)) {
      errors.push({
        field: 'redis',
        message: 'Missing Redis URL or host/port configuration',
        severity: 'critical',
        suggestion: 'Provide either Redis URL or host/port configuration',
        category: 'functionality'
      });
    }

    // Password in production
    if (config.environment === 'production' && !redis.password) {
      warnings.push({
        field: 'redis.password',
        message: 'Redis password not set in production',
        suggestion: 'Use password authentication for production Redis',
        category: 'security'
      });
    }

    // Connection settings validation
    if (redis.maxRetries < 1) {
      warnings.push({
        field: 'redis.maxRetries',
        message: 'Redis max retries set to 0',
        suggestion: 'Allow at least 1 retry for better reliability',
        category: 'functionality'
      });
    }
  }

  /**
   * Validate TTS settings
   */
  private validateTTSSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const tts = config.tts;

    if (!tts.enabled) return;

    // Path validation
    if (!existsSync(tts.modelsPath)) {
      errors.push({
        field: 'tts.modelsPath',
        message: `TTS models path does not exist: ${tts.modelsPath}`,
        severity: 'high',
        suggestion: 'Create the models directory or update the path',
        category: 'functionality'
      });
    }

    // Output path validation
    try {
      accessSync(resolve(tts.outputPath), constants.W_OK);
    } catch {
      errors.push({
        field: 'tts.outputPath',
        message: `TTS output path is not writable: ${tts.outputPath}`,
        severity: 'high',
        suggestion: 'Ensure the output directory exists and is writable',
        category: 'functionality'
      });
    }

    // Performance validation
    if (tts.maxConcurrentSynthesis > 20) {
      warnings.push({
        field: 'tts.maxConcurrentSynthesis',
        message: 'Very high concurrent synthesis limit may impact performance',
        suggestion: 'Consider system resources when setting concurrent limits',
        category: 'performance'
      });
    }

    // Cache validation
    if (tts.cacheEnabled && tts.cacheMaxSize < 100) {
      warnings.push({
        field: 'tts.cacheMaxSize',
        message: 'TTS cache size may be too small for effective caching',
        suggestion: 'Consider increasing cache size for better performance',
        category: 'performance'
      });
    }
  }

  /**
   * Validate email settings
   */
  private validateEmailSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const email = config.email;

    // Provider validation
    const validProviders = ['smtp', 'sendgrid', 'mailgun', 'ses'];
    if (!validProviders.includes(email.provider)) {
      errors.push({
        field: 'email.provider',
        message: `Invalid email provider: ${email.provider}`,
        severity: 'medium',
        suggestion: `Use one of: ${validProviders.join(', ')}`,
        category: 'functionality'
      });
    }

    // SMTP validation
    if (email.provider === 'smtp' && email.smtp) {
      if (!email.smtp.host || !email.smtp.auth.user) {
        errors.push({
          field: 'email.smtp',
          message: 'Incomplete SMTP configuration',
          severity: 'medium',
          suggestion: 'Provide SMTP host and authentication details',
          category: 'functionality'
        });
      }
    }

    // From address validation
    if (!email.from || !this.isValidEmail(email.from)) {
      errors.push({
        field: 'email.from',
        message: 'Invalid or missing from email address',
        severity: 'medium',
        suggestion: 'Provide a valid from email address',
        category: 'functionality'
      });
    }
  }

  /**
   * Validate storage settings
   */
  private validateStorageSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const storage = config.storage;

    const validProviders = ['local', 's3', 'gcs', 'azure'];
    if (!validProviders.includes(storage.provider)) {
      errors.push({
        field: 'storage.provider',
        message: `Invalid storage provider: ${storage.provider}`,
        severity: 'medium',
        suggestion: `Use one of: ${validProviders.join(', ')}`,
        category: 'functionality'
      });
    }

    // Local storage validation
    if (storage.provider === 'local' && storage.local) {
      try {
        accessSync(resolve(storage.local.basePath), constants.W_OK);
      } catch {
        errors.push({
          field: 'storage.local.basePath',
          message: `Storage path is not writable: ${storage.local.basePath}`,
          severity: 'medium',
          suggestion: 'Ensure the storage directory exists and is writable',
          category: 'functionality'
        });
      }
    }

    // Cloud storage validation
    if (storage.provider === 's3' && storage.s3) {
      if (!storage.s3.bucket || !storage.s3.region) {
        errors.push({
          field: 'storage.s3',
          message: 'Incomplete S3 configuration',
          severity: 'medium',
          suggestion: 'Provide S3 bucket and region',
          category: 'functionality'
        });
      }
    }
  }

  /**
   * Validate performance settings
   */
  private validatePerformanceSettings(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const perf = config.performance;

    // Concurrent requests validation
    if (perf.optimization.maxConcurrentRequests > 10000) {
      warnings.push({
        field: 'performance.optimization.maxConcurrentRequests',
        message: 'Very high concurrent request limit',
        suggestion: 'Ensure system can handle this load',
        category: 'performance'
      });
    }

    // Timeout validation
    if (perf.optimization.requestTimeout < 5000) {
      warnings.push({
        field: 'performance.optimization.requestTimeout',
        message: 'Request timeout may be too low',
        suggestion: 'Consider increasing timeout for complex operations',
        category: 'performance'
      });
    }

    // Clustering validation
    if (perf.clustering.enabled && config.environment === 'development') {
      warnings.push({
        field: 'performance.clustering.enabled',
        message: 'Clustering enabled in development',
        suggestion: 'Clustering is typically not needed in development',
        category: 'functionality'
      });
    }
  }

  /**
   * Validate feature flags
   */
  private validateFeatureFlags(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const features = config.features;

    // Dependency validation
    if (features.shadowBoard && !features.voiceSynthesis) {
      warnings.push({
        field: 'features.shadowBoard',
        message: 'Shadow Board enabled without voice synthesis',
        suggestion: 'Shadow Board typically requires voice synthesis',
        category: 'functionality'
      });
    }

    if (features.quantumDecisionMaking && config.environment === 'production') {
      warnings.push({
        field: 'features.quantumDecisionMaking',
        message: 'Experimental feature enabled in production',
        suggestion: 'Consider disabling experimental features in production',
        category: 'functionality'
      });
    }
  }

  /**
   * Validate environment-specific settings
   */
  private validateEnvironmentSpecific(
    config: SOVRENConfiguration,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (config.environment === 'production') {
      // Production-specific validations
      if (config.monitoring.logging.level === 'debug') {
        warnings.push({
          field: 'monitoring.logging.level',
          message: 'Debug logging enabled in production',
          suggestion: 'Use info or warn level for production',
          category: 'performance'
        });
      }

      if (!config.monitoring.alerting.enabled) {
        warnings.push({
          field: 'monitoring.alerting.enabled',
          message: 'Alerting disabled in production',
          suggestion: 'Enable alerting for production monitoring',
          category: 'functionality'
        });
      }
    }

    if (config.environment === 'development') {
      // Development-specific validations
      if (config.security.jwt.secret.length > 50) {
        warnings.push({
          field: 'security.jwt.secret',
          message: 'Very long JWT secret in development',
          suggestion: 'Shorter secrets are fine for development',
          category: 'functionality'
        });
      }
    }
  }

  /**
   * Audit JWT security
   */
  private auditJWTSecurity(
    config: SOVRENConfiguration,
    vulnerabilities: SecurityVulnerability[],
    recommendations: SecurityRecommendation[]
  ): void {
    const jwt = config.security.jwt;

    if (jwt.secret.length < 32) {
      vulnerabilities.push({
        field: 'security.jwt.secret',
        severity: 'critical',
        description: 'JWT secret is too short',
        impact: 'Tokens can be easily brute-forced',
        remediation: 'Use a JWT secret with at least 32 characters'
      });
    }

    if (jwt.algorithm.startsWith('HS') && jwt.secret.length < 64) {
      recommendations.push({
        category: 'JWT Security',
        recommendation: 'Use longer secrets (64+ chars) for HMAC algorithms',
        priority: 'medium'
      });
    }
  }

  /**
   * Audit password security
   */
  private auditPasswordSecurity(
    config: SOVRENConfiguration,
    vulnerabilities: SecurityVulnerability[],
    recommendations: SecurityRecommendation[]
  ): void {
    const bcrypt = config.security.bcrypt;

    if (bcrypt.rounds < 10) {
      vulnerabilities.push({
        field: 'security.bcrypt.rounds',
        severity: 'high',
        description: 'Bcrypt rounds too low',
        impact: 'Passwords can be cracked faster',
        remediation: 'Use at least 12 rounds for production'
      });
    }

    recommendations.push({
      category: 'Password Security',
      recommendation: 'Consider implementing password complexity requirements',
      priority: 'medium'
    });
  }

  /**
   * Audit CORS security
   */
  private auditCORSSecurity(
    config: SOVRENConfiguration,
    vulnerabilities: SecurityVulnerability[],
    recommendations: SecurityRecommendation[]
  ): void {
    const cors = config.security.cors;

    if (cors.origin === true) {
      vulnerabilities.push({
        field: 'security.cors.origin',
        severity: 'medium',
        description: 'CORS allows all origins',
        impact: 'Potential for cross-origin attacks',
        remediation: 'Specify exact allowed origins'
      });
    }
  }

  /**
   * Audit CSP security
   */
  private auditCSPSecurity(
    config: SOVRENConfiguration,
    vulnerabilities: SecurityVulnerability[],
    recommendations: SecurityRecommendation[]
  ): void {
    const csp = config.security.csp;

    if (!csp.enabled) {
      vulnerabilities.push({
        field: 'security.csp.enabled',
        severity: 'medium',
        description: 'Content Security Policy disabled',
        impact: 'Increased risk of XSS attacks',
        remediation: 'Enable and configure CSP'
      });
    }

    if (csp.directives['script-src']?.includes("'unsafe-inline'")) {
      vulnerabilities.push({
        field: 'security.csp.directives.script-src',
        severity: 'medium',
        description: 'CSP allows unsafe inline scripts',
        impact: 'Reduced XSS protection',
        remediation: 'Remove unsafe-inline and use nonces or hashes'
      });
    }
  }

  /**
   * Audit database security
   */
  private auditDatabaseSecurity(
    config: SOVRENConfiguration,
    vulnerabilities: SecurityVulnerability[],
    recommendations: SecurityRecommendation[]
  ): void {
    const db = config.database;

    if (!db.ssl && config.environment === 'production') {
      vulnerabilities.push({
        field: 'database.ssl',
        severity: 'high',
        description: 'Database SSL disabled in production',
        impact: 'Data transmitted in plain text',
        remediation: 'Enable SSL for database connections'
      });
    }

    recommendations.push({
      category: 'Database Security',
      recommendation: 'Implement database connection encryption',
      priority: 'high'
    });
  }

  /**
   * Audit Redis security
   */
  private auditRedisSecurity(
    config: SOVRENConfiguration,
    vulnerabilities: SecurityVulnerability[],
    recommendations: SecurityRecommendation[]
  ): void {
    const redis = config.redis;

    if (!redis.password && config.environment === 'production') {
      vulnerabilities.push({
        field: 'redis.password',
        severity: 'medium',
        description: 'Redis password not set in production',
        impact: 'Unauthorized access to Redis data',
        remediation: 'Set a strong Redis password'
      });
    }
  }

  /**
   * Calculate configuration quality score
   */
  private calculateConfigurationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    let score = 100;

    // Deduct points for errors
    for (const error of errors) {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Deduct points for warnings
    for (const warning of warnings) {
      score -= 2;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate security score
   */
  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 100;

    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Validate URL format
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const configValidator = new ConfigurationValidator();
