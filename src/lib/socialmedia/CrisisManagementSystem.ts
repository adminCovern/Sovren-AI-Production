/**
 * SOVREN AI - Crisis Management System
 * 
 * PhD-level crisis detection, prevention, and response system with
 * real-time threat monitoring and autonomous damage control protocols.
 */

import { EventEmitter } from 'events';

export interface CrisisAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'reputation' | 'legal' | 'competitive' | 'viral_negative' | 'misinformation' | 'customer_service';
  platform: string;
  description: string;
  source: {
    author: string;
    reach: number;
    influence_score: number;
    verification_status: boolean;
  };
  content: string;
  sentiment_score: number;
  viral_potential: number;
  business_impact: number; // 0-1 scale
  detected_at: Date;
  response_deadline: Date;
  escalation_required: boolean;
}

export interface CrisisResponse {
  id: string;
  crisis_id: string;
  strategy: 'acknowledge' | 'clarify' | 'apologize' | 'defend' | 'redirect' | 'ignore';
  response_type: 'immediate' | 'measured' | 'legal_review';
  content: string;
  platforms: string[];
  tone: 'professional' | 'empathetic' | 'authoritative' | 'transparent';
  stakeholders_notified: string[];
  media_statement: boolean;
  legal_review: boolean;
  executive_approval: boolean;
  executed_at: Date;
}

export interface CrisisMetrics {
  total_alerts: number;
  resolved_crises: number;
  average_response_time: number; // minutes
  reputation_impact: number; // -1 to 1 scale
  media_coverage: {
    positive: number;
    neutral: number;
    negative: number;
  };
  stakeholder_sentiment: number; // -1 to 1 scale
  business_impact_prevented: number; // estimated dollar value
}

export class CrisisManagementSystem extends EventEmitter {
  private activeAlerts: Map<string, CrisisAlert> = new Map();
  private responseHistory: Map<string, CrisisResponse> = new Map();
  private crisisMetrics: CrisisMetrics;
  private monitoringKeywords: Set<string> = new Set();
  private stakeholderContacts: Map<string, any> = new Map();
  private automaticDetection: boolean = false;
  private responseProtocols: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeCrisisMetrics();
    this.initializeMonitoringKeywords();
    this.initializeResponseProtocols();
    this.initializeStakeholderContacts();
  }

  /**
   * Initialize crisis metrics tracking
   */
  private initializeCrisisMetrics(): void {
    this.crisisMetrics = {
      total_alerts: 0,
      resolved_crises: 0,
      average_response_time: 0,
      reputation_impact: 0,
      media_coverage: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      stakeholder_sentiment: 0,
      business_impact_prevented: 0
    };
  }

  /**
   * Initialize crisis monitoring keywords
   */
  private initializeMonitoringKeywords(): void {
    const keywords = [
      // Legal threats
      'lawsuit', 'legal action', 'sue', 'court', 'attorney', 'lawyer',
      // Reputation threats
      'scam', 'fraud', 'fake', 'lie', 'cheat', 'terrible', 'worst', 'awful',
      // Service issues
      'broken', 'not working', 'failed', 'error', 'bug', 'problem', 'issue',
      // Competitive attacks
      'competitor', 'better alternative', 'switch to', 'avoid',
      // Viral negative
      'boycott', 'cancel', 'exposed', 'truth about', 'warning',
      // Misinformation
      'false', 'untrue', 'misleading', 'deceptive', 'propaganda'
    ];

    keywords.forEach(keyword => this.monitoringKeywords.add(keyword.toLowerCase()));
    console.log(`🚨 Monitoring ${keywords.length} crisis keywords`);
  }

  /**
   * Initialize response protocols
   */
  private initializeResponseProtocols(): void {
    const protocols = {
      reputation: {
        immediate_response: true,
        legal_review: false,
        executive_approval: false,
        strategy: 'acknowledge',
        tone: 'empathetic'
      },
      legal: {
        immediate_response: false,
        legal_review: true,
        executive_approval: true,
        strategy: 'defend',
        tone: 'professional'
      },
      competitive: {
        immediate_response: true,
        legal_review: false,
        executive_approval: false,
        strategy: 'clarify',
        tone: 'professional'
      },
      viral_negative: {
        immediate_response: true,
        legal_review: false,
        executive_approval: true,
        strategy: 'acknowledge',
        tone: 'transparent'
      },
      misinformation: {
        immediate_response: true,
        legal_review: false,
        executive_approval: false,
        strategy: 'clarify',
        tone: 'authoritative'
      },
      customer_service: {
        immediate_response: true,
        legal_review: false,
        executive_approval: false,
        strategy: 'apologize',
        tone: 'empathetic'
      }
    };

    Object.entries(protocols).forEach(([type, protocol]) => {
      this.responseProtocols.set(type, protocol);
    });

    console.log('📋 Crisis response protocols initialized');
  }

  /**
   * Initialize stakeholder contact information
   */
  private initializeStakeholderContacts(): void {
    const contacts = {
      legal_team: {
        name: 'Legal Department',
        email: 'legal@company.com',
        phone: '+1-555-0123',
        priority: 'high'
      },
      pr_team: {
        name: 'Public Relations',
        email: 'pr@company.com',
        phone: '+1-555-0124',
        priority: 'high'
      },
      executive_team: {
        name: 'Executive Team',
        email: 'executives@company.com',
        phone: '+1-555-0125',
        priority: 'critical'
      },
      customer_service: {
        name: 'Customer Service',
        email: 'support@company.com',
        phone: '+1-555-0126',
        priority: 'medium'
      }
    };

    Object.entries(contacts).forEach(([role, contact]) => {
      this.stakeholderContacts.set(role, contact);
    });
  }

  /**
   * Enable automatic crisis detection
   */
  public async enableAutomaticDetection(): Promise<void> {
    this.automaticDetection = true;

    // Monitor social media mentions every 30 seconds
    setInterval(() => {
      this.monitorSocialMentions();
    }, 30000);

    // Analyze sentiment trends every 2 minutes
    setInterval(() => {
      this.analyzeSentimentTrends();
    }, 120000);

    // Check viral negative content every 5 minutes
    setInterval(() => {
      this.checkViralNegativeContent();
    }, 300000);

    // Update crisis metrics every 15 minutes
    setInterval(() => {
      this.updateCrisisMetrics();
    }, 900000);

    console.log('🚨 Automatic crisis detection enabled');
    
    this.emit('automaticDetectionEnabled', {
      timestamp: new Date()
    });
  }

  /**
   * Monitor social media mentions for crisis indicators
   */
  private async monitorSocialMentions(): Promise<void> {
    if (!this.automaticDetection) return;

    try {
      const platforms = ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube', 'pinterest'];
      
      for (const platform of platforms) {
        const mentions = await this.fetchPlatformMentions(platform);
        
        for (const mention of mentions) {
          const crisisIndicators = await this.analyzeCrisisIndicators(mention);
          
          if (crisisIndicators.severity !== 'low') {
            await this.createCrisisAlert(mention, crisisIndicators, platform);
          }
        }
      }
    } catch (error) {
      console.error('❌ Crisis monitoring failed:', error);
    }
  }

  /**
   * Analyze content for crisis indicators
   */
  private async analyzeCrisisIndicators(mention: any): Promise<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    viral_potential: number;
    business_impact: number;
  }> {
    
    const content = mention.content.toLowerCase();
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let type = 'reputation';
    let viral_potential = 0;
    let business_impact = 0;

    // Check for crisis keywords
    const foundKeywords = Array.from(this.monitoringKeywords)
      .filter(keyword => content.includes(keyword));

    if (foundKeywords.length > 0) {
      // Determine crisis type
      if (foundKeywords.some(k => ['lawsuit', 'legal action', 'sue'].includes(k))) {
        type = 'legal';
        severity = 'critical';
        business_impact = 0.9;
      } else if (foundKeywords.some(k => ['boycott', 'cancel', 'exposed'].includes(k))) {
        type = 'viral_negative';
        severity = 'high';
        viral_potential = 0.8;
        business_impact = 0.7;
      } else if (foundKeywords.some(k => ['false', 'untrue', 'misleading'].includes(k))) {
        type = 'misinformation';
        severity = 'medium';
        business_impact = 0.5;
      } else if (foundKeywords.some(k => ['broken', 'not working', 'failed'].includes(k))) {
        type = 'customer_service';
        severity = 'medium';
        business_impact = 0.3;
      }
    }

    // Analyze author influence
    if (mention.author.influence_score > 0.8) {
      severity = this.escalateSeverity(severity);
      viral_potential += 0.3;
      business_impact += 0.2;
    }

    // Analyze engagement velocity
    if (mention.engagement_velocity > 100) { // High engagement rate
      viral_potential += 0.4;
      business_impact += 0.3;
    }

    return {
      severity,
      type,
      viral_potential: Math.min(viral_potential, 1.0),
      business_impact: Math.min(business_impact, 1.0)
    };
  }

  /**
   * Create crisis alert
   */
  private async createCrisisAlert(
    mention: any, 
    indicators: any, 
    platform: string
  ): Promise<void> {
    
    const alert: CrisisAlert = {
      id: `crisis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: indicators.severity,
      type: indicators.type,
      platform,
      description: `${indicators.type} crisis detected on ${platform}`,
      source: {
        author: mention.author.username,
        reach: mention.author.follower_count,
        influence_score: mention.author.influence_score,
        verification_status: mention.author.verified
      },
      content: mention.content,
      sentiment_score: mention.sentiment_score,
      viral_potential: indicators.viral_potential,
      business_impact: indicators.business_impact,
      detected_at: new Date(),
      response_deadline: this.calculateResponseDeadline(indicators.severity),
      escalation_required: indicators.severity === 'critical'
    };

    this.activeAlerts.set(alert.id, alert);
    this.crisisMetrics.total_alerts++;

    console.log(`🚨 Crisis alert created: ${alert.severity} ${alert.type} on ${platform}`);

    this.emit('crisisAlert', alert);

    // Automatic response for certain crisis types
    if (this.shouldAutoRespond(alert)) {
      await this.executeAutomaticResponse(alert);
    }

    // Notify stakeholders
    await this.notifyStakeholders(alert);
  }

  /**
   * Execute automatic crisis response
   */
  private async executeAutomaticResponse(alert: CrisisAlert): Promise<void> {
    console.log(`🤖 Executing automatic response for crisis ${alert.id}`);

    const protocol = this.responseProtocols.get(alert.type);
    if (!protocol) {
      console.warn(`No protocol found for crisis type: ${alert.type}`);
      return;
    }

    // Generate response content
    const responseContent = await this.generateCrisisResponse(alert, protocol);
    
    const response: CrisisResponse = {
      id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      crisis_id: alert.id,
      strategy: protocol.strategy,
      response_type: protocol.immediate_response ? 'immediate' : 'measured',
      content: responseContent,
      platforms: [alert.platform],
      tone: protocol.tone,
      stakeholders_notified: [],
      media_statement: alert.severity === 'critical',
      legal_review: protocol.legal_review,
      executive_approval: protocol.executive_approval,
      executed_at: new Date()
    };

    // Execute response if no approvals required
    if (!response.legal_review && !response.executive_approval) {
      await this.executeResponse(response);
      this.responseHistory.set(response.id, response);
      
      console.log(`✅ Automatic crisis response executed`);
      
      this.emit('crisisResponseExecuted', {
        alert,
        response
      });
    } else {
      console.log(`⏳ Crisis response pending approval`);
      
      this.emit('crisisResponsePendingApproval', {
        alert,
        response
      });
    }
  }

  /**
   * Generate crisis response content
   */
  private async generateCrisisResponse(alert: CrisisAlert, protocol: any): Promise<string> {
    let response = '';

    switch (protocol.strategy) {
      case 'acknowledge':
        response = `Thank you for bringing this to our attention. We take all feedback seriously and are looking into this matter.`;
        break;
      case 'clarify':
        response = `We'd like to clarify this situation. Please reach out to us directly so we can provide accurate information.`;
        break;
      case 'apologize':
        response = `We sincerely apologize for this experience. This doesn't reflect our standards, and we're working to make it right.`;
        break;
      case 'defend':
        response = `We stand by our practices and policies. We believe there may be a misunderstanding that we'd like to address.`;
        break;
      case 'redirect':
        response = `For the most accurate and up-to-date information, please visit our official channels or contact us directly.`;
        break;
      default:
        response = `Thank you for your feedback. We're committed to continuous improvement and value all input.`;
    }

    // Customize based on tone
    if (protocol.tone === 'empathetic') {
      response = `We understand your concern. ${response}`;
    } else if (protocol.tone === 'authoritative') {
      response = `To set the record straight: ${response}`;
    }

    return response;
  }

  /**
   * Execute crisis response
   */
  private async executeResponse(response: CrisisResponse): Promise<void> {
    try {
      // Post response to specified platforms
      for (const platform of response.platforms) {
        await this.postResponseToPlatform(platform, response.content);
      }

      // Update crisis metrics
      this.crisisMetrics.resolved_crises++;
      
      // Calculate response time
      const alert = this.activeAlerts.get(response.crisis_id);
      if (alert) {
        const responseTime = (response.executed_at.getTime() - alert.detected_at.getTime()) / 60000; // minutes
        this.updateAverageResponseTime(responseTime);
        
        // Mark alert as resolved
        this.activeAlerts.delete(response.crisis_id);
      }

    } catch (error) {
      console.error('❌ Failed to execute crisis response:', error);
      throw error;
    }
  }

  /**
   * Notify stakeholders about crisis
   */
  private async notifyStakeholders(alert: CrisisAlert): Promise<void> {
    const stakeholdersToNotify: string[] = [];

    // Determine which stakeholders to notify based on crisis type and severity
    if (alert.type === 'legal' || alert.severity === 'critical') {
      stakeholdersToNotify.push('legal_team', 'executive_team', 'pr_team');
    } else if (alert.severity === 'high') {
      stakeholdersToNotify.push('pr_team', 'executive_team');
    } else if (alert.type === 'customer_service') {
      stakeholdersToNotify.push('customer_service', 'pr_team');
    }

    for (const stakeholder of stakeholdersToNotify) {
      const contact = this.stakeholderContacts.get(stakeholder);
      if (contact) {
        await this.sendStakeholderNotification(contact, alert);
      }
    }
  }

  /**
   * Helper methods
   */
  private escalateSeverity(currentSeverity: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(currentSeverity);
    return severityLevels[Math.min(currentIndex + 1, 3)] as 'low' | 'medium' | 'high' | 'critical';
  }

  private calculateResponseDeadline(severity: 'low' | 'medium' | 'high' | 'critical'): Date {
    const now = new Date();
    const deadlines = {
      critical: 15, // 15 minutes
      high: 60, // 1 hour
      medium: 240, // 4 hours
      low: 1440 // 24 hours
    };
    
    now.setMinutes(now.getMinutes() + deadlines[severity]);
    return now;
  }

  private shouldAutoRespond(alert: CrisisAlert): boolean {
    // Auto-respond to customer service issues and misinformation
    return ['customer_service', 'misinformation'].includes(alert.type) && alert.severity !== 'critical';
  }

  private updateAverageResponseTime(newResponseTime: number): void {
    const totalResponses = this.crisisMetrics.resolved_crises;
    const currentAverage = this.crisisMetrics.average_response_time;
    
    this.crisisMetrics.average_response_time = 
      ((currentAverage * (totalResponses - 1)) + newResponseTime) / totalResponses;
  }
}
