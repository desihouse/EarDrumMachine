import React, { useState, useRef } from 'react';
import { Upload, RotateCcw, Sliders, Volume2, Waves, Music, Check, Trash2 } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

export function ChannelInspector({
  selectedTrack,
  trackParams,
  onChangeParam,
  onUploadSample,
  onResetSample,
  onTriggerTrack
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  if (!selectedTrack) {
    return (
      <div className="inspector-panel empty-state">
        <Sliders size={32} className="muted-icon" />
        <p>SELECT A TRACK TO EDIT SOUND PARAMETERS & UPLOAD SAMPLES</p>
      </div>
    );
  }

  const params = trackParams[selectedTrack.id] || {
    volume: 1.0,
    pitch: 1.0,
    pan: 0,
    cutoff: 20000,
    decay: 1.0,
    muted: false,
    solo: false
  };

  const customMeta = audioEngine.getCustomMetadata(selectedTrack.id);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|ogg|flac|aac|m4a|webm)$/i)) {
      alert('Please upload a valid audio file (.wav, .mp3, .ogg, .flac, .m4a)');
      return;
    }

    try {
      setUploadStatus('Uploading & Decoding...');
      const info = await onUploadSample(selectedTrack.id, file);
      setUploadStatus(`Loaded: ${file.name} (${info.duration.toFixed(2)}s)`);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setUploadStatus('Failed to decode audio file');
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="inspector-panel" style={{ '--track-accent': selectedTrack.color }}>
      <div className="inspector-header">
        <div className="track-badge-title">
          <span className="color-dot" style={{ backgroundColor: selectedTrack.color }}></span>
          <h3>{selectedTrack.name.toUpperCase()} CHANNEL</h3>
        </div>
        <button
          className="btn-secondary btn-test-sound"
          onClick={() => onTriggerTrack(selectedTrack)}
        >
          <Music size={14} />
          TEST SOUND
        </button>
      </div>

      <div className="inspector-content">
        {/* Sample Uploader Box */}
        <div className="sample-upload-section">
          <div className="section-label">CUSTOM SAMPLE LOADER</div>
          <div
            className={`dropzone ${isDragging ? 'is-drag-over' : ''} ${
              customMeta ? 'has-custom-sample' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            />

            {customMeta ? (
              <div className="dropzone-info">
                <Check size={20} className="icon-success" />
                <div className="file-meta">
                  <span className="file-name">{customMeta.fileName}</span>
                  <span className="file-sub">CUSTOM SAMPLE ACTIVE</span>
                </div>
              </div>
            ) : (
              <div className="dropzone-placeholder">
                <Upload size={24} className="dropzone-icon" />
                <span>DROP AUDIO SAMPLE HERE OR CLICK TO UPLOAD</span>
                <span className="dropzone-sub">SUPPORTED: WAV, MP3, OGG, FLAC, M4A</span>
              </div>
            )}
          </div>

          {uploadStatus && <div className="upload-status-bar">{uploadStatus}</div>}

          {customMeta && (
            <button
              className="btn-revert-synth"
              onClick={() => onResetSample(selectedTrack.id)}
            >
              <RotateCcw size={13} />
              REVERT TO SYNTHESIZED DRUM
            </button>
          )}
        </div>

        {/* Audio Parameters Controls Grid */}
        <div className="params-controls-grid">
          {/* Volume */}
          <div className="param-card">
            <div className="param-header">
              <label>VOLUME</label>
              <span className="param-value">{Math.round((params.volume || 1.0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.01"
              value={params.volume ?? 1.0}
              onChange={(e) => onChangeParam(selectedTrack.id, 'volume', Number(e.target.value))}
              className="slider-range"
            />
          </div>

          {/* Pitch */}
          <div className="param-card">
            <div className="param-header">
              <label>PITCH / SPEED</label>
              <span className="param-value">{(params.pitch || 1.0).toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2.0"
              step="0.05"
              value={params.pitch ?? 1.0}
              onChange={(e) => onChangeParam(selectedTrack.id, 'pitch', Number(e.target.value))}
              className="slider-range"
            />
          </div>

          {/* Stereo Pan */}
          <div className="param-card">
            <div className="param-header">
              <label>STEREO PAN</label>
              <span className="param-value">
                {params.pan === 0 || !params.pan
                  ? 'CENTER'
                  : params.pan < 0
                  ? `L ${Math.abs(Math.round(params.pan * 100))}%`
                  : `R ${Math.round(params.pan * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={params.pan ?? 0}
              onChange={(e) => onChangeParam(selectedTrack.id, 'pan', Number(e.target.value))}
              className="slider-range"
            />
          </div>

          {/* Filter Cutoff */}
          <div className="param-card">
            <div className="param-header">
              <label>LOW-PASS FILTER</label>
              <span className="param-value">
                {(params.cutoff || 20000) >= 20000 ? 'OFF (20kHz)' : `${Math.round(params.cutoff)} Hz`}
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="20000"
              step="100"
              value={params.cutoff ?? 20000}
              onChange={(e) => onChangeParam(selectedTrack.id, 'cutoff', Number(e.target.value))}
              className="slider-range"
            />
          </div>

          {/* Decay */}
          <div className="param-card">
            <div className="param-header">
              <label>DECAY TIME</label>
              <span className="param-value">{(params.decay || 1.0).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={params.decay ?? 1.0}
              onChange={(e) => onChangeParam(selectedTrack.id, 'decay', Number(e.target.value))}
              className="slider-range"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
