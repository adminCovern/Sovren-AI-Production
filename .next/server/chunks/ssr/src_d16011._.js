module.exports = {

"[project]/src/lib/voice/AudioProcessor.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "AudioProcessor": ()=>AudioProcessor
});
class AudioProcessor {
    config;
    audioContext;
    activeStreams;
    processors;
    analyzers;
    spatialNodes;
    eventListeners;
    constructor(config = {
        sampleRate: 48000,
        bufferSize: 4096,
        enableNoiseReduction: true,
        enableEchoCancellation: true,
        enableAutoGainControl: true,
        spatialAudioEnabled: true
    }){
        this.config = config;
        this.audioContext = null;
        this.activeStreams = new Map();
        this.processors = new Map();
        this.analyzers = new Map();
        this.spatialNodes = new Map();
        this.eventListeners = new Map();
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        this.eventListeners.set('audioActivity', []);
        this.eventListeners.set('volumeChange', []);
        this.eventListeners.set('qualityChange', []);
        this.eventListeners.set('spatialUpdate', []);
    }
    async initialize() {
        try {
            // Create AudioContext with optimal settings
            this.audioContext = new AudioContext({
                sampleRate: this.config.sampleRate,
                latencyHint: 'interactive'
            });
            // Load audio worklet for advanced processing
            await this.loadAudioWorklets();
            console.log('Audio Processor initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Audio Processor:', error);
            throw error;
        }
    }
    async loadAudioWorklets() {
        if (!this.audioContext) return;
        try {
            // Load noise reduction worklet
            await this.audioContext.audioWorklet.addModule('/audio-worklets/noise-reduction.js');
            // Load voice enhancement worklet
            await this.audioContext.audioWorklet.addModule('/audio-worklets/voice-enhancement.js');
            // Load spatial audio worklet
            await this.audioContext.audioWorklet.addModule('/audio-worklets/spatial-processor.js');
        } catch (error) {
            console.warn('Audio worklets not available, falling back to basic processing:', error);
        }
    }
    async processInboundAudio(stream, executiveId) {
        if (!this.audioContext) {
            await this.initialize();
        }
        const streamId = `inbound_${executiveId}_${Date.now()}`;
        this.activeStreams.set(streamId, stream);
        try {
            // Create audio processing chain
            const source = this.audioContext.createMediaStreamSource(stream);
            const analyzer = this.createAnalyzer();
            const enhancer = await this.createVoiceEnhancer();
            const spatializer = this.createSpatializer(executiveId);
            const destination = this.audioContext.destination;
            // Connect processing chain
            source.connect(analyzer);
            analyzer.connect(enhancer);
            enhancer.connect(spatializer);
            spatializer.connect(destination);
            // Store references
            this.analyzers.set(streamId, analyzer);
            this.processors.set(streamId, enhancer);
            this.spatialNodes.set(streamId, spatializer);
            // Start monitoring
            this.startAudioMonitoring(streamId, analyzer, executiveId);
            console.log(`Inbound audio processing started for executive ${executiveId}`);
        } catch (error) {
            console.error('Failed to process inbound audio:', error);
            this.stopProcessing(stream);
        }
    }
    async processOutboundAudio(stream, executiveId) {
        if (!this.audioContext) {
            await this.initialize();
        }
        const streamId = `outbound_${executiveId}_${Date.now()}`;
        this.activeStreams.set(streamId, stream);
        try {
            // Create outbound processing chain
            const source = this.audioContext.createMediaStreamSource(stream);
            const analyzer = this.createAnalyzer();
            const noiseReducer = await this.createNoiseReducer();
            const enhancer = await this.createVoiceEnhancer();
            // Connect processing chain
            source.connect(analyzer);
            analyzer.connect(noiseReducer);
            noiseReducer.connect(enhancer);
            // Store references
            this.analyzers.set(streamId, analyzer);
            this.processors.set(streamId, enhancer);
            // Start monitoring
            this.startAudioMonitoring(streamId, analyzer, executiveId);
            console.log(`Outbound audio processing started for executive ${executiveId}`);
        } catch (error) {
            console.error('Failed to process outbound audio:', error);
            this.stopProcessing(stream);
        }
    }
    createAnalyzer() {
        const analyzer = this.audioContext.createAnalyser();
        analyzer.fftSize = 2048;
        analyzer.smoothingTimeConstant = 0.8;
        return analyzer;
    }
    async createNoiseReducer() {
        try {
            const processor = new AudioWorkletNode(this.audioContext, 'noise-reduction-processor', {
                processorOptions: {
                    threshold: -30,
                    ratio: 4,
                    attack: 0.003,
                    release: 0.1
                }
            });
            return processor;
        } catch (error) {
            // Fallback to basic filtering
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 80;
            return filter;
        }
    }
    async createVoiceEnhancer() {
        try {
            const processor = new AudioWorkletNode(this.audioContext, 'voice-enhancement-processor', {
                processorOptions: {
                    clarity: 1.2,
                    warmth: 0.8,
                    presence: 1.1
                }
            });
            return processor;
        } catch (error) {
            // Fallback to basic EQ
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = 2000;
            filter.Q.value = 1;
            filter.gain.value = 3;
            return filter;
        }
    }
    createSpatializer(executiveId) {
        const panner = this.audioContext.createPanner();
        // Configure 3D audio settings
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 0;
        panner.coneOuterGain = 0;
        // Set executive position based on their circle position
        const position = this.getExecutivePosition(executiveId);
        panner.positionX.value = position.x;
        panner.positionY.value = position.y;
        panner.positionZ.value = position.z;
        return panner;
    }
    getExecutivePosition(executiveId) {
        const executives = [
            'ceo',
            'cfo',
            'cto',
            'cmo',
            'coo',
            'chro',
            'clo',
            'cso'
        ];
        const index = executives.indexOf(executiveId.toLowerCase());
        if (index === -1) {
            return {
                x: 0,
                y: 0,
                z: 0
            };
        }
        const angle = index / executives.length * Math.PI * 2;
        const radius = 6; // Match the visual circle radius
        return {
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius
        };
    }
    startAudioMonitoring(streamId, analyzer, executiveId) {
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const frequencyData = new Float32Array(bufferLength);
        const monitor = ()=>{
            if (!this.analyzers.has(streamId)) return;
            analyzer.getByteTimeDomainData(dataArray);
            analyzer.getFloatFrequencyData(frequencyData);
            // Calculate volume (RMS)
            let sum = 0;
            for(let i = 0; i < bufferLength; i++){
                const sample = (dataArray[i] - 128) / 128;
                sum += sample * sample;
            }
            const volume = Math.sqrt(sum / bufferLength);
            // Calculate dominant frequency
            let maxIndex = 0;
            let maxValue = -Infinity;
            for(let i = 0; i < frequencyData.length; i++){
                if (frequencyData[i] > maxValue) {
                    maxValue = frequencyData[i];
                    maxIndex = i;
                }
            }
            const dominantFreq = maxIndex * this.audioContext.sampleRate / (2 * bufferLength);
            // Determine if audio is active
            const isActive = volume > 0.01;
            // Calculate noise level and clarity
            const noiseLevel = this.calculateNoiseLevel(frequencyData);
            const clarity = this.calculateClarity(frequencyData);
            const metrics = {
                volume,
                frequency: Array.from(frequencyData),
                isActive,
                noiseLevel,
                clarity
            };
            this.emit('audioActivity', {
                executiveId,
                streamId,
                metrics,
                dominantFrequency: dominantFreq
            });
            // Continue monitoring
            requestAnimationFrame(monitor);
        };
        monitor();
    }
    calculateNoiseLevel(frequencyData) {
        // Calculate noise level in lower frequencies (below 300Hz)
        const noiseRange = Math.floor(300 / this.audioContext.sampleRate * frequencyData.length * 2);
        let noiseSum = 0;
        for(let i = 0; i < Math.min(noiseRange, frequencyData.length); i++){
            noiseSum += Math.pow(10, frequencyData[i] / 20);
        }
        return noiseSum / noiseRange;
    }
    calculateClarity(frequencyData) {
        // Calculate clarity based on voice frequency range (300Hz - 3400Hz)
        const voiceStart = Math.floor(300 / this.audioContext.sampleRate * frequencyData.length * 2);
        const voiceEnd = Math.floor(3400 / this.audioContext.sampleRate * frequencyData.length * 2);
        let voiceSum = 0;
        let totalSum = 0;
        for(let i = 0; i < frequencyData.length; i++){
            const power = Math.pow(10, frequencyData[i] / 20);
            totalSum += power;
            if (i >= voiceStart && i <= voiceEnd) {
                voiceSum += power;
            }
        }
        return totalSum > 0 ? voiceSum / totalSum : 0;
    }
    updateExecutivePosition(executiveId, x, y, z) {
        for (const [streamId, panner] of this.spatialNodes.entries()){
            if (streamId.includes(executiveId)) {
                panner.positionX.value = x;
                panner.positionY.value = y;
                panner.positionZ.value = z;
                this.emit('spatialUpdate', {
                    executiveId,
                    position: {
                        x,
                        y,
                        z
                    }
                });
            }
        }
    }
    stopProcessing(stream) {
        const streamId = Array.from(this.activeStreams.entries()).find(([_, s])=>s === stream)?.[0];
        if (streamId) {
            // Clean up analyzers
            this.analyzers.delete(streamId);
            // Clean up processors
            const processor = this.processors.get(streamId);
            if (processor) {
                processor.disconnect();
                this.processors.delete(streamId);
            }
            // Clean up spatial nodes
            const spatialNode = this.spatialNodes.get(streamId);
            if (spatialNode) {
                spatialNode.disconnect();
                this.spatialNodes.delete(streamId);
            }
            // Remove stream
            this.activeStreams.delete(streamId);
            console.log(`Audio processing stopped for stream: ${streamId}`);
        }
    }
    getAudioMetrics(executiveId) {
        // This would return the latest metrics for the executive
        // Implementation would depend on how you want to store/retrieve metrics
        return null;
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback)=>callback(data));
        }
    }
    async destroy() {
        // Stop all processing
        for (const stream of this.activeStreams.values()){
            this.stopProcessing(stream);
        }
        // Close audio context
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
        console.log('Audio Processor destroyed');
    }
}

})()),
"[project]/src/lib/voice/ExecutiveVoiceRouter.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "ExecutiveVoiceRouter": ()=>ExecutiveVoiceRouter
});
class ExecutiveVoiceRouter {
    executives = new Map();
    routingRules = [];
    callHistory = new Map();
    eventListeners = new Map();
    constructor(){
        this.initializeExecutives();
        this.initializeRoutingRules();
        this.initializeEventListeners();
    }
    initializeExecutives() {
        const executiveProfiles = [
            {
                id: 'sovren-ai',
                name: 'SOVREN AI Core System',
                role: 'NEURAL OS',
                availability: 'available',
                priority: 11,
                specializations: [
                    'system-control',
                    'neural-processing',
                    'decision-making',
                    'orchestration',
                    'intelligence',
                    'omniscience'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 10,
                voiceModel: 'sovren-ai-neural',
                color: '#ff0000',
                personaType: 'system',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'ceo',
                name: 'Chief Executive Officer',
                role: 'CEO',
                availability: 'available',
                priority: 10,
                specializations: [
                    'strategy',
                    'vision',
                    'leadership',
                    'board',
                    'investors'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 2,
                voiceModel: 'ceo-authoritative',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'cfo',
                name: 'Chief Financial Officer',
                role: 'CFO',
                availability: 'available',
                priority: 9,
                specializations: [
                    'finance',
                    'budget',
                    'accounting',
                    'investors',
                    'funding'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 3,
                voiceModel: 'cfo-analytical',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'cto',
                name: 'Chief Technology Officer',
                role: 'CTO',
                availability: 'available',
                priority: 8,
                specializations: [
                    'technology',
                    'development',
                    'infrastructure',
                    'security',
                    'innovation'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 3,
                voiceModel: 'cto-technical',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'cmo',
                name: 'Chief Marketing Officer',
                role: 'CMO',
                availability: 'available',
                priority: 7,
                specializations: [
                    'marketing',
                    'branding',
                    'campaigns',
                    'customers',
                    'growth'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 4,
                voiceModel: 'cmo-persuasive',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'coo',
                name: 'Chief Operating Officer',
                role: 'COO',
                availability: 'available',
                priority: 8,
                specializations: [
                    'operations',
                    'processes',
                    'efficiency',
                    'logistics',
                    'management'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 3,
                voiceModel: 'coo-operational',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'chro',
                name: 'Chief Human Resources Officer',
                role: 'CHRO',
                availability: 'available',
                priority: 6,
                specializations: [
                    'hr',
                    'hiring',
                    'culture',
                    'employees',
                    'benefits'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 4,
                voiceModel: 'chro-empathetic',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'clo',
                name: 'Chief Legal Officer',
                role: 'CLO',
                availability: 'available',
                priority: 7,
                specializations: [
                    'legal',
                    'compliance',
                    'contracts',
                    'risk',
                    'governance'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 2,
                voiceModel: 'clo-precise',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            },
            {
                id: 'cso',
                name: 'Chief Strategy Officer',
                role: 'CSO',
                availability: 'available',
                priority: 7,
                specializations: [
                    'strategy',
                    'planning',
                    'analysis',
                    'competition',
                    'growth'
                ],
                currentLoad: 0,
                maxConcurrentCalls: 3,
                voiceModel: 'cso-strategic',
                personaType: 'executive',
                canInitiateCall: true,
                canReceiveCall: true,
                canSendEmail: true,
                canReceiveEmail: true
            }
        ];
        executiveProfiles.forEach((profile)=>{
            this.executives.set(profile.id, profile);
        });
    }
    initializeRoutingRules() {
        this.routingRules = [
            {
                id: 'system-control',
                name: 'SOVREN AI System Control',
                priority: 11,
                conditions: {
                    keywords: [
                        'sovren',
                        'system',
                        'neural',
                        'ai',
                        'core',
                        'control',
                        'override',
                        'emergency'
                    ],
                    urgency: 'critical'
                },
                actions: {
                    assignToExecutive: 'sovren-ai',
                    recordCall: true,
                    transcribeCall: true,
                    notifyOthers: [
                        'ceo',
                        'cto'
                    ]
                }
            },
            {
                id: 'investor-calls',
                name: 'Investor Relations',
                priority: 10,
                conditions: {
                    keywords: [
                        'investor',
                        'funding',
                        'investment',
                        'venture',
                        'capital'
                    ],
                    urgency: 'high'
                },
                actions: {
                    assignToExecutive: 'ceo',
                    recordCall: true,
                    transcribeCall: true,
                    notifyOthers: [
                        'cfo',
                        'sovren-ai'
                    ]
                }
            },
            {
                id: 'financial-matters',
                name: 'Financial Discussions',
                priority: 9,
                conditions: {
                    keywords: [
                        'budget',
                        'finance',
                        'accounting',
                        'revenue',
                        'cost'
                    ]
                },
                actions: {
                    assignToExecutive: 'cfo',
                    recordCall: true,
                    transcribeCall: true
                }
            },
            {
                id: 'technical-support',
                name: 'Technical Issues',
                priority: 8,
                conditions: {
                    keywords: [
                        'technical',
                        'bug',
                        'system',
                        'server',
                        'api',
                        'integration'
                    ]
                },
                actions: {
                    assignToExecutive: 'cto',
                    recordCall: true,
                    transcribeCall: true
                }
            },
            {
                id: 'marketing-campaigns',
                name: 'Marketing & Sales',
                priority: 7,
                conditions: {
                    keywords: [
                        'marketing',
                        'campaign',
                        'sales',
                        'customer',
                        'lead'
                    ]
                },
                actions: {
                    assignToExecutive: 'cmo',
                    recordCall: true,
                    transcribeCall: true
                }
            },
            {
                id: 'hr-matters',
                name: 'Human Resources',
                priority: 6,
                conditions: {
                    keywords: [
                        'hr',
                        'hiring',
                        'employee',
                        'culture',
                        'benefits'
                    ]
                },
                actions: {
                    assignToExecutive: 'chro',
                    recordCall: true,
                    transcribeCall: true
                }
            },
            {
                id: 'legal-compliance',
                name: 'Legal & Compliance',
                priority: 8,
                conditions: {
                    keywords: [
                        'legal',
                        'contract',
                        'compliance',
                        'risk',
                        'lawsuit'
                    ]
                },
                actions: {
                    assignToExecutive: 'clo',
                    recordCall: true,
                    transcribeCall: true,
                    requireApproval: true
                }
            },
            {
                id: 'operations',
                name: 'Operations & Processes',
                priority: 7,
                conditions: {
                    keywords: [
                        'operations',
                        'process',
                        'efficiency',
                        'logistics'
                    ]
                },
                actions: {
                    assignToExecutive: 'coo',
                    recordCall: true,
                    transcribeCall: true
                }
            },
            {
                id: 'strategy-planning',
                name: 'Strategic Planning',
                priority: 8,
                conditions: {
                    keywords: [
                        'strategy',
                        'planning',
                        'roadmap',
                        'competition',
                        'market'
                    ]
                },
                actions: {
                    assignToExecutive: 'cso',
                    recordCall: true,
                    transcribeCall: true
                }
            },
            {
                id: 'vip-callers',
                name: 'VIP Caller Routing',
                priority: 10,
                conditions: {
                    callerPattern: /\+1(555|800|888|877|866|855|844|833|822)/,
                    urgency: 'critical'
                },
                actions: {
                    assignToExecutive: 'ceo',
                    recordCall: true,
                    transcribeCall: true,
                    notifyOthers: [
                        'cfo',
                        'coo'
                    ]
                }
            },
            {
                id: 'after-hours',
                name: 'After Hours Routing',
                priority: 5,
                conditions: {
                    timeRange: {
                        start: '18:00',
                        end: '08:00'
                    }
                },
                actions: {
                    assignToExecutive: 'coo',
                    recordCall: true,
                    transcribeCall: true,
                    requireApproval: true
                }
            }
        ];
    }
    initializeEventListeners() {
        this.eventListeners.set('executiveAssigned', []);
        this.eventListeners.set('routingFailed', []);
        this.eventListeners.set('loadBalanced', []);
        this.eventListeners.set('availabilityChanged', []);
    }
    async assignExecutive(callerUri, context) {
        try {
            // Build call context
            const callContext = await this.buildCallContext(callerUri, context);
            // Find matching routing rules
            const matchingRules = this.findMatchingRules(callContext);
            // Get executive assignment from rules
            let assignedExecutive = this.getExecutiveFromRules(matchingRules);
            // If no rule-based assignment, use load balancing
            if (!assignedExecutive) {
                assignedExecutive = this.loadBalanceExecutives(callContext);
            }
            // Validate executive availability
            const executive = this.executives.get(assignedExecutive);
            if (!executive || !this.isExecutiveAvailable(executive)) {
                assignedExecutive = this.findAlternativeExecutive(assignedExecutive, callContext);
            }
            // Update executive load
            this.updateExecutiveLoad(assignedExecutive, 1);
            // Store call context
            this.storeCallContext(callerUri, callContext);
            console.log(`Call from ${callerUri} assigned to ${assignedExecutive}`);
            this.emit('executiveAssigned', {
                callerUri,
                executive: assignedExecutive,
                context: callContext
            });
            return assignedExecutive;
        } catch (error) {
            console.error('Failed to assign executive:', error);
            this.emit('routingFailed', {
                callerUri,
                error
            });
            // Fallback to CEO
            return 'ceo';
        }
    }
    async buildCallContext(callerUri, context) {
        const previousInteractions = this.callHistory.get(callerUri)?.length || 0;
        return {
            callerId: callerUri,
            callerName: context?.callerName,
            callerCompany: context?.callerCompany,
            previousInteractions,
            estimatedValue: context?.estimatedValue,
            urgency: context?.urgency || 'medium',
            keywords: context?.keywords || [],
            timeOfCall: new Date()
        };
    }
    findMatchingRules(context) {
        return this.routingRules.filter((rule)=>this.ruleMatches(rule, context)).sort((a, b)=>b.priority - a.priority);
    }
    ruleMatches(rule, context) {
        const conditions = rule.conditions;
        // Check caller pattern
        if (conditions.callerPattern && !conditions.callerPattern.test(context.callerId)) {
            return false;
        }
        // Check time range
        if (conditions.timeRange) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            if (currentTime < conditions.timeRange.start || currentTime > conditions.timeRange.end) {
                return false;
            }
        }
        // Check day of week
        if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(context.timeOfCall.getDay())) {
            return false;
        }
        // Check keywords
        if (conditions.keywords) {
            const hasKeyword = conditions.keywords.some((keyword)=>context.keywords.some((contextKeyword)=>contextKeyword.toLowerCase().includes(keyword.toLowerCase())));
            if (!hasKeyword) {
                return false;
            }
        }
        // Check urgency
        if (conditions.urgency && context.urgency !== conditions.urgency) {
            return false;
        }
        return true;
    }
    getExecutiveFromRules(rules) {
        for (const rule of rules){
            if (rule.actions.assignToExecutive) {
                const executive = this.executives.get(rule.actions.assignToExecutive);
                if (executive && this.isExecutiveAvailable(executive)) {
                    return rule.actions.assignToExecutive;
                }
            }
        }
        return null;
    }
    loadBalanceExecutives(context) {
        const availableExecutives = Array.from(this.executives.values()).filter((exec)=>this.isExecutiveAvailable(exec)).sort((a, b)=>{
            // Sort by load (ascending) then by priority (descending)
            if (a.currentLoad !== b.currentLoad) {
                return a.currentLoad - b.currentLoad;
            }
            return b.priority - a.priority;
        });
        if (availableExecutives.length === 0) {
            return 'ceo'; // Fallback
        }
        return availableExecutives[0].id;
    }
    isExecutiveAvailable(executive) {
        return executive.availability === 'available' && executive.currentLoad < executive.maxConcurrentCalls;
    }
    findAlternativeExecutive(originalExecutive, context) {
        // Find executives with similar specializations
        const original = this.executives.get(originalExecutive);
        if (!original) return 'ceo';
        const alternatives = Array.from(this.executives.values()).filter((exec)=>exec.id !== originalExecutive && this.isExecutiveAvailable(exec) && exec.specializations.some((spec)=>original.specializations.includes(spec))).sort((a, b)=>b.priority - a.priority);
        return alternatives.length > 0 ? alternatives[0].id : 'ceo';
    }
    updateExecutiveLoad(executiveId, delta) {
        const executive = this.executives.get(executiveId);
        if (executive) {
            executive.currentLoad = Math.max(0, executive.currentLoad + delta);
            this.emit('loadBalanced', {
                executiveId,
                newLoad: executive.currentLoad
            });
        }
    }
    storeCallContext(callerUri, context) {
        if (!this.callHistory.has(callerUri)) {
            this.callHistory.set(callerUri, []);
        }
        this.callHistory.get(callerUri).push(context);
        // Keep only last 10 interactions
        const history = this.callHistory.get(callerUri);
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
    }
    releaseExecutive(executiveId) {
        this.updateExecutiveLoad(executiveId, -1);
    }
    setExecutiveAvailability(executiveId, availability) {
        const executive = this.executives.get(executiveId);
        if (executive) {
            executive.availability = availability;
            this.emit('availabilityChanged', {
                executiveId,
                availability
            });
        }
    }
    getExecutiveProfile(executiveId) {
        return this.executives.get(executiveId);
    }
    getAllExecutives() {
        return Array.from(this.executives.values());
    }
    getAvailableExecutives() {
        return Array.from(this.executives.values()).filter((exec)=>this.isExecutiveAvailable(exec));
    }
    addRoutingRule(rule) {
        this.routingRules.push(rule);
        this.routingRules.sort((a, b)=>b.priority - a.priority);
    }
    removeRoutingRule(ruleId) {
        this.routingRules = this.routingRules.filter((rule)=>rule.id !== ruleId);
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback)=>callback(data));
        }
    }
}

})()),
"[project]/src/lib/voice/SIPClient.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "SIPClient": ()=>SIPClient
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$user$2d$agent$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/sip.js/lib/api/user-agent.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$inviter$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/sip.js/lib/api/inviter.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$session$2d$state$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/sip.js/lib/api/session-state.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$AudioProcessor$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/AudioProcessor.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$ExecutiveVoiceRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/ExecutiveVoiceRouter.ts [app-ssr] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
;
class SIPClient {
    config;
    ua;
    audioProcessor;
    voiceRouter;
    activeSessions;
    eventListeners;
    constructor(config, audioProcessor, voiceRouter){
        this.config = config;
        this.ua = null;
        this.activeSessions = new Map();
        this.eventListeners = new Map();
        this.audioProcessor = audioProcessor || new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$AudioProcessor$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AudioProcessor"]();
        this.voiceRouter = voiceRouter || new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$ExecutiveVoiceRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ExecutiveVoiceRouter"]();
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        this.eventListeners.set('registered', []);
        this.eventListeners.set('unregistered', []);
        this.eventListeners.set('registrationFailed', []);
        this.eventListeners.set('invite', []);
        this.eventListeners.set('connected', []);
        this.eventListeners.set('disconnected', []);
        this.eventListeners.set('failed', []);
        this.eventListeners.set('bye', []);
    }
    async initialize() {
        try {
            // Create User Agent
            const uri = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$user$2d$agent$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UserAgent"].makeURI(this.config.uri);
            if (!uri) {
                throw new Error(`Failed to create valid URI from ${this.config.uri}`);
            }
            this.ua = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$user$2d$agent$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UserAgent"]({
                uri: uri,
                transportOptions: this.config.transportOptions,
                authorizationUsername: this.config.authorizationUsername,
                authorizationPassword: this.config.authorizationPassword,
                displayName: this.config.displayName,
                delegate: {
                    onInvite: this.handleIncomingCall.bind(this),
                    onConnect: ()=>this.emit('connected'),
                    onDisconnect: ()=>this.emit('disconnected')
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
                            {
                                urls: 'stun:stun.l.google.com:19302'
                            },
                            {
                                urls: 'stun:stun1.l.google.com:19302'
                            }
                        ]
                    }
                },
                userAgentString: 'SOVREN AI Executive Command Center v1.0'
            });
            // Set up event handlers
            this.ua.delegate = {
                onInvite: this.handleIncomingCall.bind(this),
                onConnect: ()=>this.emit('connected'),
                onDisconnect: ()=>this.emit('disconnected')
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
    async makeCall(targetUri, executiveId) {
        if (!this.ua) {
            throw new Error('SIP Client not initialized');
        }
        try {
            const target = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$user$2d$agent$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UserAgent"].makeURI(targetUri);
            if (!target) {
                throw new Error(`Failed to create valid URI from ${targetUri}`);
            }
            const inviter = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$inviter$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Inviter"](this.ua, target, {
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: false
                    }
                }
            });
            const sessionId = this.generateSessionId();
            const callSession = {
                id: sessionId,
                executive: executiveId,
                remoteUri: targetUri,
                state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$session$2d$state$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SessionState"].Initial,
                startTime: new Date(),
                duration: 0,
                isInbound: false
            };
            this.activeSessions.set(sessionId, callSession);
            // Set up session event handlers
            inviter.delegate = {
                onBye: ()=>this.handleCallEnd(sessionId),
                onSessionDescriptionHandler: (sdh)=>{
                    if (sdh && sdh.peerConnection) {
                        callSession.audioStream = sdh.peerConnection?.getLocalStreams()?.[0];
                        if (callSession.audioStream) {
                            this.audioProcessor.processOutboundAudio(callSession.audioStream, executiveId);
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
    async handleIncomingCall(invitation) {
        const sessionId = this.generateSessionId();
        const assignedExecutive = await this.voiceRouter.assignExecutive(invitation.remoteIdentity.uri.toString());
        const callSession = {
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
            onBye: ()=>this.handleCallEnd(sessionId),
            onSessionDescriptionHandler: (sdh)=>{
                if (sdh && sdh.peerConnection) {
                    callSession.audioStream = sdh.peerConnection?.getRemoteStreams()?.[0];
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
            callSession.state = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sip$2e$js$2f$lib$2f$api$2f$session$2d$state$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SessionState"].Established;
            this.emit('connected', callSession);
        } catch (error) {
            console.error('Failed to accept incoming call:', error);
            this.handleCallEnd(sessionId);
        }
    }
    handleCallEnd(sessionId) {
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
    async endCall(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Implementation would depend on whether it's an Inviter or Invitation
        // For now, we'll simulate ending the call
        this.handleCallEnd(sessionId);
    }
    getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }
    getSessionById(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback)=>callback(data));
        }
    }
    async disconnect() {
        if (this.ua) {
            // End all active sessions
            for (const sessionId of this.activeSessions.keys()){
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

})()),
"[project]/src/lib/voice/StyleTTS2Engine.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

// VoiceModel import removed as it's not used
__turbopack_esm__({
    "StyleTTS2Engine": ()=>StyleTTS2Engine
});
class StyleTTS2Engine {
    config;
    models = new Map();
    wasmModule = null;
    isInitialized = false;
    webGPUDevice = null;
    audioContext = null;
    eventListeners = new Map();
    constructor(config){
        this.config = config;
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        this.eventListeners.set('engineReady', []);
        this.eventListeners.set('modelLoaded', []);
        this.eventListeners.set('synthesisProgress', []);
        this.eventListeners.set('synthesisComplete', []);
        this.eventListeners.set('error', []);
    }
    async initialize() {
        try {
            console.log('Initializing StyleTTS2 Neural Voice Engine...');
            // Initialize WebAssembly if enabled
            if (this.config.enableWebAssembly) {
                await this.initializeWebAssembly();
            }
            // Initialize WebGPU if available
            if (this.config.device === 'webgpu') {
                await this.initializeWebGPU();
            }
            // Initialize Audio Context
            this.audioContext = new AudioContext({
                sampleRate: 22050,
                latencyHint: 'interactive'
            });
            // Load executive voice models
            await this.loadExecutiveModels();
            this.isInitialized = true;
            console.log('✓ StyleTTS2 Engine initialized successfully');
            this.emit('engineReady');
        } catch (error) {
            console.error('Failed to initialize StyleTTS2 Engine:', error);
            this.emit('error', error);
            throw error;
        }
    }
    async initializeWebAssembly() {
        try {
            console.log('Loading StyleTTS2 WebAssembly module...');
            // In a real implementation, this would load the actual WASM module
            // For now, we'll simulate the loading process
            const wasmResponse = await fetch('/wasm/styletts2.wasm');
            await wasmResponse.arrayBuffer(); // Load but don't store unused bytes
            // Simulate WASM compilation and instantiation
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            this.wasmModule = {
                synthesize: this.wasmSynthesize.bind(this),
                loadModel: this.wasmLoadModel.bind(this),
                setParameters: this.wasmSetParameters.bind(this)
            };
            console.log('✓ WebAssembly module loaded');
        } catch (error) {
            console.warn('WebAssembly not available, falling back to JavaScript implementation');
            this.config.enableWebAssembly = false;
        }
    }
    async initializeWebGPU() {
        try {
            if (!navigator.gpu) {
                throw new Error('WebGPU not supported');
            }
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                throw new Error('No WebGPU adapter found');
            }
            this.webGPUDevice = await adapter.requestDevice();
            console.log('✓ WebGPU device initialized');
        } catch (error) {
            console.warn('WebGPU not available, falling back to CPU processing');
            this.config.device = 'cpu';
        }
    }
    async loadExecutiveModels() {
        const executiveModels = [
            {
                id: 'sovren-ai-neural',
                name: 'SOVREN AI Neural Core Voice',
                modelPath: '/models/sovren-ai-neural.onnx',
                vocoderPath: '/models/hifigan-sovren.onnx',
                configPath: '/models/sovren-config.json'
            },
            {
                id: 'ceo-authoritative',
                name: 'CEO Executive Voice',
                modelPath: '/models/ceo-authoritative.onnx',
                vocoderPath: '/models/hifigan-ceo.onnx',
                configPath: '/models/ceo-config.json'
            },
            {
                id: 'cfo-analytical',
                name: 'CFO Analytical Voice',
                modelPath: '/models/cfo-analytical.onnx',
                vocoderPath: '/models/hifigan-cfo.onnx',
                configPath: '/models/cfo-config.json'
            },
            {
                id: 'cto-technical',
                name: 'CTO Technical Voice',
                modelPath: '/models/cto-technical.onnx',
                vocoderPath: '/models/hifigan-cto.onnx',
                configPath: '/models/cto-config.json'
            },
            {
                id: 'cmo-persuasive',
                name: 'CMO Persuasive Voice',
                modelPath: '/models/cmo-persuasive.onnx',
                vocoderPath: '/models/hifigan-cmo.onnx',
                configPath: '/models/cmo-config.json'
            },
            {
                id: 'coo-operational',
                name: 'COO Operational Voice',
                modelPath: '/models/coo-operational.onnx',
                vocoderPath: '/models/hifigan-coo.onnx',
                configPath: '/models/coo-config.json'
            },
            {
                id: 'chro-empathetic',
                name: 'CHRO Empathetic Voice',
                modelPath: '/models/chro-empathetic.onnx',
                vocoderPath: '/models/hifigan-chro.onnx',
                configPath: '/models/chro-config.json'
            },
            {
                id: 'clo-precise',
                name: 'CLO Precise Voice',
                modelPath: '/models/clo-precise.onnx',
                vocoderPath: '/models/hifigan-clo.onnx',
                configPath: '/models/clo-config.json'
            },
            {
                id: 'cso-strategic',
                name: 'CSO Strategic Voice',
                modelPath: '/models/cso-strategic.onnx',
                vocoderPath: '/models/hifigan-cso.onnx',
                configPath: '/models/cso-config.json'
            }
        ];
        // Load models in parallel for faster initialization
        const loadPromises = executiveModels.map((model)=>this.loadModel(model));
        await Promise.all(loadPromises);
    }
    async loadModel(modelInfo) {
        try {
            console.log(`Loading StyleTTS2 model: ${modelInfo.name}`);
            // Simulate model loading (in real implementation, would load actual ONNX models)
            const [modelData, vocoderData, configData] = await Promise.all([
                this.loadModelData(modelInfo.modelPath),
                this.loadModelData(modelInfo.vocoderPath),
                this.loadConfigData(modelInfo.configPath)
            ]);
            const model = {
                id: modelInfo.id,
                name: modelInfo.name,
                modelData,
                vocoderData,
                configData,
                isLoaded: true,
                loadTime: Date.now(),
                memoryUsage: modelData.byteLength + vocoderData.byteLength
            };
            this.models.set(modelInfo.id, model);
            console.log(`✓ Model loaded: ${modelInfo.name} (${(model.memoryUsage / 1024 / 1024).toFixed(1)}MB)`);
            this.emit('modelLoaded', {
                modelId: modelInfo.id,
                model
            });
        } catch (error) {
            console.error(`Failed to load model ${modelInfo.id}:`, error);
            this.emit('error', {
                modelId: modelInfo.id,
                error
            });
        }
    }
    async loadModelData(_path) {
        // Simulate model data loading
        await new Promise((resolve)=>setTimeout(resolve, 500));
        // Create mock model data
        const size = 50 * 1024 * 1024; // 50MB mock model
        return new ArrayBuffer(size);
    }
    /**
   * Call backend TTS service for heavy processing
   */ async callBackendTTSService(parameters) {
        try {
            const response = await fetch('/api/tts/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: parameters.text,
                    voiceId: parameters.voiceId,
                    priority: 'high',
                    format: 'wav',
                    sampleRate: 22050
                })
            });
            if (!response.ok) {
                throw new Error(`Backend TTS service error: ${response.status}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(`TTS synthesis failed: ${result.error}`);
            }
            // Convert base64 audio data to ArrayBuffer
            const audioBuffer = this.base64ToArrayBuffer(result.audioData);
            console.log(`✅ Backend TTS completed: ${audioBuffer.byteLength} bytes in ${result.processingTime}ms`);
            return audioBuffer;
        } catch (error) {
            console.warn('Backend TTS service call failed:', error);
            return null;
        }
    }
    /**
   * Convert base64 string to ArrayBuffer
   */ base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for(let i = 0; i < binaryString.length; i++){
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    async loadConfigData(_path) {
        // Simulate config loading
        await new Promise((resolve)=>setTimeout(resolve, 100));
        return {
            sample_rate: 22050,
            hop_length: 256,
            win_length: 1024,
            n_mel: 80,
            n_fft: 1024,
            f_min: 0,
            f_max: 11025,
            max_wav_value: 32768.0
        };
    }
    async synthesize(parameters) {
        if (!this.isInitialized) {
            throw new Error('StyleTTS2 Engine not initialized');
        }
        const model = this.models.get(parameters.voiceId);
        if (!model) {
            throw new Error(`Voice model not found: ${parameters.voiceId}`);
        }
        try {
            console.log(`🎤 Using TTS Backend Service: "${parameters.text}" with ${model.name}`);
            // Try backend service first
            try {
                const backendResult = await this.callBackendTTSService(parameters);
                if (backendResult) {
                    this.emit('synthesisProgress', {
                        stage: 'complete',
                        progress: 1.0
                    });
                    return backendResult;
                }
            } catch (backendError) {
                console.warn('Backend TTS service unavailable, using local processing:', backendError);
            }
            // Fallback to local processing
            console.log(`🔄 Fallback: Local StyleTTS2 processing for "${parameters.text}"`);
            // Preprocess text
            const processedText = this.preprocessText(parameters.text);
            // Generate mel-spectrogram
            this.emit('synthesisProgress', {
                stage: 'mel_generation',
                progress: 0.2
            });
            const melSpectrogram = await this.generateMelSpectrogram(processedText, model, parameters);
            // Generate audio with vocoder
            this.emit('synthesisProgress', {
                stage: 'vocoding',
                progress: 0.6
            });
            const audioBuffer = await this.vocode(melSpectrogram, model, parameters);
            // Post-process audio
            this.emit('synthesisProgress', {
                stage: 'post_processing',
                progress: 0.9
            });
            const finalAudio = await this.postProcessAudio(audioBuffer, parameters);
            this.emit('synthesisProgress', {
                stage: 'complete',
                progress: 1.0
            });
            this.emit('synthesisComplete', {
                voiceId: parameters.voiceId,
                audioBuffer: finalAudio
            });
            return finalAudio;
        } catch (error) {
            console.error('StyleTTS2 synthesis failed:', error);
            this.emit('error', {
                voiceId: parameters.voiceId,
                error
            });
            throw error;
        }
    }
    preprocessText(text) {
        // Text normalization and phoneme conversion
        return text.toLowerCase().replace(/[^\w\s.,!?-]/g, '').replace(/\s+/g, ' ').trim();
    }
    async generateMelSpectrogram(text, model, params) {
        if (this.config.enableWebAssembly && this.wasmModule) {
            return await this.wasmModule.synthesize(text, model, params);
        } else {
            return await this.jsSynthesize(text, model, params);
        }
    }
    async jsSynthesize(text, model, params) {
        // JavaScript fallback implementation
        const duration = text.length * 0.1; // Estimate duration
        const melFrames = Math.floor(duration * 22050 / 256); // Hop length = 256
        const melChannels = 80;
        // Simulate mel-spectrogram generation
        await new Promise((resolve)=>setTimeout(resolve, text.length * 10));
        const melSpectrogram = new Float32Array(melFrames * melChannels);
        // Generate synthetic mel-spectrogram based on voice characteristics
        for(let frame = 0; frame < melFrames; frame++){
            for(let mel = 0; mel < melChannels; mel++){
                const freq = mel * 11025 / melChannels;
                const time = frame * 256 / 22050;
                // Simulate formant structure
                let energy = 0;
                const formants = [
                    800,
                    1200,
                    2400
                ]; // Basic formants
                for (const formant of formants){
                    const distance = Math.abs(freq - formant);
                    energy += Math.exp(-distance / 200) * (1 + Math.sin(time * 2 * Math.PI * 150));
                }
                // Apply voice-specific modifications
                energy *= this.getVoiceCharacteristics(params.voiceId, freq);
                melSpectrogram[frame * melChannels + mel] = energy;
            }
        }
        return melSpectrogram;
    }
    getVoiceCharacteristics(voiceId, frequency) {
        const characteristics = {
            'ceo-authoritative': {
                low: 1.2,
                mid: 1.0,
                high: 0.8
            },
            'cfo-analytical': {
                low: 0.9,
                mid: 1.1,
                high: 1.0
            },
            'cto-technical': {
                low: 1.0,
                mid: 1.0,
                high: 1.1
            },
            'cmo-persuasive': {
                low: 1.1,
                mid: 1.2,
                high: 1.0
            },
            'coo-operational': {
                low: 1.0,
                mid: 1.0,
                high: 0.9
            },
            'chro-empathetic': {
                low: 1.1,
                mid: 1.1,
                high: 0.9
            },
            'clo-precise': {
                low: 0.8,
                mid: 1.0,
                high: 1.0
            },
            'cso-strategic': {
                low: 1.0,
                mid: 1.1,
                high: 1.0
            }
        };
        const char = characteristics[voiceId] || {
            low: 1.0,
            mid: 1.0,
            high: 1.0
        };
        if (frequency < 500) return char.low;
        if (frequency < 2000) return char.mid;
        return char.high;
    }
    async vocode(melSpectrogram, model, params) {
        // Simulate HiFi-GAN vocoding
        const melFrames = melSpectrogram.length / 80;
        const audioSamples = melFrames * 256; // Hop length
        await new Promise((resolve)=>setTimeout(resolve, melFrames * 2));
        const audioBuffer = new ArrayBuffer(audioSamples * 2); // 16-bit audio
        const audioView = new Int16Array(audioBuffer);
        // Generate audio from mel-spectrogram
        for(let i = 0; i < audioSamples; i++){
            const melFrame = Math.floor(i / 256);
            const melIndex = melFrame * 80;
            let sample = 0;
            for(let mel = 0; mel < 80; mel++){
                const melValue = melSpectrogram[melIndex + mel] || 0;
                const freq = mel * 11025 / 80;
                const phase = i / 22050 * 2 * Math.PI * freq;
                sample += melValue * Math.sin(phase) * 0.01;
            }
            // Apply prosody modifications
            sample *= params.prosody.volume;
            sample = Math.tanh(sample); // Soft clipping
            audioView[i] = Math.max(-32768, Math.min(32767, sample * 16384));
        }
        return audioBuffer;
    }
    async postProcessAudio(audioBuffer, params) {
        // Apply final processing (normalization, filtering, etc.)
        const audioView = new Int16Array(audioBuffer);
        // Normalize audio
        let maxAmplitude = 0;
        for(let i = 0; i < audioView.length; i++){
            maxAmplitude = Math.max(maxAmplitude, Math.abs(audioView[i]));
        }
        if (maxAmplitude > 0) {
            const normalizationFactor = 16384 / maxAmplitude;
            for(let i = 0; i < audioView.length; i++){
                audioView[i] *= normalizationFactor;
            }
        }
        return audioBuffer;
    }
    // WebAssembly implementations (stubs for now)
    async wasmSynthesize(text, model, params) {
        // Would call actual WASM function
        return this.jsSynthesize(text, model, params);
    }
    wasmLoadModel(modelData) {
        // Would load model into WASM memory
        return true;
    }
    wasmSetParameters(params) {
    // Would set WASM parameters
    }
    getLoadedModels() {
        return Array.from(this.models.values());
    }
    getModelById(modelId) {
        return this.models.get(modelId);
    }
    getMemoryUsage() {
        return Array.from(this.models.values()).reduce((total, model)=>total + model.memoryUsage, 0);
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback)=>callback(data));
        }
    }
    async shutdown() {
        console.log('Shutting down StyleTTS2 Engine...');
        // Clear models
        this.models.clear();
        // Close audio context
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
        // Clean up WebGPU
        if (this.webGPUDevice) {
            this.webGPUDevice.destroy();
            this.webGPUDevice = null;
        }
        this.isInitialized = false;
        console.log('✓ StyleTTS2 Engine shutdown complete');
    }
}

})()),
"[project]/src/lib/voice/VoiceSynthesizer.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "VoiceSynthesizer": ()=>VoiceSynthesizer
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$StyleTTS2Engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/StyleTTS2Engine.ts [app-ssr] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
;
class VoiceSynthesizer {
    config;
    voiceModels;
    synthesisQueue;
    isProcessing;
    audioContext;
    cache;
    eventListeners;
    workerPool;
    maxWorkers;
    styleTTS2Engine;
    constructor(config){
        this.config = config;
        this.voiceModels = new Map();
        this.synthesisQueue = [];
        this.isProcessing = false;
        this.audioContext = null;
        this.cache = new Map();
        this.eventListeners = new Map();
        this.workerPool = [];
        this.maxWorkers = 4;
        this.styleTTS2Engine = null;
        this.initializeEventListeners();
        this.initializeVoiceModels();
    }
    initializeEventListeners() {
        this.eventListeners.set('ready', []);
        this.eventListeners.set('synthesisComplete', []);
        this.eventListeners.set('synthesisError', []);
        this.eventListeners.set('modelLoaded', []);
        this.eventListeners.set('queueUpdated', []);
        this.eventListeners.set('error', []);
    }
    initializeVoiceModels() {
        const models = [
            {
                id: 'sovren-ai-neural',
                name: 'SOVREN AI Neural Core Voice',
                language: 'en-US',
                gender: 'neutral',
                characteristics: {
                    pitch: 1.0,
                    speed: 1.1,
                    tone: 'authoritative',
                    accent: 'neural-synthetic'
                },
                modelPath: `${this.config.modelsPath}/sovren-ai-neural.onnx`,
                isLoaded: false
            },
            {
                id: 'ceo-authoritative',
                name: 'CEO Executive Voice',
                language: 'en-US',
                gender: 'male',
                characteristics: {
                    pitch: 0.8,
                    speed: 0.9,
                    tone: 'authoritative',
                    accent: 'american-executive'
                },
                modelPath: `${this.config.modelsPath}/ceo-authoritative.onnx`,
                isLoaded: false
            },
            {
                id: 'cfo-analytical',
                name: 'CFO Analytical Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 0.9,
                    speed: 0.95,
                    tone: 'analytical',
                    accent: 'professional-precise'
                },
                modelPath: `${this.config.modelsPath}/cfo-analytical.onnx`,
                isLoaded: false
            },
            {
                id: 'cmo-charismatic',
                name: 'CMO Charismatic Voice',
                language: 'en-US',
                gender: 'male',
                characteristics: {
                    pitch: 0.85,
                    speed: 1.05,
                    tone: 'charismatic',
                    accent: 'engaging-persuasive'
                },
                modelPath: `${this.config.modelsPath}/cmo-charismatic.onnx`,
                isLoaded: false
            },
            {
                id: 'cto-technical',
                name: 'CTO Technical Voice',
                language: 'en-US',
                gender: 'neutral',
                characteristics: {
                    pitch: 0.9,
                    speed: 1.0,
                    tone: 'technical',
                    accent: 'clear-methodical'
                },
                modelPath: `${this.config.modelsPath}/cto-technical.onnx`,
                isLoaded: false
            },
            {
                id: 'legal-authoritative',
                name: 'Legal Counsel Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 0.85,
                    speed: 0.9,
                    tone: 'formal',
                    accent: 'legal-precise'
                },
                modelPath: `${this.config.modelsPath}/legal-authoritative.onnx`,
                isLoaded: false
            },
            {
                id: 'coo-efficient',
                name: 'COO Efficient Voice',
                language: 'en-US',
                gender: 'male',
                characteristics: {
                    pitch: 0.88,
                    speed: 1.1,
                    tone: 'efficient',
                    accent: 'results-focused'
                },
                modelPath: `${this.config.modelsPath}/coo-efficient.onnx`,
                isLoaded: false
            },
            {
                id: 'chro-empathetic',
                name: 'CHRO Empathetic Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 0.95,
                    speed: 0.95,
                    tone: 'empathetic',
                    accent: 'warm-professional'
                },
                modelPath: `${this.config.modelsPath}/chro-empathetic.onnx`,
                isLoaded: false
            },
            {
                id: 'cfo-analytical',
                name: 'CFO Analytical Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 1.1,
                    speed: 0.95,
                    tone: 'analytical',
                    accent: 'american-professional'
                },
                modelPath: `${this.config.modelsPath}/cfo-analytical.onnx`,
                isLoaded: false
            },
            {
                id: 'cto-technical',
                name: 'CTO Technical Voice',
                language: 'en-US',
                gender: 'male',
                characteristics: {
                    pitch: 0.9,
                    speed: 1.0,
                    tone: 'technical',
                    accent: 'american-tech'
                },
                modelPath: `${this.config.modelsPath}/cto-technical.onnx`,
                isLoaded: false
            },
            {
                id: 'cmo-persuasive',
                name: 'CMO Persuasive Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 1.2,
                    speed: 1.05,
                    tone: 'persuasive',
                    accent: 'american-marketing'
                },
                modelPath: `${this.config.modelsPath}/cmo-persuasive.onnx`,
                isLoaded: false
            },
            {
                id: 'coo-operational',
                name: 'COO Operational Voice',
                language: 'en-US',
                gender: 'male',
                characteristics: {
                    pitch: 0.85,
                    speed: 0.98,
                    tone: 'operational',
                    accent: 'american-business'
                },
                modelPath: `${this.config.modelsPath}/coo-operational.onnx`,
                isLoaded: false
            },
            {
                id: 'chro-empathetic',
                name: 'CHRO Empathetic Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 1.15,
                    speed: 0.92,
                    tone: 'empathetic',
                    accent: 'american-caring'
                },
                modelPath: `${this.config.modelsPath}/chro-empathetic.onnx`,
                isLoaded: false
            },
            {
                id: 'clo-precise',
                name: 'CLO Precise Voice',
                language: 'en-US',
                gender: 'male',
                characteristics: {
                    pitch: 0.88,
                    speed: 0.88,
                    tone: 'precise',
                    accent: 'american-legal'
                },
                modelPath: `${this.config.modelsPath}/clo-precise.onnx`,
                isLoaded: false
            },
            {
                id: 'cso-strategic',
                name: 'CSO Strategic Voice',
                language: 'en-US',
                gender: 'female',
                characteristics: {
                    pitch: 1.05,
                    speed: 0.93,
                    tone: 'strategic',
                    accent: 'american-strategic'
                },
                modelPath: `${this.config.modelsPath}/cso-strategic.onnx`,
                isLoaded: false
            }
        ];
        models.forEach((model)=>{
            this.voiceModels.set(model.id, model);
        });
    }
    async initialize() {
        if (!this.config.enabled) {
            console.log('Voice synthesis is disabled');
            return;
        }
        try {
            // Initialize audio context
            this.audioContext = new AudioContext({
                sampleRate: 22050,
                latencyHint: 'interactive'
            });
            // Initialize StyleTTS2 Engine
            const styleTTS2Config = {
                modelPath: this.config.modelsPath,
                vocoder: 'hifigan',
                device: 'cpu',
                batchSize: 1,
                maxLength: 1000,
                temperature: 0.7,
                lengthScale: 1.0,
                noiseScale: 0.667,
                enableWebAssembly: true
            };
            this.styleTTS2Engine = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$StyleTTS2Engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StyleTTS2Engine"](styleTTS2Config);
            // Set up StyleTTS2 event handlers
            this.styleTTS2Engine.on('engineReady', ()=>{
                console.log('✓ StyleTTS2 Engine ready');
            });
            this.styleTTS2Engine.on('modelLoaded', (data)=>{
                console.log(`✓ StyleTTS2 model loaded: ${data.modelId}`);
                this.emit('modelLoaded', data);
            });
            this.styleTTS2Engine.on('synthesisProgress', (data)=>{
                this.emit('synthesisProgress', data);
            });
            this.styleTTS2Engine.on('error', (error)=>{
                console.error('StyleTTS2 Engine error:', error);
                this.emit('error', error);
            });
            // Initialize StyleTTS2 Engine
            await this.styleTTS2Engine.initialize();
            // Initialize worker pool for fallback processing
            await this.initializeWorkerPool();
            // Load critical voice models (SOVREN AI, CEO, CFO, CTO first)
            const criticalModels = [
                'sovren-ai-neural',
                'ceo-authoritative',
                'cfo-analytical',
                'cto-technical'
            ];
            await Promise.all(criticalModels.map((modelId)=>this.loadVoiceModel(modelId)));
            console.log('Voice Synthesizer with StyleTTS2 initialized successfully');
            this.emit('ready');
        } catch (error) {
            console.error('Failed to initialize Voice Synthesizer:', error);
            this.emit('error', error);
            throw error;
        }
    }
    /**
   * Check browser compatibility for voice synthesis
   */ async checkBrowserCompatibility() {
        if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('Web Audio API not supported');
        }
        if (!window.Worker) {
            throw new Error('Web Workers not supported');
        }
        console.log('✅ Browser compatibility check passed');
    }
    /**
   * Detect optimal device for synthesis (CPU/GPU)
   */ async detectOptimalDevice() {
        try {
            // Check for WebGPU support
            if (navigator.gpu) {
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) {
                    console.log('🚀 WebGPU detected, using GPU acceleration');
                    return 'gpu';
                }
            }
        } catch (error) {
            console.log('WebGPU not available, falling back to CPU');
        }
        return 'cpu';
    }
    /**
   * Setup comprehensive StyleTTS2 event handlers
   */ setupStyleTTS2EventHandlers() {
        this.styleTTS2Engine.on('engineReady', ()=>{
            console.log('✓ StyleTTS2 Engine ready');
        });
        this.styleTTS2Engine.on('modelLoaded', (data)=>{
            console.log(`✓ StyleTTS2 model loaded: ${data.modelId}`);
            this.emit('modelLoaded', data);
        });
        this.styleTTS2Engine.on('synthesisProgress', (data)=>{
            this.emit('synthesisProgress', data);
        });
        this.styleTTS2Engine.on('synthesisComplete', (result)=>{
            this.emit('synthesisComplete', result);
        });
        this.styleTTS2Engine.on('error', (error)=>{
            console.error('StyleTTS2 Engine error:', error);
            this.emit('error', error);
        });
    }
    /**
   * Load and validate voice models
   */ async loadAndValidateVoiceModels() {
        console.log('📦 Loading and validating voice models...');
        // Load critical models first
        const criticalModels = [
            'sovren-ai-neural',
            'ceo-authoritative',
            'cfo-analytical',
            'cto-technical'
        ];
        for (const modelId of criticalModels){
            try {
                await this.loadVoiceModel(modelId);
                console.log(`✅ Critical model loaded: ${modelId}`);
            } catch (error) {
                console.warn(`⚠️ Failed to load critical model ${modelId}:`, error);
            }
        }
    }
    /**
   * Perform system health check
   */ async performHealthCheck() {
        console.log('🏥 Performing voice synthesis health check...');
        try {
            // Test synthesis with a simple phrase
            const testResult = await this.synthesize('System health check', 'sovren-ai-neural', 'high');
            if (testResult.audioBuffer && testResult.audioBuffer.byteLength > 0) {
                console.log('✅ Voice synthesis health check passed');
            } else {
                throw new Error('Health check produced empty audio');
            }
        } catch (error) {
            console.warn('⚠️ Voice synthesis health check failed:', error);
        // Don't throw - allow system to continue with degraded functionality
        }
    }
    async initializeWorkerPool() {
        for(let i = 0; i < this.maxWorkers; i++){
            try {
                const worker = new Worker('/workers/voice-synthesis-worker.js');
                worker.onmessage = this.handleWorkerMessage.bind(this);
                worker.onerror = this.handleWorkerError.bind(this);
                this.workerPool.push(worker);
            } catch (error) {
                console.warn(`Failed to create synthesis worker ${i}:`, error);
            }
        }
        if (this.workerPool.length === 0) {
            console.warn('No synthesis workers available, falling back to main thread processing');
        }
    }
    handleWorkerMessage(event) {
        const { type, requestId, result, error } = event.data;
        switch(type){
            case 'synthesis-complete':
                this.handleSynthesisComplete(requestId, result);
                break;
            case 'synthesis-error':
                this.handleSynthesisError(requestId, error);
                break;
            case 'model-loaded':
                this.handleModelLoaded(result.modelId);
                break;
        }
    }
    handleWorkerError(error) {
        console.error('Synthesis worker error:', error);
        this.emit('error', error);
    }
    async loadVoiceModel(modelId) {
        const model = this.voiceModels.get(modelId);
        if (!model || model.isLoaded) {
            return;
        }
        try {
            // In a real implementation, this would load the actual model
            // For now, we'll simulate loading
            console.log(`Loading voice model: ${model.name}`);
            // Simulate loading time
            await new Promise((resolve)=>setTimeout(resolve, 1000));
            model.isLoaded = true;
            console.log(`✓ Voice model loaded: ${model.name}`);
            this.emit('modelLoaded', {
                modelId,
                model
            });
        } catch (error) {
            console.error(`Failed to load voice model ${modelId}:`, error);
            this.emit('error', {
                modelId,
                error
            });
            throw error;
        }
    }
    async synthesize(text, voiceModelId, priority = 'normal', options) {
        if (!this.config.enabled) {
            throw new Error('Voice synthesis is disabled');
        }
        // Check if model exists and load if necessary
        const model = this.voiceModels.get(voiceModelId);
        if (!model) {
            throw new Error(`Voice model not found: ${voiceModelId}`);
        }
        if (!model.isLoaded) {
            await this.loadVoiceModel(voiceModelId);
        }
        // Create synthesis request
        const request = {
            id: this.generateRequestId(),
            text,
            voiceModel: voiceModelId,
            priority,
            timestamp: new Date(),
            options
        };
        // Check cache first
        const cacheKey = this.generateCacheKey(request);
        if (this.cache.has(cacheKey)) {
            const cachedResult = this.cache.get(cacheKey);
            this.emit('synthesisComplete', {
                requestId: request.id,
                result: cachedResult,
                fromCache: true
            });
            return request.id;
        }
        // Add to queue
        this.addToQueue(request);
        // Process queue if not already processing
        if (!this.isProcessing) {
            this.processQueue();
        }
        return request.id;
    }
    addToQueue(request) {
        // Insert based on priority
        const priorityOrder = {
            high: 0,
            normal: 1,
            low: 2
        };
        const insertIndex = this.synthesisQueue.findIndex((req)=>priorityOrder[req.priority] > priorityOrder[request.priority]);
        if (insertIndex === -1) {
            this.synthesisQueue.push(request);
        } else {
            this.synthesisQueue.splice(insertIndex, 0, request);
        }
        this.emit('queueUpdated', {
            queueLength: this.synthesisQueue.length
        });
    }
    async processQueue() {
        if (this.isProcessing || this.synthesisQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        while(this.synthesisQueue.length > 0){
            const request = this.synthesisQueue.shift();
            try {
                await this.processSynthesisRequest(request);
            } catch (error) {
                console.error(`Synthesis failed for request ${request.id}:`, error);
                this.emit('synthesisError', {
                    requestId: request.id,
                    error
                });
            }
        }
        this.isProcessing = false;
    }
    async processSynthesisRequest(request) {
        const model = this.voiceModels.get(request.voiceModel);
        // Get available worker or process in main thread
        const worker = this.getAvailableWorker();
        if (worker) {
            // Process with worker
            worker.postMessage({
                type: 'synthesize',
                request,
                model
            });
        } else {
            // Process in main thread (fallback)
            await this.synthesizeInMainThread(request, model);
        }
    }
    getAvailableWorker() {
        // In a real implementation, you'd track worker availability
        return this.workerPool.length > 0 ? this.workerPool[0] : null;
    }
    async synthesizeInMainThread(request, model) {
        try {
            console.log(`Synthesizing with StyleTTS2: "${request.text}" using ${model.name}`);
            if (this.styleTTS2Engine) {
                // Use StyleTTS2 for high-quality synthesis
                const synthesisParams = {
                    text: request.text,
                    voiceId: request.voiceModel,
                    speed: request.options?.speed || model.characteristics.speed,
                    pitch: request.options?.pitch || model.characteristics.pitch,
                    energy: 1.0,
                    emotion: request.options?.emotion || 'neutral',
                    style: [],
                    prosody: {
                        rate: request.options?.speed || 1.0,
                        volume: request.options?.volume || 1.0,
                        emphasis: [] // Emphasis points
                    }
                };
                const audioBuffer = await this.styleTTS2Engine.synthesize(synthesisParams);
                const duration = audioBuffer.byteLength / 2 / 22050 * 1000; // Convert to milliseconds
                const result = {
                    requestId: request.id,
                    audioBuffer,
                    duration,
                    format: 'wav',
                    sampleRate: 22050
                };
                this.handleSynthesisComplete(request.id, result);
            } else {
                // Fallback to basic synthesis
                console.log(`Fallback synthesis: "${request.text}" with ${model.name}`);
                const duration = request.text.length * 50; // Simulate duration
                await new Promise((resolve)=>setTimeout(resolve, duration));
                // Create mock audio buffer
                const sampleRate = 22050;
                const samples = Math.floor(duration * sampleRate / 1000);
                const audioBuffer = new ArrayBuffer(samples * 2); // 16-bit audio
                const result = {
                    requestId: request.id,
                    audioBuffer,
                    duration,
                    format: 'wav',
                    sampleRate
                };
                this.handleSynthesisComplete(request.id, result);
            }
        } catch (error) {
            console.error('Synthesis failed, falling back to basic synthesis:', error);
            this.handleSynthesisError(request.id, error);
        }
    }
    handleSynthesisComplete(requestId, result) {
        // Cache the result
        const request = this.synthesisQueue.find((req)=>req.id === requestId);
        if (request) {
            const cacheKey = this.generateCacheKey(request);
            this.addToCache(cacheKey, result);
        }
        console.log(`Synthesis complete for request: ${requestId}`);
        this.emit('synthesisComplete', {
            requestId,
            result
        });
    }
    handleSynthesisError(requestId, error) {
        console.error(`Synthesis error for request ${requestId}:`, error);
        this.emit('synthesisError', {
            requestId,
            error
        });
    }
    handleModelLoaded(modelId) {
        const model = this.voiceModels.get(modelId);
        if (model) {
            model.isLoaded = true;
            this.emit('modelLoaded', {
                modelId,
                model
            });
        }
    }
    generateRequestId() {
        return `synthesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCacheKey(request) {
        const optionsStr = JSON.stringify(request.options || {});
        return `${request.voiceModel}_${request.text}_${optionsStr}`;
    }
    addToCache(key, result) {
        // Implement LRU cache
        if (this.cache.size >= this.config.cacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, result);
    }
    getVoiceModels() {
        return Array.from(this.voiceModels.values());
    }
    getLoadedModels() {
        return Array.from(this.voiceModels.values()).filter((model)=>model.isLoaded);
    }
    getQueueLength() {
        return this.synthesisQueue.length;
    }
    clearQueue() {
        this.synthesisQueue = [];
        this.emit('queueUpdated', {
            queueLength: 0
        });
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback)=>callback(data));
        }
    }
    getStyleTTS2Status() {
        if (!this.styleTTS2Engine) {
            return {
                status: 'not_initialized'
            };
        }
        return {
            status: 'ready',
            loadedModels: this.styleTTS2Engine.getLoadedModels().length,
            memoryUsage: this.styleTTS2Engine.getMemoryUsage()
        };
    }
    async shutdown() {
        console.log('Shutting down Voice Synthesizer...');
        // Clear queue
        this.clearQueue();
        // Terminate workers
        this.workerPool.forEach((worker)=>worker.terminate());
        this.workerPool = [];
        // Shutdown StyleTTS2 Engine
        if (this.styleTTS2Engine) {
            await this.styleTTS2Engine.shutdown();
            this.styleTTS2Engine = null;
        }
        // Close audio context
        if (this.audioContext) {
            await this.audioContext.close();
            this.audioContext = null;
        }
        // Clear cache
        this.cache.clear();
        console.log('✓ Voice Synthesizer shutdown complete');
    }
}

})()),
"[project]/src/lib/voice/VoiceSystemManager.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "VoiceSystemManager": ()=>VoiceSystemManager
});
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$SIPClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/SIPClient.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$AudioProcessor$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/AudioProcessor.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$ExecutiveVoiceRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/ExecutiveVoiceRouter.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$VoiceSynthesizer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/VoiceSynthesizer.ts [app-ssr] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
;
;
class VoiceSystemManager {
    config;
    sipClient;
    audioProcessor;
    voiceRouter;
    voiceSynthesizer;
    isInitialized;
    eventListeners;
    systemStatus;
    constructor(config){
        this.config = config;
        this.isInitialized = false;
        this.eventListeners = new Map();
        // Initialize components
        this.audioProcessor = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$AudioProcessor$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AudioProcessor"](config.audio);
        this.voiceRouter = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$ExecutiveVoiceRouter$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ExecutiveVoiceRouter"]();
        this.voiceSynthesizer = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$VoiceSynthesizer$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VoiceSynthesizer"](config.synthesis);
        this.sipClient = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$SIPClient$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SIPClient"](config.sip, this.audioProcessor, this.voiceRouter);
        // Initialize system status
        this.systemStatus = {
            isInitialized: false,
            sipStatus: 'disconnected',
            audioStatus: 'inactive',
            synthesisStatus: config.synthesis.enabled ? 'loading' : 'disabled',
            activeCalls: 0,
            availableExecutives: 8,
            systemLoad: 0
        };
        this.initializeEventListeners();
        this.setupComponentEventHandlers();
    }
    initializeEventListeners() {
        this.eventListeners.set('systemReady', []);
        this.eventListeners.set('callStarted', []);
        this.eventListeners.set('callEnded', []);
        this.eventListeners.set('executiveAssigned', []);
        this.eventListeners.set('audioActivity', []);
        this.eventListeners.set('synthesisComplete', []);
        this.eventListeners.set('error', []);
        this.eventListeners.set('statusChanged', []);
    }
    setupComponentEventHandlers() {
        // SIP Client events
        this.sipClient.on('registered', ()=>{
            this.systemStatus.sipStatus = 'connected';
            this.emit('statusChanged', this.systemStatus);
        });
        this.sipClient.on('registrationFailed', (error)=>{
            this.systemStatus.sipStatus = 'error';
            this.emit('error', {
                component: 'sip',
                error
            });
            this.emit('statusChanged', this.systemStatus);
        });
        this.sipClient.on('invite', (session)=>{
            this.systemStatus.activeCalls++;
            this.emit('callStarted', session);
            this.emit('statusChanged', this.systemStatus);
        });
        this.sipClient.on('bye', (session)=>{
            this.systemStatus.activeCalls--;
            this.voiceRouter.releaseExecutive(session.executive);
            this.emit('callEnded', session);
            this.emit('statusChanged', this.systemStatus);
        });
        // Audio Processor events
        this.audioProcessor.on('audioActivity', (data)=>{
            this.emit('audioActivity', data);
        });
        // Voice Router events
        this.voiceRouter.on('executiveAssigned', (data)=>{
            this.emit('executiveAssigned', data);
        });
        this.voiceRouter.on('availabilityChanged', ()=>{
            this.systemStatus.availableExecutives = this.voiceRouter.getAvailableExecutives().length;
            this.emit('statusChanged', this.systemStatus);
        });
        // Voice Synthesizer events
        this.voiceSynthesizer.on('ready', ()=>{
            this.systemStatus.synthesisStatus = 'ready';
            this.emit('statusChanged', this.systemStatus);
        });
        this.voiceSynthesizer.on('error', (error)=>{
            this.systemStatus.synthesisStatus = 'error';
            this.emit('error', {
                component: 'synthesis',
                error
            });
            this.emit('statusChanged', this.systemStatus);
        });
        this.voiceSynthesizer.on('synthesisComplete', (data)=>{
            this.emit('synthesisComplete', data);
        });
    }
    async initialize() {
        try {
            console.log('Initializing SOVREN AI Voice System...');
            // Initialize audio processor first
            this.systemStatus.audioStatus = 'active';
            await this.audioProcessor.initialize();
            console.log('✓ Audio Processor initialized');
            // Initialize voice synthesizer if enabled
            if (this.config.synthesis.enabled) {
                await this.voiceSynthesizer.initialize();
                console.log('✓ Voice Synthesizer initialized');
            }
            // Initialize SIP client
            this.systemStatus.sipStatus = 'connecting';
            await this.sipClient.initialize();
            console.log('✓ SIP Client initialized');
            // System is ready
            this.isInitialized = true;
            this.systemStatus.isInitialized = true;
            this.systemStatus.availableExecutives = this.voiceRouter.getAvailableExecutives().length;
            console.log('🎉 SOVREN AI Voice System initialized successfully');
            this.emit('systemReady', this.systemStatus);
            this.emit('statusChanged', this.systemStatus);
        } catch (error) {
            console.error('Failed to initialize Voice System:', error);
            this.emit('error', {
                component: 'system',
                error
            });
            throw error;
        }
    }
    async makeCall(targetUri, executiveId, message) {
        if (!this.isInitialized) {
            throw new Error('Voice System not initialized');
        }
        try {
            // Validate executive availability
            const executive = this.voiceRouter.getExecutiveProfile(executiveId);
            if (!executive) {
                throw new Error(`Executive not found: ${executiveId}`);
            }
            // Make the call
            const sessionId = await this.sipClient.makeCall(targetUri, executiveId);
            // If message provided, synthesize and play it
            if (message && this.config.synthesis.enabled) {
                await this.speakAsExecutive(executiveId, message);
            }
            return sessionId;
        } catch (error) {
            console.error('Failed to make call:', error);
            this.emit('error', {
                component: 'calling',
                error
            });
            throw error;
        }
    }
    async endCall(sessionId) {
        if (!this.isInitialized) {
            throw new Error('Voice System not initialized');
        }
        try {
            await this.sipClient.endCall(sessionId);
        } catch (error) {
            console.error('Failed to end call:', error);
            this.emit('error', {
                component: 'calling',
                error
            });
            throw error;
        }
    }
    async speakAsExecutive(executiveId, text, priority = 'normal') {
        if (!this.config.synthesis.enabled) {
            console.warn('Voice synthesis is disabled');
            return;
        }
        try {
            const executive = this.voiceRouter.getExecutiveProfile(executiveId);
            if (!executive) {
                throw new Error(`Executive not found: ${executiveId}`);
            }
            await this.voiceSynthesizer.synthesize(text, executive.voiceModel, priority);
        } catch (error) {
            console.error('Failed to synthesize speech:', error);
            this.emit('error', {
                component: 'synthesis',
                error
            });
            throw error;
        }
    }
    getActiveCalls() {
        return this.sipClient.getActiveSessions();
    }
    getCallById(sessionId) {
        return this.sipClient.getSessionById(sessionId);
    }
    getExecutiveProfiles() {
        return this.voiceRouter.getAllExecutives();
    }
    getAvailableExecutives() {
        return this.voiceRouter.getAvailableExecutives();
    }
    setExecutiveAvailability(executiveId, availability) {
        this.voiceRouter.setExecutiveAvailability(executiveId, availability);
    }
    updateExecutivePosition(executiveId, x, y, z) {
        this.audioProcessor.updateExecutivePosition(executiveId, x, y, z);
    }
    getSystemStatus() {
        // Update system load
        const activeCalls = this.sipClient.getActiveSessions().length;
        const maxCalls = this.voiceRouter.getAllExecutives().reduce((sum, exec)=>sum + exec.maxConcurrentCalls, 0);
        this.systemStatus.systemLoad = maxCalls > 0 ? activeCalls / maxCalls * 100 : 0;
        this.systemStatus.activeCalls = activeCalls;
        return {
            ...this.systemStatus
        };
    }
    async startRecording(sessionId) {
        if (!this.config.recording.enabled) {
            console.warn('Call recording is disabled');
            return;
        }
        // Implementation would depend on your recording backend
        console.log(`Starting recording for session: ${sessionId}`);
    }
    async stopRecording(sessionId) {
        if (!this.config.recording.enabled) {
            throw new Error('Call recording is disabled');
        }
        // Implementation would return the recording file path/URL
        console.log(`Stopping recording for session: ${sessionId}`);
        return `/recordings/${sessionId}.${this.config.recording.format}`;
    }
    async startTranscription(sessionId) {
        if (!this.config.transcription.enabled) {
            console.warn('Call transcription is disabled');
            return;
        }
        // Implementation would start real-time transcription
        console.log(`Starting transcription for session: ${sessionId}`);
    }
    async getTranscript(sessionId) {
        if (!this.config.transcription.enabled) {
            throw new Error('Call transcription is disabled');
        }
        // Implementation would return the transcript
        console.log(`Getting transcript for session: ${sessionId}`);
        return `Transcript for session ${sessionId}`;
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback)=>callback(data));
        }
    }
    async shutdown() {
        console.log('Shutting down SOVREN AI Voice System...');
        try {
            // Disconnect SIP client
            await this.sipClient.disconnect();
            // Destroy audio processor
            await this.audioProcessor.destroy();
            // Shutdown voice synthesizer
            if (this.config.synthesis.enabled) {
                await this.voiceSynthesizer.shutdown();
            }
            this.isInitialized = false;
            this.systemStatus.isInitialized = false;
            this.systemStatus.sipStatus = 'disconnected';
            this.systemStatus.audioStatus = 'inactive';
            console.log('✓ Voice System shutdown complete');
            this.emit('statusChanged', this.systemStatus);
        } catch (error) {
            console.error('Error during Voice System shutdown:', error);
            this.emit('error', {
                component: 'shutdown',
                error
            });
            throw error;
        }
    }
}

})()),
"[project]/src/hooks/useVoiceSystem.ts [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "useVoiceSystem": ()=>useVoiceSystem
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/future/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$VoiceSystemManager$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/voice/VoiceSystemManager.ts [app-ssr] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
'use client';
;
;
const defaultConfig = {
    sip: {
        uri: 'sip:sovren@localhost',
        transportOptions: {
            server: 'wss://localhost:8089/ws',
            connectionTimeout: 30000,
            maxReconnectionAttempts: 5,
            reconnectionTimeout: 10000
        },
        authorizationUsername: 'sovren',
        authorizationPassword: 'neural-war-terminal',
        displayName: 'SOVREN AI Executive Command Center'
    },
    audio: {
        sampleRate: 48000,
        bufferSize: 4096,
        enableNoiseReduction: true,
        enableEchoCancellation: true,
        enableAutoGainControl: true,
        spatialAudioEnabled: true
    },
    synthesis: {
        enabled: true,
        modelsPath: '/voice-models',
        cacheSize: 100
    },
    recording: {
        enabled: true,
        format: 'wav',
        quality: 'high'
    },
    transcription: {
        enabled: true,
        language: 'en-US',
        realTime: true
    }
};
function useVoiceSystem(options = {}) {
    const { autoInitialize = false, config: userConfig = {} } = options;
    // Merge user config with defaults
    const config = {
        ...defaultConfig,
        ...userConfig
    };
    // State
    const [isInitialized, setIsInitialized] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        isInitialized: false,
        sipStatus: 'disconnected',
        audioStatus: 'inactive',
        synthesisStatus: 'disabled',
        activeCalls: 0,
        availableExecutives: 8,
        systemLoad: 0
    });
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeCalls, setActiveCalls] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [executives, setExecutives] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [availableExecutives, setAvailableExecutives] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // Voice system manager instance
    const voiceSystemRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const eventCallbacksRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    // Initialize voice system
    const initialize = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (voiceSystemRef.current || isInitialized) {
            return;
        }
        try {
            setError(null);
            // Create voice system manager
            const voiceSystem = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$voice$2f$VoiceSystemManager$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["VoiceSystemManager"](config);
            voiceSystemRef.current = voiceSystem;
            // Set up event listeners
            voiceSystem.on('systemReady', (systemStatus)=>{
                setIsInitialized(true);
                setStatus(systemStatus);
                setExecutives(voiceSystem.getExecutiveProfiles());
                setAvailableExecutives(voiceSystem.getAvailableExecutives());
            });
            voiceSystem.on('statusChanged', (systemStatus)=>{
                setStatus(systemStatus);
                setActiveCalls(voiceSystem.getActiveCalls());
                setAvailableExecutives(voiceSystem.getAvailableExecutives());
            });
            voiceSystem.on('callStarted', (session)=>{
                setActiveCalls(voiceSystem.getActiveCalls());
                // Trigger user callbacks
                const callbacks = eventCallbacksRef.current.get('callStarted') || [];
                callbacks.forEach((callback)=>callback(session));
            });
            voiceSystem.on('callEnded', (session)=>{
                setActiveCalls(voiceSystem.getActiveCalls());
                // Trigger user callbacks
                const callbacks = eventCallbacksRef.current.get('callEnded') || [];
                callbacks.forEach((callback)=>callback(session));
            });
            voiceSystem.on('executiveAssigned', (data)=>{
                setAvailableExecutives(voiceSystem.getAvailableExecutives());
                // Trigger user callbacks
                const callbacks = eventCallbacksRef.current.get('executiveAssigned') || [];
                callbacks.forEach((callback)=>callback(data));
            });
            voiceSystem.on('audioActivity', (data)=>{
                // Trigger user callbacks
                const callbacks = eventCallbacksRef.current.get('audioActivity') || [];
                callbacks.forEach((callback)=>callback(data));
            });
            voiceSystem.on('error', (errorData)=>{
                console.error('Voice System Error:', errorData);
                setError(`${errorData.component}: ${errorData.error.message || errorData.error}`);
            });
            // Initialize the system
            await voiceSystem.initialize();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to initialize voice system:', err);
        }
    }, [
        config,
        isInitialized
    ]);
    // Shutdown voice system
    const shutdown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!voiceSystemRef.current) {
            return;
        }
        try {
            await voiceSystemRef.current.shutdown();
            voiceSystemRef.current = null;
            setIsInitialized(false);
            setActiveCalls([]);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Failed to shutdown voice system:', err);
        }
    }, []);
    // Make a call
    const makeCall = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (targetUri, executiveId, message)=>{
        if (!voiceSystemRef.current) {
            throw new Error('Voice system not initialized');
        }
        return await voiceSystemRef.current.makeCall(targetUri, executiveId, message);
    }, []);
    // End a call
    const endCall = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (sessionId)=>{
        if (!voiceSystemRef.current) {
            throw new Error('Voice system not initialized');
        }
        await voiceSystemRef.current.endCall(sessionId);
    }, []);
    // Set executive availability
    const setExecutiveAvailability = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((executiveId, availability)=>{
        if (!voiceSystemRef.current) {
            return;
        }
        voiceSystemRef.current.setExecutiveAvailability(executiveId, availability);
    }, []);
    // Update executive position for spatial audio
    const updateExecutivePosition = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((executiveId, x, y, z)=>{
        if (!voiceSystemRef.current) {
            return;
        }
        voiceSystemRef.current.updateExecutivePosition(executiveId, x, y, z);
    }, []);
    // Speak as executive
    const speakAsExecutive = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (executiveId, text, priority = 'normal')=>{
        if (!voiceSystemRef.current) {
            throw new Error('Voice system not initialized');
        }
        await voiceSystemRef.current.speakAsExecutive(executiveId, text, priority);
    }, []);
    // Event handler registration
    const onCallStarted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((callback)=>{
        if (!eventCallbacksRef.current.has('callStarted')) {
            eventCallbacksRef.current.set('callStarted', []);
        }
        eventCallbacksRef.current.get('callStarted').push(callback);
    }, []);
    const onCallEnded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((callback)=>{
        if (!eventCallbacksRef.current.has('callEnded')) {
            eventCallbacksRef.current.set('callEnded', []);
        }
        eventCallbacksRef.current.get('callEnded').push(callback);
    }, []);
    const onExecutiveAssigned = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((callback)=>{
        if (!eventCallbacksRef.current.has('executiveAssigned')) {
            eventCallbacksRef.current.set('executiveAssigned', []);
        }
        eventCallbacksRef.current.get('executiveAssigned').push(callback);
    }, []);
    const onAudioActivity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((callback)=>{
        if (!eventCallbacksRef.current.has('audioActivity')) {
            eventCallbacksRef.current.set('audioActivity', []);
        }
        eventCallbacksRef.current.get('audioActivity').push(callback);
    }, []);
    // Auto-initialize if requested
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (autoInitialize && !isInitialized && !voiceSystemRef.current) {
            initialize();
        }
    }, [
        autoInitialize,
        isInitialized,
        initialize
    ]);
    // Cleanup on unmount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        return ()=>{
            if (voiceSystemRef.current) {
                voiceSystemRef.current.shutdown().catch(console.error);
            }
        };
    }, []);
    return {
        // System state
        isInitialized,
        status,
        error,
        // Call management
        activeCalls,
        makeCall,
        endCall,
        // Executive management
        executives,
        availableExecutives,
        setExecutiveAvailability,
        updateExecutivePosition,
        // Voice synthesis
        speakAsExecutive,
        // System control
        initialize,
        shutdown,
        // Event handlers
        onCallStarted,
        onCallEnded,
        onExecutiveAssigned,
        onAudioActivity
    };
}

})()),
"[project]/src/components/providers/Providers.tsx [app-ssr] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

__turbopack_esm__({
    "Providers": ()=>Providers,
    "useVoiceSystemContext": ()=>useVoiceSystemContext
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/future/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/dist/server/future/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useVoiceSystem$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/hooks/useVoiceSystem.ts [app-ssr] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
'use client';
;
;
;
// Voice System Context
const VoiceSystemContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function useVoiceSystemContext() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(VoiceSystemContext);
    if (!context) {
        throw new Error('useVoiceSystemContext must be used within VoiceSystemProvider');
    }
    return context;
}
function VoiceSystemProvider({ children }) {
    const voiceSystem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useVoiceSystem$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useVoiceSystem"])({
        autoInitialize: true,
        config: {
            // Override default config if needed
            synthesis: {
                enabled: true,
                modelsPath: '/voice-models',
                cacheSize: 50
            }
        }
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(VoiceSystemContext.Provider, {
        value: voiceSystem,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/providers/Providers.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
function Providers({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$future$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(VoiceSystemProvider, {
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/providers/Providers.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}

})()),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js server component, client modules ssr)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname }) => (() => {


})()),

};

//# sourceMappingURL=src_d16011._.js.map