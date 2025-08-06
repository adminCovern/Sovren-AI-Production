/**
 * FreeSWITCH Integration Service
 * Handles PBX functionality, call routing, and SIP trunk management
 */

import { EventSocket, FreeSwitchEvent } from 'modesl';
import { UserPhoneAllocation } from './SkyetelService';

export interface FreeSwitchConfig {
  host: string;
  port: number;
  eslPort: number;
  eslPassword: string;
  sipDomain: string;
}

export interface CallSession {
  callId: string;
  userId: string;
  executiveRole: string;
  phoneNumber: string;
  callerNumber: string;
  startTime: Date;
  status: 'ringing' | 'answered' | 'ended' | 'failed';
  duration?: number;
}

export interface CallRoutingRule {
  phoneNumber: string;
  userId: string;
  executiveRole: string;
  autoAnswer: boolean;
  recordCall: boolean;
  transcribeCall: boolean;
}

export class FreeSwitchService {
  private eslConnection: EventSocket | null = null;
  private activeCalls: Map<string, CallSession> = new Map();
  private routingRules: Map<string, CallRoutingRule> = new Map();

  constructor(private config: FreeSwitchConfig) {}

  /**
   * Initialize FreeSWITCH connection
   */
  public async initialize(): Promise<boolean> {
    try {
      console.log(`🔌 Connecting to FreeSWITCH ESL at ${this.config.host}:${this.config.eslPort}...`);

      this.eslConnection = new EventSocket({
        host: this.config.host,
        port: this.config.eslPort,
        password: this.config.eslPassword
      });

      await new Promise((resolve, reject) => {
        this.eslConnection!.on('connect', () => {
          console.log('✅ Connected to FreeSWITCH ESL');
          resolve(true);
        });

        this.eslConnection!.on('error', (error: Error) => {
          console.error('❌ FreeSWITCH ESL connection error:', error);
          reject(error);
        });

        this.eslConnection!.connect();
      });

      // Subscribe to call events
      await this.subscribeToCallEvents();

      return true;

    } catch (error) {
      console.error('Failed to initialize FreeSWITCH connection:', error);
      return false;
    }
  }

  /**
   * Configure call routing for user's phone allocation
   */
  public async configureUserRouting(allocation: UserPhoneAllocation): Promise<boolean> {
    try {
      console.log(`📞 Configuring call routing for user ${allocation.userId}...`);

      // Configure SOVREN AI main number
      this.routingRules.set(allocation.phoneNumbers.sovrenAI, {
        phoneNumber: allocation.phoneNumbers.sovrenAI,
        userId: allocation.userId,
        executiveRole: 'sovren-ai',
        autoAnswer: true,
        recordCall: true,
        transcribeCall: true
      });

      // Configure executive numbers
      const executiveRoles = Object.keys(allocation.phoneNumbers.executives) as Array<keyof typeof allocation.phoneNumbers.executives>;
      
      for (const role of executiveRoles) {
        const phoneNumber = allocation.phoneNumbers.executives[role];
        if (phoneNumber) {
          this.routingRules.set(phoneNumber, {
            phoneNumber: phoneNumber,
            userId: allocation.userId,
            executiveRole: role,
            autoAnswer: false,
            recordCall: true,
            transcribeCall: true
          });
        }
      }

      // Generate FreeSWITCH dialplan for this user
      await this.generateUserDialplan(allocation);

      console.log(`✅ Call routing configured for user ${allocation.userId}`);
      return true;

    } catch (error) {
      console.error('Failed to configure user routing:', error);
      return false;
    }
  }

  /**
   * Generate FreeSWITCH dialplan for user
   */
  private async generateUserDialplan(allocation: UserPhoneAllocation): Promise<void> {
    const dialplanXml = this.generateDialplanXML(allocation);
    
    // Write dialplan to FreeSWITCH configuration
    // In production, this would write to /etc/freeswitch/dialplan/
    console.log(`📝 Generated dialplan for user ${allocation.userId}`);
    console.log(dialplanXml);
  }

  /**
   * Generate XML dialplan configuration
   */
  private generateDialplanXML(allocation: UserPhoneAllocation): string {
    const allNumbers = [
      { number: allocation.phoneNumbers.sovrenAI, role: 'sovren-ai' },
      ...Object.entries(allocation.phoneNumbers.executives).map(([role, number]) => ({ number, role }))
    ].filter(item => item.number);

    let dialplanXml = `
<!-- SOVREN AI Dialplan for User ${allocation.userId} -->
<include>
  <context name="sovren_${allocation.userId}">
`;

    for (const { number, role } of allNumbers) {
      dialplanXml += `
    <extension name="${role}_${allocation.userId}">
      <condition field="destination_number" expression="^${number.replace('+1', '')}$">
        <action application="set" data="call_timeout=30"/>
        <action application="set" data="hangup_after_bridge=true"/>
        <action application="set" data="continue_on_fail=true"/>
        <action application="record_session" data="/var/lib/freeswitch/recordings/${allocation.userId}_${role}_\${strftime(%Y%m%d_%H%M%S)}.wav"/>
        <action application="lua" data="sovren_call_handler.lua ${allocation.userId} ${role} ${number}"/>
      </condition>
    </extension>
`;
    }

    dialplanXml += `
  </context>
</include>
`;

    return dialplanXml;
  }

  /**
   * Subscribe to FreeSWITCH call events
   */
  private async subscribeToCallEvents(): Promise<void> {
    if (!this.eslConnection) return;

    // Subscribe to call events
    await this.eslConnection.subscribe([
      'CHANNEL_CREATE',
      'CHANNEL_ANSWER',
      'CHANNEL_HANGUP',
      'CHANNEL_BRIDGE'
    ]);

    this.eslConnection.on('CHANNEL_CREATE', (event: FreeSwitchEvent) => {
      this.handleCallStart(event);
    });

    this.eslConnection.on('CHANNEL_ANSWER', (event: FreeSwitchEvent) => {
      this.handleCallAnswer(event);
    });

    this.eslConnection.on('CHANNEL_HANGUP', (event: FreeSwitchEvent) => {
      this.handleCallEnd(event);
    });

    console.log('📡 Subscribed to FreeSWITCH call events');
  }

  /**
   * Handle incoming call start
   */
  private handleCallStart(event: FreeSwitchEvent): void {
    const destinationNumber = event.getHeader('Destination-Number');
    const callerNumber = event.getHeader('Caller-Caller-ID-Number');
    const callId = event.getHeader('Unique-ID');

    // Validate required headers
    if (!destinationNumber || !callerNumber || !callId) {
      console.warn('⚠️ Missing required headers in CHANNEL_CREATE event');
      return;
    }

    const routingRule = this.routingRules.get(`+1${destinationNumber}`);

    if (routingRule) {
      const callSession: CallSession = {
        callId,
        userId: routingRule.userId,
        executiveRole: routingRule.executiveRole,
        phoneNumber: routingRule.phoneNumber,
        callerNumber,
        startTime: new Date(),
        status: 'ringing'
      };

      this.activeCalls.set(callId, callSession);

      console.log(`📞 Incoming call: ${callerNumber} → ${routingRule.executiveRole} (${routingRule.phoneNumber})`);

      // Notify SOVREN AI system about incoming call
      this.notifySOVRENSystem(callSession);
    }
  }

  /**
   * Handle call answer
   */
  private handleCallAnswer(event: FreeSwitchEvent): void {
    const callId = event.getHeader('Unique-ID');

    if (!callId) {
      console.warn('⚠️ Missing Unique-ID header in CHANNEL_ANSWER event');
      return;
    }

    const callSession = this.activeCalls.get(callId);

    if (callSession) {
      callSession.status = 'answered';
      console.log(`✅ Call answered: ${callSession.executiveRole} (${callSession.callId})`);
    }
  }

  /**
   * Handle call end
   */
  private handleCallEnd(event: FreeSwitchEvent): void {
    const callId = event.getHeader('Unique-ID');

    if (!callId) {
      console.warn('⚠️ Missing Unique-ID header in CHANNEL_HANGUP event');
      return;
    }

    const callSession = this.activeCalls.get(callId);

    if (callSession) {
      const endTime = new Date();
      callSession.duration = Math.floor((endTime.getTime() - callSession.startTime.getTime()) / 1000);
      callSession.status = 'ended';

      console.log(`📞 Call ended: ${callSession.executiveRole} (Duration: ${callSession.duration}s)`);

      // Process call recording and transcription
      this.processCallRecording(callSession);

      this.activeCalls.delete(callId);
    }
  }

  /**
   * Notify SOVREN AI system about call events
   */
  private async notifySOVRENSystem(callSession: CallSession): Promise<void> {
    try {
      // This would integrate with the main SOVREN AI system
      // to trigger the appropriate executive AI to handle the call
      console.log(`🧠 Notifying SOVREN AI: ${callSession.executiveRole} call from ${callSession.callerNumber}`);
      
      // In production, this would:
      // 1. Load the appropriate executive AI model
      // 2. Initialize voice synthesis for the executive
      // 3. Prepare business context for the call
      // 4. Start real-time conversation handling
      
    } catch (error) {
      console.error('Failed to notify SOVREN system:', error);
    }
  }

  /**
   * Process call recording and transcription
   */
  private async processCallRecording(callSession: CallSession): Promise<void> {
    try {
      console.log(`🎙️ Processing recording for call ${callSession.callId}...`);
      
      // In production, this would:
      // 1. Process the recorded audio file
      // 2. Generate transcription using Whisper
      // 3. Store call data in database
      // 4. Update user's call history
      // 5. Generate call summary and insights
      
    } catch (error) {
      console.error('Failed to process call recording:', error);
    }
  }

  /**
   * Get active calls for a user
   */
  public getActiveCallsForUser(userId: string): CallSession[] {
    return Array.from(this.activeCalls.values()).filter(call => call.userId === userId);
  }

  /**
   * Initiate outbound call
   */
  public async initiateOutboundCall(
    userId: string,
    executiveRole: string,
    fromNumber: string,
    toNumber: string
  ): Promise<string | null> {
    try {
      if (!this.eslConnection) {
        throw new Error('FreeSWITCH not connected');
      }

      const callId = `outbound_${Date.now()}`;
      
      // Originate call through FreeSWITCH
      const command = `originate sofia/gateway/skyetel/${toNumber} &lua(sovren_outbound_handler.lua ${userId} ${executiveRole} ${fromNumber})`;
      
      await this.eslConnection.api(command);
      
      console.log(`📞 Initiated outbound call: ${fromNumber} → ${toNumber} (${executiveRole})`);
      
      return callId;

    } catch (error) {
      console.error('Failed to initiate outbound call:', error);
      return null;
    }
  }

  /**
   * Disconnect from FreeSWITCH
   */
  public async disconnect(): Promise<void> {
    if (this.eslConnection) {
      this.eslConnection.disconnect();
      this.eslConnection = null;
      console.log('🔌 Disconnected from FreeSWITCH ESL');
    }
  }
}
