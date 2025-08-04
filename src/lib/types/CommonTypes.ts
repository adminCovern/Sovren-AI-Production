/**
 * COMMON TYPE DEFINITIONS
 * Comprehensive type definitions for SOVREN AI system
 */

// Base types
export type UUID = string;
export type Timestamp = number;
export type EmailAddress = string;
export type PhoneNumber = string;
export type URL = string;

// User and Authentication Types
export interface UserProfile {
  id: UUID;
  email: EmailAddress;
  name: string;
  tier: 'SMB' | 'ENTERPRISE';
  avatar?: URL;
  preferences: UserPreferences;
  metadata: Record<string, unknown>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  voice: VoicePreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface VoicePreferences {
  enabled: boolean;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Timestamp;
  requestId?: UUID;
}

export interface ResponseMetadata {
  requestId: UUID;
  timestamp: Timestamp;
  processingTime: number;
  version: string;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Timestamp;
  retryAfter?: number;
}

// Event Types
export interface BaseEvent {
  id: UUID;
  type: string;
  timestamp: Timestamp;
  source: string;
  version: string;
}

export interface UserEvent extends BaseEvent {
  userId: UUID;
  sessionId?: UUID;
  userAgent?: string;
  ipAddress?: string;
}

export interface SystemEvent extends BaseEvent {
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  details: Record<string, unknown>;
}

// Voice and Audio Types
export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  format: 'wav' | 'mp3' | 'ogg' | 'flac';
}

export interface VoiceModel {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  style: string;
  quality: 'low' | 'medium' | 'high' | 'premium';
  sampleRate: number;
  fileSize: number;
  version: string;
}

export interface SynthesisRequest {
  text: string;
  voice: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: AudioConfig['format'];
  quality?: VoiceModel['quality'];
}

export interface SynthesisResult {
  audioUrl: URL;
  audioBuffer?: ArrayBuffer;
  duration: number;
  format: AudioConfig['format'];
  metadata: {
    text: string;
    voice: string;
    processingTime: number;
    fileSize: number;
  };
}

// CRM and Integration Types
export interface CRMContact {
  id: UUID;
  firstName: string;
  lastName: string;
  email: EmailAddress;
  phone?: PhoneNumber;
  company?: string;
  title?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CRMDeal {
  id: UUID;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  contactId: UUID;
  ownerId: UUID;
  expectedCloseDate?: Timestamp;
  actualCloseDate?: Timestamp;
  notes: string;
  customFields: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IntegrationConfig {
  id: UUID;
  name: string;
  type: 'crm' | 'email' | 'calendar' | 'storage' | 'communication';
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
  lastSync?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Email Types
export interface EmailMessage {
  id: UUID;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyType: 'text' | 'html';
  attachments?: EmailAttachment[];
  priority: 'low' | 'normal' | 'high';
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  threadId?: UUID;
  inReplyTo?: UUID;
  createdAt: Timestamp;
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
}

export interface EmailAttachment {
  id: UUID;
  filename: string;
  contentType: string;
  size: number;
  url?: URL;
  data?: ArrayBuffer;
}

export interface EmailTemplate {
  id: UUID;
  name: string;
  subject: string;
  body: string;
  bodyType: 'text' | 'html';
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Shadow Board Types
export interface ExecutiveProfile {
  id: UUID;
  role: 'cfo' | 'cmo' | 'cto' | 'legal' | 'sovren';
  name: string;
  title: string;
  expertise: string[];
  personality: ExecutivePersonality;
  voice: VoiceModel;
  avatar?: URL;
  background: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface ExecutivePersonality {
  traits: string[];
  communicationStyle: 'formal' | 'casual' | 'technical' | 'diplomatic';
  decisionMaking: 'analytical' | 'intuitive' | 'collaborative' | 'decisive';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  catchphrases: string[];
}

export interface ExecutiveInteraction {
  id: UUID;
  executiveId: UUID;
  userId: UUID;
  type: 'consultation' | 'presentation' | 'negotiation' | 'analysis';
  topic: string;
  duration: number;
  outcome: string;
  satisfaction: number; // 1-10 scale
  notes?: string;
  createdAt: Timestamp;
}

// Configuration Types
export interface SystemConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: FeatureFlags;
  limits: SystemLimits;
  security: SecurityConfig;
  integrations: IntegrationSettings;
}

export interface FeatureFlags {
  voiceSynthesis: boolean;
  shadowBoard: boolean;
  crmIntegration: boolean;
  emailOrchestration: boolean;
  realTimeAnalysis: boolean;
  quantumDecisionMaking: boolean;
  memoryPersistence: boolean;
  learningAdaptation: boolean;
}

export interface SystemLimits {
  maxConcurrentUsers: number;
  maxRequestsPerMinute: number;
  maxFileSize: number;
  maxAudioDuration: number;
  maxExecutivesPerUser: number;
  maxIntegrationsPerUser: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimiting: RateLimitConfig;
  cors: CORSConfig;
  csp: CSPConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface CORSConfig {
  origin: string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface CSPConfig {
  directives: Record<string, string[]>;
  reportOnly: boolean;
  reportUri?: URL;
}

export interface IntegrationSettings {
  redis: RedisConfig;
  database: DatabaseConfig;
  email: EmailConfig;
  storage: StorageConfig;
}

export interface RedisConfig {
  url: URL;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  lazyConnect: boolean;
}

export interface DatabaseConfig {
  url: URL;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
  ssl: boolean;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  apiKey?: string;
  from: EmailAddress;
}

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  bucket?: string;
  region?: string;
  credentials?: Record<string, unknown>;
  publicUrl?: URL;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

// Type Guards
export function isUUID(value: unknown): value is UUID {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isEmailAddress(value: unknown): value is EmailAddress {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isURL(value: unknown): value is URL {
  try {
    new URL(value as string);
    return true;
  } catch {
    return false;
  }
}

export function isTimestamp(value: unknown): value is Timestamp {
  return typeof value === 'number' && value > 0 && Number.isInteger(value);
}
