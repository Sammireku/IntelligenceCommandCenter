import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  DollarSign,
  Layers,
  LineChart,
  Percent,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { MarketsModuleData, MarketTickerItem, ModuleTelemetry } from '../types.js';

interface MarketsPanelProps {
  telemetry: ModuleTelemetry<MarketsModuleData>;
  liteMode?: boolean;
}

export const MarketsPanel: React.FC<MarketsPanelProps> = ({ telemetry, liteMode = false }) => {
  const { data, status, latencyMs, error } = telemetry;
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'crypto' | 'index' | 'commodity' | 'yield'>('all');

  const filteredTickers = data.tickers.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const renderSparkline = (points?: number[], isPositive = true) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const width = 80;
    const height = 24;

    const pathData = points
      .map((p, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const strokeColor = isPositive ? '#00ff41' : '#ff3366';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div id="markets-panel" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-sans flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
              MARKETS & MACRO TELEMETRY
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${
                  status === 'ok'
                    ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800'
                }`}
              >
                {status === 'ok' ? 'LIVE' : 'DEGRADED'}
              </span>
            </h2>
            <div className="text-[11px] font-mono text-[#737373]">
              CoinGecko API • Yahoo Finance Public • FRED Macro Indicators
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex rounded bg-[#050505] p-0.5 border border-[#1a1a1a] font-mono text-xs">
          {(['all', 'crypto', 'index', 'commodity', 'yield'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-[11px] uppercase transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#141414] text-[#00ff41] font-bold border border-[#262626]'
                  : 'text-[#737373] hover:text-[#d4d4d4]'
              }`}
            >
              {cat}
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

      {/* Macro Regime Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[#666666] text-[10px] uppercase">Dominant Macro Regime</div>
            <div className="text-base font-bold text-neutral-100 mt-0.5">
              {data.marketStatus.dominantTrend}
            </div>
          </div>
          <div className="px-2 py-1 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] text-[11px] font-bold">
            LIQUIDITY EXPANSION
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[#666666] text-[10px] uppercase">10Y-2Y Yield Curve Spread</div>
            <div className="text-base font-bold text-[#00d1ff] mt-0.5">
              +{data.marketStatus.spread10Y2Y}%
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-[#141414] border border-[#262626] text-[#a3a3a3]">
            {data.marketStatus.yieldCurveInversion ? 'INVERTED' : 'NORMALIZED'}
          </span>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[#666666] text-[10px] uppercase">24H Crypto Volume</div>
            <div className="text-base font-bold text-neutral-100 mt-0.5">
              {data.marketStatus.crypto24hVol}
            </div>
          </div>
          <span className="text-[10px] text-[#737373]">VIX Proxy: {data.marketStatus.volatilityIndex}</span>
        </div>
      </div>

      {/* Tickers Grid with Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredTickers.map((ticker) => {
          const isPositive = ticker.change24h >= 0;

          return (
            <div
              key={ticker.symbol}
              id={`ticker-card-${ticker.symbol}`}
              className="p-3 rounded bg-[#0c0c0c] border border-[#1a1a1a] hover:border-[#262626] transition-colors flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-sm text-neutral-100">{ticker.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#141414] text-[#888888] uppercase border border-[#1f1f1f]">
                      {ticker.category}
                    </span>
                  </div>
                  <div className="text-xs text-[#888888] font-sans mt-0.5">{ticker.name}</div>
                </div>

                <div
                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded font-mono text-xs font-bold ${
                    isPositive
                      ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                  }`}
                >
                  {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{isPositive ? '+' : ''}{ticker.change24h}%</span>
                </div>
              </div>

              <div className="flex items-end justify-between font-mono mt-1">
                <div>
                  <div className="text-lg font-bold text-white tracking-tight">
                    {ticker.category === 'yield' ? `${ticker.price}%` : `$${ticker.price.toLocaleString()}`}
                  </div>
                  {ticker.unit && <div className="text-[10px] text-[#666666]">{ticker.unit}</div>}
                </div>

                {renderSparkline(ticker.sparkline, isPositive)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Macro Indicators Table */}
      <div className="pt-2 border-t border-[#1a1a1a]">
        <div className="text-xs font-mono font-bold uppercase text-[#888888] mb-2 flex items-center justify-between">
          <span>FRED & Global Macro Indicators</span>
          <span className="text-[11px] text-[#666666]">Scheduled Updates</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-xs">
          {data.macro.map((m) => (
            <div key={m.code} className="p-2.5 rounded bg-[#0c0c0c] border border-[#1a1a1a] space-y-1">
              <div className="flex items-center justify-between text-[#888888] text-[11px]">
                <span className="font-medium text-[#d4d4d4]">{m.name}</span>
                <span className="text-[10px] text-[#00d1ff]">{m.code}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-white">{m.value}</span>
                <span className="text-[10px] text-[#666666]">Prev: {m.previous}</span>
              </div>
              <div className="text-[10px] text-[#737373] font-sans line-clamp-1">
                {m.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
