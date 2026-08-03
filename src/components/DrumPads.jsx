import React, { useEffect, useState } from 'react';
import { Upload, Music, VolumeX, ShieldAlert } from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';

export function DrumPads({
  tracks,
  trackParams,
  selectedTrackId,
  onSelectTrack,
  onTriggerTrack
}) {
  const [activePadId, setActivePadId] = useState(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toUpperCase();
      const track = tracks.find((t) => t.keyHint === key);
      if (track) {
        e.preventDefault();
        triggerPad(track);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tracks, trackParams]);

  const triggerPad = (track) => {
    setActivePadId(track.id);
    setTimeout(() => setActivePadId(null), 120);
    onTriggerTrack(track);
  };

  return (
    <div className="pads-section">
      <div className="section-title">
        <span>MPC DRUM PADS</span>
        <span className="title-hint">PRESS KEYBOARD HOTKEYS [Q W E R / A S D F / Z X C V] TO TRIGGER</span>
      </div>

      <div className="pads-grid">
        {tracks.map((track) => {
          const params = trackParams[track.id] || {};
          const isSelected = selectedTrackId === track.id;
          const isActive = activePadId === track.id;
          const isMuted = params.muted;
          const isSolo = params.solo;
          const customMeta = audioEngine.getCustomMetadata(track.id);

          return (
            <div
              key={track.id}
              className={`drum-pad ${isSelected ? 'is-selected' : ''} ${
                isActive ? 'is-active' : ''
              } ${isMuted ? 'is-muted' : ''}`}
              style={{
                '--pad-accent': track.color
              }}
              onClick={() => {
                onSelectTrack(track.id);
                triggerPad(track);
              }}
            >
              <div className="pad-header">
                <span className="pad-key-badge">{track.keyHint}</span>
                <div className="pad-status-badges">
                  {isMuted && <span className="badge badge-mute">M</span>}
                  {isSolo && <span className="badge badge-solo">S</span>}
                  {customMeta ? (
                    <span className="badge badge-custom" title={`Custom File: ${customMeta.fileName}`}>
                      SMP
                    </span>
                  ) : (
                    <span className="badge badge-synth">SYNTH</span>
                  )}
                </div>
              </div>

              <div className="pad-body">
                <span className="pad-name">{track.name}</span>
                {customMeta && (
                  <span className="pad-filename" title={customMeta.fileName}>
                    {customMeta.fileName}
                  </span>
                )}
              </div>

              <div className="pad-glow-ring"></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
