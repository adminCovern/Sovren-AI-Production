/**
 * SOVREN AI EXECUTIVE INTERACTION ENGINE
 * Real-time interaction capabilities for Shadow Board executives
 */

import { EventEmitter } from 'events';
import { ExecutiveEntity, PsychologicalProfile } from './ShadowBoardManager';
import { VoiceSynthesizer } from '../voice/VoiceSynthesizer';
import { EmailOrchestrationExecutives } from '../integrations/EmailOrchestrationExecutives';

export interface ExecutiveInteraction {
  id: string;
  executiveId: string;
  type: 'voice_call' | 'email' | 'chat' | 'decision' | 'analysis';
  userId: string;
  content: string;
  context: InteractionContext;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  response?: ExecutiveResponse;
  metadata: InteractionMetadata;
}

export interface InteractionContext {
  urgency: 'low' | 'medium' | 'high' | 'critical';
  topic: string;
  relatedContacts?: string[];
  crmData?: any;
  previousInteractions?: string[];
  businessContext?: string;
}

export interface ExecutiveResponse {
  content: string;
  tone: string;
  confidence: number;
  reasoning: string;
  actionItems?: string[];
  followUpRequired?: boolean;
  escalationNeeded?: boolean;
  estimatedValue?: number;
}

export interface InteractionMetadata {
  processingTime: number;
  neuralLoad: number;
  confidenceScore: number;
  personalityAlignment: number;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

export class ExecutiveInteractionEngine extends EventEmitter {
  private executives: Map<string, ExecutiveEntity> = new Map();
  private activeInteractions: Map<string, ExecutiveInteraction> = new Map();
  private voiceSynthesizer: VoiceSynthesizer;
  private emailOrchestrator: EmailOrchestrationExecutives;
  private interactionHistory: Map<string, ExecutiveInteraction[]> = new Map();

  constructor(voiceSynthesizer: VoiceSynthesizer, emailOrchestrator: EmailOrchestrationExecutives) {
    super();
    this.voiceSynthesizer = voiceSynthesizer;
    this.emailOrchestrator = emailOrchestrator;
  }

  /**
   * Register executive for interactions
   */
  public registerExecutive(executive: ExecutiveEntity): void {
    this.executives.set(executive.id, executive);
    this.interactionHistory.set(executive.id, []);
    console.log(`✅ Executive ${executive.name} (${executive.role}) registered for interactions`);
  }

  /**
   * Initiate voice interaction with executive
   */
  public async initiateVoiceInteraction(
    executiveId: string,
    userId: string,
    content: string,
    context: InteractionContext
  ): Promise<ExecutiveInteraction> {
    const executive = this.executives.get(executiveId);
    if (!executive) {
      throw new Error(`Executive not found: ${executiveId}`);
    }

    const interaction: ExecutiveInteraction = {
      id: `voice_${Date.now()}_${executiveId}`,
      executiveId,
      type: 'voice_call',
      userId,
      content,
      context,
      timestamp: new Date(),
      status: 'processing',
      metadata: {
        processingTime: 0,
        neuralLoad: executive.neuralLoad,
        confidenceScore: 0,
        personalityAlignment: 0,
        businessImpact: context.urgency === 'critical' ? 'critical' : 'medium'
      }
    };

    this.activeInteractions.set(interaction.id, interaction);

    try {
      // Process interaction through executive's neural patterns
      const response = await this.processExecutiveThinking(executive, interaction);
      
      // Generate voice response
      const voiceResponse = await this.generateVoiceResponse(executive, response);
      
      // Update interaction with response
      interaction.response = response;
      interaction.status = 'completed';
      interaction.metadata.processingTime = Date.now() - interaction.timestamp.getTime();

      // Store in history
      this.addToHistory(executiveId, interaction);

      // Emit completion event
      this.emit('interactionComplete', interaction);

      console.log(`🎤 Voice interaction completed with ${executive.name}: ${interaction.id}`);
      return interaction;

    } catch (error) {
      interaction.status = 'failed';
      console.error(`❌ Voice interaction failed with ${executive.name}:`, error);
      throw error;
    }
  }

  /**
   * Initiate email interaction with executive
   */
  public async initiateEmailInteraction(
    executiveId: string,
    userId: string,
    emailContent: string,
    context: InteractionContext
  ): Promise<ExecutiveInteraction> {
    const executive = this.executives.get(executiveId);
    if (!executive) {
      throw new Error(`Executive not found: ${executiveId}`);
    }

    const interaction: ExecutiveInteraction = {
      id: `email_${Date.now()}_${executiveId}`,
      executiveId,
      type: 'email',
      userId,
      content: emailContent,
      context,
      timestamp: new Date(),
      status: 'processing',
      metadata: {
        processingTime: 0,
        neuralLoad: executive.neuralLoad,
        confidenceScore: 0,
        personalityAlignment: 0,
        businessImpact: this.assessBusinessImpact(context)
      }
    };

    this.activeInteractions.set(interaction.id, interaction);

    try {
      // Process through executive's decision-making patterns
      const response = await this.processExecutiveThinking(executive, interaction);
      
      // Generate email response through orchestrator
      const emailResponse = await this.generateEmailResponse(executive, response, context);
      
      interaction.response = response;
      interaction.status = 'completed';
      interaction.metadata.processingTime = Date.now() - interaction.timestamp.getTime();

      this.addToHistory(executiveId, interaction);
      this.emit('interactionComplete', interaction);

      console.log(`📧 Email interaction completed with ${executive.name}: ${interaction.id}`);
      return interaction;

    } catch (error) {
      interaction.status = 'failed';
      console.error(`❌ Email interaction failed with ${executive.name}:`, error);
      throw error;
    }
  }

  /**
   * Process executive thinking patterns
   */
  private async processExecutiveThinking(
    executive: ExecutiveEntity,
    interaction: ExecutiveInteraction
  ): Promise<ExecutiveResponse> {
    console.log(`🧠 ${executive.name} processing: ${interaction.content.substring(0, 50)}...`);

    // Simulate executive thinking based on psychological profile
    const thinkingTime = this.calculateThinkingTime(executive, interaction);
    await new Promise(resolve => setTimeout(resolve, thinkingTime));

    // Generate response based on executive's personality and role
    const response = await this.generateExecutiveResponse(executive, interaction);

    // Update executive's neural state
    this.updateExecutiveNeuralState(executive, interaction);

    return response;
  }

  /**
   * Generate executive response based on personality and role
   */
  private async generateExecutiveResponse(
    executive: ExecutiveEntity,
    interaction: ExecutiveInteraction
  ): Promise<ExecutiveResponse> {
    const roleResponses = this.getRoleSpecificResponses(executive.role);
    const personalityModifiers = this.getPersonalityModifiers(executive.psychologicalProfile);

    // Simulate AI-powered response generation
    const baseResponse = this.selectBaseResponse(roleResponses, interaction.content);
    const personalizedResponse = this.applyPersonalityModifiers(baseResponse, personalityModifiers);

    // Derive communication style and confidence from existing psychological profile
    const communicationStyle = this.deriveCommunicationStyle(executive.psychologicalProfile);
    const confidence = this.deriveConfidenceLevel(executive.psychologicalProfile);

    return {
      content: personalizedResponse,
      tone: communicationStyle,
      confidence: confidence,
      reasoning: `Based on my ${executive.role} expertise and analysis of the situation`,
      actionItems: this.generateActionItems(executive, interaction),
      followUpRequired: this.assessFollowUpNeed(interaction),
      escalationNeeded: this.assessEscalationNeed(executive, interaction),
      estimatedValue: this.estimateBusinessValue(interaction)
    };
  }

  /**
   * Generate voice response
   */
  private async generateVoiceResponse(executive: ExecutiveEntity, response: ExecutiveResponse): Promise<void> {
    try {
      await this.voiceSynthesizer.synthesize(
        response.content,
        executive.voiceModel,
        'high'
      );
      console.log(`🔊 Voice response generated for ${executive.name}`);
    } catch (error) {
      console.error(`❌ Voice synthesis failed for ${executive.name}:`, error);
    }
  }

  /**
   * Generate email response
   */
  private async generateEmailResponse(
    executive: ExecutiveEntity,
    response: ExecutiveResponse,
    context: InteractionContext
  ): Promise<void> {
    // Integrate with the email orchestrator using all parameters
    const emailContent = {
      from: `${executive.name} <${executive.role.toLowerCase()}@company.com>`,
      subject: `Re: ${context.topic || 'Executive Response'}`,
      body: response.content,
      tone: response.tone,
      urgency: context.urgency,
      confidenceLevel: response.confidence,
      businessContext: context.businessContext
    };

    console.log(`📧 Email response generated for ${executive.name} with ${response.tone} tone (confidence: ${response.confidence})`);
    console.log(`📧 Context: ${context.topic} - Urgency: ${context.urgency}`);
    console.log(`📧 Email content prepared:`, emailContent);

    // Would send via EmailOrchestrationExecutives in production
    // await this.emailOrchestrator.sendExecutiveEmail(emailContent);
  }

  /**
   * Calculate thinking time based on executive and interaction complexity
   */
  private calculateThinkingTime(executive: ExecutiveEntity, interaction: ExecutiveInteraction): number {
    const baseTime = 100; // Base thinking time in ms
    const complexityMultiplier = interaction.context.urgency === 'critical' ? 0.5 : 1.0;
    const roleMultiplier = executive.role === 'CEO' ? 1.2 : 1.0; // CEOs think more strategically
    
    return baseTime * complexityMultiplier * roleMultiplier;
  }

  /**
   * Update executive's neural state after interaction
   */
  private updateExecutiveNeuralState(executive: ExecutiveEntity, interaction: ExecutiveInteraction): void {
    // Increase neural load slightly
    executive.neuralLoad = Math.min(1.0, executive.neuralLoad + 0.05);
    
    // Update brainwave pattern based on interaction type
    if (interaction.context.urgency === 'critical') {
      executive.brainwavePattern = 'gamma'; // High focus
    } else {
      executive.brainwavePattern = 'beta'; // Normal processing
    }

    // Update current activity
    executive.currentActivity = {
      type: 'communicating',
      focus: interaction.context.topic,
      intensity: interaction.context.urgency === 'critical' ? 0.9 : 0.6,
      startTime: new Date(),
      estimatedDuration: 5000,
      relatedExecutives: [],
      impactRadius: 100,
      urgencyLevel: interaction.context.urgency
    };
  }

  private getRoleSpecificResponses(role: string): string[] {
    const responses: Record<string, string[]> = {
      'CEO': [
        'From a strategic perspective, I believe we should...',
        'This aligns with our long-term vision to...',
        'I\'ve seen similar situations in my experience, and the key is...'
      ],
      'CFO': [
        'Looking at the financial implications...',
        'The numbers suggest that we should...',
        'From a fiscal responsibility standpoint...'
      ],
      'CTO': [
        'Technically speaking, the best approach would be...',
        'From an engineering perspective...',
        'The scalable solution here is...'
      ],
      'CMO': [
        'From a market positioning standpoint...',
        'Our customers would respond well to...',
        'The brand impact of this decision...'
      ]
    };

    return responses[role] || responses['CEO'];
  }

  private getPersonalityModifiers(profile: any): any {
    return {
      confidence: profile.confidence || 0.8,
      directness: profile.directness || 0.7,
      empathy: profile.empathy || 0.6
    };
  }

  private selectBaseResponse(responses: string[], content: string): string {
    // Content-aware response selection - analyze content for keywords and context
    const contentLower = content.toLowerCase();

    // Filter responses based on content relevance
    const relevantResponses = responses.filter(response => {
      const responseLower = response.toLowerCase();
      // Check for keyword overlap
      const contentWords = contentLower.split(' ').filter(word => word.length > 3);
      return contentWords.some(word => responseLower.includes(word));
    });

    // Use relevant responses if found, otherwise fall back to all responses
    const selectedResponses = relevantResponses.length > 0 ? relevantResponses : responses;
    return selectedResponses[Math.floor(Math.random() * selectedResponses.length)];
  }

  private applyPersonalityModifiers(response: string, modifiers: any): string {
    // Apply personality modifications to the response based on modifiers
    let modifiedResponse = response;

    if (modifiers.dominance > 0.7) {
      modifiedResponse = modifiedResponse.replace(/I think/g, 'I know');
      modifiedResponse = modifiedResponse.replace(/maybe/g, 'definitely');
    }

    if (modifiers.empathy > 0.7) {
      modifiedResponse = `I understand your perspective. ${modifiedResponse}`;
    }

    if (modifiers.analytical > 0.8) {
      modifiedResponse = `Based on my analysis, ${modifiedResponse}`;
    }

    if (modifiers.urgency === 'high') {
      modifiedResponse = `This requires immediate attention. ${modifiedResponse}`;
    }

    return modifiedResponse;
  }

  private generateActionItems(executive: ExecutiveEntity, interaction: ExecutiveInteraction): string[] {
    // Generate role-specific action items based on executive and interaction
    const baseActions = [
      `Follow up on ${interaction.context.topic}`,
      `Review related documentation`,
      `Schedule follow-up meeting if needed`
    ];

    // Add role-specific actions
    const roleSpecificActions: Record<string, string[]> = {
      'CEO': [`Review strategic implications with board`, `Assess company-wide impact`],
      'CFO': [`Analyze financial impact`, `Update budget forecasts`],
      'CTO': [`Evaluate technical requirements`, `Assess technology roadmap impact`],
      'CMO': [`Review marketing implications`, `Assess customer impact`],
      'COO': [`Evaluate operational changes needed`, `Review process implications`],
      'CHRO': [`Assess talent implications`, `Review organizational impact`],
      'CLO': [`Review legal compliance`, `Assess regulatory requirements`],
      'CSO': [`Analyze competitive implications`, `Review strategic alignment`]
    };

    const executiveActions = roleSpecificActions[executive.role] || [];
    return [...baseActions, ...executiveActions];
  }

  private assessFollowUpNeed(interaction: ExecutiveInteraction): boolean {
    return interaction.context.urgency === 'high' || interaction.context.urgency === 'critical';
  }

  private assessEscalationNeed(executive: ExecutiveEntity, interaction: ExecutiveInteraction): boolean {
    return interaction.context.urgency === 'critical' && executive.role !== 'CEO';
  }

  private estimateBusinessValue(interaction: ExecutiveInteraction): number {
    const urgencyMultipliers = {
      'low': 1000,
      'medium': 5000,
      'high': 25000,
      'critical': 100000
    };

    return urgencyMultipliers[interaction.context.urgency] || 1000;
  }

  private assessBusinessImpact(context: InteractionContext): 'low' | 'medium' | 'high' | 'critical' {
    return context.urgency === 'critical' ? 'critical' : 
           context.urgency === 'high' ? 'high' : 'medium';
  }

  private addToHistory(executiveId: string, interaction: ExecutiveInteraction): void {
    const history = this.interactionHistory.get(executiveId) || [];
    history.push(interaction);
    
    // Keep only last 100 interactions per executive
    if (history.length > 100) {
      history.shift();
    }
    
    this.interactionHistory.set(executiveId, history);
  }

  /**
   * Get interaction history for executive
   */
  public getInteractionHistory(executiveId: string): ExecutiveInteraction[] {
    return this.interactionHistory.get(executiveId) || [];
  }

  /**
   * Get active interactions
   */
  public getActiveInteractions(): ExecutiveInteraction[] {
    return Array.from(this.activeInteractions.values());
  }

  /**
   * Derive communication style from psychological profile
   */
  private deriveCommunicationStyle(profile: PsychologicalProfile): string {
    // Map leadership style and other traits to communication style
    if (profile.leadershipStyle === 'authoritative' && profile.dominanceIndex > 0.7) {
      return 'commanding';
    } else if (profile.leadershipStyle === 'collaborative' && profile.empathyLevel > 0.7) {
      return 'collaborative';
    } else if (profile.leadershipStyle === 'analytical' && profile.strategicThinking > 0.8) {
      return 'analytical';
    } else if (profile.leadershipStyle === 'visionary' && profile.innovationDrive > 0.7) {
      return 'inspirational';
    } else if (profile.emotionalIntelligence > 0.8) {
      return 'empathetic';
    } else if (profile.competitiveInstinct > 0.7) {
      return 'assertive';
    } else {
      return 'professional';
    }
  }

  /**
   * Derive confidence level from psychological profile
   */
  private deriveConfidenceLevel(profile: PsychologicalProfile): number {
    // Calculate confidence based on multiple psychological factors
    const baseConfidence = (
      profile.dominanceIndex * 0.3 +
      profile.strategicThinking * 0.2 +
      profile.leadershipStyle === 'authoritative' ? 0.2 : 0.1 +
      profile.emotionalIntelligence * 0.15 +
      profile.competitiveInstinct * 0.15
    );

    // Adjust for stress response
    const stressAdjustment = profile.stressResponse === 'calm' ? 0.1 :
                           profile.stressResponse === 'focused' ? 0.05 :
                           profile.stressResponse === 'adaptive' ? 0.0 : -0.05;

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, baseConfidence + stressAdjustment));
  }
}
