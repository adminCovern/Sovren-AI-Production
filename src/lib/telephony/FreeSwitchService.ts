/**
 * FreeSWITCH Integration Service
 * Handles PBX functionality, call routing, and SIP trunk management
 */

import { EventSocket, FreeSwitchEvent } from 'modesl';
import { UserPhoneAllocation } from './SkyetelService';
import * as fs from 'fs/promises';
import * as path from 'path';
import { whisperASRService } from '../voice/WhisperASRService';

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
  audioQuality?: number;
  latency?: number;
  packetsLost?: number;
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

  /** Get dialplan directory (override via FREESWITCH_DIALPLAN_DIR) */
  private getDialplanDir(): string {
    return process.env.FREESWITCH_DIALPLAN_DIR || '/data/freeswitch/conf/dialplan/public';
  }

  /** Get scripts directory (override via FREESWITCH_SCRIPTS_DIR) */
  private getScriptsDir(): string {
    return process.env.FREESWITCH_SCRIPTS_DIR || '/data/freeswitch/scripts';
  }

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

      // Ensure Lua handler scripts are present
      await this.ensureLuaHandlers();

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
      if (allocation.phoneNumbers.sovrenAI) {
        this.routingRules.set(allocation.phoneNumbers.sovrenAI, {
          phoneNumber: allocation.phoneNumbers.sovrenAI,
          userId: allocation.userId,
          executiveRole: 'sovren-ai',
          autoAnswer: true,
          recordCall: true,
          transcribeCall: true
        });
      }

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
   * Generate and persist FreeSWITCH dialplan for user, then reload
   */
  private async generateUserDialplan(allocation: UserPhoneAllocation): Promise<void> {
    const dialplanXml = this.generateDialplanXML(allocation);

    const dir = this.getDialplanDir();
    const fileName = `sovren_${allocation.userId}.xml`;
    const fullPath = path.join(dir, fileName);

    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, dialplanXml, { encoding: 'utf8' });
      console.log(`📝 Dialplan written: ${fullPath}`);

      // Reload FreeSWITCH XML to apply changes
      if (this.eslConnection) {
        await this.eslConnection.api('reloadxml');
        console.log('🔄 FreeSWITCH dialplan reloaded (reloadxml)');
      } else {
        console.warn('⚠️ ESL not connected; cannot auto-reload dialplan');
      }
    } catch (err) {
      console.error('❌ Failed to write/reload dialplan:', err);
      throw err;
    }
  }

  /**
   * Ensure required Lua handler scripts exist in FreeSWITCH scripts dir
   */
  private async ensureLuaHandlers(): Promise<void> {
    const scriptsDir = this.getScriptsDir();
    await fs.mkdir(scriptsDir, { recursive: true });

    const files: Array<{ name: string; content: string }> = [
      {
        name: 'sovren_call_handler.lua',
        content: `-- SOVREN Inbound Call Handler\n-- args: userId, role, number\napi = require('api')\ncall_api = api:executeString\nuserId = argv[1] or ''\nrole = argv[2] or ''\nnumber = argv[3] or ''\n-- Set standard vars\nsession:setVariable('playback_terminators', 'none')\nsession:answer()\nsession:sleep(500)\n-- Tag channel\nsession:setVariable('sovren_user_id', userId)\nsession:setVariable('sovren_role', role)\nsession:setVariable('sovren_number', number)\n-- Bridge to app media pipeline (placeholder: music on hold)\nsession:execute('progress')\nsession:execute('playback', 'local_stream://moh')\n`,
      },
      {
        name: 'sovren_outbound_handler.lua',
        content: `-- SOVREN Outbound Call Handler\n-- args: userId, role, fromNumber\napi = require('api')\ncall_api = api:executeString\nuserId = argv[1] or ''\nrole = argv[2] or ''\nfromNumber = argv[3] or ''\nsession:setVariable('effective_caller_id_number', fromNumber)\nsession:setVariable('sovren_user_id', userId)\nsession:setVariable('sovren_role', role)\nsession:answer()\nsession:sleep(200)\n`,
      },
    ];

    for (const f of files) {
      const full = path.join(scriptsDir, f.name);
      try {
        await fs.access(full);
      } catch {
        await fs.writeFile(full, f.content, { encoding: 'utf8' });
        console.log(`📝 Wrote Lua handler: ${full}`);
      }
    }
  }

  /**
   * Generate XML dialplan configuration
   */
  private generateDialplanXML(allocation: UserPhoneAllocation): string {
    const allNumbers: Array<{ number: string; role: string }> = [];

    // Add SOVREN AI number if available
    if (allocation.phoneNumbers.sovrenAI) {
      allNumbers.push({ number: allocation.phoneNumbers.sovrenAI, role: 'sovren-ai' });
    }

    // Add executive numbers
    Object.entries(allocation.phoneNumbers.executives).forEach(([role, number]) => {
      if (number) {
        allNumbers.push({ number, role });
      }
    });

    // Use public context for inbound from external profile
    // Allow overriding recordings dir via env; default to B200 path
    const recordingsDir = process.env.FREESWITCH_RECORDINGS_DIR || '/data/freeswitch/recordings';

    let dialplanXml = `
<!-- SOVREN AI Dialplan for User ${allocation.userId} -->
<include>
  <context name="public">
`;

    for (const { number, role } of allNumbers) {
      const dest = (number || '').replace('+1', '');
      // Match 10-digit, 11-digit (1NPA), or E.164 (+1NPA)
      const expr = `^(?:\\+?1)?${dest}$`;
      dialplanXml += `
    <extension name="${role}_${allocation.userId}">
      <condition field="destination_number" expression="${expr}">
        <action application="set" data="call_timeout=30"/>
        <action application="set" data="hangup_after_bridge=true"/>
        <action application="set" data="continue_on_fail=true"/>
        <action application="record_session" data="${recordingsDir}/${allocation.userId}_${role}_` + '${uuid}' + `.wav"/>
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

      // Capture recording file if set by record_session
      const recPath = event.getHeader('variable_record_session_path') || event.getHeader('record_path') || '';
      if (recPath) {
        (callSession as any).recordingPath = recPath;
      }

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

      const recPath: string | undefined = (callSession as any).recordingPath;
      const pathFromSession = recPath || '';

      if (!pathFromSession) {
        console.warn('ℹ️ No recording path found on call session; skipping transcription');
        return;
      }

      // Transcribe recording with local Whisper (whisper.cpp)
      const result = await whisperASRService.transcribeFile(pathFromSession, 'en');
      console.log('📝 Transcription summary:', {
        textPreview: result.text.slice(0, 160),
        durationSec: result.audioLength,
        confidence: result.confidence,
      });

      // TODO: persist transcript JSON next to WAV, or to DB
      // const transcriptPath = pathFromSession.replace(/\.wav$/i, '.json');
      // await fs.writeFile(transcriptPath, JSON.stringify(result, null, 2), 'utf8');

    } catch (error) {
      console.error('Failed to process call recording:', error);
    }
  }

  /**
   * Accept an incoming call
   */
  public async acceptIncomingCall(phoneNumber: string, callerNumber: string): Promise<boolean> {
    try {
      // Find the call session for this incoming call
      const callSession = Array.from(this.activeCalls.values()).find(
        call => call.phoneNumber === phoneNumber && call.callerNumber === callerNumber && call.status === 'ringing'
      );

      if (!callSession) {
        console.warn(`⚠️ No ringing call found for ${callerNumber} → ${phoneNumber}`);
        return false;
      }

      // In a real implementation, this would send an answer command to FreeSWITCH
      if (this.eslConnection) {
        try {
          // Send answer command to FreeSWITCH
          await this.eslConnection.api(`uuid_answer ${callSession.callId}`);

          // Update call status
          callSession.status = 'answered';

          console.log(`✅ Call accepted via FreeSWITCH: ${callSession.callId}`);
          return true;

        } catch (eslError) {
          console.error('❌ Failed to send answer command to FreeSWITCH:', eslError);
          return false;
        }
      } else {
        // Simulate accepting the call if no ESL connection
        callSession.status = 'answered';
        console.log(`✅ Call accepted (simulated): ${callSession.callId}`);
        return true;
      }

    } catch (error) {
      console.error('❌ Failed to accept incoming call:', error);
      return false;
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
   * Get call session by ID
   */
  public getCallSession(callId: string): CallSession | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Hang up a call
   */
  public async hangupCall(callId: string): Promise<boolean> {
    try {
      if (this.eslConnection) {
        await this.eslConnection.api(`uuid_kill ${callId}`);
      }

      const callSession = this.activeCalls.get(callId);
      if (callSession) {
        callSession.status = 'ended';
        this.activeCalls.delete(callId);
      }

      return true;
    } catch (error) {
      console.error('Failed to hang up call:', error);
      return false;
    }
  }

  /**
   * Connect audio stream to call
   */
  public async connectAudioStream(callId: string, audioStream: any): Promise<boolean> {
    try {
      console.log(`🎵 Connecting audio stream to call ${callId}`);
      // Implementation would connect audio stream to FreeSWITCH
      return true;
    } catch (error) {
      console.error('Failed to connect audio stream:', error);
      return false;
    }
  }

  /**
   * Check if FreeSWITCH is connected
   */
  public get isConnected(): boolean {
    return !!this.eslConnection;
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
