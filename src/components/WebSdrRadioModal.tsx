import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Compass,
  Headphones,
  Maximize2,
  Play,
  Radio,
  Sliders,
  Square,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { WebSdrChannel } from '../types.js';
import { WEBSDR_CHANNELS } from '../utils/geoIntelligence.js';
import { playTacticalBlip } from '../utils/audio.js';

interface WebSdrRadioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebSdrRadioModal: React.FC<WebSdrRadioModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<WebSdrChannel>(WEBSDR_CHANNELS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [squelchDb, setSquelchDb] = useState<number>(-80);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let animFrame: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const drawWaterfall = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0, 0, w, h);

      // Draw grid
      ctx.strokeStyle = '#122530';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw FFT Spectral wave
      ctx.beginPath();
      ctx.strokeStyle = isPlaying ? '#00ff41' : '#00d1ff';
      ctx.lineWidth = 2;

      const center = w / 2;
      for (let x = 0; x < w; x++) {
        const distFromCenter = Math.abs(x - center);
        const signalPeak = Math.exp(-(distFromCenter * distFromCenter) / 800) * 60;
        const noise = (Math.sin(x * 0.08 + phase) + Math.cos(x * 0.15 - phase * 0.5)) * (isPlaying ? 12 : 5);
        const jitter = Math.random() * (isPlaying ? 8 : 3);
        const y = h * 0.7 - signalPeak - noise - jitter;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Peak marker indicator
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.arc(center, h * 0.7 - 60, 4, 0, Math.PI * 2);
      ctx.fill();

      // Signal power label
      ctx.fillStyle = '#00ff41';
      ctx.font = '10px monospace';
      ctx.fillText(`CARRIER LOCK: ${selectedChannel.freqMhz}`, 10, 20);
      ctx.fillText(`RSSI: ${selectedChannel.activeSignalDb + Math.floor(Math.sin(phase) * 3)} dBm`, 10, 35);
      ctx.fillText(`MOD: ${selectedChannel.modulation} • ${selectedChannel.band.toUpperCase()}`, 10, 50);

      phase += isPlaying ? 0.2 : 0.05;
      animFrame = requestAnimationFrame(drawWaterfall);
    };

    drawWaterfall();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isOpen, isPlaying, selectedChannel]);

  if (!isOpen) return null;

  const togglePlayback = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    playTacticalBlip(next ? 1800 : 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#121212] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00d1ff]/20 border border-[#00d1ff]/50 text-[#00d1ff]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                WEBSDR RADIO SPECTRUM & SIGINT LISTENER
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121212] text-[#00ff41] border border-[#00ff41]/40">
                  REAL-TIME RF
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                VHF/UHF Air Distress (121.5/243 MHz), Maritime SAR (500 kHz), and USAF HFGCS Strategic Command (8992 kHz)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Radio FFT Waterfall Scope Canvas */}
          <div className="rounded-lg overflow-hidden border border-[#262626] bg-[#05080c] relative shadow-inner">
            <canvas
              ref={canvasRef}
              width={700}
              height={180}
              className="w-full h-44 block"
            />

            {/* Scope Overlay Badges */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isPlaying
                  ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                  : 'bg-[#121212] text-[#888888] border-[#262626]'
              }`}>
                {isPlaying ? '● LIVE DEMODULATION' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Player & Tuning Controls */}
          <div className="p-3.5 rounded-lg bg-[#121212] border border-[#262626] flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-xs transition-all shadow-lg ${
                  isPlaying
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                    : 'bg-[#00ff41] hover:bg-[#00e63a] text-black shadow-[#00ff41]/20'
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'MUTE RX' : 'TUNE & LISTEN'}
              </button>

              <div className="space-y-0.5">
                <div className="text-white font-bold text-sm">{selectedChannel.freqMhz}</div>
                <div className="text-[10px] text-[#888888]">{selectedChannel.location}</div>
              </div>
            </div>

            {/* Volume & Squelch Sliders */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#888888]" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-20 accent-[#00ff41]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#888888]">
                <span>SQL:</span>
                <span className="text-[#00ff41] font-bold">{squelchDb}dBm</span>
              </div>
            </div>
          </div>

          {/* Monitored Frequency Channel Matrix */}
          <div className="space-y-2 font-mono">
            <div className="text-[11px] font-bold text-[#888888] uppercase">
              Strategic Radio Channels & SDR Receivers:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {WEBSDR_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => {
                    setSelectedChannel(ch);
                    playTacticalBlip(1400);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedChannel.id === ch.id
                      ? 'bg-[#1a1a1a] border-[#00ff41] text-white shadow-lg shadow-[#00ff41]/10'
                      : 'bg-[#050505] border-[#1a1a1a] text-[#888888] hover:border-[#333333]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-[#00ff41]">{ch.freqMhz}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#121212] border border-[#262626] text-[#888888]">
                      {ch.modulation} • {ch.band}
                    </span>
                  </div>
                  <div className="font-sans font-medium text-white text-xs mb-0.5">
                    {ch.name}
                  </div>
                  <p className="text-[11px] font-sans text-[#737373] leading-snug line-clamp-2">
                    {ch.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between font-mono text-xs">
          <div className="text-[#888888]">
            SDR Node: <span className="text-white">KiwiSDR / WebSDR Open-Source Receiver Grid</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#888888] hover:text-white transition-colors"
          >
            Close Tuner
          </button>
        </div>
      </div>
    </div>
  );
};
