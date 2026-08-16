import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  Flame,
  Globe,
  Radio,
  Search,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AlertItem, AlertTier, SweepDelta } from '../types.js';

interface DeltaSidebarProps {
  delta: SweepDelta | null;
  alerts: AlertItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  liteMode?: boolean;
}

export const DeltaSidebar: React.FC<DeltaSidebarProps> = ({
  delta,
  alerts,
  collapsed,
  onToggleCollapse,
  liteMode = false,
}) => {
  const [selectedTier, setSelectedTier] = useState<'ALL' | AlertTier>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedTier !== 'ALL' && alert.tier !== selectedTier) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alert.title.toLowerCase().includes(q) ||
        alert.summary.toLowerCase().includes(q) ||
        alert.domain.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getDomainIcon = (domain: AlertItem['domain']) => {
    switch (domain) {
      case 'geospatial':
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case 'markets':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
      case 'health':
        return <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />;
      case 'infrastructure':
        return <Radio className="w-3.5 h-3.5 text-amber-400" />;
      case 'synthesis':
      default:
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  if (collapsed) {
    return (
      <aside
        id="delta-sidebar-collapsed"
        className="w-12 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col items-center py-4 gap-4 select-none shrink-0"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded bg-[#121212] hover:bg-[#1a1a1a] text-[#00ff41] border border-[#262626]"
          title="Expand Sweep Delta Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="writing-mode-vertical text-[10px] font-mono tracking-widest text-[#737373] uppercase flex items-center gap-2">
          <span>DELTA STREAM</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#121212] text-[#00ff41] font-bold border border-[#262626]">
            {alerts.length}
          </span>
        </div>

        {delta && delta.flashCount > 0 && (
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" title="Active FLASH alerts"></div>
        )}
      </aside>
    );
  }

  return (
    <aside
      id="delta-sidebar-expanded"
      className="w-80 md:w-96 bg-[#0a0a0a]/95 border-r border-[#1a1a1a] flex flex-col h-full select-none shrink-0"
    >
      {/* Sidebar Header */}
      <div className="p-3 border-b border-[#1a1a1a] bg-[#080808]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse"></span>
            <h2 className="text-xs font-mono font-bold tracking-wider text-[#00ff41] uppercase">
              SWEEP DELTA & ALERTS
            </h2>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#161616] transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Delta Metrics Summary Bar */}
        {delta && (
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] mb-2">
            <div
              onClick={() => setSelectedTier(selectedTier === 'FLASH' ? 'ALL' : 'FLASH')}
              className={`p-1.5 rounded border cursor-pointer transition-colors text-center ${
                selectedTier === 'FLASH'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                  : 'bg-[#121212] border-[#1f1f1f] text-[#d4d4d4] hover:border-rose-800'
              }`}
            >
              <div className="text-rose-400 font-bold text-sm">{delta.flashCount}</div>
              <div className="text-[10px] text-[#888888]">FLASH</div>
            </div>

            <div
              onClick={() => setSelectedTier(selectedTier === 'PRIORITY' ? 'ALL' : 'PRIORITY')}
              className={`p-1.5 rounded border cursor-pointer transition-colors text-center ${
                selectedTier === 'PRIORITY'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : 'bg-[#121212] border-[#1f1f1f] text-[#d4d4d4] hover:border-amber-800'
              }`}
            >
              <div className="text-amber-400 font-bold text-sm">{delta.priorityCount}</div>
              <div className="text-[10px] text-[#888888]">PRIORITY</div>
            </div>

            <div
              onClick={() => setSelectedTier(selectedTier === 'ROUTINE' ? 'ALL' : 'ROUTINE')}
              className={`p-1.5 rounded border cursor-pointer transition-colors text-center ${
                selectedTier === 'ROUTINE'
                  ? 'bg-[#1a1a1a] border-[#00ff41]/60 text-[#00ff41]'
                  : 'bg-[#121212] border-[#1f1f1f] text-[#d4d4d4] hover:border-[#333333]'
              }`}
            >
              <div className="text-[#00ff41] font-bold text-sm">{delta.routineCount}</div>
              <div className="text-[10px] text-[#888888]">ROUTINE</div>
            </div>
          </div>
        )}

        {/* Delta Change Items Log */}
        {delta && delta.changes.length > 0 && (
          <div className="bg-[#050505] border border-[#1a1a1a] rounded p-2 text-[10px] font-mono max-h-24 overflow-y-auto mb-2 space-y-1">
            <div className="text-[#888888] uppercase tracking-widest text-[9px] font-bold">
              Delta State Transitions ({delta.changes.length})
            </div>
            {delta.changes.map((ch, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[#d4d4d4]">
                <span
                  className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                    ch.severity === 'FLASH'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : ch.severity === 'PRIORITY'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-[#1a1a1a] text-[#888888]'
                  }`}
                >
                  {ch.type.toUpperCase()}
                </span>
                <span className="truncate">{ch.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#666666]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anomalies (e.g. BTC, CISA, M5.2)..."
            className="w-full pl-8 pr-3 py-1.5 rounded bg-[#050505] border border-[#262626] text-xs font-mono text-[#d4d4d4] placeholder-[#555555] focus:outline-none focus:border-[#00ff41] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-[#666666] hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Alerts Feed List */}
      <div id="delta-alerts-list" className="flex-1 overflow-y-auto p-2 space-y-2 font-mono">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#666666]">
            No alerts matching active filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isExpanded = expandedAlertId === alert.id;
            const isFlash = alert.tier === 'FLASH';
            const isPriority = alert.tier === 'PRIORITY';

            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                className={`p-2.5 rounded border transition-all cursor-pointer ${
                  isFlash
                    ? 'bg-rose-950/30 border-rose-700/60 hover:border-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                    : isPriority
                    ? 'bg-amber-950/20 border-amber-700/50 hover:border-amber-400'
                    : 'bg-[#121212] border-[#1f1f1f] hover:border-[#2f2f2f]'
                }`}
              >
                {/* Header line */}
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    {getDomainIcon(alert.domain)}
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isFlash
                          ? 'bg-rose-900 text-rose-200'
                          : isPriority
                          ? 'bg-amber-900 text-amber-200'
                          : 'bg-[#1a1a1a] text-[#a0a0a0]'
                      }`}
                    >
                      {alert.tier}
                    </span>
                    <span className="text-[10px] text-[#888888] uppercase">
                      {alert.domain}
                    </span>
                  </div>

                  <span className="text-[9px] text-[#666666]">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title */}
                <h3 className={`text-xs font-medium font-sans mb-1 leading-snug ${
                  isFlash ? 'text-rose-100 font-semibold' : isPriority ? 'text-amber-100' : 'text-[#f0f0f0]'
                }`}>
                  {alert.title.replace(/^[🔴🟡🔵]\s[A-Z]+:\s/, '')}
                </h3>

                {/* Summary Snippet */}
                <p className="text-[11px] text-[#a0a0a0] line-clamp-2 leading-relaxed font-sans">
                  {alert.summary}
                </p>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#1f1f1f] space-y-1.5 text-[10px]">
                    {alert.metrics && (
                      <div className="grid grid-cols-2 gap-1 bg-[#080808] border border-[#1a1a1a] p-1.5 rounded">
                        {Object.entries(alert.metrics).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-[#737373]">{k}: </span>
                            <span className="text-[#00d1ff] font-semibold">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[#888888] pt-1">
                      <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
                      {alert.sourceUrl && (
                        <a
                          href={alert.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#00ff41] hover:underline flex items-center gap-1"
                        >
                          Source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
