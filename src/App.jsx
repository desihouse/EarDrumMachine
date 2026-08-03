import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { DrumPads } from './components/DrumPads';
import { Sequencer } from './components/Sequencer';
import { ChannelInspector } from './components/ChannelInspector';
import { DEFAULT_TRACKS, PRESETS } from './audio/defaultKits';
import { audioEngine } from './audio/AudioEngine';
import { SequencerScheduler } from './audio/SequencerScheduler';

export default function App() {
  const tracks = DEFAULT_TRACKS;
  
  // App state
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(124);
  const [swing, setSwing] = useState(15);
  const [masterVolume, setMasterVolume] = useState(0.9);
  const [activePattern, setActivePattern] = useState('A');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTrackId, setSelectedTrackId] = useState(DEFAULT_TRACKS[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [currentPresetName, setCurrentPresetName] = useState(PRESETS[0].name);

  // Per pattern step data: { A: { kick: [0...15], snare: [...] }, B: {...} }
  const [patterns, setPatterns] = useState(() => {
    const initialPatterns = { A: {}, B: {}, C: {}, D: {} };
    // Load default preset 0 pattern into Pattern A
    const preset = PRESETS[0];
    ['A', 'B', 'C', 'D'].map((patKey) => {
      initialPatterns[patKey] = {};
      tracks.forEach((tr) => {
        if (patKey === 'A' && preset.patterns.A[tr.id]) {
          initialPatterns[patKey][tr.id] = [...preset.patterns.A[tr.id]];
        } else {
          initialPatterns[patKey][tr.id] = Array(16).fill(0);
        }
      });
    });
    return initialPatterns;
  });

  // Track sound parameters: { kick: { volume: 1.0, pitch: 1.0, pan: 0, cutoff: 20000, decay: 1.0, muted: false, solo: false } }
  const [trackParams, setTrackParams] = useState(() => {
    const initialParams = {};
    tracks.forEach((tr) => {
      initialParams[tr.id] = {
        volume: 1.0,
        pitch: 1.0,
        pan: 0,
        cutoff: 20000,
        decay: 1.0,
        muted: false,
        solo: false
      };
    });
    return initialParams;
  });

  // Scheduler Ref & Callbacks
  const schedulerRef = useRef(null);
  const trackParamsRef = useRef(trackParams);
  const patternsRef = useRef(patterns);
  const activePatternRef = useRef(activePattern);

  useEffect(() => {
    trackParamsRef.current = trackParams;
  }, [trackParams]);

  useEffect(() => {
    patternsRef.current = patterns;
  }, [patterns]);

  useEffect(() => {
    activePatternRef.current = activePattern;
  }, [activePattern]);

  // Step trigger callback executed by lookahead scheduler
  const handleStepTrigger = useCallback((stepIdx, stepTime) => {
    setCurrentStep(stepIdx);

    const currentPatData = patternsRef.current[activePatternRef.current] || {};
    const currentParams = trackParamsRef.current;

    // Check if any track has SOLO active
    const isAnySolo = Object.values(currentParams).some((p) => p.solo);

    tracks.forEach((track) => {
      const trackSteps = currentPatData[track.id] || [];
      const velocityState = trackSteps[stepIdx] || 0;

      if (velocityState > 0) {
        const p = currentParams[track.id] || {};
        
        // Mute/Solo check
        if (p.muted) return;
        if (isAnySolo && !p.solo) return;

        // Velocity multiplier: Normal (1) = 0.75, Accent (2) = 1.25
        const velocity = velocityState === 2 ? 1.25 : 0.75;

        audioEngine.triggerTrack(track, p, stepTime, velocity);
      }
    });
  }, [tracks]);

  // Initialize AudioEngine and Scheduler on mount
  useEffect(() => {
    schedulerRef.current = new SequencerScheduler(handleStepTrigger);

    // Global interaction listener to auto-unlock Web Audio context on user gesture
    const unlockAudio = () => {
      audioEngine.ensureAudioContext();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    
    // Load saved custom audio samples from IndexedDB
    audioEngine.loadSavedSamples(tracks).then(() => {
      // Force UI update for custom sample badges
      setTrackParams((prev) => ({ ...prev }));
    });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (schedulerRef.current) {
        schedulerRef.current.stop();
      }
    };
  }, [handleStepTrigger, tracks]);

  // Sync BPM & Swing to Scheduler
  useEffect(() => {
    if (schedulerRef.current) {
      schedulerRef.current.setBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (schedulerRef.current) {
      schedulerRef.current.setSwing(swing);
    }
  }, [swing]);

  // Sync Master Volume
  useEffect(() => {
    audioEngine.setMasterVolume(masterVolume);
  }, [masterVolume]);

  // Play / Stop Handler
  const handleTogglePlay = async () => {
    await audioEngine.ensureAudioContext();

    if (isPlaying) {
      schedulerRef.current.stop();
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      schedulerRef.current.start(audioEngine.ctx);
      setIsPlaying(true);
    }
  };

  // Direct manual trigger of pad sound
  const handleTriggerTrack = async (track) => {
    await audioEngine.ensureAudioContext();
    const p = trackParams[track.id] || {};
    audioEngine.triggerTrack(track, p, 0, 1.0);
  };

  // Step toggle handler: 0 (Off) -> 1 (Normal) -> 2 (Accent) -> 0 (Off)
  const handleToggleStep = (trackId, stepIdx) => {
    setPatterns((prev) => {
      const pat = prev[activePattern] || {};
      const currentTrackSteps = pat[trackId] ? [...pat[trackId]] : Array(16).fill(0);
      
      const currentVal = currentTrackSteps[stepIdx] || 0;
      const nextVal = (currentVal + 1) % 3;
      currentTrackSteps[stepIdx] = nextVal;

      return {
        ...prev,
        [activePattern]: {
          ...pat,
          [trackId]: currentTrackSteps
        }
      };
    });
  };

  // Track sound parameter update
  const handleChangeParam = (trackId, paramKey, value) => {
    setTrackParams((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        [paramKey]: value
      }
    }));
  };

  const handleToggleMute = (trackId) => {
    setTrackParams((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        muted: !prev[trackId].muted
      }
    }));
  };

  const handleToggleSolo = (trackId) => {
    setTrackParams((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        solo: !prev[trackId].solo
      }
    }));
  };

  const handleClearTrackPattern = (trackId) => {
    setPatterns((prev) => ({
      ...prev,
      [activePattern]: {
        ...prev[activePattern],
        [trackId]: Array(16).fill(0)
      }
    }));
  };

  // Upload custom sample handler
  const handleUploadSample = async (trackId, file) => {
    const meta = await audioEngine.uploadCustomSample(trackId, file);
    setTrackParams((prev) => ({ ...prev }));
    return meta;
  };

  const handleResetSample = async (trackId) => {
    await audioEngine.clearTrackSample(trackId);
    setTrackParams((prev) => ({ ...prev }));
  };

  // Load Preset
  const handleLoadPreset = (presetName) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    setCurrentPresetName(presetName);
    setBpm(preset.bpm);
    setSwing(preset.swing);

    setPatterns((prev) => ({
      ...prev,
      A: {
        ...prev.A,
        ...preset.patterns.A
      }
    }));
  };

  // Recording WAV
  const handleToggleRecording = async () => {
    await audioEngine.ensureAudioContext();
    if (!isRecording) {
      audioEngine.startRecording();
      setIsRecording(true);
    } else {
      const wavBlob = await audioEngine.stopRecording();
      setIsRecording(false);
      if (wavBlob) {
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BeatForge_Recording_${Date.now()}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  // Export Project JSON
  const handleExportProject = () => {
    const projectData = {
      version: '1.0',
      bpm,
      swing,
      masterVolume,
      activePattern,
      patterns,
      trackParams
    };
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BeatForge_Project_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Project JSON
  const handleImportProject = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.bpm) setBpm(data.bpm);
        if (data.swing !== undefined) setSwing(data.swing);
        if (data.masterVolume !== undefined) setMasterVolume(data.masterVolume);
        if (data.patterns) setPatterns(data.patterns);
        if (data.trackParams) setTrackParams(data.trackParams);
        alert('Project imported successfully!');
      } catch (err) {
        alert('Invalid BeatForge project JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];

  return (
    <div className="app-container">
      {/* Top Navigation & Master Bar */}
      <Header
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        bpm={bpm}
        onChangeBpm={setBpm}
        swing={swing}
        onChangeSwing={setSwing}
        masterVolume={masterVolume}
        onChangeMasterVolume={setMasterVolume}
        activePattern={activePattern}
        onChangePattern={setActivePattern}
        currentPreset={currentPresetName}
        onLoadPreset={handleLoadPreset}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />

      {/* Real-time Spectrum & Oscilloscope Visualizer */}
      <Visualizer
        currentTrackName={selectedTrack.name}
        currentStep={currentStep}
      />

      {/* Main Studio Workstation Layout */}
      <main className="studio-workspace">
        {/* Left Column: MPC Drum Trigger Pads Grid */}
        <section className="column-left">
          <DrumPads
            tracks={tracks}
            trackParams={trackParams}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            onTriggerTrack={handleTriggerTrack}
          />
        </section>

        {/* Center-Right: 16-Step Sequencer & Channel Inspector */}
        <section className="column-right">
          <Sequencer
            tracks={tracks}
            patternData={patterns[activePattern] || {}}
            trackParams={trackParams}
            currentStep={currentStep}
            isPlaying={isPlaying}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            onToggleStep={handleToggleStep}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onClearTrackPattern={handleClearTrackPattern}
            onTriggerTrack={handleTriggerTrack}
          />

          <ChannelInspector
            selectedTrack={selectedTrack}
            trackParams={trackParams}
            onChangeParam={handleChangeParam}
            onUploadSample={handleUploadSample}
            onResetSample={handleResetSample}
            onTriggerTrack={handleTriggerTrack}
          />
        </section>
      </main>
    </div>
  );
}
