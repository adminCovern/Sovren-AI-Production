// SOVREN AI Neural Voice Enhancement Audio Worklet
// Executive Voice Optimization System

class VoiceEnhancementProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Executive voice enhancement parameters
    this.clarity = options.processorOptions?.clarity || 1.2;
    this.warmth = options.processorOptions?.warmth || 0.8;
    this.presence = options.processorOptions?.presence || 1.1;
    
    // Neural voice processing state
    this.sampleRate = 48000;
    this.bufferSize = 512;
    
    // Multi-band processing
    this.lowShelf = this.createBiquadCoeffs('lowshelf', 200, 0.7, this.warmth);
    this.midPeak = this.createBiquadCoeffs('peaking', 2000, 1.0, this.clarity);
    this.highShelf = this.createBiquadCoeffs('highshelf', 8000, 0.7, this.presence);
    
    // Filter states for each band
    this.lowState = { x1: 0, x2: 0, y1: 0, y2: 0 };
    this.midState = { x1: 0, x2: 0, y1: 0, y2: 0 };
    this.highState = { x1: 0, x2: 0, y1: 0, y2: 0 };
    
    // Neural harmonics enhancement
    this.harmonicsBuffer = new Float32Array(1024);
    this.harmonicsIndex = 0;
    
    // Executive voice characteristics
    this.voiceProfile = {
      fundamentalFreq: 150, // Hz
      formants: [800, 1200, 2400], // Hz
      harmonicWeights: [1.0, 0.7, 0.5, 0.3, 0.2]
    };
    
    console.log('SOVREN AI Voice Enhancement Processor initialized');
  }
  
  createBiquadCoeffs(type, freq, Q, gain) {
    const w = 2 * Math.PI * freq / this.sampleRate;
    const cosw = Math.cos(w);
    const sinw = Math.sin(w);
    const A = Math.pow(10, gain / 40);
    const beta = Math.sqrt(A) / Q;
    
    let b0, b1, b2, a0, a1, a2;
    
    switch (type) {
      case 'lowshelf':
        const S = 1;
        const alpha = sinw / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2);
        b0 = A * ((A + 1) - (A - 1) * cosw + beta * sinw);
        b1 = 2 * A * ((A - 1) - (A + 1) * cosw);
        b2 = A * ((A + 1) - (A - 1) * cosw - beta * sinw);
        a0 = (A + 1) + (A - 1) * cosw + beta * sinw;
        a1 = -2 * ((A - 1) + (A + 1) * cosw);
        a2 = (A + 1) + (A - 1) * cosw - beta * sinw;
        break;
        
      case 'peaking':
        const alpha2 = sinw / (2 * Q);
        b0 = 1 + alpha2 * A;
        b1 = -2 * cosw;
        b2 = 1 - alpha2 * A;
        a0 = 1 + alpha2 / A;
        a1 = -2 * cosw;
        a2 = 1 - alpha2 / A;
        break;
        
      case 'highshelf':
        const S2 = 1;
        const alpha3 = sinw / 2 * Math.sqrt((A + 1/A) * (1/S2 - 1) + 2);
        b0 = A * ((A + 1) + (A - 1) * cosw + beta * sinw);
        b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
        b2 = A * ((A + 1) + (A - 1) * cosw - beta * sinw);
        a0 = (A + 1) - (A - 1) * cosw + beta * sinw;
        a1 = 2 * ((A - 1) - (A + 1) * cosw);
        a2 = (A + 1) - (A - 1) * cosw - beta * sinw;
        break;
        
      default:
        b0 = b2 = 1; b1 = a1 = a2 = 0; a0 = 1;
    }
    
    return {
      b0: b0 / a0,
      b1: b1 / a0,
      b2: b2 / a0,
      a1: a1 / a0,
      a2: a2 / a0
    };
  }
  
  applyBiquad(sample, coeffs, state) {
    const output = coeffs.b0 * sample + coeffs.b1 * state.x1 + coeffs.b2 * state.x2
                  - coeffs.a1 * state.y1 - coeffs.a2 * state.y2;
    
    // Update state
    state.x2 = state.x1;
    state.x1 = sample;
    state.y2 = state.y1;
    state.y1 = output;
    
    return output;
  }
  
  enhanceHarmonics(sample) {
    // Store sample in harmonics buffer
    this.harmonicsBuffer[this.harmonicsIndex] = sample;
    this.harmonicsIndex = (this.harmonicsIndex + 1) % this.harmonicsBuffer.length;
    
    // Generate harmonic enhancement
    let enhancement = 0;
    const bufferLength = this.harmonicsBuffer.length;
    
    // Add subtle harmonic content for executive voice presence
    for (let harmonic = 2; harmonic <= 5; harmonic++) {
      const harmonicIndex = Math.floor(this.harmonicsIndex / harmonic) % bufferLength;
      const harmonicSample = this.harmonicsBuffer[harmonicIndex];
      const weight = this.voiceProfile.harmonicWeights[harmonic - 2] || 0;
      enhancement += harmonicSample * weight * 0.1;
    }
    
    return sample + enhancement;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length === 0) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    
    for (let i = 0; i < inputChannel.length; i++) {
      let sample = inputChannel[i];
      
      // Apply multi-band EQ for executive voice enhancement
      sample = this.applyBiquad(sample, this.lowShelf, this.lowState);
      sample = this.applyBiquad(sample, this.midPeak, this.midState);
      sample = this.applyBiquad(sample, this.highShelf, this.highState);
      
      // Neural harmonic enhancement
      sample = this.enhanceHarmonics(sample);
      
      // Soft limiting to prevent clipping
      sample = Math.tanh(sample * 0.8) * 1.25;
      
      outputChannel[i] = sample;
    }
    
    return true;
  }
  
  static get parameterDescriptors() {
    return [
      {
        name: 'clarity',
        defaultValue: 1.2,
        minValue: 0.5,
        maxValue: 3.0
      },
      {
        name: 'warmth',
        defaultValue: 0.8,
        minValue: 0.1,
        maxValue: 2.0
      },
      {
        name: 'presence',
        defaultValue: 1.1,
        minValue: 0.5,
        maxValue: 2.5
      }
    ];
  }
}

registerProcessor('voice-enhancement-processor', VoiceEnhancementProcessor);
