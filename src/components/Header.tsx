import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertOctagon,
  Clock,
  Compass,
  Download,
  Eye,
  FileSearch,
  FileText,
  History,
  MessageSquare,
  Moon,
  Play,
  Radio,
  RefreshCw,
  Sliders,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { getAudioMuted, playTacticalBlip, setAudioMuted } from '../utils/audio.js';
import { exportSweepAsJson, exportSweepAsMarkdown } from '../utils/export.js';
import { SweepPayload } from '../types.js';

interface HeaderProps {
  sweep: SweepPayload | null;
  isSweeping: boolean;
  sseConnected: boolean;
  nextSweepTimestamp: number;
  sweepIntervalMinutes: number;
  onTriggerSweep: () => void;
  onChangeInterval: (mins: number) => void;
  onOpenHistory: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenWebSdrModal: () => void;
  onOpenWatchlistModal: () => void;
  onOpenSandboxModal: () => void;
  liteMode: boolean;
  onToggleLiteMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sweep,
  isSweeping,
  sseConnected,
  nextSweepTimestamp,
  sweepIntervalMinutes,
  onTriggerSweep,
  onChangeInterval,
  onOpenHistory,
  onOpenWhatsAppModal,
  onOpenWebSdrModal,
  onOpenWatchlistModal,
  onOpenSandboxModal,
  liteMode,
  onToggleLiteMode,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [audioMuted, setLocalMuted] = useState<boolean>(getAudioMuted());
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showIntervalMenu, setShowIntervalMenu] = useState<boolean>(false);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((nextSweepTimestamp - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [nextSweepTimestamp]);

  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMuted(next);
    setLocalMuted(next);
    if (!next) playTacticalBlip(1400, 0.05);
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const flashCount = sweep?.delta.flashCount || 0;
  const priorityCount = sweep?.delta.priorityCount || 0;

  return (
    <header id="crucix-header" className="sticky top-0 z-40 w-full border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-md px-4 py-2.5 select-none shadow-xl">
      {/* Top Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Node Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded bg-[#121212] border border-[#262626] text-[#00ff41] font-mono font-black text-lg shadow-[0_0_12px_rgba(0,255,65,0.15)]">
            CR
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#00ff41] animate-ping"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs md:text-sm font-bold font-mono tracking-wider text-white uppercase">
                CRUCIX // COMMAND NODE
              </h1>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-widest rounded border ${
                  sweep?.overallStatus === 'CRITICAL'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse'
                    : sweep?.overallStatus === 'WARNING'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                    : 'bg-[#121212] text-[#00ff41] border-[#00ff41]/40'
                }`}
              >
                {sweep?.overallStatus || 'ACTIVE OSINT'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-[#888888]">
              <span className="flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sseConnected ? 'bg-[#00ff41] animate-pulse' : 'bg-amber-400'
                  }`}
                ></span>
                {sseConnected ? 'SSE LIVE STREAM' : 'CONNECTING...'}
              </span>
              <span>•</span>
              <span className="hidden sm:inline">PARALLEL SWEEP</span>
              {sweep && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-[#a0a0a0] hidden sm:inline">ID: {sweep.sweepId.slice(0, 10)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center Quick Tactical Modal Tools */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {/* WhatsApp Alert Hub */}
          <button
            type="button"
            onClick={() => {
              playTacticalBlip(1400);
              onOpenWhatsAppModal();
            }}
            className="px-2.5 py-1 rounded bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/50 text-[#25D366] font-bold flex items-center gap-1.5 text-xs transition-colors"
            title="Configure Proximity Alerts & WhatsApp Dispatch"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">WhatsApp Alerts</span>
          </button>

          {/* WebSDR SIGINT Radio */}
          <button
            type="button"
            onClick={() => {
              playTacticalBlip(1300);
              onOpenWebSdrModal();
            }}
            className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-[#00d1ff] flex items-center gap-1.5 text-xs transition-colors"
            title="Open WebSDR Spectrum Receiver & Military Radio"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">WebSDR Radio</span>
          </button>

          {/* High-Value Watchlist */}
          <button
            type="button"
            onClick={() => {
              playTacticalBlip(1200);
              onOpenWatchlistModal();
            }}
            className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-amber-300 flex items-center gap-1.5 text-xs transition-colors"
            title="VIP Aircraft & Strike Group Asset Watchlist"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Asset Watchlist</span>
          </button>

          {/* Verification / Archiving Sandbox */}
          <button
            type="button"
            onClick={() => {
              playTacticalBlip(1200);
              onOpenSandboxModal();
            }}
            className="px-2.5 py-1 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-[#d4d4d4] hover:text-white flex items-center gap-1.5 text-xs transition-colors"
            title="EXIF Verification, Sun-Shadow, and Wayback Archiving"
          >
            <FileSearch className="w-3.5 h-3.5 text-[#00ff41]" />
            <span className="hidden md:inline">Sandbox</span>
          </button>
        </div>

        {/* Right HUD Controls: Sweep Trigger, Timer, Interval, Audio, Lite Mode, History, Export */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Next Sweep Timer */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121212] border border-[#1f1f1f] text-[#d4d4d4]">
            <Clock className="w-3.5 h-3.5 text-[#00ff41]" />
            <span className="text-[#888888] text-[10px]">NEXT:</span>
            <span className="font-bold text-[#00ff41] w-10 text-center text-xs">{timeFormatted}</span>
          </div>

          {/* Sweep Interval Selector */}
          <div className="relative">
            <button
              type="button"
              id="header-interval-btn"
              onClick={() => {
                setShowIntervalMenu(!showIntervalMenu);
                setShowExportMenu(false);
              }}
              className="px-2 py-1 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[#d4d4d4] flex items-center gap-1 transition-colors"
              title="Configure Sweep Interval"
            >
              <Sliders className="w-3.5 h-3.5 text-[#00d1ff]" />
              <span>{sweepIntervalMinutes}m</span>
            </button>

            {showIntervalMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-[#0f0f0f] border border-[#262626] rounded shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] text-[#888888] uppercase border-b border-[#1f1f1f]">
                  Sweep Interval
                </div>
                {[5, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      onChangeInterval(mins);
                      setShowIntervalMenu(false);
                      playTacticalBlip(900);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                      sweepIntervalMinutes === mins
                        ? 'bg-[#1a1a1a] text-[#00ff41] font-bold'
                        : 'text-[#d4d4d4] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <span>Every {mins} min</span>
                    {sweepIntervalMinutes === mins && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Trigger Sweep Button */}
          <button
            type="button"
            id="trigger-sweep-btn"
            onClick={() => {
              playTacticalBlip(1600);
              onTriggerSweep();
            }}
            disabled={isSweeping}
            className={`px-3 py-1 rounded font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border shadow-lg ${
              isSweeping
                ? 'bg-[#121212] border-[#262626] text-[#00ff41] cursor-not-allowed'
                : 'bg-[#00ff41] hover:bg-[#00e63a] active:scale-95 text-black border-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.25)]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
            <span>{isSweeping ? 'SWEEPING' : 'SWEEP'}</span>
          </button>

          {/* Audio Chimes Toggle */}
          <button
            type="button"
            id="header-audio-toggle"
            onClick={toggleAudio}
            className={`p-1.5 rounded border transition-colors ${
              audioMuted
                ? 'bg-[#121212] border-[#1f1f1f] text-[#666666] hover:text-[#a0a0a0]'
                : 'bg-[#161616] border-[#00ff41]/50 text-[#00ff41] shadow-[0_0_8px_rgba(0,255,65,0.15)]'
            }`}
            title={audioMuted ? 'Unmute Tactical Chimes' : 'Mute Tactical Chimes'}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Lite Mode Toggle */}
          <button
            type="button"
            id="header-performance-toggle"
            onClick={() => {
              playTacticalBlip(1000);
              onToggleLiteMode();
            }}
            className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors flex items-center gap-1 ${
              liteMode
                ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                : 'bg-[#121212] border-[#1f1f1f] text-[#d4d4d4] hover:border-[#262626]'
            }`}
            title="Toggle between Tactical HUD and Visuals Lite"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{liteMode ? 'LITE' : 'HUD'}</span>
          </button>

          {/* History Modal Trigger */}
          <button
            type="button"
            id="header-history-btn"
            onClick={() => {
              playTacticalBlip(1100);
              onOpenHistory();
            }}
            className="p-1.5 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[#d4d4d4] hover:text-[#00ff41] transition-colors"
            title="Inspect Historical Sweeps"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Export Reports Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="header-export-btn"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowIntervalMenu(false);
                playTacticalBlip(1150);
              }}
              className="p-1.5 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#1f1f1f] text-[#d4d4d4] hover:text-[#00ff41] transition-colors flex items-center gap-1"
              title="Export Intelligence Reports"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {showExportMenu && sweep && (
              <div className="absolute right-0 mt-1 w-48 bg-[#0f0f0f] border border-[#262626] rounded shadow-2xl p-1 z-50">
                <div className="px-2 py-1 text-[10px] text-[#888888] uppercase border-b border-[#1f1f1f]">
                  Export Intelligence
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportSweepAsMarkdown(sweep);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 rounded text-xs text-[#d4d4d4] hover:bg-[#1a1a1a] hover:text-[#00ff41] transition-colors flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#00d1ff]" />
                  <span>Markdown Briefing (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportSweepAsJson(sweep);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2 py-2 rounded text-xs text-[#d4d4d4] hover:bg-[#1a1a1a] hover:text-[#00ff41] transition-colors flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-[#00ff41]" />
                  <span>Raw Sweep JSON (.json)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
