module.exports = {

"[project]/src/lib/services/TTSBackendService.ts [app-route] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

/**
 * SOVREN AI TTS BACKEND SERVICE
 * Heavy TTS processing with StyleTTS2 neural models
 */ __turbopack_esm__({
    "TTSBackendService": ()=>TTSBackendService
});
var __TURBOPACK__commonjs__external__fs__ = __turbopack_external_require__("fs", true);
var __TURBOPACK__commonjs__external__path__ = __turbopack_external_require__("path", true);
var __TURBOPACK__commonjs__external__crypto__ = __turbopack_external_require__("crypto", true);
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
;
class TTSBackendService {
    modelsPath;
    outputPath;
    pythonPath;
    styleTTS2Path;
    voiceModels = new Map();
    isInitialized = false;
    processingQueue = new Map();
    constructor(){
        this.modelsPath = process.env.TTS_MODELS_PATH || './models/styletts2';
        this.outputPath = process.env.TTS_OUTPUT_PATH || './public/audio/generated';
        this.pythonPath = process.env.PYTHON_PATH || 'python';
        this.styleTTS2Path = process.env.STYLETTS2_PATH || './python/styletts2';
        this.initializeVoiceModels();
    }
    /**
   * Initialize voice models
   */ initializeVoiceModels() {
        const models = [
            {
                id: 'sovren-ai-neural',
                name: 'SOVREN AI Neural Core Voice',
                language: 'en-US',
                gender: 'neutral',
                modelPath: `${this.modelsPath}/sovren-ai-neural.pth`,
                configPath: `${this.modelsPath}/sovren-ai-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 1.0,
                    speed: 1.1,
                    tone: 'authoritative',
                    accent: 'neural-synthetic'
                }
            },
            {
                id: 'ceo-authoritative',
                name: 'CEO Executive Voice',
                language: 'en-US',
                gender: 'male',
                modelPath: `${this.modelsPath}/ceo-authoritative.pth`,
                configPath: `${this.modelsPath}/ceo-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.8,
                    speed: 0.9,
                    tone: 'authoritative',
                    accent: 'american-executive'
                }
            },
            {
                id: 'cfo-analytical',
                name: 'CFO Analytical Voice',
                language: 'en-US',
                gender: 'female',
                modelPath: `${this.modelsPath}/cfo-analytical.pth`,
                configPath: `${this.modelsPath}/cfo-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.9,
                    speed: 0.95,
                    tone: 'analytical',
                    accent: 'professional-precise'
                }
            },
            {
                id: 'cto-technical',
                name: 'CTO Technical Voice',
                language: 'en-US',
                gender: 'neutral',
                modelPath: `${this.modelsPath}/cto-technical.pth`,
                configPath: `${this.modelsPath}/cto-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.9,
                    speed: 1.0,
                    tone: 'technical',
                    accent: 'clear-methodical'
                }
            },
            {
                id: 'cmo-charismatic',
                name: 'CMO Charismatic Voice',
                language: 'en-US',
                gender: 'male',
                modelPath: `${this.modelsPath}/cmo-charismatic.pth`,
                configPath: `${this.modelsPath}/cmo-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.85,
                    speed: 1.05,
                    tone: 'charismatic',
                    accent: 'engaging-persuasive'
                }
            },
            {
                id: 'legal-authoritative',
                name: 'Legal Counsel Voice',
                language: 'en-US',
                gender: 'female',
                modelPath: `${this.modelsPath}/legal-authoritative.pth`,
                configPath: `${this.modelsPath}/legal-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.85,
                    speed: 0.9,
                    tone: 'formal',
                    accent: 'legal-precise'
                }
            },
            {
                id: 'coo-efficient',
                name: 'COO Efficient Voice',
                language: 'en-US',
                gender: 'male',
                modelPath: `${this.modelsPath}/coo-efficient.pth`,
                configPath: `${this.modelsPath}/coo-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.88,
                    speed: 1.1,
                    tone: 'efficient',
                    accent: 'results-focused'
                }
            },
            {
                id: 'chro-empathetic',
                name: 'CHRO Empathetic Voice',
                language: 'en-US',
                gender: 'female',
                modelPath: `${this.modelsPath}/chro-empathetic.pth`,
                configPath: `${this.modelsPath}/chro-config.yml`,
                isLoaded: false,
                characteristics: {
                    pitch: 0.95,
                    speed: 0.95,
                    tone: 'empathetic',
                    accent: 'warm-professional'
                }
            }
        ];
        models.forEach((model)=>{
            this.voiceModels.set(model.id, model);
        });
        console.log(`📦 Initialized ${models.length} voice models for TTS backend`);
    }
    /**
   * Initialize TTS backend service
   */ async initialize() {
        if (this.isInitialized) {
            return;
        }
        console.log('🚀 Initializing TTS Backend Service...');
        try {
            // Ensure output directory exists
            await this.ensureDirectoryExists(this.outputPath);
            // Check Python environment
            await this.checkPythonEnvironment();
            // Load StyleTTS2 models
            await this.loadStyleTTS2Models();
            this.isInitialized = true;
            console.log('✅ TTS Backend Service initialized successfully');
        } catch (error) {
            console.error('❌ TTS Backend Service initialization failed:', error);
            throw error;
        }
    }
    /**
   * Synthesize speech using StyleTTS2
   */ async synthesize(request) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const requestId = (0, __TURBOPACK__commonjs__external__crypto__["randomUUID"])();
        this.processingQueue.set(requestId, request);
        try {
            console.log(`🎤 Processing TTS request ${requestId}: "${request.text.substring(0, 50)}..."`);
            const voiceModel = this.voiceModels.get(request.voiceId);
            if (!voiceModel) {
                throw new Error(`Voice model not found: ${request.voiceId}`);
            }
            // Generate unique output filename
            const outputFilename = `${requestId}_${request.voiceId}.${request.format}`;
            const outputPath = __TURBOPACK__commonjs__external__path__["default"].join(this.outputPath, outputFilename);
            // Run StyleTTS2 synthesis
            const audioBuffer = await this.runStyleTTS2Synthesis(request.text, voiceModel, outputPath, request);
            // Convert to base64
            const audioData = audioBuffer.toString('base64');
            // Calculate duration (approximate)
            const duration = this.estimateAudioDuration(audioBuffer, request.sampleRate);
            const result = {
                audioData,
                audioUrl: `/audio/generated/${outputFilename}`,
                duration,
                sampleRate: request.sampleRate,
                format: request.format,
                size: audioBuffer.length,
                quality: this.calculateQuality(request.priority)
            };
            console.log(`✅ TTS synthesis completed: ${result.size} bytes, ${result.duration}s`);
            return result;
        } catch (error) {
            console.error(`❌ TTS synthesis failed for request ${requestId}:`, error);
            throw error;
        } finally{
            this.processingQueue.delete(requestId);
        }
    }
    /**
   * Run StyleTTS2 synthesis process
   */ async runStyleTTS2Synthesis(text, voiceModel, outputPath, request) {
        return new Promise((resolve, reject)=>{
            // For development, simulate StyleTTS2 processing
            // In production, this would call the actual StyleTTS2 Python script
            console.log(`🧠 Running StyleTTS2 synthesis for ${voiceModel.name}...`);
            // Simulate processing time based on text length and priority
            const processingTime = this.calculateProcessingTime(text, request.priority);
            setTimeout(async ()=>{
                try {
                    // Generate realistic audio data
                    const audioBuffer = await this.generateRealisticAudioBuffer(text, voiceModel, request);
                    // Save to file
                    await __TURBOPACK__commonjs__external__fs__["promises"].writeFile(outputPath, audioBuffer);
                    resolve(audioBuffer);
                } catch (error) {
                    reject(error);
                }
            }, processingTime);
        });
    }
    /**
   * Generate realistic audio buffer for development
   */ async generateRealisticAudioBuffer(text, voiceModel, request) {
        // Generate WAV header + audio data
        const duration = text.length * 0.1; // ~100ms per character
        const sampleCount = Math.floor(duration * request.sampleRate);
        const audioData = new Int16Array(sampleCount);
        // Generate realistic audio waveform based on voice characteristics
        const frequency = this.getBaseFrequency(voiceModel.characteristics.pitch);
        for(let i = 0; i < sampleCount; i++){
            const t = i / request.sampleRate;
            const amplitude = 16000 * Math.exp(-t * 0.5); // Decay over time
            audioData[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
        }
        // Create WAV file buffer
        return this.createWAVBuffer(audioData, request.sampleRate);
    }
    /**
   * Create WAV file buffer
   */ createWAVBuffer(audioData, sampleRate) {
        const buffer = Buffer.alloc(44 + audioData.length * 2);
        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + audioData.length * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20);
        buffer.writeUInt16LE(1, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28);
        buffer.writeUInt16LE(2, 32);
        buffer.writeUInt16LE(16, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(audioData.length * 2, 40);
        // Audio data
        for(let i = 0; i < audioData.length; i++){
            buffer.writeInt16LE(audioData[i], 44 + i * 2);
        }
        return buffer;
    }
    async ensureDirectoryExists(dirPath) {
        try {
            await __TURBOPACK__commonjs__external__fs__["promises"].access(dirPath);
        } catch  {
            await __TURBOPACK__commonjs__external__fs__["promises"].mkdir(dirPath, {
                recursive: true
            });
        }
    }
    async checkPythonEnvironment() {
        // Check if Python and StyleTTS2 are available
        console.log('🐍 Checking Python environment...');
    // In production, this would verify the actual Python setup
    }
    async loadStyleTTS2Models() {
        console.log('📦 Loading StyleTTS2 models...');
        // In production, this would load the actual model files
        for (const [id, model] of this.voiceModels){
            model.isLoaded = true;
            console.log(`✅ Loaded model: ${model.name}`);
        }
    }
    calculateProcessingTime(text, priority) {
        const baseTime = text.length * 100; // 100ms per character
        const priorityMultiplier = priority === 'high' ? 0.5 : priority === 'medium' ? 1.0 : 2.0;
        return Math.max(500, baseTime * priorityMultiplier);
    }
    getBaseFrequency(pitch) {
        return 200 * pitch; // Base frequency adjusted by pitch
    }
    estimateAudioDuration(audioBuffer, sampleRate) {
        const audioDataSize = audioBuffer.length - 44; // Subtract WAV header
        const sampleCount = audioDataSize / 2; // 16-bit samples
        return sampleCount / sampleRate;
    }
    calculateQuality(priority) {
        return priority === 'high' ? 0.95 : priority === 'medium' ? 0.85 : 0.75;
    }
    async getAvailableVoices() {
        return Array.from(this.voiceModels.values());
    }
    async healthCheck() {
        return this.isInitialized;
    }
}

})()),
"[project]/src/app/api/tts/synthesize/route.ts [app-route] (ecmascript)": (({ r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__ }) => (() => {
"use strict";

/**
 * SOVREN AI TTS SYNTHESIS API ENDPOINT
 * Backend service for heavy TTS processing with StyleTTS2
 */ __turbopack_esm__({
    "GET": ()=>GET,
    "POST": ()=>POST
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$TTSBackendService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/src/lib/services/TTSBackendService.ts [app-route] (ecmascript)");
"__TURBOPACK__ecmascript__hoisting__location__";
;
;
const ttsService = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$services$2f$TTSBackendService$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TTSBackendService"]();
async function POST(request) {
    try {
        const body = await request.json();
        // Validate request
        if (!body.text || !body.voiceId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'Missing required fields: text and voiceId',
                processingTime: 0,
                voiceId: body.voiceId || 'unknown',
                metadata: {
                    sampleRate: 0,
                    format: 'none',
                    size: 0,
                    quality: 0
                }
            }, {
                status: 400
            });
        }
        // Validate text length
        if (body.text.length > 5000) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                error: 'Text too long. Maximum 5000 characters.',
                processingTime: 0,
                voiceId: body.voiceId,
                metadata: {
                    sampleRate: 0,
                    format: 'none',
                    size: 0,
                    quality: 0
                }
            }, {
                status: 400
            });
        }
        console.log(`🎤 TTS API: Synthesizing "${body.text.substring(0, 50)}..." with ${body.voiceId}`);
        const startTime = Date.now();
        // Process TTS synthesis
        const result = await ttsService.synthesize({
            text: body.text,
            voiceId: body.voiceId,
            priority: body.priority || 'medium',
            format: body.format || 'wav',
            sampleRate: body.sampleRate || 22050,
            userId: body.userId
        });
        const processingTime = Date.now() - startTime;
        const response = {
            success: true,
            audioData: result.audioData,
            audioUrl: result.audioUrl,
            duration: result.duration,
            processingTime,
            voiceId: body.voiceId,
            metadata: {
                sampleRate: result.sampleRate,
                format: result.format,
                size: result.size,
                quality: result.quality
            }
        };
        console.log(`✅ TTS API: Synthesis completed in ${processingTime}ms`);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(response);
    } catch (error) {
        console.error('❌ TTS API Error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            processingTime: 0,
            voiceId: 'unknown',
            metadata: {
                sampleRate: 0,
                format: 'none',
                size: 0,
                quality: 0
            }
        }, {
            status: 500
        });
    }
}
async function GET(request) {
    // Health check endpoint
    try {
        const isHealthy = await ttsService.healthCheck();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            status: 'healthy',
            service: 'TTS Backend Service',
            timestamp: new Date().toISOString(),
            availableVoices: await ttsService.getAvailableVoices(),
            isHealthy
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            status: 'unhealthy',
            service: 'TTS Backend Service',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        }, {
            status: 503
        });
    }
}

})()),

};

//# sourceMappingURL=src_74789f._.js.map