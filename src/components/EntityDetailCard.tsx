import React from 'react';
import {
  Activity,
  AlertOctagon,
  Anchor,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  MessageSquare,
  Navigation,
  Plane,
  Radio,
  Send,
  Share2,
  Shield,
  Ship,
  Sparkles,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { UserLocation } from '../types.js';
import { calculateDistanceKm, generateWhatsAppAlertUrl } from '../utils/geoIntelligence.js';
import { playTacticalBlip } from '../utils/audio.js';

export interface SelectedEntityData {
  type: 'vessel' | 'flight' | 'earthquake' | 'disaster' | 'wildfire' | 'chokepoint' | 'storm' | 'jamming' | 'strike';
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  severity?: 'FLASH' | 'PRIORITY' | 'ROUTINE' | 'CRITICAL' | 'HIGH' | 'MODERATE';
  attributes: { label: string; value: string | number; color?: string }[];
  description?: string;
  sourceUrl?: string;
  deskId: 'geospatial' | 'infrastructure' | 'disasters' | 'maritime' | 'airtraffic' | 'weather';
  deskLabel: string;
  rawItem?: any;
}

interface EntityDetailCardProps {
  entity: SelectedEntityData | null;
  onClose: () => void;
  userLocation?: UserLocation;
  onNavigateToDesk: (deskId: string) => void;
  onOpenWhatsAppModal: () => void;
}

export const EntityDetailCard: React.FC<EntityDetailCardProps> = ({
  entity,
  onClose,
  userLocation,
  onNavigateToDesk,
  onOpenWhatsAppModal,
}) => {
  if (!entity) return null;

  const distanceToUser = userLocation
    ? calculateDistanceKm(userLocation.lat, userLocation.lng, entity.lat, entity.lng)
    : null;

  const handleWhatsAppDispatch = () => {
    playTacticalBlip(1500);
    const url = generateWhatsAppAlertUrl(
      {
        name: entity.title,
        category: entity.type,
        lat: entity.lat,
        lng: entity.lng,
        severity: entity.severity,
        details: entity.description,
      },
      userLocation
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleArchiveLink = () => {
    playTacticalBlip(1300);
    const targetUrl = entity.sourceUrl || `https://crucix-node.network/map?lat=${entity.lat}&lng=${entity.lng}`;
    window.open(`https://web.archive.org/save/${encodeURIComponent(targetUrl)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm font-sans animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Strip */}
        <div className="p-4 bg-[#121212] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#333333] text-[#00ff41]">
              {entity.type === 'vessel' && <Ship className="w-5 h-5" />}
              {entity.type === 'flight' && <Plane className="w-5 h-5" />}
              {entity.type === 'earthquake' && <Activity className="w-5 h-5 text-rose-400" />}
              {entity.type === 'disaster' && <Sparkles className="w-5 h-5 text-[#00d1ff]" />}
              {entity.type === 'wildfire' && <Flame className="w-5 h-5 text-orange-400" />}
              {entity.type === 'chokepoint' && <Waves className="w-5 h-5 text-[#00d1ff]" />}
              {entity.type === 'storm' && <Wind className="w-5 h-5 text-cyan-400" />}
              {entity.type === 'jamming' && <Radio className="w-5 h-5 text-amber-400" />}
              {entity.type === 'strike' && <AlertOctagon className="w-5 h-5 text-rose-500" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#1a1a1a] text-[#888888] border border-[#262626]">
                  {entity.type.toUpperCase()} TELEMETRY
                </span>
                {entity.severity && (
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-bold border ${
                      entity.severity === 'FLASH' || entity.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                        : entity.severity === 'PRIORITY' || entity.severity === 'HIGH'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-[#1a1a1a] text-[#00ff41] border-[#00ff41]/40'
                    }`}
                  >
                    {entity.severity}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold font-mono text-white mt-0.5 leading-snug">
                {entity.title}
              </h2>
              <div className="text-xs text-[#888888] font-mono">{entity.subtitle}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Coordinates & Proximity strip */}
          <div className="p-3 rounded-lg bg-[#050505] border border-[#1a1a1a] flex items-center justify-between font-mono">
            <div className="space-y-0.5">
              <div className="text-[10px] text-[#888888] uppercase">Geographic Coordinates</div>
              <div className="text-white font-bold text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00ff41]" />
                {entity.lat.toFixed(4)}° N, {entity.lng.toFixed(4)}° E
              </div>
            </div>

            {distanceToUser !== null && (
              <div className="text-right">
                <div className="text-[10px] text-[#888888] uppercase">Distance to Focal Point</div>
                <div className="text-[#00ff41] font-bold text-xs">
                  {distanceToUser} km ({Math.round(distanceToUser * 0.539957)} NM)
                </div>
              </div>
            )}
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono">
            {entity.attributes.map((attr, idx) => (
              <div key={idx} className="p-2.5 rounded bg-[#121212] border border-[#262626]">
                <div className="text-[10px] text-[#888888] uppercase">{attr.label}</div>
                <div className={`text-xs font-bold mt-1 ${attr.color || 'text-white'}`}>
                  {attr.value}
                </div>
              </div>
            ))}
          </div>

          {/* Description / Sitrep */}
          {entity.description && (
            <div className="p-3 rounded-lg bg-[#050505] border border-[#1a1a1a] space-y-1">
              <div className="text-[10px] font-mono text-[#888888] uppercase font-bold">
                Sitrep & Tactical Context:
              </div>
              <p className="text-xs text-[#d4d4d4] leading-relaxed font-sans">
                {entity.description}
              </p>
            </div>
          )}

          {/* Verification Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
            <button
              type="button"
              onClick={handleWhatsAppDispatch}
              className="flex-1 px-3 py-2 rounded-lg bg-[#25D366]/20 border border-[#25D366]/60 text-[#25D366] hover:bg-[#25D366]/30 font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Dispatch via WhatsApp
            </button>

            <button
              type="button"
              onClick={handleArchiveLink}
              className="px-3 py-2 rounded-lg bg-[#121212] border border-[#262626] text-[#888888] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Archive to Wayback
            </button>

            {entity.sourceUrl && (
              <a
                href={entity.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-[#121212] border border-[#262626] text-[#00ff41] hover:bg-[#1a1a1a] flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Raw Source ↗
              </a>
            )}
          </div>
        </div>

        {/* Modal Footer with Direct Link to Specific Info Desk */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#888888] hover:text-white font-mono text-xs transition-colors"
          >
            Close Inspector
          </button>

          <button
            type="button"
            onClick={() => {
              playTacticalBlip(1400);
              onNavigateToDesk(entity.deskId);
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-[#00ff41] hover:bg-[#00e63a] text-black font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#00ff41]/20 transition-all"
          >
            <Navigation className="w-4 h-4" />
            Open in {entity.deskLabel} Desk →
          </button>
        </div>
      </div>
    </div>
  );
};
