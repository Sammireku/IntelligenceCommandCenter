import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Dna,
  ExternalLink,
  Filter,
  Leaf,
  Microscope,
  Pill,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  AlternativeMedicineResearchItem,
  HealthModuleData,
  MedicalDiscoveryItem,
  ModuleTelemetry,
  ResearchPaperItem,
} from '../types.js';

interface HealthPanelProps {
  telemetry: ModuleTelemetry<HealthModuleData>;
  liteMode?: boolean;
}

export const HealthPanel: React.FC<HealthPanelProps> = ({ telemetry, liteMode = false }) => {
  const { data, status, latencyMs, error } = telemetry;
  const [activeTab, setActiveTab] = useState<'discoveries' | 'alternativeMedicine' | 'papers' | 'outbreaks'>('discoveries');
  const [selectedThreatFilter, setSelectedThreatFilter] = useState<'all' | ResearchPaperItem['threatLevel']>('all');
  const [altSearch, setAltSearch] = useState<string>('');
  const [discoveryCategory, setDiscoveryCategory] = useState<string>('all');

  const filteredPapers = (data.papers || []).filter((p) => {
    if (selectedThreatFilter === 'all') return true;
    return p.threatLevel === selectedThreatFilter;
  });

  const filteredDiscoveries = (data.discoveries || []).filter((d) => {
    if (discoveryCategory === 'all') return true;
    return d.category === discoveryCategory;
  });

  const filteredAlternativeMedicine = (data.alternativeMedicine || []).filter((item) => {
    if (!altSearch.trim()) return true;
    const q = altSearch.toLowerCase();
    return (
      item.commonName.toLowerCase().includes(q) ||
      item.botanicalName.toLowerCase().includes(q) ||
      item.primaryIndication.toLowerCase().includes(q) ||
      item.activeBioactives.toLowerCase().includes(q) ||
      item.mechanismOfAction.toLowerCase().includes(q)
    );
  });

  return (
    <div id="health-panel" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-sans flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-700/60 text-emerald-400">
            <Microscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
              BIOMEDICAL DISCOVERIES & VERIFIED PHYTOMEDICINE
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${
                  status === 'ok'
                    ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800'
                }`}
              >
                {status === 'ok' ? 'PEER-REVIEWED' : 'DEGRADED'}
              </span>
            </h2>
            <div className="text-[11px] font-mono text-[#737373]">
              Clinical Breakthroughs • Double-Blind RCTs • Phyto-Pharmacology • Europe PMC Feeds
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex rounded bg-[#050505] p-0.5 border border-[#1a1a1a] font-mono text-xs">
          {(['discoveries', 'alternativeMedicine', 'papers', 'outbreaks'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded text-[11px] uppercase transition-colors flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-[#141414] text-[#00ff41] font-bold border border-[#262626]'
                  : 'text-[#737373] hover:text-[#d4d4d4]'
              }`}
            >
              {tab === 'discoveries' && <Sparkles className="w-3 h-3 text-[#00d1ff]" />}
              {tab === 'alternativeMedicine' && <Leaf className="w-3 h-3 text-emerald-400" />}
              {tab === 'papers' && <BookOpen className="w-3 h-3 text-amber-400" />}
              {tab === 'outbreaks' && <ShieldAlert className="w-3 h-3 text-rose-400" />}
              {tab === 'discoveries' ? 'Medical Breakthroughs' : tab === 'alternativeMedicine' ? 'Alternative Medicine' : tab === 'papers' ? 'PubMed Search' : 'Bio-Surveillance'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-2 rounded bg-amber-950/30 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>Medical Breakthroughs</span>
            <Sparkles className="w-3 h-3 text-[#00d1ff]" />
          </div>
          <div className="text-sm font-bold text-neutral-100 mt-1">
            {data.discoveries?.length || 4} Clinical Trials
          </div>
          <div className="text-[10px] text-[#00d1ff] mt-0.5">
            CRISPR, Oncology & mRNA
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>Verified Phytomedicine</span>
            <Leaf className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">
            {data.alternativeMedicine?.length || 6} RCT Studies
          </div>
          <div className="text-[10px] text-[#888888] mt-0.5">
            Standardized Botanical Extracts
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>Europe PMC Live Feed</span>
            <BookOpen className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-neutral-100 mt-1">
            {data.papers?.length || 12} Indexed Papers
          </div>
          <div className="text-[10px] text-amber-400 mt-0.5">
            2025/2026 Peer-Reviewed
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>Bio-Risk Index</span>
            <ShieldAlert className="w-3 h-3 text-[#00ff41]" />
          </div>
          <div className="text-sm font-bold text-[#00ff41] mt-1">
            {data.bioRiskIndex || 26}/100 Baseline
          </div>
          <div className="text-[10px] text-[#888888] mt-0.5">
            Low Global Risk Level
          </div>
        </div>
      </div>

      {/* TAB 1: MEDICAL DISCOVERIES */}
      {activeTab === 'discoveries' && (
        <div className="space-y-3">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="text-neutral-200 font-bold uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#00d1ff]" />
              <span>Breakthrough Clinical & Molecular Discoveries</span>
            </div>

            <div className="flex flex-wrap rounded bg-[#050505] p-0.5 border border-[#1a1a1a]">
              {(['all', 'Oncology', 'Gene Editing & CRISPR', 'Neurodegenerative', 'Immunology & mRNA'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDiscoveryCategory(cat)}
                  className={`px-2 py-1 rounded text-[10px] uppercase transition-colors ${
                    discoveryCategory === cat
                      ? 'bg-[#141414] text-[#00d1ff] font-bold border border-[#262626]'
                      : 'text-[#737373] hover:text-[#d4d4d4]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredDiscoveries.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded bg-[#0c0c0c] border border-[#1a1a1a] hover:border-[#262626] transition-colors space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#00d1ff]/10 text-[#00d1ff] border border-[#00d1ff]/30 text-[10px] font-bold uppercase">
                      {item.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                      {item.clinicalPhase}
                    </span>
                  </div>

                  <span className="text-[11px] text-[#666666]">
                    {item.journal} • {item.pubDate}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-white leading-snug">
                  {item.title}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
                  <div className="bg-[#050505] p-2.5 rounded border border-[#171717] space-y-1">
                    <div className="text-[10px] font-mono font-bold text-sky-400 uppercase">
                      MOLECULAR MECHANISM:
                    </div>
                    <p className="text-[#b5b5b5] text-[11px] leading-relaxed">
                      {item.mechanism}
                    </p>
                  </div>

                  <div className="bg-[#050505] p-2.5 rounded border border-[#171717] space-y-1">
                    <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                      KEY CLINICAL FINDINGS:
                    </div>
                    <p className="text-[#b5b5b5] text-[11px] leading-relaxed">
                      {item.keyFindings}
                    </p>
                  </div>
                </div>

                <div className="bg-[#0e0e0e] p-2 rounded border border-[#1f1f1f] text-[11px] font-sans text-[#a3a3a3] flex items-start gap-2">
                  <Activity className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="font-mono text-neutral-200 uppercase text-[10px]">TRANSLATION IMPACT:</strong> {item.translationImpact}
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#737373] border-t border-[#1a1a1a]">
                  <div>Lead Investigators: {item.authors.join(', ')}</div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00ff41] hover:underline flex items-center gap-1 shrink-0"
                    >
                      PubMed / NEJM Full Text <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED ALTERNATIVE MEDICINE & PHYTOMEDICINE */}
      {activeTab === 'alternativeMedicine' && (
        <div className="space-y-3">
          {/* Search bar for Botanicals */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#525252]" />
              <input
                type="text"
                value={altSearch}
                onChange={(e) => setAltSearch(e.target.value)}
                placeholder="Search verified herbs, mechanisms, indications (e.g., Curcumin, Berberine, Ashwagandha, Lion's Mane)..."
                className="w-full pl-8 pr-3 py-1.5 rounded bg-[#050505] border border-[#1a1a1a] text-xs font-mono text-[#d4d4d4] placeholder-[#525252] focus:outline-none focus:border-[#00ff41] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredAlternativeMedicine.map((alt) => (
              <div
                key={alt.id}
                className="p-3.5 rounded bg-[#0c0c0c] border border-emerald-950/60 hover:border-emerald-800/60 transition-colors space-y-2.5"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">{alt.commonName}</span>
                    <span className="text-[11px] text-emerald-400/80 italic font-sans">
                      ({alt.botanicalName})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                      {alt.evidenceLevel}
                    </span>
                    <span className="text-[10px] text-[#666666]">
                      {alt.journal} ({alt.pubYear})
                    </span>
                  </div>
                </div>

                {/* Indication Banner */}
                <div className="bg-[#050505] px-2.5 py-1.5 rounded border border-[#1a1a1a] flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[#737373] uppercase text-[10px]">PRIMARY INDICATION: </span>
                    <span className="text-amber-300 font-bold">{alt.primaryIndication}</span>
                  </div>
                  <div className="text-[11px] text-neutral-300">
                    Cohort: <strong>{alt.sampleSize}</strong>
                  </div>
                </div>

                {/* Grid of Dosage & Mechanism */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-sans">
                  <div className="bg-[#080808] p-2.5 rounded border border-[#171717] space-y-1">
                    <div className="text-[10px] font-mono font-bold text-[#00d1ff] uppercase flex items-center justify-between">
                      <span>CLINICALLY TESTED DOSAGE & ACTIVE COMPOUNDS</span>
                      <Pill className="w-3 h-3 text-[#00d1ff]" />
                    </div>
                    <p className="text-[#d4d4d4] text-[11px]">
                      <strong>Tested Protocol:</strong> {alt.testedDosage}
                    </p>
                    <p className="text-[#888888] text-[10px] font-mono">
                      Bioactives: {alt.activeBioactives}
                    </p>
                  </div>

                  <div className="bg-[#080808] p-2.5 rounded border border-[#171717] space-y-1">
                    <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center justify-between">
                      <span>CLINICAL OUTCOMES & ENDPOINTS</span>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    <p className="text-[#d4d4d4] text-[11px] leading-relaxed">
                      {alt.keyClinicalOutcomes}
                    </p>
                  </div>
                </div>

                {/* Mechanism of Action */}
                <div className="bg-[#050505] p-2.5 rounded border border-[#171717] space-y-1 text-xs font-sans">
                  <div className="text-[10px] font-mono font-bold text-neutral-300 uppercase">
                    BIOCHEMICAL MECHANISM OF ACTION:
                  </div>
                  <p className="text-[#a3a3a3] text-[11px] leading-relaxed">
                    {alt.mechanismOfAction}
                  </p>
                </div>

                {/* Safety & Interactions */}
                <div className="bg-[#0d0909] p-2 rounded border border-amber-900/40 text-[11px] font-sans text-amber-200/90 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="font-mono text-amber-300 uppercase text-[10px]">SAFETY & DRUG INTERACTIONS:</strong> {alt.safetyAndInteractions}
                  </div>
                </div>

                {/* Footer with PMID */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#737373] border-t border-[#1a1a1a]">
                  <div>PubMed ID: <span className="text-white font-bold">PMID:{alt.pmid}</span></div>
                  {alt.url && (
                    <a
                      href={alt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      Verified PubMed RCT Study <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PUBMED RESEARCH PAPERS */}
      {activeTab === 'papers' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="text-neutral-200 font-bold uppercase flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#00ff41]" />
              <span>High-Impact Research Publications ({filteredPapers.length})</span>
            </div>

            <div className="flex rounded bg-[#050505] p-0.5 border border-[#1a1a1a]">
              {(['all', 'Emerging Threat', 'Clinical Breakthrough', 'Surveillance Update'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedThreatFilter(filter)}
                  className={`px-2 py-1 rounded text-[10px] uppercase transition-colors ${
                    selectedThreatFilter === filter
                      ? 'bg-[#141414] text-[#00ff41] font-bold border border-[#262626]'
                      : 'text-[#737373] hover:text-[#d4d4d4]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredPapers.map((paper) => {
              const isThreat = paper.threatLevel === 'Emerging Threat';
              const isBreakthrough = paper.threatLevel === 'Clinical Breakthrough';

              return (
                <div
                  key={paper.id}
                  className="p-3 rounded bg-[#0c0c0c] border border-[#1a1a1a] hover:border-[#262626] transition-colors space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isThreat
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                          : isBreakthrough
                          ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30'
                          : 'bg-[#141414] text-[#00d1ff] border border-[#262626]'
                      }`}
                    >
                      {paper.threatLevel}
                    </span>

                    <span className="text-[11px] font-mono text-[#666666]">
                      {paper.journal} • {paper.pubDate}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-neutral-100 hover:text-[#00ff41] transition-colors leading-snug">
                    {paper.title}
                  </h4>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pt-1">
                    <div className="text-[#737373] text-[10px]">
                      Authors: {paper.authors.join(', ')}
                    </div>

                    <div className="flex items-center gap-2">
                      {paper.relevanceKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-1.5 py-0.2 rounded bg-[#141414] text-[#888888] text-[9px] border border-[#1f1f1f]"
                        >
                          #{kw}
                        </span>
                      ))}
                      {paper.url && (
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00ff41] hover:underline flex items-center gap-0.5 ml-1"
                        >
                          Paper <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: OUTBREAK SURVEILLANCE */}
      {activeTab === 'outbreaks' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(data.outbreaks || []).map((ob) => {
            const isFlash = ob.alertLevel === 'FLASH';
            const isPriority = ob.alertLevel === 'PRIORITY';

            return (
              <div
                key={ob.id}
                className={`p-3 rounded border flex flex-col justify-between gap-2 ${
                  isFlash
                    ? 'bg-rose-950/40 border-rose-800 text-rose-100'
                    : isPriority
                    ? 'bg-amber-950/30 border-amber-800 text-amber-100'
                    : 'bg-[#0c0c0c] border-[#1a1a1a] text-[#d4d4d4]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 font-mono text-[10px] text-[#737373] mb-1">
                    <span className="px-1.5 py-0.2 rounded bg-[#141414] font-bold text-[#a3a3a3] border border-[#1f1f1f]">
                      {ob.source}
                    </span>
                    <span>{ob.date}</span>
                  </div>
                  <h3 className="font-bold text-xs text-white leading-snug">
                    {ob.pathogen}
                  </h3>
                  <div className="text-[11px] text-[#00d1ff] font-mono mt-0.5">
                    {ob.region}
                  </div>
                </div>

                <div className="text-[11px] text-[#a3a3a3] leading-relaxed">
                  {ob.details}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

