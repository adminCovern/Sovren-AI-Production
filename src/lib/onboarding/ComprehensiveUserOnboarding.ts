/**
 * SOVREN AI - Comprehensive User Onboarding System
 * 
 * Complete user onboarding flow with Shadow Board initialization,
 * tutorial system, and progressive feature activation.
 * 
 * CLASSIFICATION: CRITICAL USER EXPERIENCE
 */

import { EventEmitter } from 'events';

export interface OnboardingFlow {
  userId: string;
  flowId: string;
  tier: 'SMB' | 'ENTERPRISE';
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  startTime: Date;
  completionTime?: Date;
  completionRate: number;
  userPreferences: UserPreferences;
  shadowBoardConfig: ShadowBoardConfig;
}

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  type: 'registration' | 'profile' | 'tutorial' | 'integration' | 'verification' | 'activation';
  required: boolean;
  estimatedTime: number; // minutes
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  dependencies: string[];
  actions: OnboardingAction[];
  validationRules: ValidationRule[];
  completionCriteria: string[];
}

export interface OnboardingAction {
  id: string;
  name: string;
  type: 'form' | 'api_call' | 'tutorial' | 'integration' | 'verification';
  payload?: any;
  timeout: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface UserPreferences {
  industry: string;
  companySize: string;
  geography: string;
  primaryUseCase: string;
  integrationPreferences: string[];
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    voice: boolean;
    slack: boolean;
  };
  executiveCustomization: {
    namePreferences: boolean;
    voicePreferences: boolean;
    personalityAdjustments: boolean;
  };
}

export interface ShadowBoardConfig {
  userId: string;
  tier: 'SMB' | 'ENTERPRISE';
  industry: string;
  geography: string;
  companySize: string;
  customization?: {
    executiveNames?: Record<string, string>;
    voicePreferences?: Record<string, string>;
    personalityAdjustments?: Record<string, any>;
  };
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'url' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}

export class ComprehensiveUserOnboarding extends EventEmitter {
  private activeFlows: Map<string, OnboardingFlow> = new Map();
  private completedFlows: Map<string, OnboardingFlow> = new Map();
  private onboardingTemplates: Map<string, OnboardingStep[]> = new Map();
  private integrationServices: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeOnboardingTemplates();
    this.initializeIntegrationServices();
    this.startOnboardingMonitoring();
  }

  /**
   * Initialize onboarding templates for different user tiers
   */
  private initializeOnboardingTemplates(): void {
    // SMB Onboarding Template
    const smbSteps: OnboardingStep[] = [
      {
        id: 'registration',
        name: 'Account Registration',
        description: 'Create your SOVREN AI account',
        type: 'registration',
        required: true,
        estimatedTime: 3,
        status: 'pending',
        dependencies: [],
        actions: [
          {
            id: 'create_account',
            name: 'Create Account',
            type: 'api_call',
            timeout: 30000,
            retryCount: 0,
            maxRetries: 3,
            status: 'pending'
          }
        ],
        validationRules: [
          { field: 'email', type: 'email', message: 'Valid email required' },
          { field: 'name', type: 'required', message: 'Name is required' },
          { field: 'company', type: 'required', message: 'Company name is required' }
        ],
        completionCriteria: ['account_created', 'email_verified']
      },
      {
        id: 'profile_setup',
        name: 'Profile Setup',
        description: 'Configure your business profile and preferences',
        type: 'profile',
        required: true,
        estimatedTime: 5,
        status: 'pending',
        dependencies: ['registration'],
        actions: [
          {
            id: 'collect_preferences',
            name: 'Collect User Preferences',
            type: 'form',
            timeout: 300000, // 5 minutes
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          }
        ],
        validationRules: [
          { field: 'industry', type: 'required', message: 'Industry selection required' },
          { field: 'companySize', type: 'required', message: 'Company size required' },
          { field: 'geography', type: 'required', message: 'Geographic location required' }
        ],
        completionCriteria: ['profile_completed', 'preferences_saved']
      },
      {
        id: 'shadow_board_initialization',
        name: 'Shadow Board Setup',
        description: 'Initialize your personalized Shadow Board executives',
        type: 'activation',
        required: true,
        estimatedTime: 8,
        status: 'pending',
        dependencies: ['profile_setup'],
        actions: [
          {
            id: 'initialize_shadow_board',
            name: 'Initialize Shadow Board',
            type: 'api_call',
            timeout: 180000, // 3 minutes
            retryCount: 0,
            maxRetries: 2,
            status: 'pending'
          },
          {
            id: 'verify_executives',
            name: 'Verify Executive Creation',
            type: 'verification',
            timeout: 60000,
            retryCount: 0,
            maxRetries: 3,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['shadow_board_created', 'executives_verified', 'voice_models_loaded']
      },
      {
        id: 'interactive_tutorial',
        name: 'Interactive Tutorial',
        description: 'Learn how to use SOVREN AI and meet your executives',
        type: 'tutorial',
        required: false,
        estimatedTime: 10,
        status: 'pending',
        dependencies: ['shadow_board_initialization'],
        actions: [
          {
            id: 'start_tutorial',
            name: 'Start Interactive Tutorial',
            type: 'tutorial',
            timeout: 900000, // 15 minutes
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['tutorial_completed', 'executives_introduced']
      },
      {
        id: 'crm_integration',
        name: 'CRM Integration',
        description: 'Connect your CRM system for seamless data flow',
        type: 'integration',
        required: false,
        estimatedTime: 7,
        status: 'pending',
        dependencies: ['interactive_tutorial'],
        actions: [
          {
            id: 'select_crm',
            name: 'Select CRM System',
            type: 'form',
            timeout: 300000,
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          },
          {
            id: 'configure_crm',
            name: 'Configure CRM Integration',
            type: 'integration',
            timeout: 180000,
            retryCount: 0,
            maxRetries: 3,
            status: 'pending'
          }
        ],
        validationRules: [
          { field: 'crmType', type: 'required', message: 'CRM system selection required' }
        ],
        completionCriteria: ['crm_connected', 'data_sync_verified']
      },
      {
        id: 'email_integration',
        name: 'Email Integration',
        description: 'Connect your email for AI-powered email management',
        type: 'integration',
        required: false,
        estimatedTime: 5,
        status: 'pending',
        dependencies: ['crm_integration'],
        actions: [
          {
            id: 'connect_email',
            name: 'Connect Email Account',
            type: 'integration',
            timeout: 120000,
            retryCount: 0,
            maxRetries: 3,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['email_connected', 'permissions_granted']
      },
      {
        id: 'voice_configuration',
        name: 'Voice Configuration',
        description: 'Configure voice preferences for your executives',
        type: 'profile',
        required: false,
        estimatedTime: 4,
        status: 'pending',
        dependencies: ['email_integration'],
        actions: [
          {
            id: 'configure_voices',
            name: 'Configure Executive Voices',
            type: 'form',
            timeout: 240000,
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['voices_configured', 'voice_samples_generated']
      },
      {
        id: 'first_consultation',
        name: 'First Executive Consultation',
        description: 'Have your first conversation with your Shadow Board',
        type: 'verification',
        required: false,
        estimatedTime: 15,
        status: 'pending',
        dependencies: ['voice_configuration'],
        actions: [
          {
            id: 'initiate_consultation',
            name: 'Initiate First Consultation',
            type: 'api_call',
            timeout: 900000, // 15 minutes
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['consultation_completed', 'user_satisfaction_confirmed']
      }
    ];

    // Enterprise Onboarding Template (more comprehensive)
    const enterpriseSteps: OnboardingStep[] = [
      ...smbSteps.slice(0, 3), // Same first 3 steps
      {
        id: 'enterprise_tutorial',
        name: 'Enterprise Tutorial',
        description: 'Advanced tutorial covering enterprise features',
        type: 'tutorial',
        required: true,
        estimatedTime: 20,
        status: 'pending',
        dependencies: ['shadow_board_initialization'],
        actions: [
          {
            id: 'start_enterprise_tutorial',
            name: 'Start Enterprise Tutorial',
            type: 'tutorial',
            timeout: 1800000, // 30 minutes
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['enterprise_tutorial_completed', 'advanced_features_demonstrated']
      },
      {
        id: 'team_access_setup',
        name: 'Team Access Setup',
        description: 'Configure team access controls and permissions',
        type: 'profile',
        required: true,
        estimatedTime: 10,
        status: 'pending',
        dependencies: ['enterprise_tutorial'],
        actions: [
          {
            id: 'setup_team_access',
            name: 'Setup Team Access Controls',
            type: 'form',
            timeout: 600000, // 10 minutes
            retryCount: 0,
            maxRetries: 2,
            status: 'pending'
          }
        ],
        validationRules: [
          { field: 'teamSize', type: 'required', message: 'Team size required' }
        ],
        completionCriteria: ['team_access_configured', 'permissions_set']
      },
      {
        id: 'multiple_crm_integration',
        name: 'Multiple CRM Integration',
        description: 'Connect multiple CRM systems for comprehensive data integration',
        type: 'integration',
        required: false,
        estimatedTime: 15,
        status: 'pending',
        dependencies: ['team_access_setup'],
        actions: [
          {
            id: 'configure_multiple_crms',
            name: 'Configure Multiple CRM Systems',
            type: 'integration',
            timeout: 900000, // 15 minutes
            retryCount: 0,
            maxRetries: 2,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['multiple_crms_connected', 'data_consolidation_verified']
      },
      {
        id: 'advanced_analytics_setup',
        name: 'Advanced Analytics Setup',
        description: 'Configure advanced analytics and reporting',
        type: 'integration',
        required: false,
        estimatedTime: 12,
        status: 'pending',
        dependencies: ['multiple_crm_integration'],
        actions: [
          {
            id: 'setup_analytics',
            name: 'Setup Advanced Analytics',
            type: 'integration',
            timeout: 720000, // 12 minutes
            retryCount: 0,
            maxRetries: 2,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['analytics_configured', 'dashboards_created']
      },
      {
        id: 'executive_strategy_session',
        name: 'Executive Strategy Session',
        description: 'Schedule comprehensive strategy session with full Shadow Board',
        type: 'verification',
        required: false,
        estimatedTime: 30,
        status: 'pending',
        dependencies: ['advanced_analytics_setup'],
        actions: [
          {
            id: 'schedule_strategy_session',
            name: 'Schedule Strategy Session',
            type: 'api_call',
            timeout: 1800000, // 30 minutes
            retryCount: 0,
            maxRetries: 1,
            status: 'pending'
          }
        ],
        validationRules: [],
        completionCriteria: ['strategy_session_completed', 'strategic_plan_created']
      }
    ];

    this.onboardingTemplates.set('SMB', smbSteps);
    this.onboardingTemplates.set('ENTERPRISE', enterpriseSteps);

    console.log('📋 Onboarding templates initialized for SMB and Enterprise tiers');
  }

  /**
   * Initialize integration services
   */
  private initializeIntegrationServices(): void {
    // CRM Integration Services
    this.integrationServices.set('salesforce', {
      name: 'Salesforce',
      type: 'crm',
      authType: 'oauth2',
      setupTime: 5,
      complexity: 'medium'
    });

    this.integrationServices.set('hubspot', {
      name: 'HubSpot',
      type: 'crm',
      authType: 'api_key',
      setupTime: 3,
      complexity: 'low'
    });

    this.integrationServices.set('pipedrive', {
      name: 'Pipedrive',
      type: 'crm',
      authType: 'api_key',
      setupTime: 3,
      complexity: 'low'
    });

    // Email Integration Services
    this.integrationServices.set('gmail', {
      name: 'Gmail',
      type: 'email',
      authType: 'oauth2',
      setupTime: 4,
      complexity: 'medium'
    });

    this.integrationServices.set('outlook', {
      name: 'Outlook',
      type: 'email',
      authType: 'oauth2',
      setupTime: 4,
      complexity: 'medium'
    });

    console.log('🔗 Integration services initialized');
  }

  /**
   * Start onboarding monitoring
   */
  private startOnboardingMonitoring(): void {
    // Monitor onboarding progress every 30 seconds
    setInterval(() => {
      this.monitorOnboardingProgress();
    }, 30000);

    // Check for abandoned onboarding flows every 5 minutes
    setInterval(() => {
      this.checkAbandonedFlows();
    }, 300000);

    console.log('📊 Onboarding monitoring started');
  }

  /**
   * Start comprehensive user onboarding
   */
  public async startOnboarding(
    userId: string,
    tier: 'SMB' | 'ENTERPRISE',
    userPreferences: UserPreferences
  ): Promise<OnboardingFlow> {
    
    console.log(`🚀 Starting comprehensive onboarding for ${tier} user: ${userId}`);

    const flowId = `onboarding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const steps = this.onboardingTemplates.get(tier) || [];

    const shadowBoardConfig: ShadowBoardConfig = {
      userId,
      tier,
      industry: userPreferences.industry,
      geography: userPreferences.geography,
      companySize: userPreferences.companySize,
      customization: userPreferences.executiveCustomization ? {} : undefined
    };

    const onboardingFlow: OnboardingFlow = {
      userId,
      flowId,
      tier,
      currentStep: 0,
      totalSteps: steps.length,
      steps: JSON.parse(JSON.stringify(steps)), // Deep copy
      status: 'in_progress',
      startTime: new Date(),
      completionRate: 0,
      userPreferences,
      shadowBoardConfig
    };

    this.activeFlows.set(flowId, onboardingFlow);

    this.emit('onboardingStarted', {
      userId,
      flowId,
      tier,
      estimatedTime: steps.reduce((total, step) => total + step.estimatedTime, 0)
    });

    // Start executing the first step
    await this.executeNextStep(flowId);

    return onboardingFlow;
  }

  /**
   * Execute next onboarding step
   */
  public async executeNextStep(flowId: string): Promise<void> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Onboarding flow ${flowId} not found`);
    }

    if (flow.currentStep >= flow.totalSteps) {
      await this.completeOnboarding(flowId);
      return;
    }

    const currentStep = flow.steps[flow.currentStep];
    console.log(`📋 Executing onboarding step: ${currentStep.name} for user ${flow.userId}`);

    currentStep.status = 'in_progress';

    try {
      // Check dependencies
      await this.checkStepDependencies(flow, currentStep);

      // Execute step actions
      await this.executeStepActions(flow, currentStep);

      // Validate step completion
      await this.validateStepCompletion(flow, currentStep);

      currentStep.status = 'completed';
      flow.currentStep++;
      flow.completionRate = (flow.currentStep / flow.totalSteps) * 100;

      console.log(`✅ Onboarding step completed: ${currentStep.name}`);

      this.emit('onboardingStepCompleted', {
        userId: flow.userId,
        flowId,
        step: currentStep,
        progress: flow.completionRate
      });

      // Continue to next step if not completed
      if (flow.currentStep < flow.totalSteps) {
        setTimeout(() => {
          this.executeNextStep(flowId);
        }, 1000); // 1 second delay between steps
      } else {
        await this.completeOnboarding(flowId);
      }

    } catch (error) {
      console.error(`❌ Onboarding step failed: ${currentStep.name}`, error);
      currentStep.status = 'failed';

      this.emit('onboardingStepFailed', {
        userId: flow.userId,
        flowId,
        step: currentStep,
        error
      });

      // Retry logic or skip non-required steps
      if (!currentStep.required) {
        currentStep.status = 'skipped';
        flow.currentStep++;
        await this.executeNextStep(flowId);
      } else {
        flow.status = 'abandoned';
        this.emit('onboardingAbandoned', { userId: flow.userId, flowId, reason: 'step_failure' });
      }
    }
  }

  /**
   * Complete onboarding flow
   */
  private async completeOnboarding(flowId: string): Promise<void> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) return;

    flow.status = 'completed';
    flow.completionTime = new Date();
    flow.completionRate = 100;

    // Move to completed flows
    this.completedFlows.set(flowId, flow);
    this.activeFlows.delete(flowId);

    console.log(`🎉 Onboarding completed for user ${flow.userId}`);

    this.emit('onboardingCompleted', {
      userId: flow.userId,
      flowId,
      tier: flow.tier,
      duration: flow.completionTime.getTime() - flow.startTime.getTime(),
      completionRate: flow.completionRate
    });
  }

  /**
   * Helper methods for step execution
   */
  private async checkStepDependencies(flow: OnboardingFlow, step: OnboardingStep): Promise<void> {
    for (const dependency of step.dependencies) {
      const dependentStep = flow.steps.find(s => s.id === dependency);
      if (!dependentStep || dependentStep.status !== 'completed') {
        throw new Error(`Step dependency not met: ${dependency}`);
      }
    }
  }

  private async executeStepActions(flow: OnboardingFlow, step: OnboardingStep): Promise<void> {
    for (const action of step.actions) {
      action.status = 'executing';
      
      try {
        await this.executeAction(flow, action);
        action.status = 'completed';
      } catch (error) {
        action.retryCount++;
        if (action.retryCount < action.maxRetries) {
          await this.executeStepActions(flow, { ...step, actions: [action] });
        } else {
          action.status = 'failed';
          throw error;
        }
      }
    }
  }

  private async executeAction(flow: OnboardingFlow, action: OnboardingAction): Promise<void> {
    switch (action.type) {
      case 'api_call':
        await this.executeApiCall(flow, action);
        break;
      case 'form':
        await this.executeFormAction(flow, action);
        break;
      case 'tutorial':
        await this.executeTutorialAction(flow, action);
        break;
      case 'integration':
        await this.executeIntegrationAction(flow, action);
        break;
      case 'verification':
        await this.executeVerificationAction(flow, action);
        break;
    }
  }

  private async executeApiCall(flow: OnboardingFlow, action: OnboardingAction): Promise<void> {
    // Simulate API call execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000));
  }

  private async executeFormAction(flow: OnboardingFlow, action: OnboardingAction): Promise<void> {
    // Simulate form completion
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 5000));
  }

  private async executeTutorialAction(flow: OnboardingFlow, action: OnboardingAction): Promise<void> {
    // Simulate tutorial completion
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30000 + 10000));
  }

  private async executeIntegrationAction(flow: OnboardingFlow, action: OnboardingAction): Promise<void> {
    // Simulate integration setup
    await new Promise(resolve => setTimeout(resolve, Math.random() * 15000 + 5000));
  }

  private async executeVerificationAction(flow: OnboardingFlow, action: OnboardingAction): Promise<void> {
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, Math.random() * 8000 + 2000));
  }

  private async validateStepCompletion(flow: OnboardingFlow, step: OnboardingStep): Promise<void> {
    // Validate completion criteria
    for (const criteria of step.completionCriteria) {
      // Simulate validation
      if (Math.random() < 0.95) { // 95% success rate
        continue;
      } else {
        throw new Error(`Completion criteria not met: ${criteria}`);
      }
    }
  }

  private async monitorOnboardingProgress(): Promise<void> {
    // Monitor active onboarding flows for issues
    for (const [flowId, flow] of this.activeFlows) {
      const currentTime = new Date().getTime();
      const elapsedTime = currentTime - flow.startTime.getTime();
      
      // Check for stalled flows (over 1 hour without progress)
      if (elapsedTime > 3600000 && flow.completionRate < 50) {
        console.warn(`⚠️ Onboarding flow may be stalled: ${flowId}`);
        this.emit('onboardingStalled', { userId: flow.userId, flowId, elapsedTime });
      }
    }
  }

  private async checkAbandonedFlows(): Promise<void> {
    // Check for flows that haven't progressed in 30 minutes
    const abandonmentThreshold = 30 * 60 * 1000; // 30 minutes
    const currentTime = new Date().getTime();

    for (const [flowId, flow] of this.activeFlows) {
      const lastActivity = flow.startTime.getTime();
      
      if (currentTime - lastActivity > abandonmentThreshold) {
        flow.status = 'abandoned';
        this.activeFlows.delete(flowId);
        
        console.log(`⚠️ Onboarding flow abandoned: ${flowId}`);
        this.emit('onboardingAbandoned', { 
          userId: flow.userId, 
          flowId, 
          reason: 'timeout',
          completionRate: flow.completionRate
        });
      }
    }
  }
}
