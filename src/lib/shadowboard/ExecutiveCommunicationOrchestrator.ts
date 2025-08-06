/**
 * EXECUTIVE COMMUNICATION ORCHESTRATOR
 * Coordinates multi-executive communications for complex business scenarios
 */

import { EventEmitter } from 'events';
import { ShadowBoardManager, ExecutiveEntity } from './ShadowBoardManager';
import { ShadowBoardVoiceIntegration } from './ShadowBoardVoiceIntegration';

export interface CommunicationScenario {
  id: string;
  type: 'negotiation' | 'presentation' | 'crisis_management' | 'strategic_planning' | 'client_meeting' | 'board_meeting';
  title: string;
  description: string;
  participants: {
    executives: string[]; // Executive roles
    externalParties: Array<{
      name: string;
      role: string;
      phoneNumber?: string;
      email?: string;
      importance: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  objectives: string[];
  timeline: {
    startTime: Date;
    estimatedDuration: number; // milliseconds
    phases: Array<{
      name: string;
      duration: number;
      leadExecutive: string;
      supportingExecutives: string[];
      activities: string[];
    }>;
  };
  context: {
    urgency: 'low' | 'medium' | 'high' | 'critical';
    confidentiality: 'public' | 'internal' | 'confidential' | 'top_secret';
    stakeholders: string[];
    backgroundInfo: string;
    keyPoints: string[];
    potentialRisks: string[];
    successCriteria: string[];
  };
  communicationChannels: Array<{
    type: 'call' | 'email' | 'meeting' | 'presentation';
    participants: string[];
    scheduledTime?: Date;
    duration?: number;
    agenda?: string[];
  }>;
}

export interface OrchestrationSession {
  sessionId: string;
  scenario: CommunicationScenario;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  startTime: Date;
  currentPhase: number;
  executiveStates: Map<string, {
    role: string;
    status: 'ready' | 'active' | 'busy' | 'unavailable';
    currentActivity: string;
    neuralLoad: number;
    lastAction: Date;
    communicationHistory: Array<{
      timestamp: Date;
      type: 'spoke' | 'listened' | 'decided' | 'coordinated';
      content: string;
      confidence: number;
    }>;
  }>;
  realTimeMetrics: {
    coordinationEfficiency: number;
    communicationFlow: number;
    objectiveProgress: number;
    riskMitigation: number;
    stakeholderSatisfaction: number;
  };
  outcomes: Array<{
    timestamp: Date;
    type: 'decision' | 'agreement' | 'action_item' | 'risk_identified' | 'opportunity';
    description: string;
    responsibleExecutive: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    deadline?: Date;
  }>;
}

export class ExecutiveCommunicationOrchestrator extends EventEmitter {
  private shadowBoard: ShadowBoardManager;
  private voiceIntegration?: ShadowBoardVoiceIntegration;
  
  private activeSessions: Map<string, OrchestrationSession> = new Map();
  private scenarioTemplates: Map<string, Partial<CommunicationScenario>> = new Map();
  private orchestrationRules: Map<string, any> = new Map();
  
  private isInitialized: boolean = false;

  constructor(shadowBoard: ShadowBoardManager, voiceIntegration?: ShadowBoardVoiceIntegration) {
    super();
    this.shadowBoard = shadowBoard;
    this.voiceIntegration = voiceIntegration;
    
    this.initializeScenarioTemplates();
    this.initializeOrchestrationRules();
  }

  /**
   * Initialize the communication orchestrator
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🎭 Initializing Executive Communication Orchestrator...');

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Executive Communication Orchestrator initialized');

      this.emit('initialized', {
        scenarioTemplates: this.scenarioTemplates.size,
        orchestrationRules: this.orchestrationRules.size
      });

    } catch (error) {
      console.error('❌ Failed to initialize Executive Communication Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Start a new communication scenario
   */
  public async startCommunicationScenario(scenario: CommunicationScenario): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Communication Orchestrator not initialized');
    }

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate scenario
      await this.validateScenario(scenario);

      // Create orchestration session
      const session: OrchestrationSession = {
        sessionId,
        scenario,
        status: 'planning',
        startTime: new Date(),
        currentPhase: 0,
        executiveStates: new Map(),
        realTimeMetrics: {
          coordinationEfficiency: 0.8,
          communicationFlow: 0.7,
          objectiveProgress: 0.0,
          riskMitigation: 0.6,
          stakeholderSatisfaction: 0.5
        },
        outcomes: []
      };

      // Initialize executive states
      for (const executiveRole of scenario.participants.executives) {
        const executive = this.shadowBoard.getExecutive(executiveRole);
        if (executive) {
          session.executiveStates.set(executiveRole, {
            role: executiveRole,
            status: 'ready',
            currentActivity: 'preparing',
            neuralLoad: executive.neuralLoad,
            lastAction: new Date(),
            communicationHistory: []
          });
        }
      }

      this.activeSessions.set(sessionId, session);

      console.log(`🎭 Started communication scenario: ${scenario.title} (${sessionId})`);

      // Begin orchestration
      await this.beginOrchestration(sessionId);

      this.emit('scenarioStarted', { sessionId, scenario });

      return sessionId;

    } catch (error) {
      console.error('Failed to start communication scenario:', error);
      throw error;
    }
  }

  /**
   * Execute executive coordination for a specific phase
   */
  public async executePhaseCoordination(
    sessionId: string,
    phaseIndex: number,
    instructions?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const phase = session.scenario.timeline.phases[phaseIndex];
    if (!phase) {
      throw new Error(`Phase ${phaseIndex} not found in scenario`);
    }

    try {
      console.log(`🎭 Executing phase: ${phase.name} (Lead: ${phase.leadExecutive})`);

      // Update session status
      session.status = 'active';
      session.currentPhase = phaseIndex;

      // Coordinate lead executive
      const leadExecutive = this.shadowBoard.getExecutive(phase.leadExecutive);
      if (leadExecutive) {
        await this.activateExecutiveForPhase(session, phase.leadExecutive, 'lead', instructions);
      }

      // Coordinate supporting executives
      for (const supportingRole of phase.supportingExecutives) {
        const supportingExecutive = this.shadowBoard.getExecutive(supportingRole);
        if (supportingExecutive) {
          await this.activateExecutiveForPhase(session, supportingRole, 'support');
        }
      }

      // Execute phase activities
      await this.executePhaseActivities(session, phase);

      // Update metrics
      this.updateSessionMetrics(session);

      this.emit('phaseExecuted', { sessionId, phaseIndex, phase });

    } catch (error) {
      console.error(`Failed to execute phase coordination:`, error);
      throw error;
    }
  }

  /**
   * Handle executive communication during scenario
   */
  public async handleExecutiveCommunication(
    sessionId: string,
    executiveRole: string,
    communicationType: 'speak' | 'listen' | 'decide' | 'coordinate',
    content: string,
    targetAudience?: string[]
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const executiveState = session.executiveStates.get(executiveRole);
    if (!executiveState) {
      throw new Error(`Executive ${executiveRole} not part of this session`);
    }

    try {
      // Process communication based on type
      let confidence = 0.85;
      
      switch (communicationType) {
        case 'speak':
          confidence = await this.processExecutiveSpeech(session, executiveRole, content, targetAudience);
          break;
        
        case 'listen':
          confidence = await this.processExecutiveListening(session, executiveRole, content);
          break;
        
        case 'decide':
          confidence = await this.processExecutiveDecision(session, executiveRole, content);
          break;
        
        case 'coordinate':
          confidence = await this.processExecutiveCoordination(session, executiveRole, content, targetAudience);
          break;
      }

      // Update executive communication history
      executiveState.communicationHistory.push({
        timestamp: new Date(),
        type: communicationType,
        content,
        confidence
      });

      executiveState.lastAction = new Date();

      // Update session metrics
      this.updateSessionMetrics(session);

      this.emit('executiveCommunication', {
        sessionId,
        executiveRole,
        communicationType,
        content,
        confidence
      });

    } catch (error) {
      console.error(`Failed to handle executive communication:`, error);
      throw error;
    }
  }

  /**
   * Get active orchestration sessions
   */
  public getActiveSessions(): OrchestrationSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get specific session details
   */
  public getSession(sessionId: string): OrchestrationSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Complete a communication scenario
   */
  public async completeScenario(sessionId: string, outcomes?: string[]): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      session.status = 'completed';

      // Record final outcomes
      if (outcomes) {
        for (const outcome of outcomes) {
          session.outcomes.push({
            timestamp: new Date(),
            type: 'decision',
            description: outcome,
            responsibleExecutive: 'ALL',
            priority: 'medium'
          });
        }
      }

      // Update final metrics
      session.realTimeMetrics.objectiveProgress = 1.0;
      this.updateSessionMetrics(session);

      console.log(`🎭 Completed communication scenario: ${session.scenario.title}`);

      this.emit('scenarioCompleted', { sessionId, session });

    } catch (error) {
      console.error('Failed to complete scenario:', error);
      throw error;
    }
  }

  /**
   * Initialize scenario templates
   */
  private initializeScenarioTemplates(): void {
    // Negotiation template
    this.scenarioTemplates.set('negotiation', {
      type: 'negotiation',
      timeline: {
        phases: [
          {
            name: 'Opening & Rapport Building',
            duration: 300000, // 5 minutes
            leadExecutive: 'CMO',
            supportingExecutives: ['CFO'],
            activities: ['Establish rapport', 'Set agenda', 'Understand counterpart needs']
          },
          {
            name: 'Value Proposition',
            duration: 600000, // 10 minutes
            leadExecutive: 'CMO',
            supportingExecutives: ['CTO', 'CFO'],
            activities: ['Present solution', 'Demonstrate value', 'Address technical questions']
          },
          {
            name: 'Financial Discussion',
            duration: 900000, // 15 minutes
            leadExecutive: 'CFO',
            supportingExecutives: ['CMO'],
            activities: ['Discuss pricing', 'Negotiate terms', 'Address financial concerns']
          },
          {
            name: 'Legal & Risk Review',
            duration: 600000, // 10 minutes
            leadExecutive: 'CLO',
            supportingExecutives: ['CFO'],
            activities: ['Review contract terms', 'Address legal concerns', 'Mitigate risks']
          },
          {
            name: 'Closing & Next Steps',
            duration: 300000, // 5 minutes
            leadExecutive: 'CMO',
            supportingExecutives: ['CFO', 'CLO'],
            activities: ['Summarize agreements', 'Define next steps', 'Schedule follow-up']
          }
        ]
      }
    });

    // Crisis Management template
    this.scenarioTemplates.set('crisis_management', {
      type: 'crisis_management',
      timeline: {
        phases: [
          {
            name: 'Situation Assessment',
            duration: 300000, // 5 minutes
            leadExecutive: 'CLO',
            supportingExecutives: ['CFO', 'CTO'],
            activities: ['Assess situation', 'Identify risks', 'Gather facts']
          },
          {
            name: 'Immediate Response',
            duration: 600000, // 10 minutes
            leadExecutive: 'CMO',
            supportingExecutives: ['CLO', 'CTO'],
            activities: ['Craft public response', 'Coordinate communications', 'Implement containment']
          },
          {
            name: 'Stakeholder Communication',
            duration: 900000, // 15 minutes
            leadExecutive: 'CMO',
            supportingExecutives: ['CFO', 'CLO'],
            activities: ['Notify stakeholders', 'Manage media', 'Update customers']
          },
          {
            name: 'Recovery Planning',
            duration: 1200000, // 20 minutes
            leadExecutive: 'CFO',
            supportingExecutives: ['CTO', 'CLO'],
            activities: ['Develop recovery plan', 'Allocate resources', 'Set timeline']
          }
        ]
      }
    });
  }

  /**
   * Initialize orchestration rules
   */
  private initializeOrchestrationRules(): void {
    // Communication flow rules
    this.orchestrationRules.set('communication_flow', {
      maxConcurrentSpeakers: 2,
      speakingTimeLimit: 120000, // 2 minutes
      transitionDelay: 5000, // 5 seconds between speakers
      interruptionRules: {
        'critical': ['CFO', 'CLO'], // Can interrupt for critical issues
        'high': ['CMO'], // Can interrupt for high priority
        'medium': [], // No interruption allowed
        'low': []
      }
    });

    // Executive coordination rules
    this.orchestrationRules.set('executive_coordination', {
      leadExecutiveAuthority: {
        'CFO': ['financial_decisions', 'budget_approval', 'risk_assessment'],
        'CMO': ['marketing_strategy', 'customer_relations', 'brand_decisions'],
        'CTO': ['technical_decisions', 'architecture_choices', 'security_protocols'],
        'CLO': ['legal_compliance', 'contract_terms', 'regulatory_issues']
      },
      consensusRequired: ['strategic_direction', 'major_investments', 'policy_changes'],
      escalationTriggers: ['legal_risk', 'financial_exposure', 'reputation_threat']
    });
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for Shadow Board events
    this.shadowBoard.on('executiveDecision', (event) => {
      this.handleExecutiveDecisionEvent(event);
    });

    // Listen for voice integration events if available
    if (this.voiceIntegration) {
      this.voiceIntegration.on('callConnected', (event) => {
        this.handleCallConnectedEvent(event);
      });

      this.voiceIntegration.on('executiveSpoke', (event) => {
        this.handleExecutiveSpokeEvent(event);
      });
    }
  }

  /**
   * Validate communication scenario
   */
  private async validateScenario(scenario: CommunicationScenario): Promise<void> {
    // Validate executives exist
    for (const executiveRole of scenario.participants.executives) {
      const executive = this.shadowBoard.getExecutive(executiveRole);
      if (!executive) {
        throw new Error(`Executive ${executiveRole} not found in Shadow Board`);
      }
    }

    // Validate timeline
    if (scenario.timeline.phases.length === 0) {
      throw new Error('Scenario must have at least one phase');
    }

    // Validate objectives
    if (scenario.objectives.length === 0) {
      throw new Error('Scenario must have at least one objective');
    }
  }

  /**
   * Begin orchestration for a session
   */
  private async beginOrchestration(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Start with first phase
    if (session.scenario.timeline.phases.length > 0) {
      await this.executePhaseCoordination(sessionId, 0);
    }
  }

  /**
   * Activate executive for specific phase
   */
  private async activateExecutiveForPhase(
    session: OrchestrationSession,
    executiveRole: string,
    role: 'lead' | 'support',
    instructions?: string
  ): Promise<void> {
    const executive = this.shadowBoard.getExecutive(executiveRole);
    const executiveState = session.executiveStates.get(executiveRole);
    
    if (!executive || !executiveState) return;

    // Update executive activity
    executive.currentActivity = {
      type: 'communicating',
      focus: `${session.scenario.type}_${role}`,
      intensity: role === 'lead' ? 0.9 : 0.7,
      startTime: new Date(),
      estimatedDuration: session.scenario.timeline.phases[session.currentPhase]?.duration || 600000,
      relatedExecutives: session.scenario.participants.executives.filter(r => r !== executiveRole),
      impactRadius: 2000,
      urgencyLevel: session.scenario.context.urgency
    };

    // Update executive state
    executiveState.status = 'active';
    executiveState.currentActivity = `${role}_${session.scenario.type}`;
    
    // Increase neural load for active participation
    executive.neuralLoad = Math.min(1.0, executive.neuralLoad + (role === 'lead' ? 0.3 : 0.2));

    console.log(`🎭 Activated ${executiveRole} as ${role} for ${session.scenario.type}`);
  }

  /**
   * Execute activities for a phase
   */
  private async executePhaseActivities(
    session: OrchestrationSession,
    phase: any
  ): Promise<void> {
    // Simulate phase execution
    for (const activity of phase.activities) {
      console.log(`🎭 Executing activity: ${activity}`);
      
      // Add outcome for each activity
      session.outcomes.push({
        timestamp: new Date(),
        type: 'action_item',
        description: `Completed: ${activity}`,
        responsibleExecutive: phase.leadExecutive,
        priority: 'medium'
      });

      // Small delay to simulate activity execution
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Update session metrics
   */
  private updateSessionMetrics(session: OrchestrationSession): void {
    // Calculate coordination efficiency based on executive participation
    const activeExecutives = Array.from(session.executiveStates.values()).filter(
      state => state.status === 'active'
    ).length;
    
    session.realTimeMetrics.coordinationEfficiency = Math.min(1.0, activeExecutives / session.scenario.participants.executives.length);

    // Calculate communication flow based on recent activity
    const recentCommunications = Array.from(session.executiveStates.values()).reduce(
      (total, state) => total + state.communicationHistory.length, 0
    );
    
    session.realTimeMetrics.communicationFlow = Math.min(1.0, recentCommunications / 10);

    // Calculate objective progress based on completed outcomes
    const completedOutcomes = session.outcomes.filter(o => o.type === 'decision' || o.type === 'agreement').length;
    session.realTimeMetrics.objectiveProgress = Math.min(1.0, completedOutcomes / session.scenario.objectives.length);
  }

  /**
   * Process executive speech
   */
  private async processExecutiveSpeech(
    session: OrchestrationSession,
    executiveRole: string,
    content: string,
    targetAudience?: string[]
  ): Promise<number> {
    // If voice integration is available, use it for actual speech
    if (this.voiceIntegration) {
      // This would integrate with actual voice calls
      console.log(`🗣️ ${executiveRole}: "${content.substring(0, 50)}..."`);
    }

    // Calculate confidence based on content relevance and executive expertise
    const executive = this.shadowBoard.getExecutive(executiveRole);
    const baseConfidence = executive ? executive.singularityCoefficient : 0.8;
    
    return Math.min(1.0, baseConfidence + 0.1);
  }

  /**
   * Process executive listening
   */
  private async processExecutiveListening(
    session: OrchestrationSession,
    executiveRole: string,
    content: string
  ): Promise<number> {
    console.log(`👂 ${executiveRole} listening to: "${content.substring(0, 30)}..."`);
    return 0.9; // High confidence for listening
  }

  /**
   * Process executive decision
   */
  private async processExecutiveDecision(
    session: OrchestrationSession,
    executiveRole: string,
    content: string
  ): Promise<number> {
    // Record decision as outcome
    session.outcomes.push({
      timestamp: new Date(),
      type: 'decision',
      description: content,
      responsibleExecutive: executiveRole,
      priority: 'high'
    });

    console.log(`⚖️ ${executiveRole} decided: "${content.substring(0, 50)}..."`);
    return 0.85;
  }

  /**
   * Process executive coordination
   */
  private async processExecutiveCoordination(
    session: OrchestrationSession,
    executiveRole: string,
    content: string,
    targetExecutives?: string[]
  ): Promise<number> {
    console.log(`🤝 ${executiveRole} coordinating with ${targetExecutives?.join(', ') || 'team'}: "${content.substring(0, 50)}..."`);
    return 0.88;
  }

  /**
   * Handle executive decision events
   */
  private handleExecutiveDecisionEvent(event: any): void {
    // Find sessions involving this executive
    for (const [sessionId, session] of this.activeSessions) {
      if (session.executiveStates.has(event.executiveRole)) {
        // Update session with decision
        session.outcomes.push({
          timestamp: new Date(),
          type: 'decision',
          description: event.decision,
          responsibleExecutive: event.executiveRole,
          priority: event.priority || 'medium'
        });
      }
    }
  }

  /**
   * Handle call connected events
   */
  private handleCallConnectedEvent(event: any): void {
    console.log(`📞 Call connected for orchestration: ${event.callSession?.executiveRole}`);
  }

  /**
   * Handle executive spoke events
   */
  private handleExecutiveSpokeEvent(event: any): void {
    console.log(`🗣️ Executive spoke in orchestration: ${event.callSession?.executiveRole}`);
  }
}
