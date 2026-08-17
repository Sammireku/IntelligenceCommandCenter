import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Anchor,
  Compass,
  ExternalLink,
  Eye,
  Globe,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Radio,
  Search,
  Shield,
  Ship,
  X,
  Zap,
} from 'lucide-react';
import { AssetWatchlistItem } from '../types.js';
import { ASSET_WATCHLIST } from '../utils/geoIntelligence.js';
import { playTacticalBlip } from '../utils/audio.js';

interface AssetWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCoordinate?: (lat: number, lng: number) => void;
}

export const AssetWatchlistModal: React.FC<AssetWatchlistModalProps> = ({
  isOpen,
  onClose,
  onSelectCoordinate,
}) => {
  const [watchlist, setWatchlist] = useState<AssetWatchlistItem[]>(ASSET_WATCHLIST);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredAssets = watchlist.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.callsignOrImo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'ALL' || asset.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#121212] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                HIGH-VALUE ASSET WATCHLIST MATRIX
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121212] text-[#00ff41] border border-[#00ff41]/40">
                  {watchlist.length} MONITORED
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                Continuous transponder & satellite tracking of government VIP planes, carrier strike groups, and dark tankers
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

        {/* Filter bar */}
        <div className="p-4 bg-[#050505] border-b border-[#1a1a1a] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search callsign, vessel name, operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121212] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-[#00ff41]"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {['ALL', 'VIP Government Aircraft', 'Carrier Strike Group', 'Strategic Transport'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase border transition-colors ${
                  selectedType === t
                    ? 'bg-[#1a1a1a] text-[#00ff41] border-[#00ff41]'
                    : 'bg-[#121212] text-[#888888] border-[#262626] hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t.replace('Carrier Strike Group', 'CSG').replace('VIP Government Aircraft', 'VIP Air')}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Cards List */}
        <div className="p-4 overflow-y-auto space-y-2.5 max-h-[55vh] font-mono text-xs">
          {filteredAssets.map((asset) => {
            const isDark = asset.status === 'Dark / Intermittent';

            return (
              <div
                key={asset.id}
                className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isDark
                    ? 'bg-rose-950/20 border-rose-700/60'
                    : 'bg-[#121212] border-[#262626]'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#00ff41] font-bold text-sm">
                      {asset.name}
                    </span>
                    <span className="text-[#888888] text-[11px]">
                      ({asset.callsignOrImo})
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isDark
                          ? 'bg-rose-900 text-rose-200 animate-pulse'
                          : 'bg-[#1a1a1a] text-[#00ff41] border border-[#00ff41]/40'
                      }`}
                    >
                      {asset.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#a3a3a3]">
                    Operator: <strong className="text-white">{asset.operator}</strong> • Type: <span className="text-[#00d1ff]">{asset.type}</span>
                  </div>

                  <p className="text-[11px] font-sans text-[#737373]">
                    {asset.notes}
                  </p>

                  <div className="text-[10px] text-[#888888]">
                    Last Ping: {asset.lastSeen} • Coord: ({asset.lat.toFixed(2)}°, {asset.lng.toFixed(2)}°)
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {onSelectCoordinate && (
                    <button
                      type="button"
                      onClick={() => {
                        playTacticalBlip(1500);
                        onSelectCoordinate(asset.lat, asset.lng);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded bg-[#00ff41] hover:bg-[#00e63a] text-black font-bold flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Target on Map
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between font-mono text-xs">
          <div className="text-[#888888]">
            Alert Trigger: <span className="text-[#00ff41]">Instant notification if transponder drops or enters exclusion zones</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#888888] hover:text-white transition-colors"
          >
            Close Watchlist
          </button>
        </div>
      </div>
    </div>
  );
};
