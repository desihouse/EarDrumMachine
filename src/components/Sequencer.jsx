import React from 'react';
import { VolumeX, Disc, Trash2 } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

export function Sequencer({
  tracks,
  patternData,
  trackParams,
  currentStep,
  isPlaying,
  selectedTrackId,
  onSelectTrack,
  onToggleStep,
  onToggleMute,
  onToggleSolo,
  onClearTrackPattern,
  onTriggerTrack
}) {
  return (
    <div className="sequencer-section">
      <div className="sequencer-header">
        <div className="track-col-header">TRACK / SOUND</div>
        <div className="steps-header">
          {Array.from({ length: 16 }).map((_, idx) => {
            const isCurrent = isPlaying && currentStep === idx;
            const isBeatStart = idx % 4 === 0;
            return (
              <div
                key={idx}
                className={`step-num ${isBeatStart ? 'beat-start' : ''} ${
                  isCurrent ? 'is-current-step' : ''
                }`}
              >
                <span>{idx + 1}</span>
                {isCurrent && <div className="step-cursor-indicator" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sequencer-body">
        {tracks.map((track) => {
          const trackSteps = patternData[track.id] || Array(16).fill(0);
          const params = trackParams[track.id] || {};
          const isSelected = selectedTrackId === track.id;
          const isMuted = params.muted;
          const isSolo = params.solo;
          const customMeta = audioEngine.getCustomMetadata(track.id);

          return (
            <div
              key={track.id}
              className={`sequencer-row ${isSelected ? 'is-row-selected' : ''}`}
            >
              {/* Track Info & Quick Controls */}
              <div className="track-info">
                <button
                  className="track-preview-btn"
                  style={{ '--track-color': track.color }}
                  onClick={() => {
                    onSelectTrack(track.id);
                    onTriggerTrack(track);
                  }}
                  title="Click to select & trigger sound"
                >
                  <span className="track-indicator"></span>
                  <span className="track-name">{track.name}</span>
                </button>

                <div className="track-quick-actions">
                  <button
                    className={`btn-tiny ${isMuted ? 'active-mute' : ''}`}
                    onClick={() => onToggleMute(track.id)}
                    title="Mute track"
                  >
                    M
                  </button>
                  <button
                    className={`btn-tiny ${isSolo ? 'active-solo' : ''}`}
                    onClick={() => onToggleSolo(track.id)}
                    title="Solo track"
                  >
                    S
                  </button>
                  <button
                    className="btn-tiny btn-clear"
                    onClick={() => onClearTrackPattern(track.id)}
                    title="Clear track pattern"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* 16 Step Buttons */}
              <div className="track-steps">
                {trackSteps.map((stepVal, stepIdx) => {
                  const isCurrent = isPlaying && currentStep === stepIdx;
                  const isGroupStart = stepIdx % 4 === 0;

                  return (
                    <button
                      key={stepIdx}
                      className={`step-btn ${isGroupStart ? 'group-start' : ''} ${
                        stepVal === 1 ? 'state-normal' : stepVal === 2 ? 'state-accent' : ''
                      } ${isCurrent ? 'is-playing-step' : ''}`}
                      style={{
                        '--step-color': track.color
                      }}
                      onClick={() => onToggleStep(track.id, stepIdx)}
                      title={`Step ${stepIdx + 1}: ${
                        stepVal === 0 ? 'Off' : stepVal === 1 ? 'Normal' : 'Accent'
                      }`}
                    >
                      {stepVal === 2 && <div className="accent-dot"></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
