import { playSynthesizedDrum } from './DrumSynthesizer';
import { saveCustomSample, loadCustomSample, clearCustomSample } from './sampleStore';

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.recordingDest = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;

    // Track channels configuration
    this.tracks = new Map();
    this.customBuffers = new Map();
    this.customMetadata = new Map();

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Setup recording destination
      this.recordingDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.recordingDest);

      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize Web Audio Context:', err);
    }
  }

  async ensureAudioContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume failed:', err);
      }
    }
  }

  setupTrackNode(trackId) {
    if (!this.initialized) return null;
    
    if (this.tracks.has(trackId)) {
      return this.tracks.get(trackId);
    }

    const channelGain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 20000;

    // Connect graph: filter -> panner -> channelGain -> masterGain
    if (panner) {
      filter.connect(panner);
      panner.connect(channelGain);
    } else {
      filter.connect(channelGain);
    }

    channelGain.connect(this.masterGain);

    const trackObj = {
      channelGain,
      panner,
      filter
    };

    this.tracks.set(trackId, trackObj);
    return trackObj;
  }

  triggerTrack(track, params = {}, time = 0, velocity = 1.0) {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.ctx) return;

    const t = (time && time > 0) ? time : this.ctx.currentTime;
    
    if (params.muted) return;

    const trackId = track.id;
    const nodeObj = this.setupTrackNode(trackId);

    // Apply track parameters
    const trackVolume = (params.volume !== undefined ? params.volume : 1.0) * velocity;
    const pitch = params.pitch !== undefined ? params.pitch : 1.0;
    const pan = params.pan !== undefined ? params.pan : 0;
    const cutoff = params.cutoff !== undefined ? params.cutoff : 20000;
    const decay = params.decay !== undefined ? params.decay : 1.0;

    nodeObj.channelGain.gain.setValueAtTime(trackVolume, t);
    if (nodeObj.panner) {
      nodeObj.panner.pan.setValueAtTime(pan, t);
    }
    nodeObj.filter.frequency.setValueAtTime(Math.min(cutoff, this.ctx.sampleRate / 2), t);

    // Check if custom sample exists
    if (this.customBuffers.has(trackId)) {
      const audioBuffer = this.customBuffers.get(trackId);
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      // Pitch adjustment via playbackRate
      source.playbackRate.setValueAtTime(pitch, t);

      // Envelope for custom decay
      const decayGain = this.ctx.createGain();
      decayGain.gain.setValueAtTime(1.0, t);
      
      const soundDuration = (audioBuffer.duration / pitch) * decay;
      decayGain.gain.exponentialRampToValueAtTime(0.001, t + soundDuration);

      source.connect(decayGain);
      decayGain.connect(nodeObj.filter);

      source.start(t);
      source.stop(t + soundDuration);
    } else {
      // Play procedural drum synthesizer fallback
      playSynthesizedDrum(
        this.ctx,
        nodeObj.filter,
        track.synthType || trackId,
        { pitch, decay, cutoff },
        t
      );
    }
  }

  async loadSavedSamples(trackList) {
    await this.ensureAudioContext();
    for (const track of trackList) {
      const saved = await loadCustomSample(track.id);
      if (saved && saved.arrayBuffer) {
        try {
          const bufferCopy = saved.arrayBuffer.slice(0);
          const decoded = await this.ctx.decodeAudioData(bufferCopy);
          this.customBuffers.set(track.id, decoded);
          this.customMetadata.set(track.id, {
            fileName: saved.fileName,
            fileType: saved.fileType
          });
        } catch (e) {
          console.error(`Error decoding saved sample for track ${track.id}`, e);
        }
      }
    }
  }

  async uploadCustomSample(trackId, file) {
    await this.ensureAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    
    // Save to IndexedDB (make a clone because decodeAudioData detaches buffers)
    await saveCustomSample(trackId, arrayBuffer.slice(0), file.name, file.type);

    // Decode Audio Data
    const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.customBuffers.set(trackId, decodedBuffer);
    this.customMetadata.set(trackId, {
      fileName: file.name,
      fileType: file.type
    });

    return {
      fileName: file.name,
      duration: decodedBuffer.duration,
      sampleRate: decodedBuffer.sampleRate,
      numberOfChannels: decodedBuffer.numberOfChannels
    };
  }

  async clearTrackSample(trackId) {
    this.customBuffers.delete(trackId);
    this.customMetadata.delete(trackId);
    await clearCustomSample(trackId);
  }

  getCustomMetadata(trackId) {
    return this.customMetadata.get(trackId) || null;
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
    }
  }

  // Audio Recording Methods
  startRecording() {
    if (!this.recordingDest) return;
    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.recordingDest.stream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/wav' });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }
}

export const audioEngine = new AudioEngine();
