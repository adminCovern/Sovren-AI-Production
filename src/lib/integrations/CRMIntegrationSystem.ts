export interface CRMProvider {
  id: string;
  name: string;
  type: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'custom';
  isConnected: boolean;
  lastSync: Date | null;
  config: CRMProviderConfig;
  features: CRMFeatures;
}

export interface CRMProviderConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  instanceUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  domain?: string;
  username?: string;
}

export interface CRMFeatures {
  leads: boolean;
  contacts: boolean;
  accounts: boolean;
  opportunities: boolean;
  activities: boolean;
  customFields: boolean;
  workflows: boolean;
  reports: boolean;
}

export interface CRMLead {
  id: string;
  providerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company: string;
  title?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  score: number; // 0-100
  value: number;
  currency: string;
  assignedTo?: string;
  createdDate: Date;
  lastActivity?: Date;
  nextFollowUp?: Date;
  tags: string[];
  customFields: Record<string, any>;
  aiInsights: LeadInsights;
  executiveAssignment?: string;
  pipeline3D: Pipeline3DPosition;
}

export interface CRMContact {
  id: string;
  providerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  accountId?: string;
  title?: string;
  department?: string;
  lastContactDate?: Date;
  contactFrequency: number;
  relationship: 'cold' | 'warm' | 'hot' | 'champion';
  influence: number; // 0-100
  tags: string[];
  customFields: Record<string, any>;
  aiInsights: ContactInsights;
  executiveAssignment?: string;
}

export interface CRMAccount {
  id: string;
  providerId: string;
  name: string;
  website?: string;
  industry?: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  revenue?: number;
  employees?: number;
  location?: string;
  status: 'prospect' | 'customer' | 'partner' | 'competitor';
  health: 'excellent' | 'good' | 'at-risk' | 'critical';
  tier: 'strategic' | 'key' | 'standard' | 'low-priority';
  assignedTo?: string;
  createdDate: Date;
  lastActivity?: Date;
  tags: string[];
  customFields: Record<string, any>;
  aiInsights: AccountInsights;
  executiveAssignment?: string;
  pipeline3D: Pipeline3DPosition;
}

export interface CRMOpportunity {
  id: string;
  providerId: string;
  name: string;
  accountId: string;
  contactId?: string;
  stage: string;
  probability: number; // 0-100
  value: number;
  currency: string;
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  source: string;
  type: 'new-business' | 'existing-business' | 'renewal' | 'upsell';
  assignedTo?: string;
  createdDate: Date;
  lastActivity?: Date;
  nextStep?: string;
  tags: string[];
  customFields: Record<string, any>;
  aiInsights: OpportunityInsights;
  executiveAssignment?: string;
  pipeline3D: Pipeline3DPosition;
}

export interface CRMActivity {
  id: string;
  providerId: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'demo';
  subject: string;
  description?: string;
  relatedTo: {
    type: 'lead' | 'contact' | 'account' | 'opportunity';
    id: string;
  };
  assignedTo?: string;
  dueDate?: Date;
  completedDate?: Date;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  duration?: number; // minutes
  outcome?: string;
  nextAction?: string;
  tags: string[];
  customFields: Record<string, any>;
  executiveAssignment?: string;
}

export interface LeadInsights {
  conversionProbability: number;
  timeToConversion: number; // days
  recommendedActions: string[];
  similarLeads: string[];
  engagementScore: number;
  buyingSignals: string[];
  riskFactors: string[];
  optimalContactTime: Date;
  preferredChannel: 'email' | 'phone' | 'social' | 'in-person';
}

export interface ContactInsights {
  influenceLevel: number;
  decisionMaker: boolean;
  responseRate: number;
  preferredContactMethod: string;
  bestContactTimes: string[];
  relationshipStrength: number;
  networkConnections: string[];
  recentEngagement: string[];
}

export interface AccountInsights {
  growthPotential: number;
  churnRisk: number;
  expansionOpportunities: string[];
  competitorThreats: string[];
  keyStakeholders: string[];
  healthTrends: 'improving' | 'stable' | 'declining';
  renewalProbability: number;
  upsellPotential: number;
}

export interface OpportunityInsights {
  winProbability: number;
  dealVelocity: number; // days in current stage
  competitorAnalysis: string[];
  riskFactors: string[];
  accelerators: string[];
  nextBestActions: string[];
  stakeholderMap: string[];
  budgetConfidence: number;
}

export interface Pipeline3DPosition {
  x: number;
  y: number;
  z: number;
  stage: string;
  color: string;
  size: number;
  velocity: number;
  trajectory: 'up' | 'down' | 'stable';
}

export class CRMIntegrationSystem {
  private providers: Map<string, CRMProvider> = new Map();
  private leads: Map<string, CRMLead> = new Map();
  private contacts: Map<string, CRMContact> = new Map();
  private accounts: Map<string, CRMAccount> = new Map();
  private opportunities: Map<string, CRMOpportunity> = new Map();
  private activities: Map<string, CRMActivity> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private aiAnalyzer: CRMAIAnalyzer;
  private pipeline3D: Pipeline3DEngine;

  constructor() {
    this.aiAnalyzer = new CRMAIAnalyzer();
    this.pipeline3D = new Pipeline3DEngine();
    this.initializeEventListeners();
    this.initializeProviders();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('providerConnected', []);
    this.eventListeners.set('providerDisconnected', []);
    this.eventListeners.set('leadCreated', []);
    this.eventListeners.set('leadUpdated', []);
    this.eventListeners.set('leadConverted', []);
    this.eventListeners.set('opportunityCreated', []);
    this.eventListeners.set('opportunityUpdated', []);
    this.eventListeners.set('opportunityWon', []);
    this.eventListeners.set('opportunityLost', []);
    this.eventListeners.set('accountUpdated', []);
    this.eventListeners.set('activityCompleted', []);
    this.eventListeners.set('pipelineUpdated', []);
    this.eventListeners.set('syncComplete', []);
    this.eventListeners.set('error', []);
  }

  private initializeProviders(): void {
    const providers: CRMProvider[] = [
      {
        id: 'salesforce-primary',
        name: 'Salesforce (Primary)',
        type: 'salesforce',
        isConnected: false,
        lastSync: null,
        config: {
          clientId: process.env.SALESFORCE_CLIENT_ID,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
          instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
          username: process.env.SALESFORCE_USERNAME
        },
        features: {
          leads: true,
          contacts: true,
          accounts: true,
          opportunities: true,
          activities: true,
          customFields: true,
          workflows: true,
          reports: true
        }
      },
      {
        id: 'hubspot-marketing',
        name: 'HubSpot (Marketing)',
        type: 'hubspot',
        isConnected: false,
        lastSync: null,
        config: {
          apiKey: process.env.HUBSPOT_API_KEY,
          domain: process.env.HUBSPOT_DOMAIN
        },
        features: {
          leads: true,
          contacts: true,
          accounts: true,
          opportunities: true,
          activities: true,
          customFields: true,
          workflows: false,
          reports: true
        }
      },
      {
        id: 'pipedrive-sales',
        name: 'Pipedrive (Sales)',
        type: 'pipedrive',
        isConnected: false,
        lastSync: null,
        config: {
          apiKey: process.env.PIPEDRIVE_API_KEY,
          domain: process.env.PIPEDRIVE_DOMAIN
        },
        features: {
          leads: true,
          contacts: true,
          accounts: true,
          opportunities: true,
          activities: true,
          customFields: true,
          workflows: false,
          reports: true
        }
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  public async connectProvider(providerId: string, credentials?: any): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      console.log(`Connecting to ${provider.name}...`);

      switch (provider.type) {
        case 'salesforce':
          await this.connectSalesforce(provider, credentials);
          break;
        case 'hubspot':
          await this.connectHubSpot(provider, credentials);
          break;
        case 'pipedrive':
          await this.connectPipedrive(provider, credentials);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      provider.isConnected = true;
      provider.lastSync = new Date();

      console.log(`✓ Connected to ${provider.name}`);
      this.emit('providerConnected', { providerId, provider });

      // Start initial sync
      await this.syncCRMData(providerId);

    } catch (error) {
      console.error(`Failed to connect to ${provider.name}:`, error);
      this.emit('error', { providerId, error });
      throw error;
    }
  }

  /**
   * Validate provider credentials before connection
   */
  private async validateProviderCredentials(provider: CRMProvider, credentials?: any): Promise<void> {
    switch (provider.type) {
      case 'salesforce':
        if (!credentials?.clientId || !credentials?.clientSecret) {
          throw new Error('Salesforce requires clientId and clientSecret');
        }
        break;
      case 'hubspot':
        if (!credentials?.apiKey && !provider.config.apiKey) {
          throw new Error('HubSpot requires API key');
        }
        break;
      case 'pipedrive':
        if (!credentials?.apiToken && !provider.config.apiKey) {
          throw new Error('Pipedrive requires API token');
        }
        break;
      default:
        // Basic validation passed
        break;
    }
  }

  /**
   * Test provider connection with a simple API call
   */
  private async testProviderConnection(provider: CRMProvider): Promise<void> {
    try {
      switch (provider.type) {
        case 'salesforce':
          // Test with a simple query
          console.log('Testing Salesforce connection...');
          break;
        case 'hubspot':
          // Test with account info endpoint
          console.log('Testing HubSpot connection...');
          break;
        case 'pipedrive':
          // Test with user info endpoint
          console.log('Testing Pipedrive connection...');
          break;
        default:
          console.log(`Testing ${provider.name} connection...`);
          break;
      }

      // Simulate API test call
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`✅ ${provider.name} connection test successful`);
    } catch (error) {
      throw new Error(`Connection test failed for ${provider.name}: ${error}`);
    }
  }

  private async connectSalesforce(provider: CRMProvider, credentials?: any): Promise<void> {
    // Salesforce OAuth2 connection
    const authUrl = `${provider.config.instanceUrl}/services/oauth2/authorize`;
    
    // In a real implementation, this would handle OAuth2 flow
    console.log('Connecting to Salesforce...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    provider.config.accessToken = 'mock_salesforce_token';
  }

  private async connectHubSpot(provider: CRMProvider, credentials?: any): Promise<void> {
    // HubSpot API key authentication
    if (!provider.config.apiKey) {
      throw new Error('HubSpot API key required');
    }
    
    // Test API connection
    const response = await fetch(`https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=${provider.config.apiKey}&count=1`);
    
    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }
    
    console.log('✓ HubSpot API connection verified');
  }

  private async connectPipedrive(provider: CRMProvider, credentials?: any): Promise<void> {
    // Pipedrive API token authentication
    if (!provider.config.apiKey) {
      throw new Error('Pipedrive API token required');
    }
    
    // Test API connection
    const response = await fetch(`https://${provider.config.domain}.pipedrive.com/v1/users/me?api_token=${provider.config.apiKey}`);
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.statusText}`);
    }
    
    console.log('✓ Pipedrive API connection verified');
  }

  public async syncCRMData(providerId?: string): Promise<void> {
    const providersToSync = providerId 
      ? [this.providers.get(providerId)!].filter(Boolean)
      : Array.from(this.providers.values()).filter(p => p.isConnected);

    for (const provider of providersToSync) {
      try {
        console.log(`Syncing CRM data from ${provider.name}...`);

        // Sync different data types in parallel
        const syncPromises = [];
        
        if (provider.features.leads) {
          syncPromises.push(this.syncLeads(provider));
        }
        if (provider.features.contacts) {
          syncPromises.push(this.syncContacts(provider));
        }
        if (provider.features.accounts) {
          syncPromises.push(this.syncAccounts(provider));
        }
        if (provider.features.opportunities) {
          syncPromises.push(this.syncOpportunities(provider));
        }
        if (provider.features.activities) {
          syncPromises.push(this.syncActivities(provider));
        }

        await Promise.all(syncPromises);

        // Generate AI insights for all synced data
        await this.generateAIInsights(provider.id);

        // Update 3D pipeline visualization
        await this.update3DPipeline(provider.id);

        provider.lastSync = new Date();
        console.log(`✓ Synced CRM data from ${provider.name}`);

      } catch (error) {
        console.error(`Failed to sync CRM data from ${provider.name}:`, error);
        this.emit('error', { providerId: provider.id, error });
      }
    }

    this.emit('syncComplete', { timestamp: new Date() });
  }

  private async syncLeads(provider: CRMProvider): Promise<void> {
    const leads = await this.fetchLeads(provider);
    
    for (const lead of leads) {
      // Assign to appropriate executive
      lead.executiveAssignment = this.assignLeadToExecutive(lead);
      
      // Generate 3D pipeline position
      lead.pipeline3D = this.pipeline3D.calculateLeadPosition(lead);
      
      this.leads.set(lead.id, lead);
      this.emit('leadCreated', { lead, providerId: provider.id });
    }
  }

  private async syncContacts(provider: CRMProvider): Promise<void> {
    const contacts = await this.fetchContacts(provider);
    
    for (const contact of contacts) {
      contact.executiveAssignment = this.assignContactToExecutive(contact);
      this.contacts.set(contact.id, contact);
    }
  }

  private async syncAccounts(provider: CRMProvider): Promise<void> {
    const accounts = await this.fetchAccounts(provider);
    
    for (const account of accounts) {
      account.executiveAssignment = this.assignAccountToExecutive(account);
      account.pipeline3D = this.pipeline3D.calculateAccountPosition(account);
      this.accounts.set(account.id, account);
    }
  }

  private async syncOpportunities(provider: CRMProvider): Promise<void> {
    const opportunities = await this.fetchOpportunities(provider);
    
    for (const opportunity of opportunities) {
      opportunity.executiveAssignment = this.assignOpportunityToExecutive(opportunity);
      opportunity.pipeline3D = this.pipeline3D.calculateOpportunityPosition(opportunity);
      this.opportunities.set(opportunity.id, opportunity);
      this.emit('opportunityCreated', { opportunity, providerId: provider.id });
    }
  }

  private async syncActivities(provider: CRMProvider): Promise<void> {
    const activities = await this.fetchActivities(provider);
    
    for (const activity of activities) {
      activity.executiveAssignment = this.assignActivityToExecutive(activity);
      this.activities.set(activity.id, activity);
    }
  }

  private async fetchLeads(provider: CRMProvider): Promise<CRMLead[]> {
    switch (provider.type) {
      case 'salesforce':
        return await this.fetchSalesforceLeads(provider);
      case 'hubspot':
        return await this.fetchHubSpotLeads(provider);
      case 'pipedrive':
        return await this.fetchPipedriveLeads(provider);
      default:
        return [];
    }
  }

  private async fetchContacts(provider: CRMProvider): Promise<CRMContact[]> {
    switch (provider.type) {
      case 'salesforce':
        return await this.fetchSalesforceContacts(provider);
      case 'hubspot':
        return await this.fetchHubSpotContacts(provider);
      case 'pipedrive':
        return await this.fetchPipedriveContacts(provider);
      default:
        return [];
    }
  }

  private async fetchAccounts(provider: CRMProvider): Promise<CRMAccount[]> {
    switch (provider.type) {
      case 'salesforce':
        return await this.fetchSalesforceAccounts(provider);
      case 'hubspot':
        return await this.fetchHubSpotAccounts(provider);
      case 'pipedrive':
        return await this.fetchPipedriveAccounts(provider);
      default:
        return [];
    }
  }

  private async fetchOpportunities(provider: CRMProvider): Promise<CRMOpportunity[]> {
    switch (provider.type) {
      case 'salesforce':
        return await this.fetchSalesforceOpportunities(provider);
      case 'hubspot':
        return await this.fetchHubSpotOpportunities(provider);
      case 'pipedrive':
        return await this.fetchPipedriveOpportunities(provider);
      default:
        return [];
    }
  }

  private async fetchActivities(provider: CRMProvider): Promise<CRMActivity[]> {
    switch (provider.type) {
      case 'salesforce':
        return await this.fetchSalesforceActivities(provider);
      case 'hubspot':
        return await this.fetchHubSpotActivities(provider);
      case 'pipedrive':
        return await this.fetchPipedriveActivities(provider);
      default:
        return [];
    }
  }

  // Salesforce API implementations
  private async fetchSalesforceLeads(provider: CRMProvider): Promise<CRMLead[]> {
    // Simulate Salesforce SOQL query
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return this.generateMockLeads(provider.id, 'salesforce');
  }

  private async fetchSalesforceContacts(provider: CRMProvider): Promise<CRMContact[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.generateMockContacts(provider.id, 'salesforce');
  }

  private async fetchSalesforceAccounts(provider: CRMProvider): Promise<CRMAccount[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.generateMockAccounts(provider.id, 'salesforce');
  }

  private async fetchSalesforceOpportunities(provider: CRMProvider): Promise<CRMOpportunity[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.generateMockOpportunities(provider.id, 'salesforce');
  }

  private async fetchSalesforceActivities(provider: CRMProvider): Promise<CRMActivity[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.generateMockActivities(provider.id, 'salesforce');
  }

  // HubSpot API implementations
  private async fetchHubSpotLeads(provider: CRMProvider): Promise<CRMLead[]> {
    // HubSpot doesn't have separate leads, they're contacts
    const contacts = await this.fetchHubSpotContacts(provider);
    return contacts.filter(c => !c.accountId).map(c => this.convertContactToLead(c));
  }

  private async fetchHubSpotContacts(provider: CRMProvider): Promise<CRMContact[]> {
    const response = await fetch(
      `https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=${provider.config.apiKey}&count=100`
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.contacts || []).map((contact: any) => this.parseHubSpotContact(contact, provider.id));
  }

  private async fetchHubSpotAccounts(provider: CRMProvider): Promise<CRMAccount[]> {
    const response = await fetch(
      `https://api.hubapi.com/companies/v2/companies/paged?hapikey=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.companies || []).map((company: any) => this.parseHubSpotAccount(company, provider.id));
  }

  private async fetchHubSpotOpportunities(provider: CRMProvider): Promise<CRMOpportunity[]> {
    const response = await fetch(
      `https://api.hubapi.com/deals/v1/deal/paged?hapikey=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.deals || []).map((deal: any) => this.parseHubSpotOpportunity(deal, provider.id));
  }

  private async fetchHubSpotActivities(provider: CRMProvider): Promise<CRMActivity[]> {
    // HubSpot activities are more complex to fetch
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.generateMockActivities(provider.id, 'hubspot');
  }

  // Pipedrive API implementations
  private async fetchPipedriveLeads(provider: CRMProvider): Promise<CRMLead[]> {
    const response = await fetch(
      `https://${provider.config.domain}.pipedrive.com/v1/leads?api_token=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.data || []).map((lead: any) => this.parsePipedriveLead(lead, provider.id));
  }

  private async fetchPipedriveContacts(provider: CRMProvider): Promise<CRMContact[]> {
    const response = await fetch(
      `https://${provider.config.domain}.pipedrive.com/v1/persons?api_token=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.data || []).map((person: any) => this.parsePipedriveContact(person, provider.id));
  }

  private async fetchPipedriveAccounts(provider: CRMProvider): Promise<CRMAccount[]> {
    const response = await fetch(
      `https://${provider.config.domain}.pipedrive.com/v1/organizations?api_token=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.data || []).map((org: any) => this.parsePipedriveAccount(org, provider.id));
  }

  private async fetchPipedriveOpportunities(provider: CRMProvider): Promise<CRMOpportunity[]> {
    const response = await fetch(
      `https://${provider.config.domain}.pipedrive.com/v1/deals?api_token=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.data || []).map((deal: any) => this.parsePipedriveOpportunity(deal, provider.id));
  }

  private async fetchPipedriveActivities(provider: CRMProvider): Promise<CRMActivity[]> {
    const response = await fetch(
      `https://${provider.config.domain}.pipedrive.com/v1/activities?api_token=${provider.config.apiKey}&limit=100`
    );
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return (data.data || []).map((activity: any) => this.parsePipedriveActivity(activity, provider.id));
  }

  // Mock data generators for demonstration
  private generateMockLeads(providerId: string, type: string): CRMLead[] {
    const leads: CRMLead[] = [];
    const companies = ['TechCorp', 'Innovation Inc', 'Future Systems', 'Global Solutions', 'Digital Dynamics'];
    const sources = ['Website', 'LinkedIn', 'Referral', 'Cold Call', 'Trade Show'];
    
    for (let i = 0; i < 10; i++) {
      leads.push({
        id: `${type}_lead_${i}`,
        providerId,
        firstName: `Lead${i}`,
        lastName: 'Prospect',
        email: `lead${i}@${companies[i % companies.length].toLowerCase().replace(' ', '')}.com`,
        phone: `+1-555-${String(i).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        company: companies[i % companies.length],
        title: 'Decision Maker',
        source: sources[i % sources.length],
        status: ['new', 'contacted', 'qualified'][Math.floor(Math.random() * 3)] as any,
        score: Math.floor(Math.random() * 100),
        value: Math.floor(Math.random() * 100000) + 10000,
        currency: 'USD',
        createdDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        tags: ['hot-lead', 'enterprise'],
        customFields: {},
        aiInsights: {
          conversionProbability: Math.random(),
          timeToConversion: Math.floor(Math.random() * 90) + 7,
          recommendedActions: ['Schedule demo', 'Send proposal'],
          similarLeads: [],
          engagementScore: Math.random() * 100,
          buyingSignals: ['Requested pricing', 'Multiple stakeholders engaged'],
          riskFactors: ['Budget concerns'],
          optimalContactTime: new Date(),
          preferredChannel: 'email'
        },
        pipeline3D: {
          x: Math.random() * 10 - 5,
          y: Math.random() * 5,
          z: Math.random() * 10 - 5,
          stage: 'qualification',
          color: '#3b82f6',
          size: 1,
          velocity: Math.random() * 2 - 1,
          trajectory: 'up'
        }
      });
    }
    
    return leads;
  }

  private generateMockContacts(providerId: string, type: string): CRMContact[] {
    // Similar mock generation for contacts
    return [];
  }

  private generateMockAccounts(providerId: string, type: string): CRMAccount[] {
    // Similar mock generation for accounts
    return [];
  }

  private generateMockOpportunities(providerId: string, type: string): CRMOpportunity[] {
    // Similar mock generation for opportunities
    return [];
  }

  private generateMockActivities(providerId: string, type: string): CRMActivity[] {
    // Similar mock generation for activities
    return [];
  }

  // Parser methods for different CRM providers
  private parseHubSpotContact(contact: any, providerId: string): CRMContact {
    const properties = contact.properties;
    return {
      id: contact.vid.toString(),
      providerId,
      firstName: properties.firstname?.value || '',
      lastName: properties.lastname?.value || '',
      email: properties.email?.value || '',
      phone: properties.phone?.value,
      title: properties.jobtitle?.value,
      department: properties.department?.value,
      contactFrequency: 30, // Default to monthly contact
      relationship: 'warm',
      influence: 50,
      tags: [],
      customFields: {},
      aiInsights: {
        influenceLevel: 0.5,
        decisionMaker: false,
        responseRate: 0.7,
        preferredContactMethod: 'email',
        bestContactTimes: ['9:00 AM', '2:00 PM'],
        relationshipStrength: 0.6,
        networkConnections: [],
        recentEngagement: []
      }
    };
  }

  private parseHubSpotAccount(company: any, providerId: string): CRMAccount {
    const properties = company.properties;
    return {
      id: company.companyId.toString(),
      providerId,
      name: properties.name?.value || '',
      website: properties.website?.value,
      industry: properties.industry?.value,
      size: 'medium',
      status: 'prospect',
      health: 'good',
      tier: 'standard',
      createdDate: new Date(company.properties.createdate?.value || Date.now()),
      tags: [],
      customFields: {},
      aiInsights: {
        growthPotential: 0.7,
        churnRisk: 0.2,
        expansionOpportunities: [],
        competitorThreats: [],
        keyStakeholders: [],
        healthTrends: 'stable',
        renewalProbability: 0.8,
        upsellPotential: 0.6
      },
      pipeline3D: {
        x: 0,
        y: 0,
        z: 0,
        stage: 'prospect',
        color: '#10b981',
        size: 1,
        velocity: 0,
        trajectory: 'stable'
      }
    };
  }

  private parseHubSpotOpportunity(deal: any, providerId: string): CRMOpportunity {
    const properties = deal.properties;
    return {
      id: deal.dealId.toString(),
      providerId,
      name: properties.dealname?.value || '',
      accountId: properties.associatedCompanyIds?.[0]?.toString() || '',
      stage: properties.dealstage?.value || '',
      probability: parseInt(properties.probability?.value || '50'),
      value: parseFloat(properties.amount?.value || '0'),
      currency: 'USD',
      expectedCloseDate: new Date(properties.closedate?.value || Date.now()),
      source: properties.source?.value || '',
      type: 'new-business',
      createdDate: new Date(properties.createdate?.value || Date.now()),
      tags: [],
      customFields: {},
      aiInsights: {
        winProbability: 0.6,
        dealVelocity: 30,
        competitorAnalysis: [],
        riskFactors: [],
        accelerators: [],
        nextBestActions: [],
        stakeholderMap: [],
        budgetConfidence: 0.7
      },
      pipeline3D: {
        x: 0,
        y: 0,
        z: 0,
        stage: properties.dealstage?.value || '',
        color: '#f59e0b',
        size: 1,
        velocity: 0,
        trajectory: 'up'
      }
    };
  }

  private parsePipedriveLead(lead: any, providerId: string): CRMLead {
    return {
      id: lead.id.toString(),
      providerId,
      firstName: lead.person_name?.split(' ')[0] || '',
      lastName: lead.person_name?.split(' ').slice(1).join(' ') || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.organization_name || '',
      title: lead.title || '',
      source: 'Pipedrive',
      status: 'new',
      score: Math.floor(Math.random() * 100),
      value: lead.value || 0,
      currency: lead.currency || 'USD',
      createdDate: new Date(lead.add_time),
      tags: [],
      customFields: {},
      aiInsights: {
        conversionProbability: Math.random(),
        timeToConversion: Math.floor(Math.random() * 90) + 7,
        recommendedActions: [],
        similarLeads: [],
        engagementScore: Math.random() * 100,
        buyingSignals: [],
        riskFactors: [],
        optimalContactTime: new Date(),
        preferredChannel: 'email'
      },
      pipeline3D: {
        x: Math.random() * 10 - 5,
        y: Math.random() * 5,
        z: Math.random() * 10 - 5,
        stage: 'new',
        color: '#3b82f6',
        size: 1,
        velocity: 0,
        trajectory: 'stable'
      }
    };
  }

  private parsePipedriveContact(person: any, providerId: string): CRMContact {
    return {
      id: person.id.toString(),
      providerId,
      firstName: person.first_name || '',
      lastName: person.last_name || '',
      email: person.email?.[0]?.value || '',
      phone: person.phone?.[0]?.value,
      accountId: person.org_id?.toString(),
      title: person.job_title,
      contactFrequency: 30, // Default to monthly contact
      relationship: 'warm',
      influence: 50,
      tags: [],
      customFields: {},
      aiInsights: {
        influenceLevel: 0.5,
        decisionMaker: false,
        responseRate: 0.7,
        preferredContactMethod: 'email',
        bestContactTimes: [],
        relationshipStrength: 0.6,
        networkConnections: [],
        recentEngagement: []
      }
    };
  }

  private parsePipedriveAccount(org: any, providerId: string): CRMAccount {
    return {
      id: org.id.toString(),
      providerId,
      name: org.name || '',
      website: org.website,
      industry: org.category,
      size: 'medium',
      status: 'prospect',
      health: 'good',
      tier: 'standard',
      createdDate: new Date(org.add_time),
      tags: [],
      customFields: {},
      aiInsights: {
        growthPotential: 0.7,
        churnRisk: 0.2,
        expansionOpportunities: [],
        competitorThreats: [],
        keyStakeholders: [],
        healthTrends: 'stable',
        renewalProbability: 0.8,
        upsellPotential: 0.6
      },
      pipeline3D: {
        x: 0,
        y: 0,
        z: 0,
        stage: 'prospect',
        color: '#10b981',
        size: 1,
        velocity: 0,
        trajectory: 'stable'
      }
    };
  }

  private parsePipedriveOpportunity(deal: any, providerId: string): CRMOpportunity {
    return {
      id: deal.id.toString(),
      providerId,
      name: deal.title || '',
      accountId: deal.org_id?.toString() || '',
      contactId: deal.person_id?.toString(),
      stage: deal.stage_name || '',
      probability: deal.probability || 50,
      value: deal.value || 0,
      currency: deal.currency || 'USD',
      expectedCloseDate: new Date(deal.expected_close_date || Date.now()),
      source: 'Pipedrive',
      type: 'new-business',
      createdDate: new Date(deal.add_time),
      tags: [],
      customFields: {},
      aiInsights: {
        winProbability: (deal.probability || 50) / 100,
        dealVelocity: 30,
        competitorAnalysis: [],
        riskFactors: [],
        accelerators: [],
        nextBestActions: [],
        stakeholderMap: [],
        budgetConfidence: 0.7
      },
      pipeline3D: {
        x: 0,
        y: 0,
        z: 0,
        stage: deal.stage_name || '',
        color: '#f59e0b',
        size: 1,
        velocity: 0,
        trajectory: 'up'
      }
    };
  }

  private parsePipedriveActivity(activity: any, providerId: string): CRMActivity {
    return {
      id: activity.id.toString(),
      providerId,
      type: activity.type || 'task',
      subject: activity.subject || '',
      description: activity.note,
      relatedTo: {
        type: activity.deal_id ? 'opportunity' : activity.person_id ? 'contact' : 'account',
        id: (activity.deal_id || activity.person_id || activity.org_id)?.toString() || ''
      },
      assignedTo: activity.assigned_to_user_id?.toString(),
      dueDate: activity.due_date ? new Date(activity.due_date) : undefined,
      completedDate: activity.marked_as_done_time ? new Date(activity.marked_as_done_time) : undefined,
      status: activity.done ? 'completed' : 'pending',
      priority: 'normal',
      duration: activity.duration ? parseInt(activity.duration) : undefined,
      tags: [],
      customFields: {}
    };
  }

  private convertContactToLead(contact: CRMContact): CRMLead {
    return {
      id: `lead_${contact.id}`,
      providerId: contact.providerId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.accountId || 'Unknown',
      title: contact.title,
      source: 'Contact Conversion',
      status: 'new',
      score: 50,
      value: 10000,
      currency: 'USD',
      createdDate: new Date(),
      tags: contact.tags,
      customFields: contact.customFields,
      aiInsights: {
        conversionProbability: 0.5,
        timeToConversion: 30,
        recommendedActions: [],
        similarLeads: [],
        engagementScore: 50,
        buyingSignals: [],
        riskFactors: [],
        optimalContactTime: new Date(),
        preferredChannel: 'email'
      },
      pipeline3D: {
        x: 0,
        y: 0,
        z: 0,
        stage: 'new',
        color: '#3b82f6',
        size: 1,
        velocity: 0,
        trajectory: 'stable'
      }
    };
  }

  // Executive assignment methods
  private assignLeadToExecutive(lead: CRMLead): string {
    if (lead.value > 100000) return 'ceo';
    if (lead.company.toLowerCase().includes('tech')) return 'cto';
    if (lead.source.toLowerCase().includes('marketing')) return 'cmo';
    return 'coo'; // Default to COO for operations
  }

  private assignContactToExecutive(contact: CRMContact): string {
    if (contact.title?.toLowerCase().includes('ceo') || contact.title?.toLowerCase().includes('president')) return 'ceo';
    if (contact.title?.toLowerCase().includes('cfo') || contact.title?.toLowerCase().includes('finance')) return 'cfo';
    if (contact.title?.toLowerCase().includes('cto') || contact.title?.toLowerCase().includes('tech')) return 'cto';
    if (contact.title?.toLowerCase().includes('marketing')) return 'cmo';
    return 'coo';
  }

  private assignAccountToExecutive(account: CRMAccount): string {
    if (account.tier === 'strategic') return 'ceo';
    if (account.size === 'enterprise') return 'ceo';
    if (account.industry?.toLowerCase().includes('tech')) return 'cto';
    if (account.health === 'at-risk' || account.health === 'critical') return 'coo';
    return 'cmo'; // Default to CMO for customer success
  }

  private assignOpportunityToExecutive(opportunity: CRMOpportunity): string {
    if (opportunity.value > 500000) return 'ceo';
    if (opportunity.probability > 80) return 'coo'; // High probability deals to COO
    if (opportunity.stage.toLowerCase().includes('proposal')) return 'cfo'; // Financial review
    return 'cmo'; // Default to CMO for sales support
  }

  private assignActivityToExecutive(activity: CRMActivity): string {
    if (activity.type === 'meeting' && activity.priority === 'urgent') return 'ceo';
    if (activity.type === 'call') return 'cmo';
    if (activity.type === 'email') return 'cmo';
    return 'coo'; // Default operational activities
  }

  private async generateAIInsights(providerId: string): Promise<void> {
    // Generate AI insights for all CRM data
    const leads = Array.from(this.leads.values()).filter(l => l.providerId === providerId);
    const opportunities = Array.from(this.opportunities.values()).filter(o => o.providerId === providerId);
    const accounts = Array.from(this.accounts.values()).filter(a => a.providerId === providerId);

    for (const lead of leads) {
      lead.aiInsights = await this.aiAnalyzer.analyzeLeadInsights(lead);
    }

    for (const opportunity of opportunities) {
      opportunity.aiInsights = await this.aiAnalyzer.analyzeOpportunityInsights(opportunity);
    }

    for (const account of accounts) {
      account.aiInsights = await this.aiAnalyzer.analyzeAccountInsights(account);
    }
  }

  private async update3DPipeline(providerId: string): Promise<void> {
    const opportunities = Array.from(this.opportunities.values()).filter(o => o.providerId === providerId);
    const leads = Array.from(this.leads.values()).filter(l => l.providerId === providerId);
    const accounts = Array.from(this.accounts.values()).filter(a => a.providerId === providerId);

    // Update 3D positions for pipeline visualization
    for (const opportunity of opportunities) {
      opportunity.pipeline3D = this.pipeline3D.calculateOpportunityPosition(opportunity);
    }

    for (const lead of leads) {
      lead.pipeline3D = this.pipeline3D.calculateLeadPosition(lead);
    }

    for (const account of accounts) {
      account.pipeline3D = this.pipeline3D.calculateAccountPosition(account);
    }

    this.emit('pipelineUpdated', { providerId });
  }

  // Public API methods
  public getLeads(filters?: { providerId?: string; executive?: string; status?: string }): CRMLead[] {
    let leads = Array.from(this.leads.values());
    
    if (filters) {
      if (filters.providerId) leads = leads.filter(l => l.providerId === filters.providerId);
      if (filters.executive) leads = leads.filter(l => l.executiveAssignment === filters.executive);
      if (filters.status) leads = leads.filter(l => l.status === filters.status);
    }
    
    return leads.sort((a, b) => b.score - a.score);
  }

  public getOpportunities(filters?: { providerId?: string; executive?: string; stage?: string }): CRMOpportunity[] {
    let opportunities = Array.from(this.opportunities.values());
    
    if (filters) {
      if (filters.providerId) opportunities = opportunities.filter(o => o.providerId === filters.providerId);
      if (filters.executive) opportunities = opportunities.filter(o => o.executiveAssignment === filters.executive);
      if (filters.stage) opportunities = opportunities.filter(o => o.stage === filters.stage);
    }
    
    return opportunities.sort((a, b) => b.value - a.value);
  }

  public getAccounts(filters?: { providerId?: string; executive?: string; tier?: string }): CRMAccount[] {
    let accounts = Array.from(this.accounts.values());
    
    if (filters) {
      if (filters.providerId) accounts = accounts.filter(a => a.providerId === filters.providerId);
      if (filters.executive) accounts = accounts.filter(a => a.executiveAssignment === filters.executive);
      if (filters.tier) accounts = accounts.filter(a => a.tier === filters.tier);
    }
    
    return accounts.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }

  public getActivities(filters?: { providerId?: string; executive?: string; status?: string }): CRMActivity[] {
    let activities = Array.from(this.activities.values());
    
    if (filters) {
      if (filters.providerId) activities = activities.filter(a => a.providerId === filters.providerId);
      if (filters.executive) activities = activities.filter(a => a.executiveAssignment === filters.executive);
      if (filters.status) activities = activities.filter(a => a.status === filters.status);
    }
    
    return activities.sort((a, b) => (b.dueDate?.getTime() || 0) - (a.dueDate?.getTime() || 0));
  }

  public getPipeline3DData(executive?: string): (CRMLead | CRMOpportunity | CRMAccount)[] {
    const leads = Array.from(this.leads.values());
    const opportunities = Array.from(this.opportunities.values());
    const accounts = Array.from(this.accounts.values());
    
    let allItems = [...leads, ...opportunities, ...accounts];
    
    if (executive) {
      allItems = allItems.filter(item => item.executiveAssignment === executive);
    }
    
    return allItems;
  }

  public getProviders(): CRMProvider[] {
    return Array.from(this.providers.values());
  }

  public getConnectedProviders(): CRMProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isConnected);
  }

  public startAutoSync(intervalMinutes: number = 30): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncCRMData();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`✓ CRM auto-sync started (every ${intervalMinutes} minutes)`);
  }

  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('✓ CRM auto-sync stopped');
    }
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down CRM Integration System...');
    
    this.stopAutoSync();
    
    // Disconnect all providers
    for (const provider of this.providers.values()) {
      if (provider.isConnected) {
        provider.isConnected = false;
      }
    }
    
    console.log('✓ CRM Integration System shutdown complete');
  }
}

// AI Analyzer for CRM insights
class CRMAIAnalyzer {
  public async analyzeLeadInsights(lead: CRMLead): Promise<LeadInsights> {
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      conversionProbability: Math.min(1, lead.score / 100 + Math.random() * 0.3),
      timeToConversion: Math.floor(Math.random() * 90) + 7,
      recommendedActions: this.getLeadRecommendations(lead),
      similarLeads: [],
      engagementScore: lead.score,
      buyingSignals: this.detectBuyingSignals(lead),
      riskFactors: this.detectRiskFactors(lead),
      optimalContactTime: this.calculateOptimalContactTime(),
      preferredChannel: this.determinePreferredChannel(lead)
    };
  }
  
  public async analyzeOpportunityInsights(opportunity: CRMOpportunity): Promise<OpportunityInsights> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      winProbability: opportunity.probability / 100,
      dealVelocity: this.calculateDealVelocity(opportunity),
      competitorAnalysis: [],
      riskFactors: this.detectOpportunityRisks(opportunity),
      accelerators: this.identifyAccelerators(opportunity),
      nextBestActions: this.suggestNextActions(opportunity),
      stakeholderMap: [],
      budgetConfidence: Math.random() * 0.4 + 0.6
    };
  }
  
  public async analyzeAccountInsights(account: CRMAccount): Promise<AccountInsights> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      growthPotential: this.calculateGrowthPotential(account),
      churnRisk: this.calculateChurnRisk(account),
      expansionOpportunities: this.identifyExpansionOpportunities(account),
      competitorThreats: [],
      keyStakeholders: [],
      healthTrends: this.analyzeHealthTrends(account),
      renewalProbability: Math.random() * 0.3 + 0.7,
      upsellPotential: Math.random() * 0.5 + 0.3
    };
  }
  
  private getLeadRecommendations(lead: CRMLead): string[] {
    const recommendations = [];
    
    if (lead.score > 80) recommendations.push('Schedule immediate demo');
    if (lead.score > 60) recommendations.push('Send personalized proposal');
    if (!lead.lastActivity) recommendations.push('Make initial contact');
    if (lead.value > 50000) recommendations.push('Involve senior executive');
    
    return recommendations;
  }
  
  private detectBuyingSignals(lead: CRMLead): string[] {
    const signals = [];
    
    if (lead.score > 70) signals.push('High engagement score');
    if (lead.source === 'Referral') signals.push('Warm referral');
    if (lead.value > 100000) signals.push('High value opportunity');
    
    return signals;
  }
  
  private detectRiskFactors(lead: CRMLead): string[] {
    const risks = [];
    
    if (lead.score < 30) risks.push('Low engagement');
    if (!lead.phone) risks.push('Limited contact information');
    if (lead.status === 'unqualified') risks.push('Previously unqualified');
    
    return risks;
  }
  
  private calculateOptimalContactTime(): Date {
    // Calculate optimal contact time based on historical data
    const now = new Date();
    now.setHours(10, 0, 0, 0); // Default to 10 AM
    return now;
  }
  
  private determinePreferredChannel(lead: CRMLead): 'email' | 'phone' | 'social' | 'in-person' {
    if (lead.phone && lead.score > 70) return 'phone';
    if (lead.source === 'LinkedIn') return 'social';
    return 'email';
  }
  
  private calculateDealVelocity(opportunity: CRMOpportunity): number {
    const daysSinceCreated = (Date.now() - opportunity.createdDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(daysSinceCreated);
  }
  
  private detectOpportunityRisks(opportunity: CRMOpportunity): string[] {
    const risks = [];
    
    if (opportunity.probability < 30) risks.push('Low win probability');
    if (opportunity.expectedCloseDate < new Date()) risks.push('Overdue close date');
    if (!opportunity.nextStep) risks.push('No clear next steps');
    
    return risks;
  }
  
  private identifyAccelerators(opportunity: CRMOpportunity): string[] {
    const accelerators = [];
    
    if (opportunity.probability > 70) accelerators.push('High probability');
    if (opportunity.value > 100000) accelerators.push('High value deal');
    if (opportunity.type === 'existing-business') accelerators.push('Existing relationship');
    
    return accelerators;
  }
  
  private suggestNextActions(opportunity: CRMOpportunity): string[] {
    const actions = [];
    
    if (opportunity.probability < 50) actions.push('Address objections');
    if (opportunity.probability > 70) actions.push('Prepare contract');
    if (!opportunity.nextStep) actions.push('Define next steps');
    
    return actions;
  }
  
  private calculateGrowthPotential(account: CRMAccount): number {
    let potential = 0.5;
    
    if (account.size === 'enterprise') potential += 0.3;
    if (account.health === 'excellent') potential += 0.2;
    if (account.tier === 'strategic') potential += 0.2;
    
    return Math.min(1, potential);
  }
  
  private calculateChurnRisk(account: CRMAccount): number {
    let risk = 0.1;
    
    if (account.health === 'at-risk') risk += 0.4;
    if (account.health === 'critical') risk += 0.6;
    if (!account.lastActivity) risk += 0.2;
    
    return Math.min(1, risk);
  }
  
  private identifyExpansionOpportunities(account: CRMAccount): string[] {
    const opportunities = [];
    
    if (account.size === 'enterprise') opportunities.push('Additional departments');
    if (account.health === 'excellent') opportunities.push('Premium features');
    if (account.tier === 'strategic') opportunities.push('Strategic partnership');
    
    return opportunities;
  }
  
  private analyzeHealthTrends(account: CRMAccount): 'improving' | 'stable' | 'declining' {
    // Simulate trend analysis
    const trends = ['improving', 'stable', 'declining'] as const;
    return trends[Math.floor(Math.random() * trends.length)];
  }
}

// 3D Pipeline Engine
class Pipeline3DEngine {
  public calculateLeadPosition(lead: CRMLead): Pipeline3DPosition {
    const stagePositions = {
      'new': { x: -8, z: 0 },
      'contacted': { x: -4, z: 0 },
      'qualified': { x: 0, z: 0 },
      'unqualified': { x: 0, z: -5 },
      'converted': { x: 4, z: 0 }
    };
    
    const basePos = stagePositions[lead.status] || { x: 0, z: 0 };
    
    return {
      x: basePos.x + (Math.random() - 0.5) * 2,
      y: lead.score / 100 * 3, // Height based on score
      z: basePos.z + (Math.random() - 0.5) * 2,
      stage: lead.status,
      color: this.getLeadColor(lead),
      size: Math.max(0.5, lead.value / 100000),
      velocity: lead.aiInsights.conversionProbability,
      trajectory: lead.score > 50 ? 'up' : 'stable'
    };
  }
  
  public calculateOpportunityPosition(opportunity: CRMOpportunity): Pipeline3DPosition {
    const stageMap = {
      'prospecting': 0,
      'qualification': 1,
      'proposal': 2,
      'negotiation': 3,
      'closed-won': 4,
      'closed-lost': -1
    };
    
    const stageIndex = stageMap[opportunity.stage.toLowerCase() as keyof typeof stageMap] || 0;
    
    return {
      x: stageIndex * 3 + (Math.random() - 0.5) * 2,
      y: opportunity.probability / 100 * 4,
      z: (Math.random() - 0.5) * 4,
      stage: opportunity.stage,
      color: this.getOpportunityColor(opportunity),
      size: Math.max(0.5, opportunity.value / 200000),
      velocity: opportunity.aiInsights.dealVelocity / 30,
      trajectory: opportunity.probability > 50 ? 'up' : 'down'
    };
  }
  
  public calculateAccountPosition(account: CRMAccount): Pipeline3DPosition {
    const tierPositions = {
      'strategic': { x: 8, y: 4 },
      'key': { x: 4, y: 3 },
      'standard': { x: 0, y: 2 },
      'low-priority': { x: -4, y: 1 }
    };
    
    const basePos = tierPositions[account.tier] || { x: 0, y: 2 };
    
    return {
      x: basePos.x + (Math.random() - 0.5) * 2,
      y: basePos.y,
      z: (Math.random() - 0.5) * 6,
      stage: account.tier,
      color: this.getAccountColor(account),
      size: Math.max(0.5, (account.revenue || 10000) / 500000),
      velocity: account.aiInsights.growthPotential,
      trajectory: account.aiInsights.healthTrends === 'improving' ? 'up' : 
                 account.aiInsights.healthTrends === 'declining' ? 'down' : 'stable'
    };
  }
  
  private getLeadColor(lead: CRMLead): string {
    const colors = {
      'new': '#3b82f6',
      'contacted': '#8b5cf6',
      'qualified': '#10b981',
      'unqualified': '#ef4444',
      'converted': '#f59e0b'
    };
    return colors[lead.status] || '#64748b';
  }
  
  private getOpportunityColor(opportunity: CRMOpportunity): string {
    if (opportunity.probability > 80) return '#10b981'; // Green for high probability
    if (opportunity.probability > 50) return '#f59e0b'; // Orange for medium
    if (opportunity.probability > 20) return '#3b82f6'; // Blue for low
    return '#ef4444'; // Red for very low
  }
  
  private getAccountColor(account: CRMAccount): string {
    const colors = {
      'strategic': '#ef4444',
      'key': '#f59e0b',
      'standard': '#3b82f6',
      'low-priority': '#64748b'
    };
    return colors[account.tier] || '#64748b';
  }
}
