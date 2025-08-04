/**
 * SOVREN AI - Interactive Tutorial System
 * 
 * Comprehensive tutorial system that guides users through SOVREN AI
 * features with interactive demos, Shadow Board introductions,
 * and hands-on learning experiences.
 * 
 * CLASSIFICATION: INTERACTIVE LEARNING SYSTEM
 */

import { EventEmitter } from 'events';

export interface TutorialSession {
  sessionId: string;
  userId: string;
  tier: 'SMB' | 'ENTERPRISE';
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  currentModule: number;
  totalModules: number;
  modules: TutorialModule[];
  progress: number; // 0-100
  startTime: Date;
  completionTime?: Date;
  interactionCount: number;
  engagementScore: number; // 0-1 scale
  userFeedback?: TutorialFeedback;
}

export interface TutorialModule {
  id: string;
  name: string;
  description: string;
  type: 'introduction' | 'demo' | 'interactive' | 'executive_intro' | 'hands_on' | 'assessment';
  estimatedTime: number; // minutes
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  startTime?: Date;
  completionTime?: Date;
  steps: TutorialStep[];
  prerequisites: string[];
  learningObjectives: string[];
  completionCriteria: string[];
}

export interface TutorialStep {
  id: string;
  name: string;
  type: 'explanation' | 'demonstration' | 'interaction' | 'question' | 'task';
  content: StepContent;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  userResponse?: any;
  startTime?: Date;
  completionTime?: Date;
  attempts: number;
  maxAttempts: number;
}

export interface StepContent {
  title: string;
  description: string;
  media?: {
    type: 'video' | 'image' | 'animation' | 'interactive';
    url: string;
    duration?: number;
  };
  interactiveElements?: InteractiveElement[];
  executiveInvolvement?: {
    executive: string;
    role: 'presenter' | 'guide' | 'assistant';
    dialogue: string[];
  };
  validation?: {
    type: 'automatic' | 'manual' | 'executive_feedback';
    criteria: string[];
  };
}

export interface InteractiveElement {
  id: string;
  type: 'button' | 'input' | 'selection' | 'drag_drop' | 'voice_command';
  label: string;
  action: string;
  expectedResponse?: any;
  feedback: {
    correct: string;
    incorrect: string;
    hint: string;
  };
}

export interface TutorialFeedback {
  overallRating: number; // 1-5 scale
  moduleRatings: Record<string, number>;
  mostHelpful: string[];
  leastHelpful: string[];
  suggestions: string;
  wouldRecommend: boolean;
  executiveFeedback: Record<string, number>; // Rating for each executive
}

export interface TutorialAnalytics {
  totalSessions: number;
  completionRate: number;
  averageCompletionTime: number;
  averageEngagementScore: number;
  mostPopularModules: string[];
  commonDropOffPoints: string[];
  userSatisfactionScore: number;
  executivePopularity: Record<string, number>;
}

export class InteractiveTutorialSystem extends EventEmitter {
  private tutorialSessions: Map<string, TutorialSession> = new Map();
  private tutorialModules: Map<string, TutorialModule[]> = new Map();
  private analytics!: TutorialAnalytics;

  constructor() {
    super();
    this.initializeTutorialModules();
    this.initializeAnalytics();
    this.startAnalyticsTracking();
  }

  /**
   * Initialize tutorial modules for different tiers
   */
  private initializeTutorialModules(): void {
    // SMB Tutorial Modules
    const smbModules: TutorialModule[] = [
      {
        id: 'welcome_introduction',
        name: 'Welcome to SOVREN AI',
        description: 'Introduction to SOVREN AI and your Shadow Board',
        type: 'introduction',
        estimatedTime: 5,
        status: 'pending',
        steps: [
          {
            id: 'welcome_message',
            name: 'Welcome Message',
            type: 'explanation',
            content: {
              title: 'Welcome to the Future of Business Intelligence',
              description: 'SOVREN AI is your complete digital executive team, ready to transform how you run your business.',
              media: {
                type: 'video',
                url: '/tutorials/welcome_video.mp4',
                duration: 120
              }
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 1
          },
          {
            id: 'sovren_overview',
            name: 'SOVREN Overview',
            type: 'demonstration',
            content: {
              title: 'What is SOVREN AI?',
              description: 'Your personal Shadow Board of AI executives, each with unique personalities and expertise.',
              interactiveElements: [
                {
                  id: 'explore_dashboard',
                  type: 'button',
                  label: 'Explore Dashboard',
                  action: 'show_dashboard_tour',
                  feedback: {
                    correct: 'Great! Let\'s explore your dashboard.',
                    incorrect: '',
                    hint: 'Click to see your personalized dashboard'
                  }
                }
              ]
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 3
          }
        ],
        prerequisites: [],
        learningObjectives: [
          'Understand what SOVREN AI is',
          'Learn about the Shadow Board concept',
          'Navigate the main dashboard'
        ],
        completionCriteria: ['watched_welcome_video', 'explored_dashboard']
      },
      {
        id: 'meet_your_executives',
        name: 'Meet Your Shadow Board',
        description: 'Personal introductions with each of your AI executives',
        type: 'executive_intro',
        estimatedTime: 15,
        status: 'pending',
        steps: [
          {
            id: 'cfo_introduction',
            name: 'Meet Your CFO',
            type: 'interaction',
            content: {
              title: 'Your Chief Financial Officer',
              description: 'Meet your CFO who will handle all financial strategy and analysis.',
              executiveInvolvement: {
                executive: 'cfo',
                role: 'presenter',
                dialogue: [
                  'Hello! I\'m your CFO, and I\'m excited to work with you.',
                  'I specialize in financial planning, cash flow management, and helping you make data-driven financial decisions.',
                  'Feel free to ask me anything about your business finances!'
                ]
              },
              interactiveElements: [
                {
                  id: 'ask_cfo_question',
                  type: 'input',
                  label: 'Ask your CFO a question',
                  action: 'process_cfo_question',
                  feedback: {
                    correct: 'Excellent question! Your CFO is ready to help.',
                    incorrect: 'Try asking about financial planning or cash flow.',
                    hint: 'Ask about budgeting, forecasting, or financial strategy'
                  }
                }
              ]
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 3
          },
          {
            id: 'cmo_introduction',
            name: 'Meet Your CMO',
            type: 'interaction',
            content: {
              title: 'Your Chief Marketing Officer',
              description: 'Meet your CMO who will drive your marketing and growth strategies.',
              executiveInvolvement: {
                executive: 'cmo',
                role: 'presenter',
                dialogue: [
                  'Hi there! I\'m your CMO, and I\'m passionate about growing your business.',
                  'I focus on marketing strategy, customer acquisition, and brand building.',
                  'Let\'s discuss how we can accelerate your growth!'
                ]
              },
              interactiveElements: [
                {
                  id: 'marketing_goal_setting',
                  type: 'selection',
                  label: 'What\'s your primary marketing goal?',
                  action: 'set_marketing_goal',
                  feedback: {
                    correct: 'Perfect! I\'ll help you achieve that goal.',
                    incorrect: 'Let\'s refine that goal together.',
                    hint: 'Choose from customer acquisition, brand awareness, or revenue growth'
                  }
                }
              ]
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 3
          }
        ],
        prerequisites: ['welcome_introduction'],
        learningObjectives: [
          'Meet each Shadow Board executive',
          'Understand each executive\'s role',
          'Practice interacting with executives'
        ],
        completionCriteria: ['met_all_executives', 'completed_interactions']
      },
      {
        id: 'first_consultation',
        name: 'Your First Executive Consultation',
        description: 'Experience a real consultation with your Shadow Board',
        type: 'hands_on',
        estimatedTime: 20,
        status: 'pending',
        steps: [
          {
            id: 'consultation_setup',
            name: 'Set Up Consultation',
            type: 'task',
            content: {
              title: 'Schedule Your First Consultation',
              description: 'Let\'s set up a consultation to discuss your business goals.',
              interactiveElements: [
                {
                  id: 'select_consultation_topic',
                  type: 'selection',
                  label: 'What would you like to discuss?',
                  action: 'setup_consultation',
                  feedback: {
                    correct: 'Great choice! Your executives are preparing.',
                    incorrect: 'Let\'s pick a topic that interests you most.',
                    hint: 'Choose from financial planning, marketing strategy, or business growth'
                  }
                }
              ]
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 3
          },
          {
            id: 'live_consultation',
            name: 'Live Consultation',
            type: 'interaction',
            content: {
              title: 'Executive Consultation in Progress',
              description: 'Your Shadow Board is now consulting on your selected topic.',
              executiveInvolvement: {
                executive: 'multiple',
                role: 'guide',
                dialogue: [
                  'CFO: Let me analyze the financial implications...',
                  'CMO: From a marketing perspective, I see opportunities...',
                  'CTO: The technical requirements would be...'
                ]
              }
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 1
          }
        ],
        prerequisites: ['meet_your_executives'],
        learningObjectives: [
          'Experience a real consultation',
          'See executives working together',
          'Understand the consultation process'
        ],
        completionCriteria: ['completed_consultation', 'provided_feedback']
      },
      {
        id: 'integration_setup',
        name: 'Connect Your Tools',
        description: 'Learn how to integrate SOVREN with your existing tools',
        type: 'interactive',
        estimatedTime: 10,
        status: 'pending',
        steps: [
          {
            id: 'integration_overview',
            name: 'Integration Overview',
            type: 'demonstration',
            content: {
              title: 'Connect Your Business Tools',
              description: 'SOVREN integrates with your CRM, email, and other business tools.',
              media: {
                type: 'interactive',
                url: '/tutorials/integration_demo.html'
              }
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 1
          },
          {
            id: 'setup_first_integration',
            name: 'Set Up Your First Integration',
            type: 'task',
            content: {
              title: 'Choose Your First Integration',
              description: 'Let\'s connect your most important business tool.',
              interactiveElements: [
                {
                  id: 'select_integration',
                  type: 'selection',
                  label: 'Which tool would you like to connect first?',
                  action: 'setup_integration',
                  feedback: {
                    correct: 'Excellent choice! Let\'s get that connected.',
                    incorrect: 'That\'s a great tool to integrate.',
                    hint: 'Popular choices include Salesforce, Gmail, or Slack'
                  }
                }
              ]
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 3
          }
        ],
        prerequisites: ['first_consultation'],
        learningObjectives: [
          'Understand integration capabilities',
          'Set up first integration',
          'Learn integration best practices'
        ],
        completionCriteria: ['completed_integration_setup']
      },
      {
        id: 'tutorial_completion',
        name: 'Tutorial Complete',
        description: 'Congratulations! You\'re ready to use SOVREN AI',
        type: 'assessment',
        estimatedTime: 5,
        status: 'pending',
        steps: [
          {
            id: 'completion_celebration',
            name: 'Congratulations!',
            type: 'explanation',
            content: {
              title: 'You\'re Ready to Transform Your Business!',
              description: 'You\'ve completed the SOVREN AI tutorial and are ready to leverage your Shadow Board.',
              executiveInvolvement: {
                executive: 'multiple',
                role: 'presenter',
                dialogue: [
                  'CFO: Congratulations! I\'m ready to help with your finances.',
                  'CMO: Excited to drive your marketing success!',
                  'CTO: Let\'s build something amazing together.',
                  'Legal: I\'m here to keep you compliant and protected.'
                ]
              }
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 1
          },
          {
            id: 'feedback_collection',
            name: 'Share Your Feedback',
            type: 'question',
            content: {
              title: 'How Was Your Experience?',
              description: 'Help us improve the tutorial experience for future users.',
              interactiveElements: [
                {
                  id: 'tutorial_rating',
                  type: 'selection',
                  label: 'Rate your tutorial experience',
                  action: 'collect_feedback',
                  feedback: {
                    correct: 'Thank you for your feedback!',
                    incorrect: 'We appreciate any rating you give.',
                    hint: 'Rate from 1 (poor) to 5 (excellent)'
                  }
                }
              ]
            },
            status: 'pending',
            attempts: 0,
            maxAttempts: 1
          }
        ],
        prerequisites: ['integration_setup'],
        learningObjectives: [
          'Celebrate completion',
          'Provide feedback',
          'Understand next steps'
        ],
        completionCriteria: ['provided_feedback']
      }
    ];

    // Enterprise modules would include additional advanced features
    const enterpriseModules: TutorialModule[] = [
      ...smbModules,
      {
        id: 'team_management',
        name: 'Team Access & Management',
        description: 'Learn how to manage team access and permissions',
        type: 'interactive',
        estimatedTime: 15,
        status: 'pending',
        steps: [],
        prerequisites: ['integration_setup'],
        learningObjectives: ['Manage team access', 'Set permissions', 'Monitor team usage'],
        completionCriteria: ['setup_team_access']
      },
      {
        id: 'advanced_analytics',
        name: 'Advanced Analytics & Reporting',
        description: 'Explore advanced analytics and custom reporting features',
        type: 'demo',
        estimatedTime: 20,
        status: 'pending',
        steps: [],
        prerequisites: ['team_management'],
        learningObjectives: ['Use advanced analytics', 'Create custom reports', 'Set up dashboards'],
        completionCriteria: ['created_custom_report']
      }
    ];

    this.tutorialModules.set('SMB', smbModules);
    this.tutorialModules.set('ENTERPRISE', enterpriseModules);

    console.log('📚 Tutorial modules initialized');
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): void {
    this.analytics = {
      totalSessions: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      averageEngagementScore: 0,
      mostPopularModules: [],
      commonDropOffPoints: [],
      userSatisfactionScore: 0,
      executivePopularity: {}
    };
  }

  /**
   * Start analytics tracking
   */
  private startAnalyticsTracking(): void {
    // Update analytics every 5 minutes
    setInterval(() => {
      this.updateAnalytics();
    }, 300000);

    console.log('📊 Tutorial analytics tracking started');
  }

  /**
   * Start tutorial session for user
   */
  public async startTutorialSession(userId: string, tier: 'SMB' | 'ENTERPRISE'): Promise<TutorialSession> {
    console.log(`📚 Starting tutorial session for user ${userId} (${tier})`);

    const sessionId = `tutorial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const modules = this.tutorialModules.get(tier) || [];

    const session: TutorialSession = {
      sessionId,
      userId,
      tier,
      status: 'in_progress',
      currentModule: 0,
      totalModules: modules.length,
      modules: JSON.parse(JSON.stringify(modules)), // Deep copy
      progress: 0,
      startTime: new Date(),
      interactionCount: 0,
      engagementScore: 0
    };

    this.tutorialSessions.set(sessionId, session);

    console.log(`✅ Tutorial session started: ${sessionId}`);

    this.emit('tutorialSessionStarted', session);

    return session;
  }

  /**
   * Start tutorial step
   */
  public async startTutorialStep(
    sessionId: string,
    moduleId: string,
    stepId: string
  ): Promise<void> {
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error('Tutorial session not found');
    }

    const module = session.modules.find(m => m.id === moduleId);
    if (!module) {
      throw new Error('Tutorial module not found');
    }

    const step = module.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Tutorial step not found');
    }

    step.status = 'in_progress';
    step.startTime = new Date();

    console.log(`▶️ Tutorial step started: ${stepId}`);
    this.emit('tutorialStepStarted', { session, module, step });
  }

  /**
   * Complete tutorial step
   */
  public async completeTutorialStep(
    sessionId: string,
    moduleId: string,
    stepId: string,
    userResponse?: any
  ): Promise<void> {
    
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error('Tutorial session not found');
    }

    const module = session.modules.find(m => m.id === moduleId);
    if (!module) {
      throw new Error('Tutorial module not found');
    }

    const step = module.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Tutorial step not found');
    }

    // Set start time if not already set
    if (!step.startTime) {
      step.startTime = new Date();
    }

    step.status = 'completed';
    step.completionTime = new Date();
    step.userResponse = userResponse;
    session.interactionCount++;

    // Update engagement score
    this.updateEngagementScore(session, step);

    // Check if module is complete
    const completedSteps = module.steps.filter(s => s.status === 'completed').length;
    if (completedSteps === module.steps.length) {
      module.status = 'completed';
      module.completionTime = new Date();
      session.currentModule++;
    }

    // Update progress
    const totalSteps = session.modules.reduce((sum, m) => sum + m.steps.length, 0);
    const completedTotalSteps = session.modules.reduce((sum, m) => 
      sum + m.steps.filter(s => s.status === 'completed').length, 0
    );
    session.progress = (completedTotalSteps / totalSteps) * 100;

    // Check if tutorial is complete
    if (session.currentModule >= session.totalModules) {
      session.status = 'completed';
      session.completionTime = new Date();
      
      console.log(`🎉 Tutorial completed for user ${session.userId}`);
      this.emit('tutorialCompleted', session);
    }

    this.emit('tutorialStepCompleted', { session, module, step });
  }

  /**
   * Skip tutorial step
   */
  public async skipTutorialStep(sessionId: string, moduleId: string, stepId: string): Promise<void> {
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error('Tutorial session not found');
    }

    const module = session.modules.find(m => m.id === moduleId);
    if (!module) {
      throw new Error('Tutorial module not found');
    }

    const step = module.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Tutorial step not found');
    }

    step.status = 'skipped';
    step.completionTime = new Date();

    console.log(`⏭️ Tutorial step skipped: ${stepId}`);
    this.emit('tutorialStepSkipped', { session, module, step });
  }

  /**
   * Submit tutorial feedback
   */
  public async submitTutorialFeedback(sessionId: string, feedback: TutorialFeedback): Promise<void> {
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error('Tutorial session not found');
    }

    session.userFeedback = feedback;

    console.log(`📝 Tutorial feedback submitted for session ${sessionId}`);
    this.emit('tutorialFeedbackSubmitted', { session, feedback });
  }

  /**
   * Helper methods
   */
  private updateEngagementScore(session: TutorialSession, step: TutorialStep): void {
    // Calculate engagement based on interaction type and completion time
    let stepEngagement = 0.5; // Base engagement

    if (step.type === 'interaction') {
      stepEngagement = 0.8;
    } else if (step.type === 'task') {
      stepEngagement = 0.9;
    } else if (step.type === 'question') {
      stepEngagement = 0.7;
    }

    // Adjust for completion time (faster completion = higher engagement)
    if (step.completionTime && step.content.media?.duration) {
      const expectedTime = step.content.media.duration * 1000; // Convert to ms
      const actualTime = step.completionTime.getTime() - (step.startTime?.getTime() || 0);
      
      if (actualTime < expectedTime * 1.5) { // Completed within reasonable time
        stepEngagement += 0.1;
      }
    }

    // Update session engagement score (running average)
    const totalSteps = session.interactionCount;
    session.engagementScore = ((session.engagementScore * (totalSteps - 1)) + stepEngagement) / totalSteps;
  }

  private updateAnalytics(): void {
    const sessions = Array.from(this.tutorialSessions.values());
    
    this.analytics.totalSessions = sessions.length;
    this.analytics.completionRate = sessions.filter(s => s.status === 'completed').length / sessions.length;
    
    const completedSessions = sessions.filter(s => s.status === 'completed' && s.completionTime);
    if (completedSessions.length > 0) {
      const totalTime = completedSessions.reduce((sum, s) => 
        sum + (s.completionTime!.getTime() - s.startTime.getTime()), 0
      );
      this.analytics.averageCompletionTime = totalTime / completedSessions.length / 60000; // Convert to minutes
    }

    this.analytics.averageEngagementScore = sessions.reduce((sum, s) => sum + s.engagementScore, 0) / sessions.length;

    console.log(`📊 Tutorial analytics updated: ${this.analytics.completionRate.toFixed(2)} completion rate`);
  }

  /**
   * Public methods
   */
  public getTutorialSession(sessionId: string): TutorialSession | null {
    return this.tutorialSessions.get(sessionId) || null;
  }

  public getUserTutorialSession(userId: string): TutorialSession | null {
    for (const session of this.tutorialSessions.values()) {
      if (session.userId === userId) {
        return session;
      }
    }
    return null;
  }

  public getTutorialAnalytics(): TutorialAnalytics {
    return this.analytics;
  }

  public async abandonTutorialSession(sessionId: string): Promise<void> {
    const session = this.tutorialSessions.get(sessionId);
    if (!session) {
      throw new Error('Tutorial session not found');
    }

    session.status = 'abandoned';
    
    console.log(`❌ Tutorial session abandoned: ${sessionId}`);
    this.emit('tutorialAbandoned', session);
  }
}
