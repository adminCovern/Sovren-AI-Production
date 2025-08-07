import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { EventEmitter } from 'events';
import { b200ResourceMonitor } from '../monitoring/B200ResourceMonitor';
import { authSystem } from '../auth/AuthenticationSystem';

/**
 * B200 Dashboard WebSocket Server
 * Provides real-time updates for GPU metrics, executive workloads, and alerts
 */

export interface WebSocketClient {
  id: string;
  socket: WebSocket;
  userId: string;
  subscriptions: Set<string>;
  lastPing: Date;
  authenticated: boolean;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'auth' | 'request';
  data?: any;
  timestamp?: string;
  clientId?: string;
}

export interface WebSocketResponse {
  type: 'metrics_update' | 'alert' | 'error' | 'pong' | 'auth_result' | 'subscription_result';
  data?: any;
  timestamp: string;
  success?: boolean;
  error?: string;
}

export class B200DashboardWebSocket extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private isRunning: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly heartbeatIntervalMs = 30000; // 30 seconds

  constructor() {
    super();
    this.setupMonitoringListeners();
  }

  /**
   * Start WebSocket server
   */
  public start(port: number = 8081): void {
    if (this.isRunning) {
      console.log('⚠️ B200 Dashboard WebSocket server already running');
      return;
    }

    console.log(`🚀 Starting B200 Dashboard WebSocket server on port ${port}...`);

    this.wss = new WebSocketServer({ 
      port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));

    this.isRunning = true;
    this.startHeartbeat();

    console.log(`✅ B200 Dashboard WebSocket server running on ws://localhost:${port}`);
  }

  /**
   * Stop WebSocket server
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping B200 Dashboard WebSocket server...');

    this.stopHeartbeat();
    
    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close(1000, 'Server shutting down');
    }
    this.clients.clear();

    // Close server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.isRunning = false;
    console.log('✅ B200 Dashboard WebSocket server stopped');
  }

  /**
   * Verify client connection
   */
  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    // In production, implement proper origin verification
    return true;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    
    const client: WebSocketClient = {
      id: clientId,
      socket,
      userId: '',
      subscriptions: new Set(),
      lastPing: new Date(),
      authenticated: false
    };

    this.clients.set(clientId, client);

    console.log(`🔌 New B200 Dashboard client connected: ${clientId}`);

    // Emit connection event
    this.emit('connection', clientId);

    // Set up client event handlers
    socket.on('message', (data) => this.handleMessage(clientId, data));
    socket.on('close', () => this.handleDisconnection(clientId));
    socket.on('error', (error) => this.handleClientError(clientId, error));

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'auth_result',
      data: { 
        clientId,
        message: 'Connected to B200 Dashboard WebSocket. Please authenticate.' 
      },
      timestamp: new Date().toISOString(),
      success: false
    });
  }

  /**
   * Handle client message
   */
  private async handleMessage(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'auth':
          await this.handleAuthentication(clientId, message.data);
          break;

        case 'subscribe':
          this.handleSubscription(clientId, message.data);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data);
          break;

        case 'ping':
          this.handlePing(clientId);
          break;

        case 'request':
          await this.handleRequest(clientId, message.data);
          break;

        default:
          this.sendError(clientId, `Unknown message type: ${message.type}`);
      }

    } catch (error) {
      console.error(`❌ Error handling message from client ${clientId}:`, error);
      this.sendError(clientId, 'Invalid message format');
    }
  }

  /**
   * Handle client authentication
   */
  private async handleAuthentication(clientId: string, authData: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { userId, token } = authData;

      if (!userId || !token) {
        this.sendToClient(clientId, {
          type: 'auth_result',
          data: { message: 'Missing userId or token' },
          timestamp: new Date().toISOString(),
          success: false,
          error: 'Authentication failed'
        });
        return;
      }

      // Verify token
      const authResult = await authSystem.verifyToken(token);
      if (!authResult.success) {
        this.sendToClient(clientId, {
          type: 'auth_result',
          data: { message: 'Invalid token' },
          timestamp: new Date().toISOString(),
          success: false,
          error: 'Authentication failed'
        });
        return;
      }

      // Update client
      client.userId = userId;
      client.authenticated = true;

      this.sendToClient(clientId, {
        type: 'auth_result',
        data: { 
          message: 'Authentication successful',
          userId,
          availableSubscriptions: [
            'gpu_metrics',
            'cluster_metrics', 
            'executive_workloads',
            'alerts',
            'performance_stats'
          ]
        },
        timestamp: new Date().toISOString(),
        success: true
      });

      console.log(`✅ Client ${clientId} authenticated as user ${userId}`);

    } catch (error) {
      console.error(`❌ Authentication error for client ${clientId}:`, error);
      this.sendError(clientId, 'Authentication failed');
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscription(clientId: string, subscriptionData: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Not authenticated');
      return;
    }

    const { channels } = subscriptionData;
    if (!Array.isArray(channels)) {
      this.sendError(clientId, 'Invalid subscription format');
      return;
    }

    const validChannels = ['gpu_metrics', 'cluster_metrics', 'executive_workloads', 'alerts', 'performance_stats'];
    const subscribedChannels: string[] = [];

    for (const channel of channels) {
      if (validChannels.includes(channel)) {
        client.subscriptions.add(channel);
        subscribedChannels.push(channel);
      }
    }

    this.sendToClient(clientId, {
      type: 'subscription_result',
      data: { 
        subscribedChannels,
        totalSubscriptions: client.subscriptions.size
      },
      timestamp: new Date().toISOString(),
      success: true
    });

    console.log(`📡 Client ${clientId} subscribed to: ${subscribedChannels.join(', ')}`);
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(clientId: string, unsubscriptionData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channels } = unsubscriptionData;
    if (!Array.isArray(channels)) {
      this.sendError(clientId, 'Invalid unsubscription format');
      return;
    }

    const unsubscribedChannels: string[] = [];
    for (const channel of channels) {
      if (client.subscriptions.has(channel)) {
        client.subscriptions.delete(channel);
        unsubscribedChannels.push(channel);
      }
    }

    this.sendToClient(clientId, {
      type: 'subscription_result',
      data: { 
        unsubscribedChannels,
        totalSubscriptions: client.subscriptions.size
      },
      timestamp: new Date().toISOString(),
      success: true
    });
  }

  /**
   * Handle ping request
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = new Date();
    
    this.sendToClient(clientId, {
      type: 'pong',
      data: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      success: true
    });
  }

  /**
   * Handle data request
   */
  private async handleRequest(clientId: string, requestData: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Not authenticated');
      return;
    }

    try {
      const { type } = requestData;
      let data;

      switch (type) {
        case 'current_metrics':
          data = await b200ResourceMonitor.getCurrentMetrics();
          break;
        case 'gpu_history':
          const { gpuId, limit } = requestData;
          data = b200ResourceMonitor.getGPUHistory(gpuId, limit);
          break;
        default:
          this.sendError(clientId, `Unknown request type: ${type}`);
          return;
      }

      this.sendToClient(clientId, {
        type: 'metrics_update',
        data,
        timestamp: new Date().toISOString(),
        success: true
      });

    } catch (error) {
      console.error(`❌ Request error for client ${clientId}:`, error);
      this.sendError(clientId, 'Request failed');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`🔌 Client ${clientId} disconnected`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle client error
   */
  private handleClientError(clientId: string, error: Error): void {
    console.error(`❌ Client ${clientId} error:`, error);
  }

  /**
   * Handle server error
   */
  private handleServerError(error: Error): void {
    console.error('❌ B200 Dashboard WebSocket server error:', error);
  }

  /**
   * Set up monitoring event listeners
   */
  private setupMonitoringListeners(): void {
    b200ResourceMonitor.on('metricsUpdate', (data) => {
      this.broadcastToSubscribers('gpu_metrics', {
        type: 'metrics_update',
        data,
        timestamp: new Date().toISOString()
      });
    });

    b200ResourceMonitor.on('newAlerts', (alerts) => {
      this.broadcastToSubscribers('alerts', {
        type: 'alert',
        data: { alerts },
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Broadcast message to subscribers
   */
  private broadcastToSubscribers(channel: string, message: WebSocketResponse): void {
    for (const client of this.clients.values()) {
      if (client.authenticated && client.subscriptions.has(channel)) {
        this.sendToClient(client.id, message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketResponse): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`❌ Error sending message to client ${clientId}:`, error);
      this.clients.delete(clientId);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, errorMessage: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      success: false
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleClients: string[] = [];

      for (const [clientId, client] of this.clients.entries()) {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        if (timeSinceLastPing > this.heartbeatIntervalMs * 2) {
          staleClients.push(clientId);
        }
      }

      // Remove stale clients
      for (const clientId of staleClients) {
        console.log(`🧹 Removing stale client: ${clientId}`);
        const client = this.clients.get(clientId);
        if (client) {
          client.socket.close(1000, 'Stale connection');
          this.clients.delete(clientId);
        }
      }

    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `b200-client-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get server status
   */
  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      connectedClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      totalSubscriptions: Array.from(this.clients.values()).reduce((sum, c) => sum + c.subscriptions.size, 0)
    };
  }
}

// Global WebSocket server instance
export const b200DashboardWebSocket = new B200DashboardWebSocket();
