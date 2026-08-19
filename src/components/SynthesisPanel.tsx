import React, { useState } from 'react';
import {
  AlertOctagon,
  Bot,
  BrainCircuit,
  Compass,
  Lightbulb,
  Network,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AISynthesisReport } from '../types.js';

interface SynthesisPanelProps {
  synthesis?: AISynthesisReport;
  onResynthesize: () => void;
  isSynthesizing: boolean;
  liteMode?: boolean;
}

export const SynthesisPanel: React.FC<SynthesisPanelProps> = ({
  synthesis,
  onResynthesize,
  isSynthesizing,
  liteMode = false,
}) => {
  if (!synthesis) {
    return (
      <div id="synthesis-panel-empty" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 font-mono text-center space-y-3">
        <BrainCircuit className="w-8 h-8 text-[#00ff41] mx-auto animate-pulse" />
        <div className="text-sm font-bold text-white uppercase">
          AI CROSS-DOMAIN SYNTHESIS ENGINE
        </div>
        <p className="text-xs text-[#888888] max-w-md mx-auto">
          Synthesizes parallel OSINT telemetry across geospatial hazards, macro markets, biomedical surveillance, and cyber exploits.
        </p>
        <button
          type="button"
          onClick={onResynthesize}
          disabled={isSynthesizing}
          className="px-4 py-2 rounded bg-[#00ff41] hover:bg-[#00e63a] text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 mx-auto shadow-[0_0_15px_rgba(0,255,65,0.2)]"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isSynthesizing ? 'SYNTHESIZING...' : 'GENERATE EXECUTIVE BRIEF'}</span>
        </button>
      </div>
    );
  }

  const getThreatColor = (level: AISynthesisReport['threatLevel']) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-950/80 border-rose-600 animate-pulse';
      case 'HIGH':
        return 'text-orange-400 bg-orange-950/80 border-orange-600';
      case 'ELEVATED':
        return 'text-amber-400 bg-amber-950/80 border-amber-600';
      case 'LOW':
      default:
        return 'text-[#00ff41] bg-[#121212] border-[#00ff41]/50';
    }
  };

  const keyFindings = synthesis.keyFindings || [];
  const crossDomainCorrelations = synthesis.crossDomainCorrelations || [];
  const tradeAndHedgeHypotheses = synthesis.tradeAndHedgeHypotheses || [];

  return (
    <div id="synthesis-panel" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-sans flex flex-col gap-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#121212] border border-[#262626] text-[#00ff41]">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              MILZ SENTRY AI CROSS-DOMAIN SYNTHESIS
              <span className={`px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${getThreatColor(synthesis.threatLevel || 'LOW')}`}>
                THREAT: {synthesis.threatLevel || 'LOW'}
              </span>
            </h2>
            <div className="text-[11px] font-mono text-[#888888]">
              Gemini 3.7 Flash Reasoning • Multi-Source Correlation Engine
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onResynthesize}
          disabled={isSynthesizing}
          className="px-3 py-1.5 rounded bg-[#121212] hover:bg-[#1a1a1a] border border-[#262626] text-[#d4d4d4] hover:text-[#00ff41] font-mono text-xs flex items-center gap-1.5 transition-colors"
          title="Re-run AI synthesis on current telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
          <span>{isSynthesizing ? 'SYNTHESIZING...' : 'RE-SYNTHESIZE'}</span>
        </button>
      </div>

      {/* Executive Brief Card */}
      <div className="p-3.5 rounded bg-[#050505] border border-[#1a1a1a] space-y-2">
        <div className="flex items-center gap-2 text-[#00ff41] font-mono text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Executive Situation Briefing</span>
        </div>
        <p className="text-sm text-[#d4d4d4] leading-relaxed font-sans font-medium">
          {synthesis.executiveBrief}
        </p>
      </div>

      {/* Key Strategic Findings */}
      <div className="space-y-1.5">
        <div className="text-xs font-mono font-bold uppercase text-[#888888] flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Key Strategic Findings</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans text-xs">
          {keyFindings.map((finding, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded bg-[#050505] border border-[#1a1a1a] text-[#d4d4d4] flex items-start gap-2 leading-relaxed"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] shrink-0 mt-1.5"></span>
              <span>{finding}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Domain Correlations */}
      {crossDomainCorrelations.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
          <div className="text-xs font-mono font-bold uppercase text-[#888888] flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-[#00d1ff]" />
            <span>Cross-Domain Correlations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {crossDomainCorrelations.map((corr, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-[#050505] border border-[#1a1a1a] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1 mb-1.5">
                    {(corr.domains || []).map((dom) => (
                      <span
                        key={dom}
                        className="px-1.5 py-0.5 rounded bg-[#121212] text-[#00d1ff] text-[10px] font-mono border border-[#262626]"
                      >
                        {dom}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#a0a0a0] leading-relaxed font-sans">
                    {corr.observation}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#666666] pt-1 border-t border-[#1a1a1a]">
                  Confidence: <span className="text-[#d4d4d4] font-bold">{corr.probability}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Trade & Risk Hypotheses */}
      {tradeAndHedgeHypotheses.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#1a1a1a]">
          <div className="text-xs font-mono font-bold uppercase text-[#888888] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#00ff41]" />
            <span>Tactical Trade & Hedge Hypotheses</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {tradeAndHedgeHypotheses.map((h, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-[#050505] border border-[#1a1a1a] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 font-mono text-[10px] text-[#888888] mb-1">
                    <span className="text-[#00ff41] font-bold">{h.timeframe}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        h.riskLevel === 'High'
                          ? 'bg-rose-950 text-rose-300'
                          : h.riskLevel === 'Moderate'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-[#121212] text-[#00ff41] border border-[#00ff41]/30'
                      }`}
                    >
                      {h.riskLevel} Risk
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-white font-sans leading-snug">
                    {h.title}
                  </h4>

                  <p className="text-xs text-[#a0a0a0] font-sans leading-relaxed mt-1">
                    {h.thesis}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1a1a1a] font-mono text-[10px]">
                  <span className="text-[#666666]">Target Assets: </span>
                  <span className="text-[#00ff41] font-semibold">{h.affectedAssets.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
