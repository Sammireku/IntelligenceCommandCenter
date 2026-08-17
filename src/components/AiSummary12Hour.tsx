import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  BrainCircuit,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Radio,
  RefreshCw,
  Share2,
  ShieldAlert,
  Ship,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react';
import { DisasterTweetItem, EarthquakeItem, FireAnomalyItem, FlightAnomalyItem, MaritimeVesselItem, TwelveHourSitrep } from '../types.js';
import { generate12HourSitrep } from '../utils/geoIntelligence.js';
import { playTacticalBlip } from '../utils/audio.js';

interface AiSummary12HourProps {
  earthquakes?: EarthquakeItem[];
  disasters?: DisasterTweetItem[];
  emergencySquawks?: FlightAnomalyItem[];
  fireAnomalies?: FireAnomalyItem[];
  trackedVessels?: MaritimeVesselItem[];
  onOpenDesk?: (deskId: string) => void;
  liteMode?: boolean;
}

export const AiSummary12Hour: React.FC<AiSummary12HourProps> = ({
  earthquakes = [],
  disasters = [],
  emergencySquawks = [],
  fireAnomalies = [],
  trackedVessels = [],
  onOpenDesk,
  liteMode = false,
}) => {
  const [sitrep, setSitrep] = useState<TwelveHourSitrep>(() =>
    generate12HourSitrep(earthquakes, disasters, emergencySquawks, fireAnomalies, trackedVessels)
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    playTacticalBlip(1800);
    setTimeout(() => {
      const updated = generate12HourSitrep(
        earthquakes,
        disasters,
        emergencySquawks,
        fireAnomalies,
        trackedVessels
      );
      setSitrep(updated);
      setIsGenerating(false);
      playTacticalBlip(1200);
    }, 600);
  };

  const handleSpeakBriefing = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const text = `${sitrep.executiveSummary} Key findings: ${sitrep.keyTakeaways.join('. ')}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 font-sans shadow-xl space-y-4">
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#121212] border border-[#262626] text-[#00ff41]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              12-HOUR CRISIS AI SYNTHESIS & SITREP
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#121212] text-[#00ff41] border border-[#00ff41]/40">
                TEMPORAL DELTA
              </span>
            </h2>
            <div className="text-[11px] font-mono text-[#888888]">
              Automated AI synthesis of cross-domain geopolitical, seismic, maritime, and airspace shifts over the last 12h
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSpeakBriefing}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              isSpeaking
                ? 'bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse'
                : 'bg-[#121212] border-[#262626] text-[#888888] hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isSpeaking ? 'Stop Audio Brief' : 'Audio Brief'}</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-lg bg-[#00ff41] hover:bg-[#00e63a] text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#00ff41]/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Analyzing...' : 'Resynthesize 12h'}</span>
          </button>
        </div>
      </div>

      {/* 12h Executive Briefing Card */}
      <div className="p-3.5 rounded-lg bg-[#050505] border border-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00d1ff]" />
            <span className="text-xs font-mono font-bold text-[#00d1ff] uppercase">Executive Situation Report (Past 12h)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-700 font-bold">
              THREAT LEVEL: {sitrep.threatLevel}
            </span>
          </div>
          <p className="text-xs text-[#e5e5e5] leading-relaxed">
            {sitrep.executiveSummary}
          </p>
        </div>

        {/* 12h Delta Metrics Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full md:w-auto font-mono text-center shrink-0">
          <div className="p-2 rounded bg-[#121212] border border-[#262626]">
            <div className="text-[10px] text-[#888888] uppercase">12h Quakes</div>
            <div className="text-sm font-bold text-white mt-0.5">{sitrep.metricsDelta.quakesCount12h}</div>
            <div className="text-[9px] text-rose-400">Max M{sitrep.metricsDelta.maxMag12h}</div>
          </div>

          <div className="p-2 rounded bg-[#121212] border border-[#262626]">
            <div className="text-[10px] text-[#888888] uppercase">Squawks</div>
            <div className="text-sm font-bold text-white mt-0.5">{sitrep.metricsDelta.squawks12h}</div>
            <div className="text-[9px] text-amber-400">7700/7600</div>
          </div>

          <div className="p-2 rounded bg-[#121212] border border-[#262626]">
            <div className="text-[10px] text-[#888888] uppercase">Dark Fleet</div>
            <div className="text-sm font-bold text-white mt-0.5">{sitrep.metricsDelta.darkFleetDeviations}</div>
            <div className="text-[9px] text-[#00ff41]">Diverted</div>
          </div>

          <div className="p-2 rounded bg-[#121212] border border-[#262626]">
            <div className="text-[10px] text-[#888888] uppercase">FIRMS Fires</div>
            <div className="text-sm font-bold text-white mt-0.5">{sitrep.metricsDelta.firesCount12h}</div>
            <div className="text-[9px] text-orange-400">Hotspots</div>
          </div>

          <div className="p-2 rounded bg-[#121212] border border-[#262626]">
            <div className="text-[10px] text-[#888888] uppercase">VIX Shift</div>
            <div className="text-sm font-bold text-white mt-0.5">+{sitrep.metricsDelta.marketVixDelta}%</div>
            <div className="text-[9px] text-amber-400">Volatility</div>
          </div>

          <div className="p-2 rounded bg-[#121212] border border-[#262626]">
            <div className="text-[10px] text-[#888888] uppercase">Status</div>
            <div className="text-sm font-bold text-[#00ff41] mt-0.5">SYNCHED</div>
            <div className="text-[9px] text-[#888888]">100% Valid</div>
          </div>
        </div>
      </div>

      {/* 12-Hour Chronological Timeline Progression Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#888888] flex items-center gap-1.5 uppercase">
            <Clock className="w-3.5 h-3.5 text-[#00ff41]" />
            12-Hour Incident Chronology (Click to Inspect Milestone)
          </span>
          <span className="text-[11px] text-[#666666]">
            Showing milestone {selectedTimelineIndex + 1} of {sitrep.timelinePoints.length}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sitrep.timelinePoints.map((tp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedTimelineIndex(idx);
                playTacticalBlip(1300);
              }}
              className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                selectedTimelineIndex === idx
                  ? 'bg-[#1a1a1a] border-[#00ff41] text-white shadow-lg shadow-[#00ff41]/10'
                  : 'bg-[#050505] border-[#1a1a1a] text-[#888888] hover:border-[#333333]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-[#00ff41]">{tp.time}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[8px] uppercase ${
                    tp.severity === 'FLASH'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'bg-[#121212] text-amber-300 border border-amber-700'
                  }`}
                >
                  {tp.domain}
                </span>
              </div>
              <p className="text-[11px] font-sans text-[#d4d4d4] line-clamp-2 leading-tight">
                {tp.event}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Key Strategic Takeaways */}
      <div className="p-3 rounded-lg bg-[#050505] border border-[#1a1a1a] space-y-1.5">
        <div className="text-[11px] font-mono font-bold text-[#888888] uppercase tracking-wider">
          Strategic Assessment & Cross-Domain Implications:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {sitrep.keyTakeaways.map((takeaway, i) => (
            <div key={i} className="flex items-start gap-2 text-[#d4d4d4]">
              <span className="text-[#00ff41] font-mono font-bold mt-0.5">•</span>
              <span className="leading-snug">{takeaway}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
