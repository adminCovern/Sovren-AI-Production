/**
 * SOVREN AI - Onboarding Orchestrator
 * 
 * Master orchestrator that coordinates all onboarding systems:
 * registration, Shadow Board initialization, tutorials, integrations,
 * and completion validation. Provides unified onboarding experience.
 * 
 * CLASSIFICATION: MASTER ONBOARDING ORCHESTRATION
 */

import { EventEmitter } from 'events';
import { UserRegistrationSystem, UserRegistration } from './UserRegistrationSystem';
import { ShadowBoardInitializer, ShadowBoardConfiguration } from './ShadowBoardInitializer';
import { InteractiveTutorialSystem, TutorialSession } from './InteractiveTutorialSystem';
import { IntegrationSetupSystem, IntegrationRecommendation } from './IntegrationSetupSystem';
import { ComprehensiveUserOnboarding, OnboardingFlow } from './ComprehensiveUserOnboarding';
import { SubscriptionBillingSystem } from '../billing/SubscriptionBillingSystem';
import { OnboardingPaymentFlow, PaymentFlowResult } from '../billing/OnboardingPaymentFlow';

export interface CompleteOnboardingSession {
  sessionId: string;
  userId: string;
  tier: 'SMB' | 'ENTERPRISE';
  status: 'not_started' | 'registration' | 'shadow_board_setup' | 'tutorial' | 'integrations' | 'payment_required' | 'completed' | 'failed';
  currentPhase: string;
  progress: number; // 0-100
  startTime: Date;
  completionTime?: Date;
  phases: OnboardingPhase[];
  registration?: UserRegistration;
  shadowBoard?: ShadowBoardConfiguration;
  tutorial?: TutorialSession;
  integrations: IntegrationRecommendation[];
  paymentResult?: PaymentFlowResult;
  completionCertificate?: OnboardingCompletionCertificate;
  analytics: OnboardingAnalytics;
}

export interface OnboardingPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  completionTime?: Date;
  duration?: number; // milliseconds
  estimatedTime: number; // minutes
  dependencies: string[];
  criticalPath: boolean;
  completionCriteria: string[];
  errorMessage?: string;
}

export interface OnboardingCompletionCertificate {
  certificateId: string;
  userId: string;
  tier: 'SMB' | 'ENTERPRISE';
  completionTime: Date;
  totalDuration: number; // minutes
  phasesCompleted: number;
  totalPhases: number;
  shadowBoardExecutives: number;
  integrationsSetup: number;
  tutorialCompleted: boolean;
  overallScore: number; // 0-100
  readyForProduction: boolean;
  nextSteps: string[];
  signedBy: string;
}

export interface OnboardingAnalytics {
  sessionDuration: number; // milliseconds
  phaseCompletionTimes: Record<string, number>;
  userEngagement: number; // 0-1 scale
  dropOffPoints: string[];
  completionRate: number; // 0-1 scale
  userSatisfaction?: number; // 1-5 scale
  timeToValue: number; // Time to first successful interaction
}

export class OnboardingOrchestrator extends EventEmitter {
  private registrationSystem: UserRegistrationSystem;
  private shadowBoardInitializer: ShadowBoardInitializer;
  private tutorialSystem: InteractiveTutorialSystem;
  private integrationSystem: IntegrationSetupSystem;
  private comprehensiveOnboarding: ComprehensiveUserOnboarding;
  private billingSystem: SubscriptionBillingSystem;
  private paymentFlow: OnboardingPaymentFlow;

  private activeSessions: Map<string, CompleteOnboardingSession> = new Map();
  private completedSessions: Map<string, CompleteOnboardingSession> = new Map();
  private onboardingMetrics: Map<string, any> = new Map();

  constructor() {
    super();
    this.registrationSystem = new UserRegistrationSystem();
    this.shadowBoardInitializer = new ShadowBoardInitializer();
    this.tutorialSystem = new InteractiveTutorialSystem();
    this.integrationSystem = new IntegrationSetupSystem();
    this.comprehensiveOnboarding = new ComprehensiveUserOnboarding();
    this.billingSystem = new SubscriptionBillingSystem();
    this.paymentFlow = new OnboardingPaymentFlow(this.billingSystem);

    this.initializeEventHandlers();
    this.startOnboardingMonitoring();
  }

  /**
   * Initialize event handlers for all subsystems
   */
  private initializeEventHandlers(): void {
    // Registration events
    this.registrationSystem.on('userRegistered', this.handleUserRegistered.bind(this));
    this.registrationSystem.on('emailVerified', this.handleEmailVerified.bind(this));
    this.registrationSystem.on('userActivated', this.handleUserActivated.bind(this));

    // Shadow Board events
    this.shadowBoardInitializer.on('shadowBoardInitialized', this.handleShadowBoardInitialized.bind(this));
    this.shadowBoardInitializer.on('shadowBoardActivated', this.handleShadowBoardActivated.bind(this));

    // Tutorial events
    this.tutorialSystem.on('tutorialCompleted', this.handleTutorialCompleted.bind(this));
    this.tutorialSystem.on('tutorialAbandoned', this.handleTutorialAbandoned.bind(this));

    // Integration events
    this.integrationSystem.on('integrationSetupCompleted', this.handleIntegrationCompleted.bind(this));

    // Comprehensive onboarding events
    this.comprehensiveOnboarding.on('onboardingCompleted', this.handleComprehensiveOnboardingCompleted.bind(this));

    console.log('🔗 Onboarding orchestrator event handlers initialized');
  }

  /**
   * Start onboarding monitoring
   */
  private startOnboardingMonitoring(): void {
    // Monitor active sessions every 30 seconds
    setInterval(() => {
      this.monitorActiveSessions();
    }, 30000);

    // Update analytics every 5 minutes
    setInterval(() => {
      this.updateOnboardingAnalytics();
    }, 300000);

    console.log('📊 Onboarding monitoring started');
  }

  /**
   * Start complete onboarding process
   */
  public async startCompleteOnboarding(registrationData: {
    email: string;
    name: string;
    company: string;
    industry: string;
    companySize: string;
    geography: string;
    primaryUseCase: string;
    metadata: any;
  }): Promise<CompleteOnboardingSession> {
    
    console.log('🚀 ========================================');
    console.log('🚀 STARTING COMPLETE USER ONBOARDING');
    console.log('🚀 ========================================');
    console.log(`👤 User: ${registrationData.name} (${registrationData.email})`);
    console.log(`🏢 Company: ${registrationData.company}`);
    console.log(`🏭 Industry: ${registrationData.industry}`);

    const sessionId = `onboarding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    try {
      // Phase 1: User Registration
      console.log('📝 Phase 1: User Registration');
      const registration = await this.registrationSystem.registerUser(registrationData);

      // Detect tier and create session
      const session: CompleteOnboardingSession = {
        sessionId,
        userId: registration.userId,
        tier: registration.tier,
        status: 'registration',
        currentPhase: 'User Registration',
        progress: 0,
        startTime,
        phases: this.createOnboardingPhases(registration.tier),
        registration,
        integrations: [],
        analytics: {
          sessionDuration: 0,
          phaseCompletionTimes: {},
          userEngagement: 0,
          dropOffPoints: [],
          completionRate: 0,
          timeToValue: 0
        }
      };

      this.activeSessions.set(sessionId, session);

      console.log(`✅ Onboarding session created: ${sessionId} (${registration.tier} tier)`);

      // Update phase status
      await this.updatePhaseStatus(session, 'registration', 'completed');

      this.emit('onboardingSessionStarted', session);

      return session;

    } catch (error) {
      console.error('❌ Failed to start onboarding:', error);
      throw error;
    }
  }

  /**
   * Continue onboarding to next phase
   */
  public async continueOnboarding(sessionId: string): Promise<CompleteOnboardingSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    console.log(`⏭️ Continuing onboarding: ${sessionId} (Current: ${session.currentPhase})`);

    try {
      switch (session.status) {
        case 'registration':
          await this.proceedToShadowBoardSetup(session);
          break;
        case 'shadow_board_setup':
          await this.proceedToTutorial(session);
          break;
        case 'tutorial':
          await this.proceedToIntegrations(session);
          break;
        case 'integrations':
          await this.completeOnboarding(session);
          break;
        default:
          throw new Error(`Cannot continue from status: ${session.status}`);
      }

      return session;

    } catch (error) {
      console.error(`❌ Failed to continue onboarding ${sessionId}:`, error);
      session.status = 'failed';
      
      this.emit('onboardingFailed', { session, error });
      
      throw error;
    }
  }

  /**
   * Proceed to Shadow Board setup
   */
  private async proceedToShadowBoardSetup(session: CompleteOnboardingSession): Promise<void> {
    console.log('👥 Phase 2: Shadow Board Setup');

    if (!session.registration) {
      throw new Error('Registration not completed');
    }

    session.status = 'shadow_board_setup';
    session.currentPhase = 'Shadow Board Setup';
    await this.updatePhaseStatus(session, 'shadow_board_setup', 'in_progress');

    // Check if payment is required before Shadow Board setup
    const paymentResult = await this.paymentFlow.handleApprovedUserLogin({
      id: session.userId,
      email: session.registration.email,
      name: session.registration.name,
      type: session.registration.tier || 'standard',
      company: session.registration.company,
      industry: session.registration.industry,
      tier: session.tier
    });

    if (!paymentResult.success) {
      throw new Error(`Payment setup failed: ${paymentResult.error}`);
    }

    // Store payment result in session
    session.paymentResult = paymentResult;

    // If payment is required, handle it before proceeding
    if (paymentResult.nextStep === 'subscription_selection') {
      session.status = 'payment_required';
      session.currentPhase = 'Payment Setup';
      console.log('💳 Payment required before Shadow Board setup');
      return;
    }

    // Initialize Shadow Board
    const shadowBoard = await this.shadowBoardInitializer.initializeShadowBoard({
      userId: session.userId,
      tier: session.tier,
      industry: session.registration.industry,
      companySize: session.registration.companySize,
      geography: session.registration.geography,
      customization: session.registration.preferences.executiveCustomization
    });

    session.shadowBoard = shadowBoard;
    await this.updatePhaseStatus(session, 'shadow_board_setup', 'completed');

    console.log(`✅ Shadow Board initialized: ${shadowBoard.executives.length} executives`);
  }

  /**
   * Proceed to tutorial
   */
  private async proceedToTutorial(session: CompleteOnboardingSession): Promise<void> {
    console.log('📚 Phase 3: Interactive Tutorial');

    session.status = 'tutorial';
    session.currentPhase = 'Interactive Tutorial';
    await this.updatePhaseStatus(session, 'tutorial', 'in_progress');

    // Start tutorial session
    const tutorial = await this.tutorialSystem.startTutorialSession(session.userId, session.tier);
    session.tutorial = tutorial;

    console.log(`✅ Tutorial session started: ${tutorial.sessionId}`);
  }

  /**
   * Proceed to integrations
   */
  private async proceedToIntegrations(session: CompleteOnboardingSession): Promise<void> {
    console.log('🔗 Phase 4: Integration Setup');

    if (!session.registration) {
      throw new Error('Registration not completed');
    }

    session.status = 'integrations';
    session.currentPhase = 'Integration Setup';
    await this.updatePhaseStatus(session, 'integrations', 'in_progress');

    // Get integration recommendations
    const recommendations = this.integrationSystem.getIntegrationRecommendations(
      session.userId,
      session.registration.industry,
      session.tier
    );

    session.integrations = recommendations;

    console.log(`✅ Integration recommendations generated: ${recommendations.length} services`);
  }

  /**
   * Complete onboarding
   */
  private async completeOnboarding(session: CompleteOnboardingSession): Promise<void> {
    console.log('🎉 Phase 5: Onboarding Completion');

    session.status = 'completed';
    session.currentPhase = 'Completed';
    session.completionTime = new Date();
    session.progress = 100;

    // Generate completion certificate
    const certificate = await this.generateCompletionCertificate(session);
    session.completionCertificate = certificate;

    // Update analytics
    this.updateSessionAnalytics(session);

    // Move to completed sessions
    this.completedSessions.set(session.sessionId, session);
    this.activeSessions.delete(session.sessionId);

    const totalTime = session.completionTime.getTime() - session.startTime.getTime();

    console.log('🎉 ========================================');
    console.log('🎉 ONBOARDING COMPLETED SUCCESSFULLY!');
    console.log('🎉 ========================================');
    console.log(`🎯 Session ID: ${session.sessionId}`);
    console.log(`👤 User: ${session.registration?.name}`);
    console.log(`🏆 Tier: ${session.tier}`);
    console.log(`⏱️ Total Time: ${Math.round(totalTime / 60000)} minutes`);
    console.log(`👥 Executives: ${session.shadowBoard?.executives.length || 0}`);
    console.log(`🔗 Integrations: ${session.integrations.length} recommended`);
    console.log(`📚 Tutorial: ${session.tutorial?.status === 'completed' ? 'Completed' : 'Available'}`);
    console.log('🎉 ========================================');

    this.emit('onboardingCompleted', session);
  }

  /**
   * Generate completion certificate
   */
  private async generateCompletionCertificate(session: CompleteOnboardingSession): Promise<OnboardingCompletionCertificate> {
    const completedPhases = session.phases.filter(p => p.status === 'completed').length;
    const totalDuration = session.completionTime!.getTime() - session.startTime.getTime();

    return {
      certificateId: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: session.userId,
      tier: session.tier,
      completionTime: session.completionTime!,
      totalDuration: Math.round(totalDuration / 60000), // Convert to minutes
      phasesCompleted: completedPhases,
      totalPhases: session.phases.length,
      shadowBoardExecutives: session.shadowBoard?.executives.length || 0,
      integrationsSetup: session.integrations.filter(i => i.priority === 'high').length,
      tutorialCompleted: session.tutorial?.status === 'completed' || false,
      overallScore: this.calculateOverallScore(session),
      readyForProduction: true,
      nextSteps: this.generateNextSteps(session),
      signedBy: 'SOVREN AI Onboarding System'
    };
  }

  /**
   * Helper methods
   */
  private createOnboardingPhases(tier: 'SMB' | 'ENTERPRISE'): OnboardingPhase[] {
    const basePhases: OnboardingPhase[] = [
      {
        id: 'registration',
        name: 'User Registration',
        description: 'Complete user registration and email verification',
        status: 'pending',
        estimatedTime: 5,
        dependencies: [],
        criticalPath: true,
        completionCriteria: ['user_registered', 'email_verified']
      },
      {
        id: 'shadow_board_setup',
        name: 'Shadow Board Setup',
        description: 'Initialize personalized Shadow Board executives',
        status: 'pending',
        estimatedTime: 8,
        dependencies: ['registration'],
        criticalPath: true,
        completionCriteria: ['shadow_board_initialized', 'executives_created']
      },
      {
        id: 'tutorial',
        name: 'Interactive Tutorial',
        description: 'Complete interactive tutorial and meet executives',
        status: 'pending',
        estimatedTime: 15,
        dependencies: ['shadow_board_setup'],
        criticalPath: false,
        completionCriteria: ['tutorial_started']
      },
      {
        id: 'integrations',
        name: 'Integration Setup',
        description: 'Set up integrations with business tools',
        status: 'pending',
        estimatedTime: 10,
        dependencies: ['tutorial'],
        criticalPath: false,
        completionCriteria: ['integrations_recommended']
      }
    ];

    if (tier === 'ENTERPRISE') {
      basePhases.push({
        id: 'team_setup',
        name: 'Team Access Setup',
        description: 'Configure team access and permissions',
        status: 'pending',
        estimatedTime: 12,
        dependencies: ['integrations'],
        criticalPath: false,
        completionCriteria: ['team_access_configured']
      });
    }

    return basePhases;
  }

  private async updatePhaseStatus(
    session: CompleteOnboardingSession,
    phaseId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  ): Promise<void> {
    
    const phase = session.phases.find(p => p.id === phaseId);
    if (!phase) return;

    const previousStatus = phase.status;
    phase.status = status;

    if (status === 'in_progress' && previousStatus === 'pending') {
      phase.startTime = new Date();
    } else if (status === 'completed' && phase.startTime) {
      phase.completionTime = new Date();
      phase.duration = phase.completionTime.getTime() - phase.startTime.getTime();
      session.analytics.phaseCompletionTimes[phaseId] = phase.duration;
    }

    // Update overall progress
    const completedPhases = session.phases.filter(p => p.status === 'completed').length;
    session.progress = (completedPhases / session.phases.length) * 100;

    this.emit('onboardingPhaseUpdated', { session, phase, previousStatus });
  }

  private calculateOverallScore(session: CompleteOnboardingSession): number {
    let score = 0;

    // Base score for completion
    score += 40;

    // Shadow Board setup
    if (session.shadowBoard?.status === 'active') {
      score += 25;
    }

    // Tutorial completion
    if (session.tutorial?.status === 'completed') {
      score += 20;
    }

    // Integration recommendations
    if (session.integrations.length > 0) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private generateNextSteps(session: CompleteOnboardingSession): string[] {
    const nextSteps = [];

    if (session.tutorial?.status !== 'completed') {
      nextSteps.push('Complete the interactive tutorial to learn all features');
    }

    if (session.integrations.length > 0) {
      nextSteps.push('Set up recommended integrations to streamline workflows');
    }

    nextSteps.push('Schedule your first executive consultation');
    nextSteps.push('Explore advanced features and customization options');

    if (session.tier === 'ENTERPRISE') {
      nextSteps.push('Configure team access and permissions');
      nextSteps.push('Set up advanced analytics and reporting');
    }

    return nextSteps;
  }

  private updateSessionAnalytics(session: CompleteOnboardingSession): void {
    if (session.completionTime) {
      session.analytics.sessionDuration = session.completionTime.getTime() - session.startTime.getTime();
      session.analytics.completionRate = 1.0;
      session.analytics.userEngagement = session.tutorial?.engagementScore || 0.5;
    }
  }

  private monitorActiveSessions(): void {
    const currentTime = new Date().getTime();
    
    for (const [sessionId, session] of this.activeSessions) {
      const elapsedTime = currentTime - session.startTime.getTime();
      
      // Check for stalled sessions (over 2 hours)
      if (elapsedTime > 7200000 && session.progress < 50) {
        console.warn(`⚠️ Onboarding session may be stalled: ${sessionId}`);
        session.analytics.dropOffPoints.push(session.currentPhase);
        
        this.emit('onboardingStalled', session);
      }
    }
  }

  private updateOnboardingAnalytics(): void {
    const totalSessions = this.activeSessions.size + this.completedSessions.size;
    const completedSessions = this.completedSessions.size;
    
    this.onboardingMetrics.set('total_sessions', totalSessions);
    this.onboardingMetrics.set('completion_rate', completedSessions / totalSessions);
    
    console.log(`📊 Onboarding metrics: ${completedSessions}/${totalSessions} completed`);
  }

  /**
   * Event handlers
   */
  private handleUserRegistered(event: any): void {
    console.log(`✅ User registered: ${event.registration.email}`);
  }

  private handleEmailVerified(event: any): void {
    console.log(`📧 Email verified: ${event.email}`);
  }

  private handleUserActivated(event: any): void {
    console.log(`🚀 User activated: ${event.email}`);
  }

  private handleShadowBoardInitialized(event: any): void {
    console.log(`👥 Shadow Board initialized: ${event.executives.length} executives`);
  }

  private handleShadowBoardActivated(event: any): void {
    console.log(`✅ Shadow Board activated for user: ${event.userId}`);
  }

  private handleTutorialCompleted(event: any): void {
    console.log(`📚 Tutorial completed: ${event.sessionId}`);
  }

  private handleTutorialAbandoned(event: any): void {
    console.log(`❌ Tutorial abandoned: ${event.sessionId}`);
  }

  private handleIntegrationCompleted(event: any): void {
    console.log(`🔗 Integration completed: ${event.serviceName}`);
  }

  private handleComprehensiveOnboardingCompleted(event: any): void {
    console.log(`🎉 Comprehensive onboarding completed: ${event.userId}`);
  }

  /**
   * Handle payment completion during onboarding
   */
  public async completePayment(
    sessionId: string,
    paymentMethodId: string,
    subscriptionTier: 'sovren_proof' | 'sovren_proof_plus'
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    if (session.status !== 'payment_required') {
      throw new Error('Session is not in payment required state');
    }

    try {
      const paymentResult = await this.paymentFlow.completePaymentAndOnboarding(
        session.userId,
        paymentMethodId,
        subscriptionTier
      );

      if (paymentResult.success) {
        session.paymentResult = paymentResult;
        session.status = 'shadow_board_setup';
        session.currentPhase = 'Shadow Board Setup';

        // Continue with Shadow Board setup
        await this.proceedToShadowBoardSetup(session);

        console.log(`✅ Payment completed for session: ${sessionId}`);
        return { success: true };
      } else {
        console.error(`❌ Payment failed for session: ${sessionId}`, paymentResult.error);
        return { success: false, error: paymentResult.error };
      }
    } catch (error) {
      console.error(`❌ Error completing payment for session: ${sessionId}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Get payment status for a user
   */
  public async getUserPaymentStatus(userId: string): Promise<{
    hasActiveSubscription: boolean;
    subscriptionTier?: string;
    billingStatus: string;
    trialEndsAt?: Date;
    nextBillingDate?: Date;
    paymentMethod?: string;
  }> {
    return await this.paymentFlow.getUserPaymentStatus(userId);
  }

  /**
   * Process subscription selection during onboarding
   */
  public async processSubscriptionSelection(
    sessionId: string,
    selectedTier: 'sovren_proof' | 'sovren_proof_plus'
  ): Promise<{
    success: boolean;
    clientSecret?: string;
    amount?: number;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    try {
      const result = await this.paymentFlow.processSubscriptionSelection(session.userId, selectedTier);

      if (result.success) {
        return {
          success: true,
          clientSecret: result.clientSecret,
          amount: result.amount
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error(`❌ Error processing subscription selection:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Subscription selection failed'
      };
    }
  }

  /**
   * Handle payment webhook events
   */
  public async handlePaymentWebhook(event: any): Promise<{
    success: boolean;
    action: string;
  }> {
    return await this.paymentFlow.processWebhook(event);
  }

  /**
   * Get payment gateway status
   */
  public getPaymentGatewayStatus() {
    return this.paymentFlow.getPaymentGatewayStatus();
  }

  /**
   * Public methods
   */
  public getOnboardingSession(sessionId: string): CompleteOnboardingSession | null {
    return this.activeSessions.get(sessionId) || this.completedSessions.get(sessionId) || null;
  }

  public getUserOnboardingSession(userId: string): CompleteOnboardingSession | null {
    // Check active sessions first
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId) return session;
    }

    // Check completed sessions
    for (const session of this.completedSessions.values()) {
      if (session.userId === userId) return session;
    }

    return null;
  }

  public getOnboardingMetrics(): Record<string, any> {
    return Object.fromEntries(this.onboardingMetrics);
  }

  public async skipOnboardingPhase(sessionId: string, phaseId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Onboarding session not found');
    }

    await this.updatePhaseStatus(session, phaseId, 'skipped');

    console.log(`⏭️ Onboarding phase skipped: ${phaseId}`);
    this.emit('onboardingPhaseSkipped', { session, phaseId });
  }
}
