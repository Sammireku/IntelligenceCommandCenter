import React, { useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  MessageSquare,
  Radio,
  Repeat2,
  Search,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { DisasterTweetItem } from '../types.js';

interface TwitterDisasterFeedProps {
  dispatches: DisasterTweetItem[];
  onSelectCoordinate?: (lat: number, lng: number, item: DisasterTweetItem) => void;
  liteMode?: boolean;
}

export const TwitterDisasterFeed: React.FC<TwitterDisasterFeedProps> = ({
  dispatches = [],
  onSelectCoordinate,
  liteMode = false,
}) => {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredDispatches = dispatches.filter((d) => {
    if (selectedType !== 'ALL' && d.disasterType !== selectedType) return false;
    if (selectedUrgency !== 'ALL' && d.urgency !== selectedUrgency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = d.text.toLowerCase().includes(q);
      const matchAuthor = d.authorName.toLowerCase().includes(q) || d.handle.toLowerCase().includes(q);
      const matchLoc = d.location.name.toLowerCase().includes(q) || d.location.country.toLowerCase().includes(q);
      if (!matchText && !matchAuthor && !matchLoc) return false;
    }
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDisasterIcon = (type: string) => {
    switch (type) {
      case 'Earthquake':
        return <Zap className="w-3.5 h-3.5 text-rose-400" />;
      case 'Wildfire':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'Cyclone / Storm':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Tsunami / Floods':
        return <Waves className="w-3.5 h-3.5 text-blue-400" />;
      case 'Volcano':
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    }
  };

  return (
    <div id="twitter-disaster-feed" className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 font-sans flex flex-col gap-3 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#111111] border border-[#262626] text-[#00d1ff]">
            <Radio className="w-4 h-4 text-[#00d1ff] animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              LIVE X/TWITTER DISASTER INTELLIGENCE
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/40">
                VERIFIED FEEDS
              </span>
            </h3>
            <p className="text-[11px] font-mono text-[#888888]">
              Continuous OSINT monitoring: USGS • NHC • Copernicus EMS • EMSC • RedCross • CalFire
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded text-[11px] transition-colors border flex items-center gap-1 ${
              soundEnabled
                ? 'bg-[#1a1a1a] border-[#00ff41]/50 text-[#00ff41]'
                : 'bg-[#0a0a0a] border-[#1f1f1f] text-[#666666]'
            }`}
            title="Toggle breaking audio chime"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'ALERT ON' : 'MUTED'}</span>
          </button>
          <div className="px-2 py-1 rounded bg-[#0f0f0f] border border-[#222222] text-[#d4d4d4] text-[11px]">
            {filteredDispatches.length} DISPATCHES
          </div>
        </div>
      </div>

      {/* Breaking Ticker Banner */}
      {dispatches.some((d) => d.urgency === 'CRITICAL BREAKING') && (
        <div className="p-2.5 rounded bg-rose-950/20 border border-rose-800/40 flex items-start gap-2 text-xs font-mono text-rose-200">
          <span className="px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 font-bold uppercase tracking-wider text-[10px] animate-pulse shrink-0">
            CRITICAL DISPATCH
          </span>
          <div className="truncate">
            <strong className="text-white">
              {dispatches.find((d) => d.urgency === 'CRITICAL BREAKING')?.authorName}:
            </strong>{' '}
            {dispatches.find((d) => d.urgency === 'CRITICAL BREAKING')?.text}
          </div>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs font-mono">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            id="disaster-feed-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search disasters, agencies, hashtags (#TaiwanQuake, Greece, Marapi)..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-[#0a0a0a] border border-[#222222] text-white placeholder-[#555555] text-xs focus:outline-none focus:border-[#00d1ff]"
          />
        </div>

        {/* Disaster Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'ALL', label: 'All Disasters' },
            { id: 'Earthquake', label: 'Quakes' },
            { id: 'Wildfire', label: 'Wildfires' },
            { id: 'Cyclone / Storm', label: 'Cyclones' },
            { id: 'Volcano', label: 'Volcanoes' },
            { id: 'Tsunami / Floods', label: 'Floods' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(type.id)}
              className={`px-2 py-1 rounded text-[11px] transition-colors border ${
                selectedType === type.id
                  ? 'bg-[#1a1a1a] text-[#00d1ff] border-[#00d1ff]/60 font-bold'
                  : 'bg-[#0a0a0a] text-[#888888] border-[#1a1a1a] hover:text-[#d4d4d4]'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Stream Cards */}
      <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
        {filteredDispatches.length === 0 ? (
          <div className="text-center py-8 text-[#666666] font-mono text-xs border border-dashed border-[#1a1a1a] rounded">
            No natural disaster dispatches match query criteria.
          </div>
        ) : (
          filteredDispatches.map((dispatch) => {
            const isCritical = dispatch.urgency === 'CRITICAL BREAKING';
            const isPriority = dispatch.urgency === 'PRIORITY SITREP';

            return (
              <div
                key={dispatch.id}
                id={`tweet-${dispatch.id}`}
                className={`p-3.5 rounded-lg border transition-colors ${
                  isCritical
                    ? 'bg-[#0e0708] border-rose-800/60 shadow-rose-950/20 shadow-md'
                    : isPriority
                    ? 'bg-[#0c0a06] border-amber-800/40'
                    : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#2a2a2a]'
                }`}
              >
                {/* Author Info & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Avatar Badge */}
                    <div className="w-7 h-7 rounded-full bg-[#181818] border border-[#333333] flex items-center justify-center font-mono font-bold text-[10px] text-white shrink-0">
                      {dispatch.avatarBadge}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white hover:underline cursor-pointer">
                          {dispatch.authorName}
                        </span>
                        {dispatch.verified && (
                          <span className="text-[#00d1ff] text-[11px]" title="Verified OSINT / Agency">
                            ✓
                          </span>
                        )}
                        <span className="text-[#666666] text-[11px] font-mono">{dispatch.handle}</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#888888] flex items-center gap-2">
                        <span className="px-1 rounded bg-[#161616] text-[#aaaaaa] border border-[#2a2a2a]">
                          {dispatch.badgeType}
                        </span>
                        <span>•</span>
                        <span>{dispatch.timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border flex items-center gap-1 ${
                        isCritical
                          ? 'bg-rose-950/80 text-rose-300 border-rose-700/80'
                          : isPriority
                          ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                          : 'bg-[#141414] text-[#888888] border-[#222222]'
                      }`}
                    >
                      {getDisasterIcon(dispatch.disasterType)}
                      {dispatch.urgency}
                    </span>
                  </div>
                </div>

                {/* Tweet Text Content */}
                <p className="text-xs text-[#e5e5e5] leading-relaxed mb-2.5 whitespace-pre-line">
                  {dispatch.text}
                </p>

                {/* Media Attachment / Radar Tag Snippet */}
                {dispatch.media && (
                  <div className="mb-2.5 p-2 rounded bg-[#050505] border border-[#1f1f1f] text-[11px] font-mono flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[#00d1ff]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{dispatch.media.tag}</span>
                    </div>
                    <span className="text-[#737373] text-[10px] truncate max-w-xs">{dispatch.media.caption}</span>
                  </div>
                )}

                {/* Footer: Location, Map Jump & Engagement Metrics */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1a1a1a] text-[11px] font-mono text-[#737373]">
                  <div className="flex items-center gap-3">
                    {/* Location Pin */}
                    <button
                      type="button"
                      onClick={() => onSelectCoordinate && onSelectCoordinate(dispatch.location.lat, dispatch.location.lng, dispatch)}
                      className="flex items-center gap-1 text-[#00d1ff] hover:text-white transition-colors"
                      title="Center location on interactive map / globe"
                    >
                      <Globe className="w-3 h-3" />
                      <span>
                        {dispatch.location.name} ({dispatch.location.lat.toFixed(2)}°, {dispatch.location.lng.toFixed(2)}°)
                      </span>
                    </button>
                  </div>

                  {/* Social stats & Share */}
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[#888888]">
                      <Repeat2 className="w-3 h-3 text-[#00ff41]" />
                      {dispatch.metrics.retweets.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-[#888888]">
                      <Heart className="w-3 h-3 text-rose-500" />
                      {dispatch.metrics.likes.toLocaleString()}
                    </span>
                    {dispatch.metrics.views && (
                      <span className="text-[#666666] hidden sm:inline">
                        👁 {dispatch.metrics.views}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(dispatch.id, dispatch.text)}
                      className="text-[#888888] hover:text-white px-1"
                      title="Copy dispatch text"
                    >
                      {copiedId === dispatch.id ? <span className="text-[#00ff41]">COPIED</span> : <Share2 className="w-3 h-3" />}
                    </button>
                    <a
                      href={dispatch.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00d1ff] hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
