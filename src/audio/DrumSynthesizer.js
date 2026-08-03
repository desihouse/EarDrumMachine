// High quality Web Audio Drum Synthesizer for default drum kits

export function playSynthesizedDrum(ctx, destination, drumType, params = {}, time = 0) {
  const t = time || ctx.currentTime;
  const pitch = params.pitch || 1.0;
  const decay = params.decay || 1.0;
  const cutoff = params.cutoff || 20000;

  // Track filter setup
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(cutoff, ctx.sampleRate / 2), t);
  filter.connect(destination);

  switch (drumType) {
    case 'kick': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const startFreq = 150 * pitch;
      const endFreq = 0.01;
      const kickDecay = 0.4 * decay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + kickDecay);

      gain.gain.setValueAtTime(1.0, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + kickDecay);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + kickDecay);
      break;
    }

    case 'snare': {
      const snareDecay = 0.25 * decay;
      
      // Noise component
      const bufferSize = ctx.sampleRate * snareDecay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(1000, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + snareDecay);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(filter);

      // Body tone component
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + snareDecay);

      oscGain.gain.setValueAtTime(0.7, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + snareDecay);

      osc.connect(oscGain);
      oscGain.connect(filter);

      noise.start(t);
      osc.start(t);
      noise.stop(t + snareDecay);
      osc.stop(t + snareDecay);
      break;
    }

    case 'hihat_closed': {
      const hatDecay = 0.08 * decay;
      const bufferSize = ctx.sampleRate * hatDecay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'highpass';
      bandpass.frequency.setValueAtTime(7000 * pitch, t);

      const hatGain = ctx.createGain();
      hatGain.gain.setValueAtTime(0.6, t);
      hatGain.gain.exponentialRampToValueAtTime(0.01, t + hatDecay);

      noise.connect(bandpass);
      bandpass.connect(hatGain);
      hatGain.connect(filter);

      noise.start(t);
      noise.stop(t + hatDecay);
      break;
    }

    case 'hihat_open': {
      const hatDecay = 0.45 * decay;
      const bufferSize = ctx.sampleRate * hatDecay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'highpass';
      bandpass.frequency.setValueAtTime(6500 * pitch, t);

      const hatGain = ctx.createGain();
      hatGain.gain.setValueAtTime(0.65, t);
      hatGain.gain.exponentialRampToValueAtTime(0.01, t + hatDecay);

      noise.connect(bandpass);
      bandpass.connect(hatGain);
      hatGain.connect(filter);

      noise.start(t);
      noise.stop(t + hatDecay);
      break;
    }

    case 'clap': {
      const clapDecay = 0.3 * decay;
      const bufferSize = ctx.sampleRate * clapDecay;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1200 * pitch, t);
      bandpass.Q.setValueAtTime(3, t);

      const clapGain = ctx.createGain();
      // Burst envelope for clap echo simulation
      clapGain.gain.setValueAtTime(0.8, t);
      clapGain.gain.setValueAtTime(0.1, t + 0.01);
      clapGain.gain.setValueAtTime(0.7, t + 0.02);
      clapGain.gain.setValueAtTime(0.1, t + 0.03);
      clapGain.gain.setValueAtTime(0.9, t + 0.04);
      clapGain.gain.exponentialRampToValueAtTime(0.001, t + clapDecay);

      noise.connect(bandpass);
      bandpass.connect(clapGain);
      clapGain.connect(filter);

      noise.start(t);
      noise.stop(t + clapDecay);
      break;
    }

    case 'tom_low':
    case 'tom_mid':
    case 'tom_high': {
      const baseFreq = drumType === 'tom_low' ? 90 : drumType === 'tom_mid' ? 140 : 200;
      const tomDecay = (drumType === 'tom_low' ? 0.45 : drumType === 'tom_mid' ? 0.35 : 0.28) * decay;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4 * pitch, t + tomDecay);

      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + tomDecay);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + tomDecay);
      break;
    }

    case 'rimshot': {
      const rimDecay = 0.07 * decay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + rimDecay);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + rimDecay);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + rimDecay);
      break;
    }

    case 'cowbell': {
      const cowDecay = 0.3 * decay;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'square';
      osc2.type = 'square';

      osc1.frequency.setValueAtTime(560 * pitch, t);
      osc2.frequency.setValueAtTime(845 * pitch, t);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000 * pitch, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + cowDecay);

      osc1.connect(bandpass);
      osc2.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(filter);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + cowDecay);
      osc2.stop(t + cowDecay);
      break;
    }

    case 'perc':
    default: {
      const percDecay = 0.12 * decay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450 * pitch, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + percDecay);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + percDecay);

      osc.connect(gain);
      gain.connect(filter);

      osc.start(t);
      osc.stop(t + percDecay);
      break;
    }
  }
}
