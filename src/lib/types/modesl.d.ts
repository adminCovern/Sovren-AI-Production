/**
 * Type definitions for modesl (FreeSWITCH Event Socket Library)
 * Provides comprehensive TypeScript support for FreeSWITCH ESL integration
 */

declare module 'modesl' {
  import { EventEmitter } from 'events';

  /**
   * Configuration options for EventSocket connection
   */
  export interface EventSocketConfig {
    host: string;
    port: number;
    password: string;
    timeout?: number;
    reconnect?: boolean;
    reconnectInterval?: number;
  }

  /**
   * FreeSWITCH Event object interface
   * Represents events received from FreeSWITCH ESL
   */
  export interface FreeSwitchEvent {
    /**
     * Get header value from the event
     * @param headerName - Name of the header to retrieve
     * @returns Header value or undefined if not found
     */
    getHeader(headerName: string): string | undefined;

    /**
     * Get all headers from the event
     * @returns Object containing all event headers
     */
    getHeaders(): Record<string, string>;

    /**
     * Get the event body content
     * @returns Event body as string
     */
    getBody(): string;

    /**
     * Get the event type
     * @returns Event type string
     */
    getType(): string;

    /**
     * Serialize the event to string
     * @returns String representation of the event
     */
    serialize(): string;

    /**
     * Get event as plain object
     * @returns Event data as plain object
     */
    getPlainObject(): Record<string, any>;
  }

  /**
   * Event handler function type
   */
  export type EventHandler = (event: FreeSwitchEvent) => void;

  /**
   * Error handler function type
   */
  export type ErrorHandler = (error: Error) => void;

  /**
   * Connection handler function type
   */
  export type ConnectionHandler = () => void;

  /**
   * FreeSWITCH Event Socket client
   * Provides connection and communication with FreeSWITCH ESL
   */
  export class EventSocket extends EventEmitter {
    /**
     * Create new EventSocket instance
     * @param config - Connection configuration
     */
    constructor(config: EventSocketConfig);

    /**
     * Connect to FreeSWITCH ESL server
     * @returns Promise that resolves when connected
     */
    connect(): Promise<void>;

    /**
     * Disconnect from FreeSWITCH ESL server
     */
    disconnect(): void;

    /**
     * Subscribe to FreeSWITCH events
     * @param events - Array of event names to subscribe to
     * @returns Promise that resolves when subscription is complete
     */
    subscribe(events: string[]): Promise<void>;

    /**
     * Execute FreeSWITCH API command
     * @param command - API command to execute
     * @returns Promise that resolves with command result
     */
    api(command: string): Promise<string>;

    /**
     * Execute FreeSWITCH background API command
     * @param command - API command to execute
     * @returns Promise that resolves with job UUID
     */
    bgapi(command: string): Promise<string>;

    /**
     * Send arbitrary command to FreeSWITCH
     * @param command - Command to send
     * @returns Promise that resolves with response
     */
    send(command: string): Promise<string>;

    /**
     * Filter events based on criteria
     * @param header - Header name to filter on
     * @param value - Header value to match
     * @returns Promise that resolves when filter is applied
     */
    filter(header: string, value: string): Promise<void>;

    /**
     * Set event format
     * @param format - Event format ('plain', 'xml', 'json')
     * @returns Promise that resolves when format is set
     */
    setEventFormat(format: 'plain' | 'xml' | 'json'): Promise<void>;

    /**
     * Enable or disable events
     * @param enabled - Whether to enable events
     * @returns Promise that resolves when setting is applied
     */
    setEvents(enabled: boolean): Promise<void>;

    // Event emitter overrides with proper typing
    on(event: 'connect', listener: ConnectionHandler): this;
    on(event: 'disconnect', listener: ConnectionHandler): this;
    on(event: 'error', listener: ErrorHandler): this;
    on(event: 'ready', listener: ConnectionHandler): this;
    on(event: string, listener: EventHandler): this;

    once(event: 'connect', listener: ConnectionHandler): this;
    once(event: 'disconnect', listener: ConnectionHandler): this;
    once(event: 'error', listener: ErrorHandler): this;
    once(event: 'ready', listener: ConnectionHandler): this;
    once(event: string, listener: EventHandler): this;

    emit(event: 'connect'): boolean;
    emit(event: 'disconnect'): boolean;
    emit(event: 'error', error: Error): boolean;
    emit(event: 'ready'): boolean;
    emit(event: string, eventData: FreeSwitchEvent): boolean;

    off(event: 'connect', listener: ConnectionHandler): this;
    off(event: 'disconnect', listener: ConnectionHandler): this;
    off(event: 'error', listener: ErrorHandler): this;
    off(event: 'ready', listener: ConnectionHandler): this;
    off(event: string, listener: EventHandler): this;

    removeListener(event: 'connect', listener: ConnectionHandler): this;
    removeListener(event: 'disconnect', listener: ConnectionHandler): this;
    removeListener(event: 'error', listener: ErrorHandler): this;
    removeListener(event: 'ready', listener: ConnectionHandler): this;
    removeListener(event: string, listener: EventHandler): this;

    removeAllListeners(event?: string): this;
  }

  /**
   * FreeSWITCH Connection class for outbound socket connections
   */
  export class Connection extends EventEmitter {
    constructor(socket: any);
    
    execute(command: string, args?: string): Promise<FreeSwitchEvent>;
    executeAsync(command: string, args?: string): Promise<string>;
    api(command: string): Promise<string>;
    bgapi(command: string): Promise<string>;
    
    on(event: 'connect', listener: ConnectionHandler): this;
    on(event: 'error', listener: ErrorHandler): this;
    on(event: string, listener: EventHandler): this;
  }

  /**
   * FreeSWITCH Server class for inbound socket server
   */
  export class Server extends EventEmitter {
    constructor(options: { port: number; host?: string });
    
    listen(callback?: () => void): void;
    close(callback?: () => void): void;
    
    on(event: 'connection', listener: (connection: Connection) => void): this;
    on(event: 'error', listener: ErrorHandler): this;
  }

  // Export commonly used event types
  export const CHANNEL_EVENTS: {
    CHANNEL_CREATE: 'CHANNEL_CREATE';
    CHANNEL_DESTROY: 'CHANNEL_DESTROY';
    CHANNEL_ANSWER: 'CHANNEL_ANSWER';
    CHANNEL_HANGUP: 'CHANNEL_HANGUP';
    CHANNEL_BRIDGE: 'CHANNEL_BRIDGE';
    CHANNEL_UNBRIDGE: 'CHANNEL_UNBRIDGE';
    CHANNEL_PROGRESS: 'CHANNEL_PROGRESS';
    CHANNEL_PROGRESS_MEDIA: 'CHANNEL_PROGRESS_MEDIA';
    CHANNEL_OUTGOING: 'CHANNEL_OUTGOING';
    CHANNEL_PARK: 'CHANNEL_PARK';
    CHANNEL_UNPARK: 'CHANNEL_UNPARK';
    CHANNEL_APPLICATION: 'CHANNEL_APPLICATION';
    CHANNEL_ORIGINATE: 'CHANNEL_ORIGINATE';
    CHANNEL_UUID: 'CHANNEL_UUID';
  };

  export const CALL_EVENTS: {
    CALL_SETUP_REQ: 'CALL_SETUP_REQ';
    CALL_SETUP_RESULT: 'CALL_SETUP_RESULT';
    CALL_UPDATE: 'CALL_UPDATE';
  };

  export const SYSTEM_EVENTS: {
    STARTUP: 'STARTUP';
    SHUTDOWN: 'SHUTDOWN';
    HEARTBEAT: 'HEARTBEAT';
    MODULE_LOAD: 'MODULE_LOAD';
    MODULE_UNLOAD: 'MODULE_UNLOAD';
    RELOADXML: 'RELOADXML';
  };
}
