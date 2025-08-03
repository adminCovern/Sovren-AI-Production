// SOVREN AI Spatial Audio Processing Worklet
// 3D Executive Positioning System

class SpatialAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Spatial audio parameters
    this.listenerPosition = { x: 0, y: 0, z: 0 };
    this.sourcePosition = options.processorOptions?.position || { x: 0, y: 0, z: 0 };
    this.roomSize = options.processorOptions?.roomSize || { x: 20, y: 10, z: 20 };
    
    // HRTF simulation parameters
    this.sampleRate = 48000;
    this.speedOfSound = 343; // m/s
    
    // Delay lines for distance simulation
    this.maxDelay = Math.floor(this.sampleRate * 0.1); // 100ms max delay
    this.leftDelayLine = new Float32Array(this.maxDelay);
    this.rightDelayLine = new Float32Array(this.maxDelay);
    this.delayIndex = 0;
    
    // Reverb simulation
    this.reverbBuffer = new Float32Array(this.sampleRate * 2); // 2 second reverb
    this.reverbIndex = 0;
    this.reverbGain = 0.3;
    
    // HRTF coefficients (simplified)
    this.hrtfLeft = { gain: 1.0, delay: 0 };
    this.hrtfRight = { gain: 1.0, delay: 0 };
    
    // Executive positioning (matches the visual circle)
    this.executivePositions = {
      'ceo': { x: 6, y: 0, z: 0 },
      'cfo': { x: 4.24, y: 0, z: 4.24 },
      'cto': { x: 0, y: 0, z: 6 },
      'cmo': { x: -4.24, y: 0, z: 4.24 },
      'coo': { x: -6, y: 0, z: 0 },
      'chro': { x: -4.24, y: 0, z: -4.24 },
      'clo': { x: 0, y: 0, z: -6 },
      'cso': { x: 4.24, y: 0, z: -4.24 }
    };
    
    this.updateSpatialParameters();
    
    console.log('SOVREN AI Spatial Audio Processor initialized');
  }
  
  updateSpatialParameters() {
    // Calculate distance
    const dx = this.sourcePosition.x - this.listenerPosition.x;
    const dy = this.sourcePosition.y - this.listenerPosition.y;
    const dz = this.sourcePosition.z - this.listenerPosition.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const normalizedDistance = Math.max(0.1, distance);
    
    // Calculate azimuth and elevation
    const azimuth = Math.atan2(dx, dz);
    const elevation = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    
    // Simplified HRTF calculation
    this.calculateHRTF(azimuth, elevation, normalizedDistance);
  }
  
  calculateHRTF(azimuth, elevation, distance) {
    // Simplified HRTF model for executive positioning
    const headRadius = 0.0875; // Average head radius in meters
    const earSeparation = 0.175; // Distance between ears
    
    // Calculate interaural time difference (ITD)
    const itd = (earSeparation / 2) * Math.sin(azimuth) / this.speedOfSound;
    
    // Calculate interaural level difference (ILD)
    const shadowingFactor = Math.max(0.1, 1 - Math.abs(Math.sin(azimuth)) * 0.3);
    
    // Distance attenuation
    const distanceGain = 1 / (1 + distance * 0.1);
    
    // Left ear parameters
    if (azimuth > 0) {
      // Source is to the right
      this.hrtfLeft.gain = distanceGain * shadowingFactor;
      this.hrtfLeft.delay = Math.max(0, Math.floor(itd * this.sampleRate));
    } else {
      // Source is to the left
      this.hrtfLeft.gain = distanceGain;
      this.hrtfLeft.delay = 0;
    }
    
    // Right ear parameters
    if (azimuth < 0) {
      // Source is to the left
      this.hrtfRight.gain = distanceGain * shadowingFactor;
      this.hrtfRight.delay = Math.max(0, Math.floor(-itd * this.sampleRate));
    } else {
      // Source is to the right
      this.hrtfRight.gain = distanceGain;
      this.hrtfRight.delay = 0;
    }
    
    // Elevation effects (simplified)
    const elevationGain = 1 - Math.abs(elevation) * 0.2;
    this.hrtfLeft.gain *= elevationGain;
    this.hrtfRight.gain *= elevationGain;
  }
  
  applyReverb(sample) {
    // Simple reverb simulation for room acoustics
    const reverbSample = this.reverbBuffer[this.reverbIndex];
    this.reverbBuffer[this.reverbIndex] = sample + reverbSample * 0.5;
    this.reverbIndex = (this.reverbIndex + 1) % this.reverbBuffer.length;
    
    return sample + reverbSample * this.reverbGain;
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input.length === 0 || output.length < 2) {
      return true;
    }
    
    const inputChannel = input[0];
    const leftOutput = output[0];
    const rightOutput = output[1];
    
    for (let i = 0; i < inputChannel.length; i++) {
      let sample = inputChannel[i];
      
      // Apply reverb for room simulation
      sample = this.applyReverb(sample);
      
      // Apply HRTF processing
      // Left channel
      const leftDelayedIndex = (this.delayIndex - this.hrtfLeft.delay + this.maxDelay) % this.maxDelay;
      this.leftDelayLine[this.delayIndex] = sample;
      const leftSample = this.leftDelayLine[leftDelayedIndex] * this.hrtfLeft.gain;
      
      // Right channel
      const rightDelayedIndex = (this.delayIndex - this.hrtfRight.delay + this.maxDelay) % this.maxDelay;
      this.rightDelayLine[this.delayIndex] = sample;
      const rightSample = this.rightDelayLine[rightDelayedIndex] * this.hrtfRight.gain;
      
      leftOutput[i] = leftSample;
      rightOutput[i] = rightSample;
      
      this.delayIndex = (this.delayIndex + 1) % this.maxDelay;
    }
    
    return true;
  }
  
  // Handle parameter updates from main thread
  static get parameterDescriptors() {
    return [
      {
        name: 'positionX',
        defaultValue: 0,
        minValue: -20,
        maxValue: 20
      },
      {
        name: 'positionY',
        defaultValue: 0,
        minValue: -10,
        maxValue: 10
      },
      {
        name: 'positionZ',
        defaultValue: 0,
        minValue: -20,
        maxValue: 20
      },
      {
        name: 'reverbGain',
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1
      }
    ];
  }
}

registerProcessor('spatial-processor', SpatialAudioProcessor);
