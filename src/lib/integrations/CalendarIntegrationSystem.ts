export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'exchange' | 'caldav' | 'custom';
  isConnected: boolean;
  lastSync: Date | null;
  config: CalendarProviderConfig;
  calendars: Calendar[];
}

export interface CalendarProviderConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  serverUrl?: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface Calendar {
  id: string;
  providerId: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isVisible: boolean;
  permissions: CalendarPermission[];
  timeZone: string;
  executiveOwner?: string;
}

export interface CalendarPermission {
  role: 'owner' | 'editor' | 'viewer';
  user: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  providerId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  recurrence?: RecurrenceRule;
  attendees: EventAttendee[];
  organizer: EventAttendee;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'confidential';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  categories: string[];
  executiveAssignment?: string;
  meetingType: 'in-person' | 'video' | 'phone' | 'hybrid';
  meetingUrl?: string;
  aiInsights: EventInsights;
  conflictResolution?: ConflictResolution;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
}

export interface EventAttendee {
  email: string;
  name?: string;
  role: 'required' | 'optional' | 'resource';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  isOrganizer?: boolean;
}

export interface EventInsights {
  importance: number; // 0-1 scale
  conflictProbability: number;
  preparationTime: number; // minutes
  travelTime: number; // minutes
  suggestedDuration: number; // minutes
  optimalTimeSlots: TimeSlot[];
  relatedEvents: string[];
  keyTopics: string[];
  requiredDocuments: string[];
}

export interface TimeSlot {
  start: Date;
  end: Date;
  confidence: number;
  reasoning: string;
}

export interface ConflictResolution {
  conflictType: 'overlap' | 'travel' | 'preparation' | 'priority';
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestions: ResolutionSuggestion[];
  autoResolved: boolean;
}

export interface ResolutionSuggestion {
  type: 'reschedule' | 'delegate' | 'shorten' | 'virtual' | 'cancel';
  description: string;
  impact: number; // 0-1 scale
  feasibility: number; // 0-1 scale
}

export interface CalendarTetrisBlock {
  id: string;
  eventId: string;
  executive: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  color: string;
  priority: number;
  flexibility: number; // How moveable this block is
  dependencies: string[]; // Other events this depends on
  shape: 'rectangle' | 'L-shape' | 'T-shape'; // For complex scheduling
}

export class CalendarIntegrationSystem {
  private providers: Map<string, CalendarProvider> = new Map();
  private events: Map<string, CalendarEvent> = new Map();
  private tetrisBlocks: Map<string, CalendarTetrisBlock> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private aiScheduler: CalendarAIScheduler;
  private conflictResolver: CalendarConflictResolver;

  constructor() {
    this.aiScheduler = new CalendarAIScheduler();
    this.conflictResolver = new CalendarConflictResolver();
    this.initializeEventListeners();
    this.initializeProviders();
  }

  private initializeEventListeners(): void {
    this.eventListeners.set('providerConnected', []);
    this.eventListeners.set('providerDisconnected', []);
    this.eventListeners.set('eventCreated', []);
    this.eventListeners.set('eventUpdated', []);
    this.eventListeners.set('eventDeleted', []);
    this.eventListeners.set('conflictDetected', []);
    this.eventListeners.set('conflictResolved', []);
    this.eventListeners.set('tetrisOptimized', []);
    this.eventListeners.set('syncComplete', []);
    this.eventListeners.set('error', []);
  }

  private initializeProviders(): void {
    const providers: CalendarProvider[] = [
      {
        id: 'google-primary',
        name: 'Google Calendar (Primary)',
        type: 'google',
        isConnected: false,
        lastSync: null,
        config: {
          clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
          redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
          scopes: ['https://www.googleapis.com/auth/calendar']
        },
        calendars: []
      },
      {
        id: 'outlook-primary',
        name: 'Outlook Calendar (Primary)',
        type: 'outlook',
        isConnected: false,
        lastSync: null,
        config: {
          clientId: process.env.OUTLOOK_CALENDAR_CLIENT_ID,
          clientSecret: process.env.OUTLOOK_CALENDAR_CLIENT_SECRET,
          redirectUri: process.env.OUTLOOK_CALENDAR_REDIRECT_URI,
          scopes: ['https://graph.microsoft.com/calendars.readwrite']
        },
        calendars: []
      },
      {
        id: 'exchange-corporate',
        name: 'Exchange Calendar (Corporate)',
        type: 'exchange',
        isConnected: false,
        lastSync: null,
        config: {
          serverUrl: process.env.EXCHANGE_CALENDAR_SERVER_URL,
          username: process.env.EXCHANGE_CALENDAR_USERNAME
        },
        calendars: []
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  public async connectProvider(providerId: string, authCode?: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    try {
      console.log(`Connecting to ${provider.name}...`);

      switch (provider.type) {
        case 'google':
          await this.connectGoogleCalendar(provider, authCode);
          break;
        case 'outlook':
          await this.connectOutlookCalendar(provider, authCode);
          break;
        case 'exchange':
          await this.connectExchangeCalendar(provider);
          break;
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      provider.isConnected = true;
      provider.lastSync = new Date();

      console.log(`✓ Connected to ${provider.name}`);
      this.emit('providerConnected', { providerId, provider });

      // Load calendars and events
      await this.loadCalendars(providerId);
      await this.syncEvents(providerId);

    } catch (error) {
      console.error(`Failed to connect to ${provider.name}:`, error);
      this.emit('error', { providerId, error });
      throw error;
    }
  }

  private async connectGoogleCalendar(provider: CalendarProvider, authCode?: string): Promise<void> {
    if (!authCode) {
      const authUrl = this.generateGoogleCalendarAuthUrl(provider);
      throw new Error(`Authorization required. Visit: ${authUrl}`);
    }

    const tokens = await this.exchangeGoogleCalendarAuthCode(provider, authCode);
    provider.config.accessToken = tokens.access_token;
    provider.config.refreshToken = tokens.refresh_token;
  }

  private async connectOutlookCalendar(provider: CalendarProvider, authCode?: string): Promise<void> {
    if (!authCode) {
      const authUrl = this.generateOutlookCalendarAuthUrl(provider);
      throw new Error(`Authorization required. Visit: ${authUrl}`);
    }

    const tokens = await this.exchangeOutlookCalendarAuthCode(provider, authCode);
    provider.config.accessToken = tokens.access_token;
    provider.config.refreshToken = tokens.refresh_token;
  }

  private async connectExchangeCalendar(provider: CalendarProvider): Promise<void> {
    console.log('Connecting to Exchange calendar...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private generateGoogleCalendarAuthUrl(provider: CalendarProvider): string {
    const params = new URLSearchParams({
      client_id: provider.config.clientId!,
      redirect_uri: provider.config.redirectUri!,
      scope: provider.config.scopes!.join(' '),
      response_type: 'code',
      access_type: 'offline'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private generateOutlookCalendarAuthUrl(provider: CalendarProvider): string {
    const params = new URLSearchParams({
      client_id: provider.config.clientId!,
      redirect_uri: provider.config.redirectUri!,
      scope: provider.config.scopes!.join(' '),
      response_type: 'code',
      response_mode: 'query'
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private async exchangeGoogleCalendarAuthCode(provider: CalendarProvider, authCode: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: provider.config.clientId!,
        client_secret: provider.config.clientSecret!,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: provider.config.redirectUri!
      })
    });

    if (!response.ok) {
      throw new Error(`Google Calendar token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async exchangeOutlookCalendarAuthCode(provider: CalendarProvider, authCode: string): Promise<any> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: provider.config.clientId!,
        client_secret: provider.config.clientSecret!,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: provider.config.redirectUri!
      })
    });

    if (!response.ok) {
      throw new Error(`Outlook Calendar token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async loadCalendars(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId)!;

    try {
      let calendars: Calendar[] = [];

      switch (provider.type) {
        case 'google':
          calendars = await this.fetchGoogleCalendars(provider);
          break;
        case 'outlook':
          calendars = await this.fetchOutlookCalendars(provider);
          break;
        case 'exchange':
          calendars = await this.fetchExchangeCalendars(provider);
          break;
      }

      provider.calendars = calendars;
      console.log(`✓ Loaded ${calendars.length} calendars from ${provider.name}`);

    } catch (error) {
      console.error(`Failed to load calendars from ${provider.name}:`, error);
      throw error;
    }
  }

  private async fetchGoogleCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${provider.config.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []).map((cal: any) => ({
      id: cal.id,
      providerId: provider.id,
      name: cal.summary,
      description: cal.description,
      color: cal.backgroundColor || '#1976d2',
      isDefault: cal.primary || false,
      isVisible: !cal.hidden,
      permissions: [],
      timeZone: cal.timeZone || 'UTC',
      executiveOwner: this.assignCalendarToExecutive(cal.summary)
    }));
  }

  private async fetchOutlookCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        'Authorization': `Bearer ${provider.config.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Outlook Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.value || []).map((cal: any) => ({
      id: cal.id,
      providerId: provider.id,
      name: cal.name,
      description: '',
      color: cal.color || '#0078d4',
      isDefault: cal.isDefaultCalendar || false,
      isVisible: true,
      permissions: [],
      timeZone: 'UTC',
      executiveOwner: this.assignCalendarToExecutive(cal.name)
    }));
  }

  private async fetchExchangeCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    // Simulate Exchange calendar fetching
    await new Promise(resolve => setTimeout(resolve, 500));
    return [];
  }

  private assignCalendarToExecutive(calendarName: string): string | undefined {
    const name = calendarName.toLowerCase();
    
    if (name.includes('ceo') || name.includes('executive')) return 'ceo';
    if (name.includes('cfo') || name.includes('finance')) return 'cfo';
    if (name.includes('cto') || name.includes('tech')) return 'cto';
    if (name.includes('cmo') || name.includes('marketing')) return 'cmo';
    if (name.includes('coo') || name.includes('operations')) return 'coo';
    if (name.includes('chro') || name.includes('hr')) return 'chro';
    if (name.includes('clo') || name.includes('legal')) return 'clo';
    if (name.includes('cso') || name.includes('strategy')) return 'cso';
    
    return undefined;
  }

  public async syncEvents(providerId?: string): Promise<void> {
    const providersToSync = providerId 
      ? [this.providers.get(providerId)!].filter(Boolean)
      : Array.from(this.providers.values()).filter(p => p.isConnected);

    for (const provider of providersToSync) {
      try {
        console.log(`Syncing events from ${provider.name}...`);

        for (const calendar of provider.calendars) {
          const events = await this.fetchEvents(provider, calendar);
          
          for (const event of events) {
            // Generate AI insights
            event.aiInsights = await this.aiScheduler.generateInsights(event);
            
            // Assign to executive if not already assigned
            if (!event.executiveAssignment) {
              event.executiveAssignment = this.assignEventToExecutive(event);
            }
            
            // Create tetris block
            const tetrisBlock = this.createTetrisBlock(event);
            this.tetrisBlocks.set(tetrisBlock.id, tetrisBlock);
            
            // Store event
            this.events.set(event.id, event);
            
            this.emit('eventCreated', { event, providerId: provider.id });
          }
        }

        // Run conflict detection and resolution
        await this.detectAndResolveConflicts(provider.id);

        // Optimize calendar tetris
        await this.optimizeCalendarTetris(provider.id);

        provider.lastSync = new Date();
        console.log(`✓ Synced events from ${provider.name}`);

      } catch (error) {
        console.error(`Failed to sync events from ${provider.name}:`, error);
        this.emit('error', { providerId: provider.id, error });
      }
    }

    this.emit('syncComplete', { timestamp: new Date() });
  }

  private async fetchEvents(provider: CalendarProvider, calendar: Calendar): Promise<CalendarEvent[]> {
    switch (provider.type) {
      case 'google':
        return await this.fetchGoogleEvents(provider, calendar);
      case 'outlook':
        return await this.fetchOutlookEvents(provider, calendar);
      case 'exchange':
        return await this.fetchExchangeEvents(provider, calendar);
      default:
        return [];
    }
  }

  private async fetchGoogleEvents(provider: CalendarProvider, calendar: Calendar): Promise<CalendarEvent[]> {
    const timeMin = new Date();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?` +
      `timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar Events API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []).map((event: any) => this.parseGoogleEvent(event, calendar, provider.id));
  }

  private async fetchOutlookEvents(provider: CalendarProvider, calendar: Calendar): Promise<CalendarEvent[]> {
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendar.id}/events?` +
      `$filter=start/dateTime ge '${startTime}' and end/dateTime le '${endTime}'&$orderby=start/dateTime`,
      {
        headers: {
          'Authorization': `Bearer ${provider.config.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Outlook Calendar Events API error: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.value || []).map((event: any) => this.parseOutlookEvent(event, calendar, provider.id));
  }

  private async fetchExchangeEvents(provider: CalendarProvider, calendar: Calendar): Promise<CalendarEvent[]> {
    // Simulate Exchange event fetching
    await new Promise(resolve => setTimeout(resolve, 500));
    return [];
  }

  private parseGoogleEvent(googleEvent: any, calendar: Calendar, providerId: string): CalendarEvent {
    return {
      id: googleEvent.id,
      calendarId: calendar.id,
      providerId,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      location: googleEvent.location,
      startTime: new Date(googleEvent.start.dateTime || googleEvent.start.date),
      endTime: new Date(googleEvent.end.dateTime || googleEvent.end.date),
      isAllDay: !googleEvent.start.dateTime,
      attendees: (googleEvent.attendees || []).map((attendee: any) => ({
        email: attendee.email,
        name: attendee.displayName,
        role: attendee.optional ? 'optional' : 'required',
        status: attendee.responseStatus === 'accepted' ? 'accepted' : 
                attendee.responseStatus === 'declined' ? 'declined' : 
                attendee.responseStatus === 'tentative' ? 'tentative' : 'pending',
        isOrganizer: attendee.organizer || false
      })),
      organizer: {
        email: googleEvent.organizer?.email || '',
        name: googleEvent.organizer?.displayName,
        role: 'required',
        status: 'accepted',
        isOrganizer: true
      },
      status: googleEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
      visibility: googleEvent.visibility || 'public',
      priority: 'normal',
      categories: [],
      meetingType: googleEvent.conferenceData ? 'video' : 'in-person',
      meetingUrl: googleEvent.conferenceData?.entryPoints?.[0]?.uri,
      aiInsights: {
        importance: 0.5,
        conflictProbability: 0,
        preparationTime: 15,
        travelTime: 0,
        suggestedDuration: 60,
        optimalTimeSlots: [],
        relatedEvents: [],
        keyTopics: [],
        requiredDocuments: []
      }
    };
  }

  private parseOutlookEvent(outlookEvent: any, calendar: Calendar, providerId: string): CalendarEvent {
    return {
      id: outlookEvent.id,
      calendarId: calendar.id,
      providerId,
      title: outlookEvent.subject || 'Untitled Event',
      description: outlookEvent.body?.content,
      location: outlookEvent.location?.displayName,
      startTime: new Date(outlookEvent.start.dateTime),
      endTime: new Date(outlookEvent.end.dateTime),
      isAllDay: outlookEvent.isAllDay,
      attendees: (outlookEvent.attendees || []).map((attendee: any) => ({
        email: attendee.emailAddress.address,
        name: attendee.emailAddress.name,
        role: attendee.type === 'optional' ? 'optional' : 'required',
        status: attendee.status.response === 'accepted' ? 'accepted' : 
                attendee.status.response === 'declined' ? 'declined' : 
                attendee.status.response === 'tentativelyAccepted' ? 'tentative' : 'pending'
      })),
      organizer: {
        email: outlookEvent.organizer?.emailAddress?.address || '',
        name: outlookEvent.organizer?.emailAddress?.name,
        role: 'required',
        status: 'accepted',
        isOrganizer: true
      },
      status: outlookEvent.isCancelled ? 'cancelled' : 'confirmed',
      visibility: 'public',
      priority: outlookEvent.importance === 'high' ? 'high' : 'normal',
      categories: outlookEvent.categories || [],
      meetingType: outlookEvent.onlineMeeting ? 'video' : 'in-person',
      meetingUrl: outlookEvent.onlineMeeting?.joinUrl,
      aiInsights: {
        importance: 0.5,
        conflictProbability: 0,
        preparationTime: 15,
        travelTime: 0,
        suggestedDuration: 60,
        optimalTimeSlots: [],
        relatedEvents: [],
        keyTopics: [],
        requiredDocuments: []
      }
    };
  }

  private assignEventToExecutive(event: CalendarEvent): string {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    const text = `${title} ${description}`;
    
    if (text.includes('board') || text.includes('investor') || text.includes('strategy')) return 'ceo';
    if (text.includes('budget') || text.includes('financial') || text.includes('revenue')) return 'cfo';
    if (text.includes('technical') || text.includes('development') || text.includes('engineering')) return 'cto';
    if (text.includes('marketing') || text.includes('campaign') || text.includes('brand')) return 'cmo';
    if (text.includes('operations') || text.includes('process') || text.includes('logistics')) return 'coo';
    if (text.includes('hr') || text.includes('hiring') || text.includes('employee')) return 'chro';
    if (text.includes('legal') || text.includes('contract') || text.includes('compliance')) return 'clo';
    if (text.includes('strategy') || text.includes('planning') || text.includes('roadmap')) return 'cso';
    
    return 'ceo'; // Default assignment
  }

  private createTetrisBlock(event: CalendarEvent): CalendarTetrisBlock {
    const duration = event.endTime.getTime() - event.startTime.getTime();
    
    return {
      id: `block_${event.id}`,
      eventId: event.id,
      executive: event.executiveAssignment || 'ceo',
      startTime: event.startTime,
      endTime: event.endTime,
      duration: duration / (1000 * 60), // Convert to minutes
      color: this.getExecutiveColor(event.executiveAssignment || 'ceo'),
      priority: this.calculateEventPriority(event),
      flexibility: this.calculateEventFlexibility(event),
      dependencies: [],
      shape: 'rectangle'
    };
  }

  private getExecutiveColor(executive: string): string {
    const colors = {
      'ceo': '#ef4444',
      'cfo': '#10b981',
      'cto': '#3b82f6',
      'cmo': '#f59e0b',
      'coo': '#8b5cf6',
      'chro': '#ec4899',
      'clo': '#06b6d4',
      'cso': '#84cc16'
    };
    return colors[executive as keyof typeof colors] || '#64748b';
  }

  private calculateEventPriority(event: CalendarEvent): number {
    let priority = 0.5; // Base priority
    
    if (event.priority === 'urgent') priority = 1.0;
    else if (event.priority === 'high') priority = 0.8;
    else if (event.priority === 'low') priority = 0.2;
    
    // Adjust based on attendee count
    if (event.attendees.length > 10) priority += 0.2;
    else if (event.attendees.length > 5) priority += 0.1;
    
    // Adjust based on AI insights
    priority += event.aiInsights.importance * 0.3;
    
    return Math.min(1.0, priority);
  }

  private calculateEventFlexibility(event: CalendarEvent): number {
    let flexibility = 0.5; // Base flexibility
    
    // Less flexible if many attendees
    if (event.attendees.length > 10) flexibility -= 0.3;
    else if (event.attendees.length > 5) flexibility -= 0.2;
    
    // Less flexible if external attendees
    const externalAttendees = event.attendees.filter(a => !a.email.includes('@company.com'));
    if (externalAttendees.length > 0) flexibility -= 0.2;
    
    // Less flexible if recurring
    if (event.recurrence) flexibility -= 0.3;
    
    return Math.max(0.1, flexibility);
  }

  private async detectAndResolveConflicts(providerId: string): Promise<void> {
    const conflicts = await this.conflictResolver.detectConflicts(
      Array.from(this.events.values()).filter(e => e.providerId === providerId)
    );
    
    for (const conflict of conflicts) {
      this.emit('conflictDetected', { conflict, providerId });
      
      const resolution = await this.conflictResolver.resolveConflict(conflict);
      if (resolution.autoResolved) {
        this.emit('conflictResolved', { conflict, resolution, providerId });
      }
    }
  }

  private async optimizeCalendarTetris(providerId: string): Promise<void> {
    const blocks = Array.from(this.tetrisBlocks.values())
      .filter(b => this.events.get(b.eventId)?.providerId === providerId);
    
    const optimizedBlocks = await this.aiScheduler.optimizeTetris(blocks);
    
    // Update tetris blocks
    optimizedBlocks.forEach(block => {
      this.tetrisBlocks.set(block.id, block);
    });
    
    this.emit('tetrisOptimized', { blocks: optimizedBlocks, providerId });
  }

  public getEvents(filters?: {
    providerId?: string;
    calendarId?: string;
    executive?: string;
    startDate?: Date;
    endDate?: Date;
  }): CalendarEvent[] {
    let events = Array.from(this.events.values());
    
    if (filters) {
      if (filters.providerId) {
        events = events.filter(e => e.providerId === filters.providerId);
      }
      if (filters.calendarId) {
        events = events.filter(e => e.calendarId === filters.calendarId);
      }
      if (filters.executive) {
        events = events.filter(e => e.executiveAssignment === filters.executive);
      }
      if (filters.startDate) {
        events = events.filter(e => e.startTime >= filters.startDate!);
      }
      if (filters.endDate) {
        events = events.filter(e => e.endTime <= filters.endDate!);
      }
    }
    
    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  public getTetrisBlocks(executive?: string): CalendarTetrisBlock[] {
    let blocks = Array.from(this.tetrisBlocks.values());
    
    if (executive) {
      blocks = blocks.filter(b => b.executive === executive);
    }
    
    return blocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  public getProviders(): CalendarProvider[] {
    return Array.from(this.providers.values());
  }

  public getConnectedProviders(): CalendarProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isConnected);
  }

  public startAutoSync(intervalMinutes: number = 15): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.syncEvents();
    }, intervalMinutes * 60 * 1000);
    
    console.log(`✓ Calendar auto-sync started (every ${intervalMinutes} minutes)`);
  }

  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('✓ Calendar auto-sync stopped');
    }
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

  public async shutdown(): Promise<void> {
    console.log('Shutting down Calendar Integration System...');
    
    this.stopAutoSync();
    
    // Disconnect all providers
    for (const provider of this.providers.values()) {
      if (provider.isConnected) {
        provider.isConnected = false;
      }
    }
    
    console.log('✓ Calendar Integration System shutdown complete');
  }
}

// AI Calendar Scheduler
class CalendarAIScheduler {
  public async generateInsights(event: CalendarEvent): Promise<EventInsights> {
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const importance = this.calculateImportance(event);
    const preparationTime = this.estimatePreparationTime(event);
    const travelTime = this.estimateTravelTime(event);
    
    return {
      importance,
      conflictProbability: Math.random() * 0.3,
      preparationTime,
      travelTime,
      suggestedDuration: this.suggestDuration(event),
      optimalTimeSlots: [],
      relatedEvents: [],
      keyTopics: this.extractKeyTopics(event),
      requiredDocuments: this.identifyRequiredDocuments(event)
    };
  }
  
  public async optimizeTetris(blocks: CalendarTetrisBlock[]): Promise<CalendarTetrisBlock[]> {
    // Simulate tetris optimization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Sort by priority and try to minimize gaps
    return blocks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.startTime.getTime() - b.startTime.getTime();
    });
  }
  
  private calculateImportance(event: CalendarEvent): number {
    let importance = 0.5;
    
    // More important if many attendees
    if (event.attendees.length > 10) importance += 0.3;
    else if (event.attendees.length > 5) importance += 0.2;
    
    // More important if external attendees
    const externalAttendees = event.attendees.filter(a => !a.email.includes('@company.com'));
    if (externalAttendees.length > 0) importance += 0.2;
    
    // More important based on keywords
    const title = event.title.toLowerCase();
    if (title.includes('board') || title.includes('investor')) importance += 0.3;
    if (title.includes('client') || title.includes('customer')) importance += 0.2;
    
    return Math.min(1.0, importance);
  }
  
  private estimatePreparationTime(event: CalendarEvent): number {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    if (title.includes('presentation') || description.includes('presentation')) return 60;
    if (title.includes('meeting') && event.attendees.length > 5) return 30;
    if (title.includes('interview')) return 20;
    
    return 15; // Default
  }
  
  private estimateTravelTime(event: CalendarEvent): number {
    if (!event.location) return 0;
    if (event.meetingType === 'video') return 0;
    
    const location = event.location.toLowerCase();
    if (location.includes('office') || location.includes('building')) return 15;
    if (location.includes('airport')) return 60;
    if (location.includes('downtown')) return 30;
    
    return 20; // Default
  }
  
  private suggestDuration(event: CalendarEvent): number {
    const currentDuration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60);
    const title = event.title.toLowerCase();
    
    if (title.includes('standup') || title.includes('daily')) return 15;
    if (title.includes('1:1') || title.includes('one-on-one')) return 30;
    if (title.includes('interview')) return 45;
    if (title.includes('presentation')) return 60;
    if (title.includes('workshop') || title.includes('training')) return 120;
    
    return currentDuration;
  }
  
  private extractKeyTopics(event: CalendarEvent): string[] {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();
    const topics: any[] = [];
    
    if (text.includes('budget') || text.includes('financial')) topics.push('Finance');
    if (text.includes('strategy') || text.includes('planning')) topics.push('Strategy');
    if (text.includes('technical') || text.includes('development')) topics.push('Technology');
    if (text.includes('marketing') || text.includes('campaign')) topics.push('Marketing');
    if (text.includes('hr') || text.includes('hiring')) topics.push('Human Resources');
    if (text.includes('legal') || text.includes('compliance')) topics.push('Legal');
    
    return topics;
  }
  
  private identifyRequiredDocuments(event: CalendarEvent): string[] {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();
    const documents: any[] = [];
    
    if (text.includes('presentation')) documents.push('Presentation slides');
    if (text.includes('budget') || text.includes('financial')) documents.push('Financial reports');
    if (text.includes('contract') || text.includes('agreement')) documents.push('Legal documents');
    if (text.includes('interview')) documents.push('Resume', 'Interview questions');
    if (text.includes('review')) documents.push('Performance data');
    
    return documents;
  }
}

// Calendar Conflict Resolver
class CalendarConflictResolver {
  public async detectConflicts(events: CalendarEvent[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    
    // Sort events by start time
    const sortedEvents = events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];
      
      // Check for overlaps
      if (current.endTime > next.startTime) {
        conflicts.push({
          conflictType: 'overlap',
          severity: 'high',
          suggestions: [
            {
              type: 'reschedule',
              description: `Reschedule "${next.title}" to avoid overlap`,
              impact: 0.7,
              feasibility: 0.8
            },
            {
              type: 'shorten',
              description: `Shorten "${current.title}" to end before next meeting`,
              impact: 0.5,
              feasibility: 0.6
            }
          ],
          autoResolved: false
        });
      }
      
      // Check for insufficient travel time
      if (current.location && next.location && current.location !== next.location) {
        const travelTime = this.estimateTravelTime(current.location, next.location);
        const gap = (next.startTime.getTime() - current.endTime.getTime()) / (1000 * 60);
        
        if (gap < travelTime) {
          conflicts.push({
            conflictType: 'travel',
            severity: gap < travelTime / 2 ? 'critical' : 'medium',
            suggestions: [
              {
                type: 'virtual',
                description: `Make "${next.title}" virtual to eliminate travel time`,
                impact: 0.3,
                feasibility: 0.9
              },
              {
                type: 'reschedule',
                description: `Reschedule "${next.title}" to allow travel time`,
                impact: 0.6,
                feasibility: 0.7
              }
            ],
            autoResolved: false
          });
        }
      }
    }
    
    return conflicts;
  }
  
  public async resolveConflict(conflict: ConflictResolution): Promise<ConflictResolution> {
    // Simulate conflict resolution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Auto-resolve simple conflicts
    if (conflict.severity === 'low' && conflict.suggestions.length > 0) {
      const bestSuggestion = conflict.suggestions.reduce((best, current) => 
        (current.feasibility * current.impact) > (best.feasibility * best.impact) ? current : best
      );
      
      if (bestSuggestion.feasibility > 0.8) {
        conflict.autoResolved = true;
      }
    }
    
    return conflict;
  }
  
  private estimateTravelTime(from: string, to: string): number {
    // Simple travel time estimation
    if (from.toLowerCase().includes('office') && to.toLowerCase().includes('office')) return 10;
    if (from.toLowerCase().includes('airport') || to.toLowerCase().includes('airport')) return 60;
    return 30; // Default
  }
}
