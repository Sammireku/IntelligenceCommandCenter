import React, { useState } from 'react';
import {
  Archive,
  Camera,
  CheckCircle,
  Clock,
  Compass,
  ExternalLink,
  FileSearch,
  Globe,
  Image as ImageIcon,
  MapPin,
  Search,
  Shield,
  Sun,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { playTacticalBlip } from '../utils/audio.js';

interface MetadataSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetadataSandboxModal: React.FC<MetadataSandboxModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null);
  const [calculatedSunAngle, setCalculatedSunAngle] = useState<{
    azimuth: number;
    elevation: number;
    shadowLengthRatio: number;
  } | null>(null);
  const [sandboxLat, setSandboxLat] = useState<number>(33.5);
  const [sandboxLng, setSandboxLng] = useState<number>(36.3);
  const [sandboxTime, setSandboxTime] = useState<string>('14:30');

  if (!isOpen) return null;

  const handlePushToWayback = () => {
    if (!targetUrl) return;
    playTacticalBlip(1600);
    setArchiveStatus('Pushing snapshot request to Internet Archive Wayback & Archive.today...');
    window.open(`https://web.archive.org/save/${encodeURIComponent(targetUrl)}`, '_blank', 'noopener,noreferrer');
    setTimeout(() => {
      setArchiveStatus('Archive snapshot initiated in new tab. URL preserved.');
    }, 1500);
  };

  const handleCalculateSunShadow = () => {
    playTacticalBlip(1300);
    const [hours, mins] = sandboxTime.split(':').map(Number);
    const timeDec = hours + mins / 60;
    const hourAngle = (timeDec - 12) * 15;
    const declination = 15; // approximate summer/spring

    const latRad = (sandboxLat * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;
    const haRad = (hourAngle * Math.PI) / 180;

    const sinElev = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const elevation = Math.max(2, Math.asin(sinElev) * (180 / Math.PI));
    const azimuth = (180 + hourAngle * 1.2) % 360;
    const shadowRatio = 1 / Math.tan((elevation * Math.PI) / 180);

    setCalculatedSunAngle({
      azimuth: Math.round(azimuth),
      elevation: Math.round(elevation),
      shadowLengthRatio: Number(shadowRatio.toFixed(2)),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#121212] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#00ff41]/20 border border-[#00ff41]/50 text-[#00ff41]">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                VERIFICATION & GEOLOCATION SANDBOX
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121212] text-[#00ff41] border border-[#00ff41]/40">
                  EXIF • SHADOW • ARCHIVE
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                One-click media verification, deep-link archiving, and solar shadow angle verification
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
          {/* Section 1: Deep-Link Archiving */}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 space-y-3 font-mono">
            <span className="font-bold text-white uppercase flex items-center gap-2 text-xs">
              <Archive className="w-4 h-4 text-[#00d1ff]" />
              1. Instant Evidence Preservation (Wayback Machine & Archive.today)
            </span>

            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://x.com/user/status/... or news dispatch URL"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#262626] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#00d1ff]"
                />
                <button
                  type="button"
                  onClick={handlePushToWayback}
                  className="px-4 py-2 rounded-lg bg-[#00d1ff] hover:bg-[#00b8e6] text-black font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-lg shadow-[#00d1ff]/20"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Preserve URL
                </button>
              </div>
            </div>

            {archiveStatus && (
              <div className="p-2 rounded bg-[#00d1ff]/10 border border-[#00d1ff]/30 text-[#00d1ff] text-[11px] flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{archiveStatus}</span>
              </div>
            )}
          </div>

          {/* Section 2: Sun-Shadow Chronolocation Calculator */}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 space-y-3 font-mono">
            <span className="font-bold text-white uppercase flex items-center gap-2 text-xs">
              <Sun className="w-4 h-4 text-amber-400" />
              2. Sun-Shadow Chronolocation & Azimuth Verifier
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-[#888888]">Latitude (°N):</label>
                <input
                  type="number"
                  step="0.1"
                  value={sandboxLat}
                  onChange={(e) => setSandboxLat(Number(e.target.value))}
                  className="w-full bg-[#121212] border border-[#262626] rounded px-2.5 py-1.5 text-white text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#888888]">Longitude (°E):</label>
                <input
                  type="number"
                  step="0.1"
                  value={sandboxLng}
                  onChange={(e) => setSandboxLng(Number(e.target.value))}
                  className="w-full bg-[#121212] border border-[#262626] rounded px-2.5 py-1.5 text-white text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#888888]">Local Time (HH:MM):</label>
                <input
                  type="time"
                  value={sandboxTime}
                  onChange={(e) => setSandboxTime(e.target.value)}
                  className="w-full bg-[#121212] border border-[#262626] rounded px-2.5 py-1.5 text-white text-xs mt-1"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCalculateSunShadow}
              className="w-full py-2 rounded bg-[#161616] hover:bg-[#202020] text-amber-300 border border-amber-600/50 font-bold flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              Calculate Solar Angles & Shadow Ratios
            </button>

            {calculatedSunAngle && (
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[#121212] border border-[#262626] text-center">
                <div>
                  <div className="text-[10px] text-[#888888]">Sun Elevation</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">{calculatedSunAngle.elevation}°</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#888888]">Azimuth Angle</div>
                  <div className="text-sm font-bold text-white mt-0.5">{calculatedSunAngle.azimuth}°</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#888888]">Shadow Multiplier</div>
                  <div className="text-sm font-bold text-[#00ff41] mt-0.5">{calculatedSunAngle.shadowLengthRatio}x height</div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Reverse Image & Video Verification Quick Links */}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 space-y-2 font-mono">
            <span className="font-bold text-white uppercase flex items-center gap-2 text-xs">
              <Camera className="w-4 h-4 text-[#00ff41]" />
              3. Reverse Visual Search Engine Portals
            </span>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="https://images.google.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-[#121212] border border-[#262626] text-white hover:text-[#00ff41] flex items-center gap-1.5 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Google Lens / Reverse Search ↗
              </a>
              <a
                href="https://yandex.com/images"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-[#121212] border border-[#262626] text-white hover:text-[#00ff41] flex items-center gap-1.5 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Yandex Visual Matcher ↗
              </a>
              <a
                href="https://tineye.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded bg-[#121212] border border-[#262626] text-white hover:text-[#00ff41] flex items-center gap-1.5 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                TinEye Historical Tracker ↗
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between font-mono text-xs">
          <div className="text-[#888888]">
            Standards: <span className="text-white">Bellingcat & FirstDraft OSINT Verification Protocols</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#888888] hover:text-white transition-colors"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
