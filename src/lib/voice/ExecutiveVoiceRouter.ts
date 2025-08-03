export interface ExecutiveProfile {
  id: string;
  name: string;
  role: string;
  availability: 'available' | 'busy' | 'in-call' | 'offline';
  priority: number;
  specializations: string[];
  currentLoad: number;
  maxConcurrentCalls: number;
  voiceModel: string;
  color?: string; // Visual color for UI representation
  personaType: 'executive' | 'system';
  canInitiateCall: boolean;
  canReceiveCall: boolean;
  canSendEmail: boolean;
  canReceiveEmail: boolean;
  phoneNumber?: string;
  emailAddress?: string;
}

export interface CallRoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    callerPattern?: RegExp;
    timeRange?: { start: string; end: string };
    dayOfWeek?: number[];
    keywords?: string[];
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  actions: {
    assignToExecutive?: string;
    requireApproval?: boolean;
    recordCall?: boolean;
    transcribeCall?: boolean;
    notifyOthers?: string[];
  };
}

export interface CallContext {
  callerId: string;
  callerName?: string;
  callerCompany?: string;
  previousInteractions: number;
  estimatedValue?: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  timeOfCall: Date;
}

export class ExecutiveVoiceRouter {
  private executives: Map<string, ExecutiveProfile> = new Map();
  private routingRules: CallRoutingRule[] = [];
  private callHistory: Map<string, CallContext[]> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeExecutives();
    this.initializeRoutingRules();
    this.initializeEventListeners();
  }

  private initializeExecutives(): void {
    const executiveProfiles: ExecutiveProfile[] = [
      {
        id: 'sovren-ai',
        name: 'SOVREN AI Core System',
        role: 'NEURAL OS',
        availability: 'available',
        priority: 11, // Highest priority - core system
        specializations: ['system-control', 'neural-processing', 'decision-making', 'orchestration', 'intelligence', 'omniscience'],
        currentLoad: 0,
        maxConcurrentCalls: 10, // Can handle multiple simultaneous conversations
        voiceModel: 'sovren-ai-neural',
        color: '#ff0000', // Red for synthetic intelligence
        personaType: 'system',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'ceo',
        name: 'Chief Executive Officer',
        role: 'CEO',
        availability: 'available',
        priority: 10,
        specializations: ['strategy', 'vision', 'leadership', 'board', 'investors'],
        currentLoad: 0,
        maxConcurrentCalls: 2,
        voiceModel: 'ceo-authoritative',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'cfo',
        name: 'Chief Financial Officer',
        role: 'CFO',
        availability: 'available',
        priority: 9,
        specializations: ['finance', 'budget', 'accounting', 'investors', 'funding'],
        currentLoad: 0,
        maxConcurrentCalls: 3,
        voiceModel: 'cfo-analytical',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'cto',
        name: 'Chief Technology Officer',
        role: 'CTO',
        availability: 'available',
        priority: 8,
        specializations: ['technology', 'development', 'infrastructure', 'security', 'innovation'],
        currentLoad: 0,
        maxConcurrentCalls: 3,
        voiceModel: 'cto-technical',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'cmo',
        name: 'Chief Marketing Officer',
        role: 'CMO',
        availability: 'available',
        priority: 7,
        specializations: ['marketing', 'branding', 'campaigns', 'customers', 'growth'],
        currentLoad: 0,
        maxConcurrentCalls: 4,
        voiceModel: 'cmo-persuasive',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'coo',
        name: 'Chief Operating Officer',
        role: 'COO',
        availability: 'available',
        priority: 8,
        specializations: ['operations', 'processes', 'efficiency', 'logistics', 'management'],
        currentLoad: 0,
        maxConcurrentCalls: 3,
        voiceModel: 'coo-operational',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'chro',
        name: 'Chief Human Resources Officer',
        role: 'CHRO',
        availability: 'available',
        priority: 6,
        specializations: ['hr', 'hiring', 'culture', 'employees', 'benefits'],
        currentLoad: 0,
        maxConcurrentCalls: 4,
        voiceModel: 'chro-empathetic',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'clo',
        name: 'Chief Legal Officer',
        role: 'CLO',
        availability: 'available',
        priority: 7,
        specializations: ['legal', 'compliance', 'contracts', 'risk', 'governance'],
        currentLoad: 0,
        maxConcurrentCalls: 2,
        voiceModel: 'clo-precise',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      },
      {
        id: 'cso',
        name: 'Chief Strategy Officer',
        role: 'CSO',
        availability: 'available',
        priority: 7,
        specializations: ['strategy', 'planning', 'analysis', 'competition', 'growth'],
        currentLoad: 0,
        maxConcurrentCalls: 3,
        voiceModel: 'cso-strategic',
        personaType: 'executive',
        canInitiateCall: true,
        canReceiveCall: true,
        canSendEmail: true,
        canReceiveEmail: true
      }
    ];

    executiveProfiles.forEach(profile => {
      this.executives.set(profile.id, profile);
    });
  }

  private initializeRoutingRules(): void {
    this.routingRules = [
      {
        id: 'system-control',
        name: 'SOVREN AI System Control',
        priority: 11,
        conditions: {
          keywords: ['sovren', 'system', 'neural', 'ai', 'core', 'control', 'override', 'emergency'],
          urgency: 'critical'
        },
        actions: {
          assignToExecutive: 'sovren-ai',
          recordCall: true,
          transcribeCall: true,
          notifyOthers: ['ceo', 'cto']
        }
      },
      {
        id: 'investor-calls',
        name: 'Investor Relations',
        priority: 10,
        conditions: {
          keywords: ['investor', 'funding', 'investment', 'venture', 'capital'],
          urgency: 'high'
        },
        actions: {
          assignToExecutive: 'ceo',
          recordCall: true,
          transcribeCall: true,
          notifyOthers: ['cfo', 'sovren-ai']
        }
      },
      {
        id: 'financial-matters',
        name: 'Financial Discussions',
        priority: 9,
        conditions: {
          keywords: ['budget', 'finance', 'accounting', 'revenue', 'cost']
        },
        actions: {
          assignToExecutive: 'cfo',
          recordCall: true,
          transcribeCall: true
        }
      },
      {
        id: 'technical-support',
        name: 'Technical Issues',
        priority: 8,
        conditions: {
          keywords: ['technical', 'bug', 'system', 'server', 'api', 'integration']
        },
        actions: {
          assignToExecutive: 'cto',
          recordCall: true,
          transcribeCall: true
        }
      },
      {
        id: 'marketing-campaigns',
        name: 'Marketing & Sales',
        priority: 7,
        conditions: {
          keywords: ['marketing', 'campaign', 'sales', 'customer', 'lead']
        },
        actions: {
          assignToExecutive: 'cmo',
          recordCall: true,
          transcribeCall: true
        }
      },
      {
        id: 'hr-matters',
        name: 'Human Resources',
        priority: 6,
        conditions: {
          keywords: ['hr', 'hiring', 'employee', 'culture', 'benefits']
        },
        actions: {
          assignToExecutive: 'chro',
          recordCall: true,
          transcribeCall: true
        }
      },
      {
        id: 'legal-compliance',
        name: 'Legal & Compliance',
        priority: 8,
        conditions: {
          keywords: ['legal', 'contract', 'compliance', 'risk', 'lawsuit']
        },
        actions: {
          assignToExecutive: 'clo',
          recordCall: true,
          transcribeCall: true,
          requireApproval: true
        }
      },
      {
        id: 'operations',
        name: 'Operations & Processes',
        priority: 7,
        conditions: {
          keywords: ['operations', 'process', 'efficiency', 'logistics']
        },
        actions: {
          assignToExecutive: 'coo',
          recordCall: true,
          transcribeCall: true
        }
      },
      {
        id: 'strategy-planning',
        name: 'Strategic Planning',
        priority: 8,
        conditions: {
          keywords: ['strategy', 'planning', 'roadmap', 'competition', 'market']
        },
        actions: {
          assignToExecutive: 'cso',
          recordCall: true,
          transcribeCall: true
        }
      },
      {
        id: 'vip-callers',
        name: 'VIP Caller Routing',
        priority: 10,
        conditions: {
          callerPattern: /\+1(555|800|888|877|866|855|844|833|822)/,
          urgency: 'critical'
        },
        actions: {
          assignToExecutive: 'ceo',
          recordCall: true,
          transcribeCall: true,
          notifyOthers: ['cfo', 'coo']
        }
      },
      {
        id: 'after-hours',
        name: 'After Hours Routing',
        priority: 5,
        conditions: {
          timeRange: { start: '18:00', end: '08:00' }
        },
        actions: {
          assignToExecutive: 'coo',
          recordCall: true,
          transcribeCall: true,
          requireApproval: true
        }
      }
    ];
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('executiveAssigned', []);
    this.eventListeners.set('routingFailed', []);
    this.eventListeners.set('loadBalanced', []);
    this.eventListeners.set('availabilityChanged', []);
  }

  public async assignExecutive(callerUri: string, context?: Partial<CallContext>): Promise<string> {
    try {
      // Build call context
      const callContext = await this.buildCallContext(callerUri, context);
      
      // Find matching routing rules
      const matchingRules = this.findMatchingRules(callContext);
      
      // Get executive assignment from rules
      let assignedExecutive = this.getExecutiveFromRules(matchingRules);
      
      // If no rule-based assignment, use load balancing
      if (!assignedExecutive) {
        assignedExecutive = this.loadBalanceExecutives(callContext);
      }
      
      // Validate executive availability
      const executive = this.executives.get(assignedExecutive);
      if (!executive || !this.isExecutiveAvailable(executive)) {
        assignedExecutive = this.findAlternativeExecutive(assignedExecutive, callContext);
      }
      
      // Update executive load
      this.updateExecutiveLoad(assignedExecutive, 1);
      
      // Store call context
      this.storeCallContext(callerUri, callContext);
      
      console.log(`Call from ${callerUri} assigned to ${assignedExecutive}`);
      this.emit('executiveAssigned', { callerUri, executive: assignedExecutive, context: callContext });
      
      return assignedExecutive;
      
    } catch (error) {
      console.error('Failed to assign executive:', error);
      this.emit('routingFailed', { callerUri, error });
      
      // Fallback to CEO
      return 'ceo';
    }
  }

  private async buildCallContext(callerUri: string, context?: Partial<CallContext>): Promise<CallContext> {
    const previousInteractions = this.callHistory.get(callerUri)?.length || 0;
    
    return {
      callerId: callerUri,
      callerName: context?.callerName,
      callerCompany: context?.callerCompany,
      previousInteractions,
      estimatedValue: context?.estimatedValue,
      urgency: context?.urgency || 'medium',
      keywords: context?.keywords || [],
      timeOfCall: new Date()
    };
  }

  private findMatchingRules(context: CallContext): CallRoutingRule[] {
    return this.routingRules
      .filter(rule => this.ruleMatches(rule, context))
      .sort((a, b) => b.priority - a.priority);
  }

  private ruleMatches(rule: CallRoutingRule, context: CallContext): boolean {
    const conditions = rule.conditions;
    
    // Check caller pattern
    if (conditions.callerPattern && !conditions.callerPattern.test(context.callerId)) {
      return false;
    }
    
    // Check time range
    if (conditions.timeRange) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) {
        return false;
      }
    }
    
    // Check day of week
    if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(context.timeOfCall.getDay())) {
      return false;
    }
    
    // Check keywords
    if (conditions.keywords) {
      const hasKeyword = conditions.keywords.some(keyword =>
        context.keywords.some(contextKeyword =>
          contextKeyword.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      if (!hasKeyword) {
        return false;
      }
    }
    
    // Check urgency
    if (conditions.urgency && context.urgency !== conditions.urgency) {
      return false;
    }
    
    return true;
  }

  private getExecutiveFromRules(rules: CallRoutingRule[]): string | null {
    for (const rule of rules) {
      if (rule.actions.assignToExecutive) {
        const executive = this.executives.get(rule.actions.assignToExecutive);
        if (executive && this.isExecutiveAvailable(executive)) {
          return rule.actions.assignToExecutive;
        }
      }
    }
    return null;
  }

  private loadBalanceExecutives(context: CallContext): string {
    const availableExecutives = Array.from(this.executives.values())
      .filter(exec => this.isExecutiveAvailable(exec))
      .sort((a, b) => {
        // Sort by load (ascending) then by priority (descending)
        if (a.currentLoad !== b.currentLoad) {
          return a.currentLoad - b.currentLoad;
        }
        return b.priority - a.priority;
      });
    
    if (availableExecutives.length === 0) {
      return 'ceo'; // Fallback
    }
    
    return availableExecutives[0].id;
  }

  private isExecutiveAvailable(executive: ExecutiveProfile): boolean {
    return executive.availability === 'available' && 
           executive.currentLoad < executive.maxConcurrentCalls;
  }

  private findAlternativeExecutive(originalExecutive: string, context: CallContext): string {
    // Find executives with similar specializations
    const original = this.executives.get(originalExecutive);
    if (!original) return 'ceo';
    
    const alternatives = Array.from(this.executives.values())
      .filter(exec => 
        exec.id !== originalExecutive &&
        this.isExecutiveAvailable(exec) &&
        exec.specializations.some(spec => original.specializations.includes(spec))
      )
      .sort((a, b) => b.priority - a.priority);
    
    return alternatives.length > 0 ? alternatives[0].id : 'ceo';
  }

  private updateExecutiveLoad(executiveId: string, delta: number): void {
    const executive = this.executives.get(executiveId);
    if (executive) {
      executive.currentLoad = Math.max(0, executive.currentLoad + delta);
      this.emit('loadBalanced', { executiveId, newLoad: executive.currentLoad });
    }
  }

  private storeCallContext(callerUri: string, context: CallContext): void {
    if (!this.callHistory.has(callerUri)) {
      this.callHistory.set(callerUri, []);
    }
    this.callHistory.get(callerUri)!.push(context);
    
    // Keep only last 10 interactions
    const history = this.callHistory.get(callerUri)!;
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  public releaseExecutive(executiveId: string): void {
    this.updateExecutiveLoad(executiveId, -1);
  }

  public setExecutiveAvailability(executiveId: string, availability: ExecutiveProfile['availability']): void {
    const executive = this.executives.get(executiveId);
    if (executive) {
      executive.availability = availability;
      this.emit('availabilityChanged', { executiveId, availability });
    }
  }

  public getExecutiveProfile(executiveId: string): ExecutiveProfile | undefined {
    return this.executives.get(executiveId);
  }

  public getAllExecutives(): ExecutiveProfile[] {
    return Array.from(this.executives.values());
  }

  public getAvailableExecutives(): ExecutiveProfile[] {
    return Array.from(this.executives.values()).filter(exec => this.isExecutiveAvailable(exec));
  }

  public addRoutingRule(rule: CallRoutingRule): void {
    this.routingRules.push(rule);
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  public removeRoutingRule(ruleId: string): void {
    this.routingRules = this.routingRules.filter(rule => rule.id !== ruleId);
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
}
