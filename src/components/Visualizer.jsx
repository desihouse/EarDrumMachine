import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

export function Visualizer({ currentTrackName, currentStep }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const render = () => {
      animId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      if (!audioEngine.analyser) return;

      const bufferLength = audioEngine.analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      audioEngine.analyser.getByteFrequencyData(freqData);
      audioEngine.analyser.getByteTimeDomainData(timeData);

      // 1. Render Frequency Spectrum Bars
      const barCount = 48;
      const barWidth = (width / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        const value = freqData[i * 2] || 0;
        const percent = value / 255;
        const barHeight = percent * (height * 0.75);

        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Dynamic neon gradient
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(5, 217, 232, 0.2)');
        gradient.addColorStop(0.5, 'rgba(0, 245, 212, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 42, 109, 1)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Bar cap glow
        if (barHeight > 4) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 2, barWidth, 2);
        }
      }

      // 2. Render Oscilloscope Waveform Line
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(5, 217, 232, 0.9)';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="visualizer-container">
      <div className="visualizer-overlay">
        <span className="visualizer-label">MASTER AUDIO SPECTRUM</span>
        {currentTrackName && (
          <span className="visualizer-track-tag">SELECTED: {currentTrackName.toUpperCase()}</span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={90}
        className="visualizer-canvas"
      />
    </div>
  );
}
