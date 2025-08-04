/**
 * SOVREN AI - Onboarding Completion Validator
 * 
 * Final validation system that ensures all onboarding requirements
 * are met before marking users as fully onboarded and ready for
 * production use of SOVREN AI.
 * 
 * CLASSIFICATION: ONBOARDING COMPLETION CERTIFICATION
 */

import { EventEmitter } from 'events';
import { CompleteOnboardingSession, OnboardingCompletionCertificate } from './OnboardingOrchestrator';

export interface OnboardingValidationResult {
  validationId: string;
  sessionId: string;
  userId: string;
  timestamp: Date;
  overallStatus: 'passed' | 'failed' | 'conditional';
  validationCriteria: ValidationCriterion[];
  systemReadiness: SystemReadinessCheck;
  userReadiness: UserReadinessCheck;
  recommendations: string[];
  requiredActions: string[];
  productionApproval: boolean;
  validatedBy: string;
}

export interface ValidationCriterion {
  criterion: string;
  description: string;
  category: 'registration' | 'shadow_board' | 'tutorial' | 'integrations' | 'system';
  required: boolean;
  status: 'passed' | 'failed' | 'warning' | 'not_applicable';
  evidence: string[];
  score: number; // 0-100
  weight: number; // Importance weight
}

export interface SystemReadinessCheck {
  shadowBoardStatus: 'ready' | 'partial' | 'not_ready';
  executivesOnline: number;
  totalExecutives: number;
  voiceModelsLoaded: boolean;
  integrationCapability: 'ready' | 'partial' | 'not_ready';
  tutorialSystemReady: boolean;
  overallSystemHealth: number; // 0-100
}

export interface UserReadinessCheck {
  profileCompleteness: number; // 0-100
  emailVerified: boolean;
  shadowBoardMet: boolean;
  tutorialProgress: number; // 0-100
  integrationSetupStarted: boolean;
  firstInteractionCompleted: boolean;
  readinessScore: number; // 0-100
}

export interface OnboardingMetrics {
  totalOnboardingTime: number; // minutes
  phaseCompletionRates: Record<string, number>;
  userEngagementScore: number; // 0-100
  systemPerformanceScore: number; // 0-100
  completionQualityScore: number; // 0-100
  timeToFirstValue: number; // minutes
}

export class OnboardingCompletionValidator extends EventEmitter {
  private validationResults: Map<string, OnboardingValidationResult> = new Map();
  private validationCriteria: Map<string, ValidationCriterion[]> = new Map();

  constructor() {
    super();
    this.initializeValidationCriteria();
  }

  /**
   * Initialize validation criteria for different tiers
   */
  private initializeValidationCriteria(): void {
    // SMB Validation Criteria
    const smbCriteria: ValidationCriterion[] = [
      {
        criterion: 'user_registration_complete',
        description: 'User registration and email verification completed',
        category: 'registration',
        required: true,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.2
      },
      {
        criterion: 'shadow_board_initialized',
        description: 'Shadow Board executives created and initialized',
        category: 'shadow_board',
        required: true,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.3
      },
      {
        criterion: 'executives_voice_ready',
        description: 'All executive voice models loaded and ready',
        category: 'shadow_board',
        required: true,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.15
      },
      {
        criterion: 'tutorial_introduced',
        description: 'User introduced to tutorial system (completion optional)',
        category: 'tutorial',
        required: false,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.1
      },
      {
        criterion: 'integration_recommendations_provided',
        description: 'Integration recommendations generated for user',
        category: 'integrations',
        required: true,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.1
      },
      {
        criterion: 'first_executive_interaction',
        description: 'User completed first interaction with Shadow Board',
        category: 'system',
        required: false,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.15
      }
    ];

    // Enterprise Validation Criteria (includes additional requirements)
    const enterpriseCriteria: ValidationCriterion[] = [
      ...smbCriteria,
      {
        criterion: 'team_access_configured',
        description: 'Team access controls and permissions configured',
        category: 'system',
        required: true,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.1
      },
      {
        criterion: 'advanced_features_introduced',
        description: 'User introduced to enterprise-specific features',
        category: 'tutorial',
        required: false,
        status: 'passed',
        evidence: [],
        score: 0,
        weight: 0.05
      }
    ];

    this.validationCriteria.set('SMB', smbCriteria);
    this.validationCriteria.set('ENTERPRISE', enterpriseCriteria);

    console.log('✅ Onboarding validation criteria initialized');
  }

  /**
   * Validate onboarding completion
   */
  public async validateOnboardingCompletion(session: CompleteOnboardingSession): Promise<OnboardingValidationResult> {
    console.log('🔍 ========================================');
    console.log('🔍 ONBOARDING COMPLETION VALIDATION');
    console.log('🔍 ========================================');
    console.log(`👤 User: ${session.userId}`);
    console.log(`🏆 Tier: ${session.tier}`);
    console.log(`📊 Progress: ${session.progress.toFixed(1)}%`);

    const validationId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();

    try {
      // Get validation criteria for tier
      const criteria = this.validationCriteria.get(session.tier) || [];
      const validationCriteria = JSON.parse(JSON.stringify(criteria)); // Deep copy

      // Validate each criterion
      for (const criterion of validationCriteria) {
        await this.validateCriterion(criterion, session);
      }

      // Check system readiness
      const systemReadiness = await this.checkSystemReadiness(session);

      // Check user readiness
      const userReadiness = await this.checkUserReadiness(session);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(validationCriteria, systemReadiness, userReadiness);

      // Generate recommendations and required actions
      const recommendations = this.generateRecommendations(validationCriteria, systemReadiness, userReadiness);
      const requiredActions = this.generateRequiredActions(validationCriteria, overallStatus);

      // Determine production approval
      const productionApproval = this.determineProductionApproval(overallStatus, validationCriteria);

      const validationResult: OnboardingValidationResult = {
        validationId,
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp,
        overallStatus,
        validationCriteria,
        systemReadiness,
        userReadiness,
        recommendations,
        requiredActions,
        productionApproval,
        validatedBy: 'SOVREN Onboarding Completion Validator'
      };

      // Store validation result
      this.validationResults.set(validationId, validationResult);

      // Log validation results
      this.logValidationResults(validationResult);

      this.emit('onboardingValidationCompleted', validationResult);

      return validationResult;

    } catch (error) {
      console.error('❌ Onboarding validation failed:', error);
      
      // Create failed validation result
      const failedResult: OnboardingValidationResult = {
        validationId,
        sessionId: session.sessionId,
        userId: session.userId,
        timestamp,
        overallStatus: 'failed',
        validationCriteria: [],
        systemReadiness: {
          shadowBoardStatus: 'not_ready',
          executivesOnline: 0,
          totalExecutives: 0,
          voiceModelsLoaded: false,
          integrationCapability: 'not_ready',
          tutorialSystemReady: false,
          overallSystemHealth: 0
        },
        userReadiness: {
          profileCompleteness: 0,
          emailVerified: false,
          shadowBoardMet: false,
          tutorialProgress: 0,
          integrationSetupStarted: false,
          firstInteractionCompleted: false,
          readinessScore: 0
        },
        recommendations: ['Resolve validation errors and retry'],
        requiredActions: ['Fix critical onboarding issues'],
        productionApproval: false,
        validatedBy: 'SOVREN Onboarding Completion Validator'
      };

      this.validationResults.set(validationId, failedResult);
      this.emit('onboardingValidationFailed', failedResult);

      throw error;
    }
  }

  /**
   * Validate individual criterion
   */
  private async validateCriterion(criterion: ValidationCriterion, session: CompleteOnboardingSession): Promise<void> {
    switch (criterion.criterion) {
      case 'user_registration_complete':
        criterion.status = session.registration?.status === 'active' ? 'passed' : 'failed';
        criterion.score = criterion.status === 'passed' ? 100 : 0;
        criterion.evidence = [
          `Registration status: ${session.registration?.status}`,
          `Email verified: ${session.registration?.verificationTime ? 'Yes' : 'No'}`
        ];
        break;

      case 'shadow_board_initialized':
        const shadowBoardReady = session.shadowBoard?.status === 'ready' || session.shadowBoard?.status === 'active';
        criterion.status = shadowBoardReady ? 'passed' : 'failed';
        criterion.score = shadowBoardReady ? 100 : 0;
        criterion.evidence = [
          `Shadow Board status: ${session.shadowBoard?.status}`,
          `Executives created: ${session.shadowBoard?.executives.length || 0}`
        ];
        break;

      case 'executives_voice_ready':
        const voicesLoaded = session.shadowBoard?.executives.every(e => e.voiceProfile.isLoaded) || false;
        criterion.status = voicesLoaded ? 'passed' : 'failed';
        criterion.score = voicesLoaded ? 100 : 0;
        criterion.evidence = [
          `Voice models loaded: ${voicesLoaded ? 'All' : 'Partial/None'}`,
          `Total executives: ${session.shadowBoard?.executives.length || 0}`
        ];
        break;

      case 'tutorial_introduced':
        const tutorialStarted = session.tutorial?.status !== 'not_started';
        criterion.status = tutorialStarted ? 'passed' : 'warning';
        criterion.score = tutorialStarted ? 100 : 50;
        criterion.evidence = [
          `Tutorial status: ${session.tutorial?.status || 'not_started'}`,
          `Progress: ${session.tutorial?.progress.toFixed(1) || 0}%`
        ];
        break;

      case 'integration_recommendations_provided':
        const hasRecommendations = session.integrations.length > 0;
        criterion.status = hasRecommendations ? 'passed' : 'failed';
        criterion.score = hasRecommendations ? 100 : 0;
        criterion.evidence = [
          `Recommendations provided: ${session.integrations.length}`,
          `High priority: ${session.integrations.filter(i => i.priority === 'high').length}`
        ];
        break;

      case 'first_executive_interaction':
        // This would be checked against actual interaction logs
        const hasInteraction = (session.tutorial?.interactionCount || 0) > 0;
        criterion.status = hasInteraction ? 'passed' : 'warning';
        criterion.score = hasInteraction ? 100 : 0;
        criterion.evidence = [
          `Interactions completed: ${session.tutorial?.interactionCount || 0}`,
          `Engagement score: ${((session.tutorial?.engagementScore || 0) * 100).toFixed(1)}%`
        ];
        break;

      case 'team_access_configured':
        // For enterprise users
        criterion.status = session.tier === 'ENTERPRISE' ? 'warning' : 'not_applicable';
        criterion.score = criterion.status === 'not_applicable' ? 100 : 50;
        criterion.evidence = [
          `Tier: ${session.tier}`,
          `Team access: ${criterion.status === 'not_applicable' ? 'Not required' : 'Pending configuration'}`
        ];
        break;

      default:
        criterion.status = 'warning';
        criterion.score = 50;
        criterion.evidence = ['Criterion not implemented'];
    }
  }

  /**
   * Check system readiness
   */
  private async checkSystemReadiness(session: CompleteOnboardingSession): Promise<SystemReadinessCheck> {
    const shadowBoardReady = session.shadowBoard?.status === 'ready' || session.shadowBoard?.status === 'active';
    const executivesOnline = session.shadowBoard?.executives.filter(e => e.status === 'ready' || e.status === 'active').length || 0;
    const totalExecutives = session.shadowBoard?.executives.length || 0;
    const voicesLoaded = session.shadowBoard?.executives.every(e => e.voiceProfile.isLoaded) || false;

    return {
      shadowBoardStatus: shadowBoardReady ? 'ready' : 'not_ready',
      executivesOnline,
      totalExecutives,
      voiceModelsLoaded: voicesLoaded,
      integrationCapability: session.integrations.length > 0 ? 'ready' : 'partial',
      tutorialSystemReady: session.tutorial !== undefined,
      overallSystemHealth: this.calculateSystemHealth(session)
    };
  }

  /**
   * Check user readiness
   */
  private async checkUserReadiness(session: CompleteOnboardingSession): Promise<UserReadinessCheck> {
    const profileCompleteness = this.calculateProfileCompleteness(session);
    const emailVerified = session.registration?.verificationTime !== undefined;
    const shadowBoardMet = session.shadowBoard?.status === 'ready' || session.shadowBoard?.status === 'active';
    const tutorialProgress = session.tutorial?.progress || 0;
    const integrationSetupStarted = session.integrations.length > 0;
    const firstInteractionCompleted = (session.tutorial?.interactionCount || 0) > 0;

    return {
      profileCompleteness,
      emailVerified,
      shadowBoardMet,
      tutorialProgress,
      integrationSetupStarted,
      firstInteractionCompleted,
      readinessScore: this.calculateUserReadinessScore({
        profileCompleteness,
        emailVerified,
        shadowBoardMet,
        tutorialProgress,
        integrationSetupStarted,
        firstInteractionCompleted
      })
    };
  }

  /**
   * Helper methods
   */
  private determineOverallStatus(
    criteria: ValidationCriterion[],
    systemReadiness: SystemReadinessCheck,
    userReadiness: UserReadinessCheck
  ): 'passed' | 'failed' | 'conditional' {
    
    const requiredCriteria = criteria.filter(c => c.required);
    const failedRequired = requiredCriteria.filter(c => c.status === 'failed');
    const warningCriteria = criteria.filter(c => c.status === 'warning');

    if (failedRequired.length > 0) {
      return 'failed';
    }

    if (warningCriteria.length > 0 || systemReadiness.overallSystemHealth < 90 || userReadiness.readinessScore < 80) {
      return 'conditional';
    }

    return 'passed';
  }

  private generateRecommendations(
    criteria: ValidationCriterion[],
    systemReadiness: SystemReadinessCheck,
    userReadiness: UserReadinessCheck
  ): string[] {
    
    const recommendations: string[] = [];

    // Check failed criteria
    const failedCriteria = criteria.filter(c => c.status === 'failed');
    failedCriteria.forEach(c => {
      recommendations.push(`Address failed requirement: ${c.description}`);
    });

    // Check warning criteria
    const warningCriteria = criteria.filter(c => c.status === 'warning');
    warningCriteria.forEach(c => {
      recommendations.push(`Consider completing: ${c.description}`);
    });

    // System readiness recommendations
    if (systemReadiness.shadowBoardStatus !== 'ready') {
      recommendations.push('Ensure Shadow Board is fully initialized');
    }

    if (!systemReadiness.voiceModelsLoaded) {
      recommendations.push('Load all executive voice models');
    }

    // User readiness recommendations
    if (userReadiness.profileCompleteness < 100) {
      recommendations.push('Complete user profile information');
    }

    if (!userReadiness.firstInteractionCompleted) {
      recommendations.push('Complete first interaction with Shadow Board');
    }

    if (recommendations.length === 0) {
      recommendations.push('Onboarding completed successfully - ready for production use');
    }

    return recommendations;
  }

  private generateRequiredActions(criteria: ValidationCriterion[], overallStatus: string): string[] {
    const requiredActions: string[] = [];

    if (overallStatus === 'failed') {
      const failedRequired = criteria.filter(c => c.required && c.status === 'failed');
      failedRequired.forEach(c => {
        requiredActions.push(`REQUIRED: ${c.description}`);
      });
    }

    return requiredActions;
  }

  private determineProductionApproval(overallStatus: string, criteria: ValidationCriterion[]): boolean {
    if (overallStatus === 'failed') return false;
    
    const requiredCriteria = criteria.filter(c => c.required);
    const passedRequired = requiredCriteria.filter(c => c.status === 'passed');
    
    return passedRequired.length === requiredCriteria.length;
  }

  private calculateSystemHealth(session: CompleteOnboardingSession): number {
    let health = 0;

    // Shadow Board health (40%)
    if (session.shadowBoard?.status === 'ready' || session.shadowBoard?.status === 'active') {
      health += 40;
    }

    // Executive readiness (30%)
    const executivesReady = session.shadowBoard?.executives.filter(e => e.status === 'ready' || e.status === 'active').length || 0;
    const totalExecutives = session.shadowBoard?.executives.length || 1;
    health += (executivesReady / totalExecutives) * 30;

    // Voice models (20%)
    const voicesLoaded = session.shadowBoard?.executives.every(e => e.voiceProfile.isLoaded) || false;
    if (voicesLoaded) health += 20;

    // Integration capability (10%)
    if (session.integrations.length > 0) health += 10;

    return Math.round(health);
  }

  private calculateProfileCompleteness(session: CompleteOnboardingSession): number {
    let completeness = 0;

    if (session.registration?.email) completeness += 20;
    if (session.registration?.name) completeness += 20;
    if (session.registration?.company) completeness += 20;
    if (session.registration?.industry) completeness += 20;
    if (session.registration?.verificationTime) completeness += 20;

    return completeness;
  }

  private calculateUserReadinessScore(readiness: any): number {
    let score = 0;

    score += readiness.profileCompleteness * 0.2;
    score += readiness.emailVerified ? 20 : 0;
    score += readiness.shadowBoardMet ? 25 : 0;
    score += readiness.tutorialProgress * 0.15;
    score += readiness.integrationSetupStarted ? 10 : 0;
    score += readiness.firstInteractionCompleted ? 20 : 0;

    return Math.round(score);
  }

  private logValidationResults(result: OnboardingValidationResult): void {
    console.log('📋 ========================================');
    console.log('📋 ONBOARDING VALIDATION RESULTS');
    console.log('📋 ========================================');
    console.log(`🎯 Validation ID: ${result.validationId}`);
    console.log(`👤 User ID: ${result.userId}`);
    console.log(`📊 Overall Status: ${result.overallStatus.toUpperCase()}`);
    console.log(`🖥️ System Health: ${result.systemReadiness.overallSystemHealth}%`);
    console.log(`👤 User Readiness: ${result.userReadiness.readinessScore}%`);
    console.log(`✅ Production Approved: ${result.productionApproval ? 'YES' : 'NO'}`);
    
    if (result.requiredActions.length > 0) {
      console.log('🚨 Required Actions:');
      result.requiredActions.forEach(action => {
        console.log(`   - ${action}`);
      });
    }
    
    if (result.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      result.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    
    console.log(`✍️ Validated by: ${result.validatedBy}`);
    console.log('📋 ========================================');
  }

  /**
   * Mark onboarding as complete
   */
  public async markOnboardingComplete(sessionId: string): Promise<OnboardingValidationResult> {
    console.log('✅ ========================================');
    console.log('✅ MARKING ONBOARDING AS COMPLETE');
    console.log('✅ ========================================');

    // This would typically be called by the OnboardingOrchestrator
    // after successful validation
    
    const validationResult = Array.from(this.validationResults.values())
      .find(r => r.sessionId === sessionId);
    
    if (!validationResult) {
      throw new Error('No validation result found for session');
    }

    if (!validationResult.productionApproval) {
      throw new Error('Onboarding validation failed - cannot mark as complete');
    }

    console.log('✅ USER ONBOARDING SYSTEM - COMPLETED');
    console.log('🎯 All onboarding requirements met');
    console.log('🚀 User ready for production use');
    console.log('👥 Shadow Board fully operational');
    console.log('🔗 Integration recommendations provided');
    console.log('📚 Tutorial system available');
    console.log('🏆 Onboarding completion certified');

    this.emit('onboardingMarkedComplete', {
      validationResult,
      timestamp: new Date()
    });

    return validationResult;
  }

  /**
   * Public methods
   */
  public getValidationResult(validationId: string): OnboardingValidationResult | null {
    return this.validationResults.get(validationId) || null;
  }

  public getValidationResultBySession(sessionId: string): OnboardingValidationResult | null {
    for (const result of this.validationResults.values()) {
      if (result.sessionId === sessionId) return result;
    }
    return null;
  }

  public getValidationResultByUser(userId: string): OnboardingValidationResult | null {
    for (const result of this.validationResults.values()) {
      if (result.userId === userId) return result;
    }
    return null;
  }
}
