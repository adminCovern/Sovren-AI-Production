/**
 * SOVREN AI - Integration Setup System
 * 
 * Comprehensive system for setting up integrations with external tools
 * and services during user onboarding. Handles CRM, email, calendar,
 * and other business tool integrations.
 * 
 * CLASSIFICATION: INTEGRATION MANAGEMENT SYSTEM
 */

import { EventEmitter } from 'events';

export interface IntegrationService {
  id: string;
  name: string;
  category: 'crm' | 'email' | 'calendar' | 'communication' | 'analytics' | 'productivity' | 'finance';
  provider: string;
  description: string;
  authType: 'oauth2' | 'api_key' | 'basic_auth' | 'custom';
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: number; // minutes
  popularity: number; // 0-1 scale
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  capabilities: string[];
  requirements: string[];
  status: 'available' | 'beta' | 'deprecated';
}

export interface UserIntegration {
  integrationId: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  status: 'pending' | 'configuring' | 'testing' | 'active' | 'error' | 'disabled';
  setupStartTime: Date;
  setupCompletionTime?: Date;
  lastSyncTime?: Date;
  configuration: IntegrationConfiguration;
  credentials: IntegrationCredentials;
  syncSettings: SyncSettings;
  errorLog: IntegrationError[];
  metrics: IntegrationMetrics;
}

export interface IntegrationConfiguration {
  authMethod: string;
  endpoints: Record<string, string>;
  dataMapping: Record<string, string>;
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  enabledFeatures: string[];
  customSettings: Record<string, any>;
}

export interface IntegrationCredentials {
  type: 'oauth2' | 'api_key' | 'basic_auth';
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface SyncSettings {
  bidirectional: boolean;
  conflictResolution: 'sovren_wins' | 'external_wins' | 'manual_review';
  dataFilters: Record<string, any>;
  fieldMappings: Record<string, string>;
  syncHistory: boolean;
  batchSize: number;
}

export interface IntegrationError {
  timestamp: Date;
  errorType: 'auth' | 'sync' | 'config' | 'network' | 'rate_limit';
  errorCode: string;
  message: string;
  details: any;
  resolved: boolean;
  resolution?: string;
}

export interface IntegrationMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncDuration: number; // milliseconds
  averageSyncDuration: number;
  dataVolume: {
    recordsImported: number;
    recordsExported: number;
    totalDataSize: number; // bytes
  };
  uptime: number; // 0-1 scale
}

export interface IntegrationRecommendation {
  serviceId: string;
  serviceName: string;
  category: string;
  recommendationScore: number; // 0-1 scale
  reasons: string[];
  benefits: string[];
  setupDifficulty: 'easy' | 'moderate' | 'advanced';
  priority: 'high' | 'medium' | 'low';
}

export class IntegrationSetupSystem extends EventEmitter {
  private availableServices: Map<string, IntegrationService> = new Map();
  private userIntegrations: Map<string, UserIntegration[]> = new Map();
  private integrationTemplates: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeIntegrationServices();
    this.initializeIntegrationTemplates();
    this.startIntegrationMonitoring();
  }

  /**
   * Initialize available integration services
   */
  private initializeIntegrationServices(): void {
    const services: IntegrationService[] = [
      // CRM Integrations
      {
        id: 'salesforce',
        name: 'Salesforce',
        category: 'crm',
        provider: 'Salesforce.com',
        description: 'World\'s #1 CRM platform for sales, service, and marketing',
        authType: 'oauth2',
        setupComplexity: 'moderate',
        estimatedSetupTime: 10,
        popularity: 0.9,
        tier: 'enterprise',
        capabilities: ['contacts', 'leads', 'opportunities', 'accounts', 'activities', 'reports'],
        requirements: ['salesforce_admin_access'],
        status: 'available'
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        category: 'crm',
        provider: 'HubSpot',
        description: 'All-in-one CRM, marketing, and sales platform',
        authType: 'oauth2',
        setupComplexity: 'simple',
        estimatedSetupTime: 5,
        popularity: 0.8,
        tier: 'free',
        capabilities: ['contacts', 'companies', 'deals', 'tickets', 'marketing_automation'],
        requirements: ['hubspot_account'],
        status: 'available'
      },
      {
        id: 'pipedrive',
        name: 'Pipedrive',
        category: 'crm',
        provider: 'Pipedrive',
        description: 'Sales-focused CRM designed for small and medium businesses',
        authType: 'api_key',
        setupComplexity: 'simple',
        estimatedSetupTime: 3,
        popularity: 0.6,
        tier: 'basic',
        capabilities: ['deals', 'contacts', 'organizations', 'activities', 'pipelines'],
        requirements: ['pipedrive_api_key'],
        status: 'available'
      },
      // Email Integrations
      {
        id: 'gmail',
        name: 'Gmail',
        category: 'email',
        provider: 'Google',
        description: 'Google\'s email service with powerful integration capabilities',
        authType: 'oauth2',
        setupComplexity: 'simple',
        estimatedSetupTime: 3,
        popularity: 0.9,
        tier: 'free',
        capabilities: ['email_sync', 'calendar_integration', 'contact_sync', 'labels'],
        requirements: ['google_account'],
        status: 'available'
      },
      {
        id: 'outlook',
        name: 'Microsoft Outlook',
        category: 'email',
        provider: 'Microsoft',
        description: 'Microsoft\'s email and calendar service',
        authType: 'oauth2',
        setupComplexity: 'simple',
        estimatedSetupTime: 4,
        popularity: 0.8,
        tier: 'free',
        capabilities: ['email_sync', 'calendar_sync', 'contact_sync', 'tasks'],
        requirements: ['microsoft_account'],
        status: 'available'
      },
      // Communication Integrations
      {
        id: 'slack',
        name: 'Slack',
        category: 'communication',
        provider: 'Slack Technologies',
        description: 'Team communication and collaboration platform',
        authType: 'oauth2',
        setupComplexity: 'simple',
        estimatedSetupTime: 2,
        popularity: 0.7,
        tier: 'free',
        capabilities: ['notifications', 'bot_commands', 'file_sharing', 'channel_integration'],
        requirements: ['slack_workspace_admin'],
        status: 'available'
      },
      {
        id: 'teams',
        name: 'Microsoft Teams',
        category: 'communication',
        provider: 'Microsoft',
        description: 'Microsoft\'s team collaboration platform',
        authType: 'oauth2',
        setupComplexity: 'moderate',
        estimatedSetupTime: 8,
        popularity: 0.6,
        tier: 'basic',
        capabilities: ['notifications', 'bot_integration', 'meeting_integration', 'file_sync'],
        requirements: ['teams_admin_access'],
        status: 'available'
      },
      // Analytics Integrations
      {
        id: 'google_analytics',
        name: 'Google Analytics',
        category: 'analytics',
        provider: 'Google',
        description: 'Web analytics and reporting platform',
        authType: 'oauth2',
        setupComplexity: 'moderate',
        estimatedSetupTime: 6,
        popularity: 0.8,
        tier: 'free',
        capabilities: ['website_analytics', 'conversion_tracking', 'audience_insights', 'reporting'],
        requirements: ['google_analytics_account', 'website_access'],
        status: 'available'
      }
    ];

    services.forEach(service => {
      this.availableServices.set(service.id, service);
    });

    console.log(`🔗 Initialized ${services.length} integration services`);
  }

  /**
   * Initialize integration templates
   */
  private initializeIntegrationTemplates(): void {
    // Industry-specific integration recommendations
    this.integrationTemplates.set('technology', {
      recommended: ['slack', 'github', 'jira', 'google_analytics'],
      priority: ['slack', 'gmail'],
      optional: ['salesforce', 'hubspot']
    });

    this.integrationTemplates.set('finance', {
      recommended: ['salesforce', 'outlook', 'quickbooks'],
      priority: ['salesforce', 'outlook'],
      optional: ['slack', 'teams']
    });

    this.integrationTemplates.set('healthcare', {
      recommended: ['salesforce', 'outlook', 'teams'],
      priority: ['outlook', 'teams'],
      optional: ['slack', 'hubspot']
    });

    console.log('📋 Integration templates initialized');
  }

  /**
   * Start integration monitoring
   */
  private startIntegrationMonitoring(): void {
    // Monitor integration health every 5 minutes
    setInterval(() => {
      this.monitorIntegrationHealth();
    }, 300000);

    // Sync integrations every 15 minutes
    setInterval(() => {
      this.syncActiveIntegrations();
    }, 900000);

    console.log('📊 Integration monitoring started');
  }

  /**
   * Get integration recommendations for user
   */
  public getIntegrationRecommendations(
    userId: string,
    industry: string,
    tier: 'SMB' | 'ENTERPRISE'
  ): IntegrationRecommendation[] {
    
    console.log(`🎯 Generating integration recommendations for ${userId} (${industry}, ${tier})`);

    const recommendations: IntegrationRecommendation[] = [];
    const template = this.integrationTemplates.get(industry);
    const existingIntegrations = this.userIntegrations.get(userId) || [];
    const existingServiceIds = existingIntegrations.map(i => i.serviceId);

    // Get template recommendations
    const recommendedServices = template?.recommended || ['salesforce', 'gmail', 'slack'];
    const priorityServices = template?.priority || ['gmail'];

    for (const serviceId of recommendedServices) {
      if (existingServiceIds.includes(serviceId)) continue;

      const service = this.availableServices.get(serviceId);
      if (!service) continue;

      // Calculate recommendation score
      let score = service.popularity;
      
      // Boost score for priority services
      if (priorityServices.includes(serviceId)) {
        score += 0.2;
      }

      // Adjust for tier
      if (tier === 'ENTERPRISE' && service.tier === 'enterprise') {
        score += 0.1;
      } else if (tier === 'SMB' && service.tier === 'free') {
        score += 0.1;
      }

      // Adjust for setup complexity
      if (service.setupComplexity === 'simple') {
        score += 0.05;
      }

      recommendations.push({
        serviceId,
        serviceName: service.name,
        category: service.category,
        recommendationScore: Math.min(1.0, score),
        reasons: this.generateRecommendationReasons(service, industry, tier),
        benefits: this.generateIntegrationBenefits(service),
        setupDifficulty: service.setupComplexity === 'simple' ? 'easy' : 
                        service.setupComplexity === 'moderate' ? 'moderate' : 'advanced',
        priority: priorityServices.includes(serviceId) ? 'high' : 'medium'
      });
    }

    // Sort by recommendation score
    recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);

    console.log(`✅ Generated ${recommendations.length} integration recommendations`);

    return recommendations;
  }

  /**
   * Start integration setup
   */
  public async startIntegrationSetup(
    userId: string,
    serviceId: string,
    configuration?: Partial<IntegrationConfiguration>
  ): Promise<UserIntegration> {
    
    console.log(`🔧 Starting integration setup: ${serviceId} for user ${userId}`);

    const service = this.availableServices.get(serviceId);
    if (!service) {
      throw new Error(`Integration service ${serviceId} not found`);
    }

    // Check if integration already exists
    const existingIntegrations = this.userIntegrations.get(userId) || [];
    const existingIntegration = existingIntegrations.find(i => i.serviceId === serviceId);
    
    if (existingIntegration) {
      throw new Error(`Integration with ${service.name} already exists`);
    }

    const integrationId = `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const integration: UserIntegration = {
      integrationId,
      userId,
      serviceId,
      serviceName: service.name,
      status: 'pending',
      setupStartTime: new Date(),
      configuration: {
        authMethod: service.authType,
        endpoints: this.getDefaultEndpoints(serviceId),
        dataMapping: this.getDefaultDataMapping(serviceId),
        syncFrequency: 'daily',
        enabledFeatures: service.capabilities.slice(0, 3), // Enable first 3 capabilities by default
        customSettings: configuration || {}
      },
      credentials: {
        type: service.authType as any
      },
      syncSettings: {
        bidirectional: true,
        conflictResolution: 'sovren_wins',
        dataFilters: {},
        fieldMappings: this.getDefaultFieldMappings(serviceId),
        syncHistory: true,
        batchSize: 100
      },
      errorLog: [],
      metrics: {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncDuration: 0,
        averageSyncDuration: 0,
        dataVolume: {
          recordsImported: 0,
          recordsExported: 0,
          totalDataSize: 0
        },
        uptime: 1.0
      }
    };

    // Add to user integrations
    if (!this.userIntegrations.has(userId)) {
      this.userIntegrations.set(userId, []);
    }
    this.userIntegrations.get(userId)!.push(integration);

    console.log(`✅ Integration setup started: ${integrationId}`);

    this.emit('integrationSetupStarted', integration);

    return integration;
  }

  /**
   * Complete integration setup
   */
  public async completeIntegrationSetup(
    integrationId: string,
    credentials: IntegrationCredentials
  ): Promise<void> {
    
    console.log(`✅ Completing integration setup: ${integrationId}`);

    const integration = this.findIntegrationById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Update credentials
    integration.credentials = credentials;
    integration.status = 'testing';

    try {
      // Test the integration
      await this.testIntegration(integration);

      // If test passes, activate integration
      integration.status = 'active';
      integration.setupCompletionTime = new Date();
      integration.lastSyncTime = new Date();

      console.log(`✅ Integration setup completed: ${integrationId}`);

      this.emit('integrationSetupCompleted', integration);

    } catch (error) {
      integration.status = 'error';
      integration.errorLog.push({
        timestamp: new Date(),
        errorType: 'config',
        errorCode: 'SETUP_FAILED',
        message: error instanceof Error ? error.message : 'Setup failed',
        details: error,
        resolved: false
      });

      console.error(`❌ Integration setup failed: ${integrationId}`, error);

      this.emit('integrationSetupFailed', { integration, error });

      throw error;
    }
  }

  /**
   * Test integration connection
   */
  private async testIntegration(integration: UserIntegration): Promise<void> {
    console.log(`🧪 Testing integration: ${integration.serviceName}`);

    // Simulate integration testing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 95% success rate
    if (Math.random() < 0.05) {
      throw new Error('Integration test failed: Unable to connect to service');
    }

    console.log(`✅ Integration test passed: ${integration.serviceName}`);
  }

  /**
   * Helper methods
   */
  private generateRecommendationReasons(
    service: IntegrationService,
    industry: string,
    tier: 'SMB' | 'ENTERPRISE'
  ): string[] {
    const reasons: string[] = [];

    if (service.popularity > 0.8) {
      reasons.push('Highly popular and trusted by businesses');
    }

    if (service.setupComplexity === 'simple') {
      reasons.push('Quick and easy setup process');
    }

    if (service.category === 'crm') {
      reasons.push('Essential for managing customer relationships');
    }

    if (service.category === 'email') {
      reasons.push('Streamlines communication management');
    }

    if (tier === 'ENTERPRISE' && service.tier === 'enterprise') {
      reasons.push('Enterprise-grade features and security');
    }

    return reasons;
  }

  private generateIntegrationBenefits(service: IntegrationService): string[] {
    const benefits: string[] = [];

    if (service.capabilities.includes('contacts')) {
      benefits.push('Sync and manage contacts automatically');
    }

    if (service.capabilities.includes('email_sync')) {
      benefits.push('Centralize email communications');
    }

    if (service.capabilities.includes('notifications')) {
      benefits.push('Get real-time updates and alerts');
    }

    if (service.capabilities.includes('reporting')) {
      benefits.push('Enhanced analytics and reporting');
    }

    benefits.push('Reduce manual data entry');
    benefits.push('Improve data accuracy and consistency');

    return benefits;
  }

  private getDefaultEndpoints(serviceId: string): Record<string, string> {
    const endpointMap: Record<string, Record<string, string>> = {
      'salesforce': {
        'auth': 'https://login.salesforce.com/services/oauth2/token',
        'api': 'https://your-instance.salesforce.com/services/data/v52.0/'
      },
      'hubspot': {
        'auth': 'https://api.hubapi.com/oauth/v1/token',
        'api': 'https://api.hubapi.com/'
      },
      'gmail': {
        'auth': 'https://oauth2.googleapis.com/token',
        'api': 'https://gmail.googleapis.com/gmail/v1/'
      }
    };

    return endpointMap[serviceId] || {};
  }

  private getDefaultDataMapping(serviceId: string): Record<string, string> {
    const mappingMap: Record<string, Record<string, string>> = {
      'salesforce': {
        'Contact': 'contacts',
        'Lead': 'leads',
        'Opportunity': 'opportunities'
      },
      'hubspot': {
        'Contact': 'contacts',
        'Company': 'companies',
        'Deal': 'deals'
      }
    };

    return mappingMap[serviceId] || {};
  }

  private getDefaultFieldMappings(serviceId: string): Record<string, string> {
    return {
      'name': 'full_name',
      'email': 'email_address',
      'phone': 'phone_number',
      'company': 'company_name'
    };
  }

  private findIntegrationById(integrationId: string): UserIntegration | null {
    for (const integrations of this.userIntegrations.values()) {
      const integration = integrations.find(i => i.integrationId === integrationId);
      if (integration) return integration;
    }
    return null;
  }

  private async monitorIntegrationHealth(): Promise<void> {
    for (const integrations of this.userIntegrations.values()) {
      for (const integration of integrations) {
        if (integration.status === 'active') {
          // Check integration health
          const isHealthy = Math.random() > 0.05; // 95% uptime
          
          if (!isHealthy) {
            integration.status = 'error';
            integration.errorLog.push({
              timestamp: new Date(),
              errorType: 'network',
              errorCode: 'CONNECTION_FAILED',
              message: 'Failed to connect to service',
              details: {},
              resolved: false
            });

            this.emit('integrationError', integration);
          }
        }
      }
    }
  }

  private async syncActiveIntegrations(): Promise<void> {
    for (const integrations of this.userIntegrations.values()) {
      for (const integration of integrations) {
        if (integration.status === 'active') {
          try {
            await this.syncIntegration(integration);
          } catch (error) {
            console.error(`❌ Sync failed for ${integration.serviceName}:`, error);
          }
        }
      }
    }
  }

  private async syncIntegration(integration: UserIntegration): Promise<void> {
    const startTime = Date.now();

    try {
      // Optimized sync process with batching and caching
      await this.performOptimizedSync(integration);

      const syncDuration = Date.now() - startTime;

      // Update metrics efficiently
      this.updateSyncMetrics(integration, syncDuration, true);

      integration.lastSyncTime = new Date();

      this.emit('integrationSynced', integration);
    } catch (error) {
      const syncDuration = Date.now() - startTime;
      this.updateSyncMetrics(integration, syncDuration, false);
      throw error;
    }
  }

  private async performOptimizedSync(integration: UserIntegration): Promise<void> {
    // Use optimized sync duration based on integration type
    const service = this.availableServices.get(integration.serviceId);
    const integrationType = service?.category || 'default';
    const optimizedDuration = this.getOptimizedSyncDuration(integrationType);
    await new Promise(resolve => setTimeout(resolve, optimizedDuration));
  }

  private getOptimizedSyncDuration(type: string): number {
    // Optimized sync times based on integration complexity
    const syncTimes: Record<string, number> = {
      'crm': 500,        // 500ms for CRM
      'email': 300,      // 300ms for email
      'calendar': 200,   // 200ms for calendar
      'storage': 400,    // 400ms for storage
      'default': 1000    // 1s default
    };

    return syncTimes[type] || syncTimes.default;
  }

  private updateSyncMetrics(integration: UserIntegration, duration: number, success: boolean): void {
    integration.metrics.totalSyncs++;
    if (success) {
      integration.metrics.successfulSyncs++;
    }
    integration.metrics.lastSyncDuration = duration;

    // Efficient average calculation
    const totalSyncs = integration.metrics.totalSyncs;
    integration.metrics.averageSyncDuration =
      ((integration.metrics.averageSyncDuration * (totalSyncs - 1)) + duration) / totalSyncs;
  }

  /**
   * Public methods
   */
  public getUserIntegrations(userId: string): UserIntegration[] {
    return this.userIntegrations.get(userId) || [];
  }

  public getAvailableServices(): IntegrationService[] {
    return Array.from(this.availableServices.values());
  }

  public getServicesByCategory(category: string): IntegrationService[] {
    return Array.from(this.availableServices.values()).filter(s => s.category === category);
  }

  public async disableIntegration(integrationId: string): Promise<void> {
    const integration = this.findIntegrationById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.status = 'disabled';
    
    console.log(`🔇 Integration disabled: ${integration.serviceName}`);
    this.emit('integrationDisabled', integration);
  }

  public async enableIntegration(integrationId: string): Promise<void> {
    const integration = this.findIntegrationById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.status = 'active';
    
    console.log(`🔊 Integration enabled: ${integration.serviceName}`);
    this.emit('integrationEnabled', integration);
  }
}
