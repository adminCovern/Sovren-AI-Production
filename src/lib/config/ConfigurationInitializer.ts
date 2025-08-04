/**
 * CONFIGURATION INITIALIZER
 * Handles configuration loading, validation, and initialization for production deployment
 */

import { configManager, SOVRENConfiguration } from './ConfigurationManager';
import { configValidator, ValidationResult, SecurityAuditResult } from './ConfigurationValidator';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../errors/ErrorHandler';
import { container, SERVICE_IDENTIFIERS } from '../di/DIContainer';

export interface InitializationResult {
  success: boolean;
  config: SOVRENConfiguration;
  validation: ValidationResult;
  securityAudit: SecurityAuditResult;
  warnings: string[];
  errors: string[];
}

export interface ConfigurationHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  securityScore: number;
  issues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
}

/**
 * Configuration Initializer for production-ready setup
 */
export class ConfigurationInitializer {
  private errorHandler: ErrorHandler;
  private initialized: boolean = false;
  private config: SOVRENConfiguration | null = null;

  constructor() {
    this.errorHandler = container.resolve<ErrorHandler>(SERVICE_IDENTIFIERS.ERROR_HANDLER);
  }

  /**
   * Initialize configuration system
   */
  public async initialize(): Promise<InitializationResult> {
    try {
      console.log('🔧 Initializing SOVREN AI Configuration System...');

      // Load configuration
      const config = configManager.getConfig();
      this.config = config;

      // Validate configuration
      console.log('🔍 Validating configuration...');
      const validation = configValidator.validateConfiguration(config);

      // Perform security audit
      console.log('🛡️ Performing security audit...');
      const securityAudit = configValidator.performSecurityAudit(config);

      // Process results
      const warnings: string[] = [];
      const errors: string[] = [];

      // Process validation errors
      for (const error of validation.errors) {
        const message = `${error.field}: ${error.message} (${error.severity})`;
        if (error.severity === 'critical' || error.severity === 'high') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }

      // Process validation warnings
      for (const warning of validation.warnings) {
        warnings.push(`${warning.field}: ${warning.message}`);
      }

      // Process security vulnerabilities
      for (const vuln of securityAudit.vulnerabilities) {
        const message = `Security: ${vuln.field} - ${vuln.description} (${vuln.severity})`;
        if (vuln.severity === 'critical' || vuln.severity === 'high') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }

      // Log results
      this.logInitializationResults(config, validation, securityAudit, warnings, errors);

      // Check if initialization is successful
      const success = errors.length === 0 && validation.valid;

      if (success) {
        this.initialized = true;
        console.log('✅ Configuration system initialized successfully');
      } else {
        console.error('❌ Configuration initialization failed');
        
        // In production, we might want to exit if critical errors exist
        if (config.environment === 'production' && errors.length > 0) {
          console.error('💥 Critical configuration errors in production - exiting');
          process.exit(1);
        }
      }

      return {
        success,
        config,
        validation,
        securityAudit,
        warnings,
        errors
      };

    } catch (error) {
      const sovrenError = this.errorHandler.createError(
        'CONFIG_INIT_FAILED',
        'Configuration initialization failed',
        ErrorCategory.CONFIGURATION,
        ErrorSeverity.CRITICAL,
        { additionalData: { error: error instanceof Error ? error.message : String(error) } },
        {
          userMessage: 'System configuration could not be initialized.',
          suggestedActions: ['Check configuration files', 'Verify environment variables']
        }
      );

      console.error('💥 Configuration initialization failed:', sovrenError);
      throw sovrenError;
    }
  }

  /**
   * Get configuration health status
   */
  public getConfigurationHealth(): ConfigurationHealth {
    if (!this.initialized || !this.config) {
      return {
        status: 'critical',
        score: 0,
        securityScore: 0,
        issues: { critical: 1, high: 0, medium: 0, low: 0 },
        recommendations: ['Initialize configuration system']
      };
    }

    const validation = configValidator.validateConfiguration(this.config);
    const securityAudit = configValidator.performSecurityAudit(this.config);

    const issues = {
      critical: validation.errors.filter(e => e.severity === 'critical').length +
                securityAudit.vulnerabilities.filter(v => v.severity === 'critical').length,
      high: validation.errors.filter(e => e.severity === 'high').length +
            securityAudit.vulnerabilities.filter(v => v.severity === 'high').length,
      medium: validation.errors.filter(e => e.severity === 'medium').length +
              securityAudit.vulnerabilities.filter(v => v.severity === 'medium').length,
      low: validation.errors.filter(e => e.severity === 'low').length +
           securityAudit.vulnerabilities.filter(v => v.severity === 'low').length
    };

    const status = issues.critical > 0 ? 'critical' : 
                   issues.high > 0 ? 'warning' : 'healthy';

    const recommendations = [
      ...validation.warnings.map(w => w.suggestion),
      ...securityAudit.recommendations.map(r => r.recommendation)
    ].slice(0, 5); // Top 5 recommendations

    return {
      status,
      score: validation.score,
      securityScore: securityAudit.score,
      issues,
      recommendations
    };
  }

  /**
   * Reload configuration
   */
  public async reloadConfiguration(): Promise<InitializationResult> {
    console.log('🔄 Reloading configuration...');
    this.initialized = false;
    this.config = null;
    return this.initialize();
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): SOVRENConfiguration {
    if (!this.initialized || !this.config) {
      throw new Error('Configuration not initialized');
    }
    return this.config;
  }

  /**
   * Check if configuration is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Validate environment variables
   */
  public validateEnvironmentVariables(): { valid: boolean; missing: string[]; warnings: string[] } {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Critical environment variables
    const critical = [
      'NODE_ENV',
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL'
    ];

    // Important environment variables
    const important = [
      'PORT',
      'HOST',
      'BASE_URL',
      'TTS_MODELS_PATH',
      'TTS_OUTPUT_PATH'
    ];

    // Check critical variables
    for (const envVar of critical) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    // Check important variables
    for (const envVar of important) {
      if (!process.env[envVar]) {
        warnings.push(`Missing optional environment variable: ${envVar}`);
      }
    }

    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long');
    }

    // Check production-specific variables
    if (process.env.NODE_ENV === 'production') {
      const productionVars = [
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'ALERTING_EMAIL'
      ];

      for (const envVar of productionVars) {
        if (!process.env[envVar]) {
          warnings.push(`Missing production environment variable: ${envVar}`);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings
    };
  }

  /**
   * Generate configuration report
   */
  public generateConfigurationReport(): string {
    if (!this.initialized || !this.config) {
      return 'Configuration not initialized';
    }

    const health = this.getConfigurationHealth();
    const envValidation = this.validateEnvironmentVariables();

    const report = `
SOVREN AI Configuration Report
==============================

Environment: ${this.config.environment}
Status: ${health.status.toUpperCase()}
Configuration Score: ${health.score}/100
Security Score: ${health.securityScore}/100

Issues Summary:
- Critical: ${health.issues.critical}
- High: ${health.issues.high}
- Medium: ${health.issues.medium}
- Low: ${health.issues.low}

Environment Variables:
- Valid: ${envValidation.valid ? 'Yes' : 'No'}
- Missing Critical: ${envValidation.missing.length}
- Warnings: ${envValidation.warnings.length}

Feature Flags:
- Voice Synthesis: ${this.config.features.voiceSynthesis ? 'Enabled' : 'Disabled'}
- Shadow Board: ${this.config.features.shadowBoard ? 'Enabled' : 'Disabled'}
- CRM Integration: ${this.config.features.crmIntegration ? 'Enabled' : 'Disabled'}
- Performance Optimization: ${this.config.features.performanceOptimization ? 'Enabled' : 'Disabled'}
- Advanced Security: ${this.config.features.advancedSecurity ? 'Enabled' : 'Disabled'}

Top Recommendations:
${health.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

Database Configuration:
- Host: ${this.config.database.host}:${this.config.database.port}
- Database: ${this.config.database.database}
- SSL: ${this.config.database.ssl ? 'Enabled' : 'Disabled'}
- Max Connections: ${this.config.database.maxConnections}

Redis Configuration:
- Host: ${this.config.redis.host}:${this.config.redis.port}
- Password Protected: ${this.config.redis.password ? 'Yes' : 'No'}
- Max Retries: ${this.config.redis.maxRetries}

Security Configuration:
- JWT Algorithm: ${this.config.security.jwt.algorithm}
- Bcrypt Rounds: ${this.config.security.bcrypt.rounds}
- Rate Limiting: ${this.config.security.rateLimiting.enabled ? 'Enabled' : 'Disabled'}
- CORS: ${this.config.security.cors.enabled ? 'Enabled' : 'Disabled'}
- CSP: ${this.config.security.csp.enabled ? 'Enabled' : 'Disabled'}

Performance Configuration:
- Optimization: ${this.config.performance.optimization.enabled ? 'Enabled' : 'Disabled'}
- Clustering: ${this.config.performance.clustering.enabled ? 'Enabled' : 'Disabled'}
- Compression: ${this.config.performance.compression.enabled ? 'Enabled' : 'Disabled'}
- Max Concurrent Requests: ${this.config.performance.optimization.maxConcurrentRequests}

Generated: ${new Date().toISOString()}
    `.trim();

    return report;
  }

  /**
   * Log initialization results
   */
  private logInitializationResults(
    config: SOVRENConfiguration,
    validation: ValidationResult,
    securityAudit: SecurityAuditResult,
    warnings: string[],
    errors: string[]
  ): void {
    console.log('\n📊 Configuration Analysis Results:');
    console.log('=====================================');
    
    console.log(`Environment: ${config.environment}`);
    console.log(`Configuration Score: ${validation.score}/100`);
    console.log(`Security Score: ${securityAudit.score}/100`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(`   • ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ No configuration issues found!');
    }
    
    console.log('\n🔧 Active Features:');
    Object.entries(config.features).forEach(([feature, enabled]) => {
      if (enabled) {
        console.log(`   ✓ ${feature}`);
      }
    });
    
    console.log('');
  }
}

// Export singleton instance
export const configInitializer = new ConfigurationInitializer();
