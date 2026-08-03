import React, { useState, useEffect } from 'react';
import { Play, Square, Mic, Download, Upload, RefreshCw, Volume2, Sparkles } from 'lucide-react';
import { PRESETS } from '../audio/defaultKits';

export function Header({
  isPlaying,
  onTogglePlay,
  bpm,
  onChangeBpm,
  swing,
  onChangeSwing,
  masterVolume,
  onChangeMasterVolume,
  activePattern,
  onChangePattern,
  currentPreset,
  onLoadPreset,
  isRecording,
  onToggleRecording,
  onExportProject,
  onImportProject
}) {
  const [tapTimes, setTapTimes] = useState([]);

  const handleTapTempo = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes.filter(t => now - t < 3000), now];
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        onChangeBpm(calculatedBpm);
      }
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <div className="logo-pulse"></div>
          <Sparkles className="icon-sparkle" size={24} />
        </div>
        <div>
          <h1 className="brand-title">BEATFORGE<span>.STUDIO</span></h1>
          <p className="brand-subtitle">PRO SAMPLE DRUM MACHINE & SEQUENCER</p>
        </div>
      </div>

      <div className="header-controls">
        {/* Main Playback Control */}
        <button
          className={`btn-transport ${isPlaying ? 'is-playing' : ''}`}
          onClick={onTogglePlay}

        >
          {isPlaying ? <Square size={20} /> : <Play size={20} />}
          <span>{isPlaying ? 'STOP' : 'PLAY'}</span>
        </button>

        {/* BPM & Tap */}
        <div className="control-group">
          <div className="group-label">TEMPO / BPM</div>
          <div className="bpm-controls">
            <input
              type="number"
              min="40"
              max="260"
              value={bpm}
              onChange={(e) => onChangeBpm(Number(e.target.value))}
              className="bpm-input"
            />
            <input
              type="range"
              min="40"
              max="240"
              value={bpm}
              onChange={(e) => onChangeBpm(Number(e.target.value))}
              className="slider-range bpm-slider"
            />
            <button className="btn-secondary btn-tap" onClick={handleTapTempo}>
              TAP
            </button>
          </div>
        </div>

        {/* Swing / Groove */}
        <div className="control-group">
          <div className="group-label">SWING ({swing}%)</div>
          <input
            type="range"
            min="0"
            max="60"
            value={swing}
            onChange={(e) => onChangeSwing(Number(e.target.value))}
            className="slider-range"
          />
        </div>

        {/* Master Volume */}
        <div className="control-group">
          <div className="group-label">
            <Volume2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
            MASTER
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.01"
            value={masterVolume}
            onChange={(e) => onChangeMasterVolume(Number(e.target.value))}
            className="slider-range"
          />
        </div>

        {/* Pattern Selector */}
        <div className="control-group">
          <div className="group-label">PATTERN</div>
          <div className="pattern-buttons">
            {['A', 'B', 'C', 'D'].map((pat) => (
              <button
                key={pat}
                className={`btn-pattern ${activePattern === pat ? 'active' : ''}`}
                onClick={() => onChangePattern(pat)}
              >
                {pat}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Selector */}
        <div className="control-group">
          <div className="group-label">KIT PRESET</div>
          <select
            className="preset-select"
            value={currentPreset}
            onChange={(e) => onLoadPreset(e.target.value)}
          >
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Recording & Exporting Actions */}
        <div className="header-actions">
          <button
            className={`btn-action btn-rec ${isRecording ? 'is-recording' : ''}`}
            onClick={onToggleRecording}
            title={isRecording ? 'Stop Recording & Export WAV' : 'Record Master Audio Output'}
          >
            <Mic size={16} />
            <span>{isRecording ? 'REC...' : 'RECORD'}</span>
          </button>

          <button className="btn-action" onClick={onExportProject} title="Export Project File (JSON)">
            <Download size={16} />
            <span>EXPORT</span>
          </button>

          <label className="btn-action" title="Import Project File (JSON)">
            <Upload size={16} />
            <span>IMPORT</span>
            <input
              type="file"
              accept=".json"
              onChange={onImportProject}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </header>
  );
}
