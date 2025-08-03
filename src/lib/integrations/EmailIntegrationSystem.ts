export interface EmailProvider {
  id: string;
  name: string;
  type: 'gmail' | 'outlook' | 'exchange' | 'imap' | 'custom';
  isConnected: boolean;
  lastSync: Date | null;
  config: EmailProviderConfig;
}

export interface EmailProviderConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  serverUrl?: string;
  port?: number;
  encryption?: 'ssl' | 'tls' | 'none';
  username?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface EmailMessage {
  id: string;
  providerId: string;
  threadId?: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  body: string;
  htmlBody?: string;
  attachments: EmailAttachment[];
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  labels: string[];
  folder: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  aiClassification: EmailClassification;
  executiveAssignment?: string;
  responseRequired: boolean;
  deadline?: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  isInline: boolean;
}

export interface EmailClassification {
  category: 'business' | 'personal' | 'marketing' | 'support' | 'legal' | 'financial' | 'hr' | 'technical';
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  confidence: number;
  keywords: string[];
  entities: EmailEntity[];
  actionRequired: boolean;
  estimatedResponseTime: number; // minutes
}

export interface EmailEntity {
  type: 'person' | 'company' | 'date' | 'money' | 'location' | 'product';
  value: string;
  confidence: number;
}

export interface EmailDraft {
  id: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: EmailAttachment[];
  executiveVoice: string;
  tone: 'professional' | 'friendly' | 'formal' | 'urgent' | 'apologetic';
  scheduledSend?: Date;
}

export class EmailIntegrationSystem {
  private providers: Map<string, EmailProvider> = new Map();
  private messages: Map<string, EmailMessage> = new Map();
  private drafts: Map<string, EmailDraft> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private aiClassifier: EmailAIClassifier;

  constructor() {
    this.aiClassifier = new EmailAIClassifier();
    this.initializeEventListeners();
    this.initializeProviders();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('providerConnected', []);
    this.eventListeners.set('providerDisconnected', []);
    this.eventListeners.set('newEmail', []);
    this.eventListeners.set('emailClassified', []);
    this.eventListeners.set('emailSent', []);
    this.eventListeners.set('syncComplete', []);
    this.eventListeners.set('error', []);
  }

  private initializeProviders(): void {
    // Initialize supported email providers
    const providers: EmailProvider[] = [
      {
        id: 'gmail-primary',
        name: 'Gmail (Primary)',
        type: 'gmail',
        isConnected: false,
        lastSync: null,
        config: {
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          redirectUri: process.env.GMAIL_REDIRECT_URI,
          scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
        }
      },
      {
        id: 'outlook-primary',
        name: 'Outlook (Primary)',
        type: 'outlook',
        isConnected: false,
        lastSync: null,
        config: {
          clientId: process.env.OUTLOOK_CLIENT_ID,
          clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
          redirectUri: process.env.OUTLOOK_REDIRECT_URI,
          scopes: ['https://graph.microsoft.com/mail.read', 'https://graph.microsoft.com/mail.send']
        }
      },
      {
        id: 'exchange-corporate',
        name: 'Exchange (Corporate)',
        type: 'exchange',
        isConnected: false,
        lastSync: null,
        config: {
          serverUrl: process.env.EXCHANGE_SERVER_URL,
          username: process.env.EXCHANGE_USERNAME,
          encryption: 'tls'
        }
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  public async connectProvider(providerId: string, authCode?: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      console.log(`Connecting to ${provider.name}...`);

      switch (provider.type) {
        case 'gmail':
          await this.connectGmail(provider, authCode);
          break;
        case 'outlook':
          await this.connectOutlook(provider, authCode);
          break;
        case 'exchange':
          await this.connectExchange(provider);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      provider.isConnected = true;
      provider.lastSync = new Date();

      console.log(`✓ Connected to ${provider.name}`);
      this.emit('providerConnected', { providerId, provider });

      // Start syncing emails
      await this.syncEmails(providerId);

    } catch (error) {
      console.error(`Failed to connect to ${provider.name}:`, error);
      this.emit('error', { providerId, error });
      throw error;
    }
  }

  private async connectGmail(provider: EmailProvider, authCode?: string): Promise<void> {
    // Gmail OAuth2 connection
    if (!authCode) {
      const authUrl = this.generateGmailAuthUrl(provider);
      throw new Error(`Authorization required. Visit: ${authUrl}`);
    }

    // Exchange auth code for tokens
    const tokens = await this.exchangeGmailAuthCode(provider, authCode);
    provider.config.accessToken = tokens.access_token;
    provider.config.refreshToken = tokens.refresh_token;
  }

  private async connectOutlook(provider: EmailProvider, authCode?: string): Promise<void> {
    // Microsoft Graph OAuth2 connection
    if (!authCode) {
      const authUrl = this.generateOutlookAuthUrl(provider);
      throw new Error(`Authorization required. Visit: ${authUrl}`);
    }

    // Exchange auth code for tokens
    const tokens = await this.exchangeOutlookAuthCode(provider, authCode);
    provider.config.accessToken = tokens.access_token;
    provider.config.refreshToken = tokens.refresh_token;
  }

  private async connectExchange(provider: EmailProvider): Promise<void> {
    // Exchange Web Services connection
    // In a real implementation, this would use EWS or similar
    console.log('Connecting to Exchange server...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateGmailAuthUrl(provider: EmailProvider): string {
    const params = new URLSearchParams({
      client_id: provider.config.clientId!,
      redirect_uri: provider.config.redirectUri!,
      scope: provider.config.scopes!.join(' '),
      response_type: 'code',
      access_type: 'offline'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private generateOutlookAuthUrl(provider: EmailProvider): string {
    const params = new URLSearchParams({
      client_id: provider.config.clientId!,
      redirect_uri: provider.config.redirectUri!,
      scope: provider.config.scopes!.join(' '),
      response_type: 'code',
      response_mode: 'query'
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private async exchangeGmailAuthCode(provider: EmailProvider, authCode: string): Promise<any> {
    // Exchange authorization code for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: provider.config.clientId!,
        client_secret: provider.config.clientSecret!,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: provider.config.redirectUri!
      })
    });

    if (!response.ok) {
      throw new Error(`Gmail token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async exchangeOutlookAuthCode(provider: EmailProvider, authCode: string): Promise<any> {
    // Exchange authorization code for access token
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: provider.config.clientId!,
        client_secret: provider.config.clientSecret!,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: provider.config.redirectUri!
      })
    });

    if (!response.ok) {
      throw new Error(`Outlook token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  public async syncEmails(providerId?: string): Promise<void> {
    const providersToSync = providerId 
      ? [this.providers.get(providerId)!].filter(Boolean)
      : Array.from(this.providers.values()).filter(p => p.isConnected);

    for (const provider of providersToSync) {
      try {
        console.log(`Syncing emails from ${provider.name}...`);

        const emails = await this.fetchEmails(provider);
        
        for (const email of emails) {
          // Classify email with AI
          email.aiClassification = await this.aiClassifier.classifyEmail(email);
          
          // Assign to appropriate executive
          email.executiveAssignment = this.assignToExecutive(email);
          
          // Store email
          this.messages.set(email.id, email);
          
          this.emit('newEmail', { email, providerId: provider.id });
          this.emit('emailClassified', { email, classification: email.aiClassification });
        }

        provider.lastSync = new Date();
        console.log(`✓ Synced ${emails.length} emails from ${provider.name}`);

      } catch (error) {
        console.error(`Failed to sync emails from ${provider.name}:`, error);
        this.emit('error', { providerId: provider.id, error });
      }
    }

    this.emit('syncComplete', { timestamp: new Date() });
  }

  private async fetchEmails(provider: EmailProvider): Promise<EmailMessage[]> {
    switch (provider.type) {
      case 'gmail':
        return await this.fetchGmailEmails(provider);
      case 'outlook':
        return await this.fetchOutlookEmails(provider);
      case 'exchange':
        return await this.fetchExchangeEmails(provider);
      default:
        return [];
    }
  }

  private async fetchGmailEmails(provider: EmailProvider): Promise<EmailMessage[]> {
    // Fetch emails from Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50', {
      headers: {
        'Authorization': `Bearer ${provider.config.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }

    const data = await response.json();
    const emails: EmailMessage[] = [];

    // Fetch detailed message data
    for (const message of data.messages || []) {
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`
        }
      });

      if (detailResponse.ok) {
        const detail = await detailResponse.json();
        emails.push(this.parseGmailMessage(detail, provider.id));
      }
    }

    return emails;
  }

  private async fetchOutlookEmails(provider: EmailProvider): Promise<EmailMessage[]> {
    // Fetch emails from Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=50', {
      headers: {
        'Authorization': `Bearer ${provider.config.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.value || []).map((message: any) => this.parseOutlookMessage(message, provider.id));
  }

  private async fetchExchangeEmails(provider: EmailProvider): Promise<EmailMessage[]> {
    // Simulate Exchange email fetching
    await new Promise(resolve => setTimeout(resolve, 500));
    return [];
  }

  private parseGmailMessage(gmailMessage: any, providerId: string): EmailMessage {
    const headers = gmailMessage.payload.headers;
    const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || '';

    return {
      id: gmailMessage.id,
      providerId,
      threadId: gmailMessage.threadId,
      subject: getHeader('Subject'),
      from: this.parseEmailAddress(getHeader('From')),
      to: this.parseEmailAddresses(getHeader('To')),
      cc: this.parseEmailAddresses(getHeader('Cc')),
      body: this.extractGmailBody(gmailMessage.payload),
      attachments: this.extractGmailAttachments(gmailMessage.payload),
      timestamp: new Date(parseInt(gmailMessage.internalDate)),
      isRead: !gmailMessage.labelIds?.includes('UNREAD'),
      isImportant: gmailMessage.labelIds?.includes('IMPORTANT') || false,
      labels: gmailMessage.labelIds || [],
      folder: 'INBOX',
      priority: 'normal',
      aiClassification: {
        category: 'business',
        sentiment: 'neutral',
        confidence: 0,
        keywords: [],
        entities: [],
        actionRequired: false,
        estimatedResponseTime: 60
      },
      responseRequired: false
    };
  }

  private parseOutlookMessage(outlookMessage: any, providerId: string): EmailMessage {
    return {
      id: outlookMessage.id,
      providerId,
      subject: outlookMessage.subject || '',
      from: {
        email: outlookMessage.from?.emailAddress?.address || '',
        name: outlookMessage.from?.emailAddress?.name
      },
      to: (outlookMessage.toRecipients || []).map((r: any) => ({
        email: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      cc: (outlookMessage.ccRecipients || []).map((r: any) => ({
        email: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      body: outlookMessage.body?.content || '',
      htmlBody: outlookMessage.body?.contentType === 'html' ? outlookMessage.body.content : undefined,
      attachments: (outlookMessage.attachments || []).map((a: any) => ({
        id: a.id,
        filename: a.name,
        mimeType: a.contentType,
        size: a.size,
        isInline: a.isInline
      })),
      timestamp: new Date(outlookMessage.receivedDateTime),
      isRead: outlookMessage.isRead,
      isImportant: outlookMessage.importance === 'high',
      labels: [],
      folder: 'Inbox',
      priority: outlookMessage.importance === 'high' ? 'high' : 'normal',
      aiClassification: {
        category: 'business',
        sentiment: 'neutral',
        confidence: 0,
        keywords: [],
        entities: [],
        actionRequired: false,
        estimatedResponseTime: 60
      },
      responseRequired: false
    };
  }

  private parseEmailAddress(addressString: string): EmailAddress {
    const match = addressString.match(/^(.+?)\s*<(.+?)>$/) || addressString.match(/^(.+)$/);
    if (match) {
      return match.length > 2 
        ? { name: match[1].trim(), email: match[2].trim() }
        : { email: match[1].trim() };
    }
    return { email: addressString };
  }

  private parseEmailAddresses(addressString: string): EmailAddress[] {
    if (!addressString) return [];
    return addressString.split(',').map(addr => this.parseEmailAddress(addr.trim()));
  }

  private extractGmailBody(payload: any): string {
    if (payload.body?.data) {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
      }
    }
    
    return '';
  }

  private extractGmailAttachments(payload: any): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            isInline: false
          });
        }
      }
    }
    
    return attachments;
  }

  private assignToExecutive(email: EmailMessage): string {
    // AI-powered executive assignment based on email content and classification
    const classification = email.aiClassification;
    
    switch (classification.category) {
      case 'financial':
        return 'cfo';
      case 'technical':
        return 'cto';
      case 'legal':
        return 'clo';
      case 'hr':
        return 'chro';
      case 'business':
        if (classification.sentiment === 'urgent' || email.priority === 'high') {
          return 'ceo';
        }
        return 'coo';
      default:
        return 'ceo';
    }
  }

  public async sendEmail(draft: EmailDraft): Promise<string> {
    // Implementation would send email through appropriate provider
    console.log(`Sending email: ${draft.subject}`);
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const messageId = `sent_${Date.now()}`;
    this.emit('emailSent', { messageId, draft });
    
    return messageId;
  }

  public getEmails(filters?: {
    providerId?: string;
    category?: string;
    executive?: string;
    unreadOnly?: boolean;
  }): EmailMessage[] {
    let emails = Array.from(this.messages.values());
    
    if (filters) {
      if (filters.providerId) {
        emails = emails.filter(e => e.providerId === filters.providerId);
      }
      if (filters.category) {
        emails = emails.filter(e => e.aiClassification.category === filters.category);
      }
      if (filters.executive) {
        emails = emails.filter(e => e.executiveAssignment === filters.executive);
      }
      if (filters.unreadOnly) {
        emails = emails.filter(e => !e.isRead);
      }
    }
    
    return emails.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getProviders(): EmailProvider[] {
    return Array.from(this.providers.values());
  }

  public getConnectedProviders(): EmailProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isConnected);
  }

  public startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncEmails();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`✓ Auto-sync started (every ${intervalMinutes} minutes)`);
  }

  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('✓ Auto-sync stopped');
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
    console.log('Shutting down Email Integration System...');
    
    this.stopAutoSync();
    
    // Disconnect all providers
    for (const provider of this.providers.values()) {
      if (provider.isConnected) {
        provider.isConnected = false;
      }
    }
    
    console.log('✓ Email Integration System shutdown complete');
  }
}

// AI Email Classification System
class EmailAIClassifier {
  public async classifyEmail(email: EmailMessage): Promise<EmailClassification> {
    // Simulate AI classification
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const text = `${email.subject} ${email.body}`.toLowerCase();
    
    // Simple keyword-based classification
    const keywords = this.extractKeywords(text);
    const category = this.categorizeEmail(text, keywords);
    const sentiment = this.analyzeSentiment(text);
    const actionRequired = this.detectActionRequired(text);
    
    return {
      category,
      sentiment,
      confidence: 0.85,
      keywords,
      entities: this.extractEntities(text),
      actionRequired,
      estimatedResponseTime: this.estimateResponseTime(category, sentiment, actionRequired)
    };
  }
  
  private extractKeywords(text: string): string[] {
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return text
      .split(/\W+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10);
  }
  
  private categorizeEmail(text: string, keywords: string[]): EmailClassification['category'] {
    if (text.includes('budget') || text.includes('financial') || text.includes('invoice')) return 'financial';
    if (text.includes('technical') || text.includes('system') || text.includes('bug')) return 'technical';
    if (text.includes('legal') || text.includes('contract') || text.includes('compliance')) return 'legal';
    if (text.includes('hiring') || text.includes('employee') || text.includes('hr')) return 'hr';
    if (text.includes('marketing') || text.includes('campaign') || text.includes('promotion')) return 'marketing';
    if (text.includes('support') || text.includes('help') || text.includes('issue')) return 'support';
    return 'business';
  }
  
  private analyzeSentiment(text: string): EmailClassification['sentiment'] {
    if (text.includes('urgent') || text.includes('asap') || text.includes('emergency')) return 'urgent';
    if (text.includes('thank') || text.includes('great') || text.includes('excellent')) return 'positive';
    if (text.includes('problem') || text.includes('issue') || text.includes('concern')) return 'negative';
    return 'neutral';
  }
  
  private detectActionRequired(text: string): boolean {
    const actionWords = ['please', 'need', 'require', 'request', 'urgent', 'asap', 'deadline'];
    return actionWords.some(word => text.includes(word));
  }
  
  private extractEntities(text: string): EmailEntity[] {
    // Simple entity extraction
    const entities: EmailEntity[] = [];
    
    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({ type: 'person', value: email, confidence: 0.9 });
    });
    
    // Extract monetary amounts
    const moneyRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const amounts = text.match(moneyRegex) || [];
    amounts.forEach(amount => {
      entities.push({ type: 'money', value: amount, confidence: 0.8 });
    });
    
    return entities;
  }
  
  private estimateResponseTime(category: string, sentiment: string, actionRequired: boolean): number {
    let baseTime = 60; // 1 hour default
    
    if (sentiment === 'urgent') baseTime = 15;
    else if (actionRequired) baseTime = 30;
    else if (category === 'support') baseTime = 120;
    else if (category === 'legal') baseTime = 240;
    
    return baseTime;
  }
}
