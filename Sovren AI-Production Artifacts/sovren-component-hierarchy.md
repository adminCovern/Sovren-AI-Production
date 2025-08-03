# SOVREN Component Hierarchy

## Root Component Structure

```
App (Next.js Root)
├── CommandCenterLayout
│   ├── Header
│   │   ├── SOVRENLogo
│   │   ├── UserProfile
│   │   └── SystemStatus
│   │
│   ├── CommandBridge (Main 3D Scene)
│   │   ├── ThreeJSCanvas
│   │   ├── CameraController
│   │   ├── LightingSystem
│   │   ├── ExecutiveCircle
│   │   │   ├── ExecutiveAvatar (x8)
│   │   │   │   ├── AvatarModel
│   │   │   │   ├── AnimationController
│   │   │   │   ├── ActivityIndicator
│   │   │   │   ├── VoiceWaveform
│   │   │   │   └── StatusBadge
│   │   │   └── ExecutivePositioner
│   │   │
│   │   ├── HolographicDisplay
│   │   │   ├── ActivityStream
│   │   │   ├── MetricsDisplay
│   │   │   └── ParticleEffects
│   │   │
│   │   └── InteractionLayer
│   │       ├── GestureHandler
│   │       ├── VoiceCommandProcessor
│   │       └── SelectionManager
│   │
│   ├── ControlPanels
│   │   ├── ApprovalQueue
│   │   │   ├── ApprovalCard
│   │   │   ├── SwipeGestureHandler
│   │   │   └── ImpactVisualization
│   │   │
│   │   ├── ActiveCallsPanel
│   │   │   ├── CallVisualization
│   │   │   ├── TranscriptDisplay
│   │   │   └── CallControls
│   │   │
│   │   └── ResourceMonitor
│   │       ├── GPUUsageDisplay
│   │       ├── ExecutiveAllocation
│   │       └── PerformanceMetrics
│   │
│   ├── IntegrationViews
│   │   ├── EmailIntegration
│   │   │   ├── UnifiedInbox
│   │   │   ├── EmailComposer
│   │   │   ├── ThreadVisualizer
│   │   │   └── ExecutiveEmailFilter
│   │   │
│   │   ├── CalendarIntegration
│   │   │   ├── CalendarTetris
│   │   │   ├── MeetingOrbs
│   │   │   ├── ScheduleCoordinator
│   │   │   └── ExecutiveAvailability
│   │   │
│   │   ├── CRMIntegration
│   │   │   ├── Pipeline3D
│   │   │   ├── DealFlow
│   │   │   ├── RelationshipNetwork
│   │   │   └── RevenueProjection
│   │   │
│   │   └── VoiceIntegration
│   │       ├── CallConstellation
│   │       ├── VoiceRouter
│   │       └── PhoneControls
│   │
│   └── Modals
│       ├── ExecutiveDetailModal
│       ├── SettingsModal
│       ├── IntegrationSetupModal
│       └── HelpModal
│
└── Providers
    ├── AuthProvider
    ├── WebSocketProvider
    ├── ThemeProvider
    ├── IntegrationProvider
    └── RevolutionaryEngineeringProvider
```

## State Management Structure

```
Redux Store
├── executives
│   ├── entities (normalized executive data)
│   ├── status (active/idle/busy states)
│   ├── activities (current tasks)
│   └── performance (metrics)
│
├── integrations
│   ├── email
│   │   ├── inbox
│   │   ├── drafts
│   │   └── threads
│   ├── calendar
│   │   ├── events
│   │   ├── availability
│   │   └── conflicts
│   ├── crm
│   │   ├── deals
│   │   ├── contacts
│   │   └── pipeline
│   └── voice
│       ├── activeCalls
│       ├── callHistory
│       └── transcripts
│
├── approvals
│   ├── pending
│   ├── history
│   └── thresholds
│
├── activities
│   ├── stream
│   ├── filters
│   └── analytics
│
├── gpu
│   ├── allocation
│   ├── usage
│   └── health
│
└── ui
    ├── selectedExecutive
    ├── activeView
    ├── modals
    └── notifications
```

## WebSocket Event Structure

```
WebSocket Events
├── Executive Events
│   ├── executive.status.changed
│   ├── executive.activity.started
│   ├── executive.activity.completed
│   ├── executive.decision.made
│   └── executive.resource.allocated
│
├── Integration Events
│   ├── email.received
│   ├── email.sent
│   ├── calendar.event.created
│   ├── calendar.conflict.detected
│   ├── crm.deal.updated
│   ├── crm.contact.added
│   ├── voice.call.started
│   ├── voice.call.ended
│   └── voice.transcription.update
│
├── Approval Events
│   ├── approval.requested
│   ├── approval.granted
│   ├── approval.denied
│   └── approval.escalated
│
├── System Events
│   ├── gpu.allocation.changed
│   ├── system.health.update
│   ├── raft.consensus.update
│   └── blockchain.audit.recorded
│
└── User Events
    ├── user.gesture.detected
    ├── user.voice.command
    ├── user.selection.changed
    └── user.approval.action
```

## Integration Service Architecture

```
Integration Services
├── BaseIntegrationService
│   ├── authenticate()
│   ├── refreshToken()
│   ├── handleWebhook()
│   └── syncData()
│
├── EmailService extends BaseIntegrationService
│   ├── GmailAdapter
│   ├── OutlookAdapter
│   ├── ExchangeAdapter
│   └── Methods
│       ├── getInbox()
│       ├── sendEmail()
│       ├── createDraft()
│       └── trackActivity()
│
├── CalendarService extends BaseIntegrationService
│   ├── GoogleCalendarAdapter
│   ├── OutlookCalendarAdapter
│   ├── CalDAVAdapter
│   └── Methods
│       ├── getEvents()
│       ├── createEvent()
│       ├── resolveConflicts()
│       └── checkAvailability()
│
├── CRMService extends BaseIntegrationService
│   ├── SalesforceAdapter
│   ├── HubSpotAdapter
│   ├── PipedriveAdapter
│   └── Methods
│       ├── getDeals()
│       ├── updateDeal()
│       ├── getContacts()
│       └── trackActivity()
│
└── VoiceService extends BaseIntegrationService
    ├── FreeSwitch Integration
    ├── Skyetel Trunk
    └── Methods
        ├── initiateCall()
        ├── receiveCall()
        ├── transferCall()
        └── getTranscription()
```