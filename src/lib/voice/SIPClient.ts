import { UserAgent, Inviter, Invitation, SessionState } from 'sip.js';
import { AudioProcessor } from './AudioProcessor';
import { ExecutiveVoiceRouter } from './ExecutiveVoiceRouter';

export interface SIPConfig {
  uri: string;
  transportOptions: {
    server: string;
    connectionTimeout?: number;
    maxReconnectionAttempts?: number;
    reconnectionTimeout?: number;
  };
  authorizationUsername?: string;
  authorizationPassword?: string;
  displayName?: string;
}

export interface CallSession {
  id: string;
  executive: string;
  remoteUri: string;
  state: SessionState;
  startTime: Date;
  duration: number;
  isInbound: boolean;
  audioStream?: MediaStream;
}

export class SIPClient {
  private ua: UserAgent | null = null;
  private audioProcessor: AudioProcessor;
  private voiceRouter: ExecutiveVoiceRouter;
  private activeSessions: Map<string, CallSession> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    private config: SIPConfig,
    audioProcessor?: AudioProcessor,
    voiceRouter?: ExecutiveVoiceRouter
  ) {
    this.audioProcessor = audioProcessor || new AudioProcessor();
    this.voiceRouter = voiceRouter || new ExecutiveVoiceRouter();
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('registered', []);
    this.eventListeners.set('unregistered', []);
    this.eventListeners.set('registrationFailed', []);
    this.eventListeners.set('invite', []);
    this.eventListeners.set('connected', []);
    this.eventListeners.set('disconnected', []);
    this.eventListeners.set('failed', []);
    this.eventListeners.set('bye', []);
  }

  public async initialize(): Promise<void> {
    try {
      // Create User Agent
      const uri = UserAgent.makeURI(this.config.uri);
      if (!uri) {
        throw new Error(`Failed to create valid URI from ${this.config.uri}`);
      }

      this.ua = new UserAgent({
        uri: uri,
        transportOptions: this.config.transportOptions,
        authorizationUsername: this.config.authorizationUsername,
        authorizationPassword: this.config.authorizationPassword,
        displayName: this.config.displayName,
        delegate: {
          onInvite: this.handleIncomingCall.bind(this),
          onConnect: () => this.emit('connected'),
          onDisconnect: () => this.emit('disconnected'),
        },
        allowLegacyNotifications: true,
        contactName: this.config.displayName,
        contactParams: {},
        forceRport: false,
        logLevel: 'warn',
        noAnswerTimeout: 60,
        sessionDescriptionHandlerFactoryOptions: {
          constraints: {
            audio: true,
            video: false
          },
          peerConnectionConfiguration: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        },
        userAgentString: 'SOVREN AI Executive Command Center v1.0'
      });

      // Set up event handlers
      this.ua.delegate = {
        onInvite: this.handleIncomingCall.bind(this),
        onConnect: () => this.emit('connected'),
        onDisconnect: () => this.emit('disconnected'),
      };

      // Start the User Agent
      await this.ua.start();
      
      console.log('SIP Client initialized successfully');
      this.emit('registered');
      
    } catch (error) {
      console.error('Failed to initialize SIP Client:', error);
      this.emit('registrationFailed', error);
      throw error;
    }
  }

  public async makeCall(targetUri: string, executiveId: string): Promise<string> {
    if (!this.ua) {
      throw new Error('SIP Client not initialized');
    }

    try {
      const target = UserAgent.makeURI(targetUri);
      if (!target) {
        throw new Error(`Failed to create valid URI from ${targetUri}`);
      }

      const inviter = new Inviter(this.ua, target, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      });

      const sessionId = this.generateSessionId();
      const callSession: CallSession = {
        id: sessionId,
        executive: executiveId,
        remoteUri: targetUri,
        state: SessionState.Initial,
        startTime: new Date(),
        duration: 0,
        isInbound: false
      };

      this.activeSessions.set(sessionId, callSession);

      // Set up session event handlers
      inviter.delegate = {
        onBye: () => this.handleCallEnd(sessionId),
        onSessionDescriptionHandler: (sdh) => {
          if (sdh && (sdh as any).peerConnection) {
            const streams = (sdh as any).peerConnection?.getLocalStreams();
            if (streams && streams.length > 0) {
              callSession.audioStream = streams[0];
              if (callSession.audioStream) {
                this.audioProcessor.processOutboundAudio(callSession.audioStream, executiveId);
              }
            }
          }
        }
      };

      // Send the INVITE
      await inviter.invite();
      
      console.log(`Outbound call initiated: ${sessionId} for executive ${executiveId}`);
      this.emit('invite', callSession);
      
      return sessionId;
      
    } catch (error) {
      console.error('Failed to make call:', error);
      throw error;
    }
  }

  private async handleIncomingCall(invitation: Invitation): Promise<void> {
    const sessionId = this.generateSessionId();
    const assignedExecutive = await this.voiceRouter.assignExecutive(invitation.remoteIdentity.uri.toString());
    
    const callSession: CallSession = {
      id: sessionId,
      executive: assignedExecutive,
      remoteUri: invitation.remoteIdentity.uri.toString(),
      state: invitation.state,
      startTime: new Date(),
      duration: 0,
      isInbound: true
    };

    this.activeSessions.set(sessionId, callSession);

    // Set up invitation event handlers
    invitation.delegate = {
      onBye: () => this.handleCallEnd(sessionId),
      onSessionDescriptionHandler: (sdh) => {
        if (sdh && (sdh as any).peerConnection) {
          callSession.audioStream = (sdh as any).peerConnection?.getRemoteStreams()?.[0];
          if (callSession.audioStream) {
            this.audioProcessor.processInboundAudio(callSession.audioStream, assignedExecutive);
          }
        }
      }
    };

    console.log(`Incoming call received: ${sessionId} assigned to ${assignedExecutive}`);
    this.emit('invite', callSession);

    // Auto-accept for now (in production, this would be configurable)
    try {
      await invitation.accept();
      callSession.state = SessionState.Established;
      this.emit('connected', callSession);
    } catch (error) {
      console.error('Failed to accept incoming call:', error);
      this.handleCallEnd(sessionId);
    }
  }

  private handleCallEnd(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.duration = Date.now() - session.startTime.getTime();
      console.log(`Call ended: ${sessionId}, duration: ${session.duration}ms`);
      
      // Clean up audio processing
      if (session.audioStream) {
        this.audioProcessor.stopProcessing(session.audioStream);
      }
      
      this.activeSessions.delete(sessionId);
      this.emit('bye', session);
    }
  }

  public async endCall(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Implementation would depend on whether it's an Inviter or Invitation
    // For now, we'll simulate ending the call
    this.handleCallEnd(sessionId);
  }

  public getActiveSessions(): CallSession[] {
    return Array.from(this.activeSessions.values());
  }

  public getSessionById(sessionId: string): CallSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

  public async disconnect(): Promise<void> {
    if (this.ua) {
      // End all active sessions
      for (const sessionId of this.activeSessions.keys()) {
        await this.endCall(sessionId);
      }
      
      // Stop the User Agent
      await this.ua.stop();
      this.ua = null;
      
      console.log('SIP Client disconnected');
      this.emit('disconnected');
    }
  }
}
