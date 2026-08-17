import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCircle,
  ExternalLink,
  Filter,
  Flame,
  Info,
  MapPin,
  MessageSquare,
  Navigation,
  Radio,
  Ship,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { AlertItem, AlertTier, UserLocation } from '../types.js';
import { getAudioMuted, playTacticalBlip, setAudioMuted } from '../utils/audio.js';
import { calculateDistanceKm } from '../utils/geoIntelligence.js';

interface NotificationCenterProps {
  alerts: AlertItem[];
  userLocation?: UserLocation;
  onSelectAlert?: (alert: AlertItem) => void;
  onOpenWhatsAppAlertModal?: () => void;
  onNavigateToDesk?: (deskId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  alerts = [],
  userLocation,
  onSelectAlert,
  onOpenWhatsAppAlertModal,
  onNavigateToDesk,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | AlertTier>('ALL');
  const [isMuted, setIsMuted] = useState<boolean>(getAudioMuted());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const alertItems = alerts || [];
  const activeAlerts = alertItems.filter((a) => !dismissedIds.has(a.id));
  const filteredAlerts = activeAlerts.filter(
    (a) => selectedFilter === 'ALL' || a.tier === selectedFilter
  );

  const flashCount = activeAlerts.filter((a) => a.tier === 'FLASH').length;
  const priorityCount = activeAlerts.filter((a) => a.tier === 'PRIORITY').length;

  const toggleMute = () => {
    const next = !isMuted;
    setAudioMuted(next);
    setIsMuted(next);
    if (!next) playTacticalBlip(1500);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="relative font-sans text-xs">
      {/* Top Banner / Ticker Strip */}
      <div className="bg-[#0c0c0c] border-b border-[#1a1a1a] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              playTacticalBlip(1200);
            }}
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#161616] border border-[#262626] hover:border-[#404040] text-white transition-colors shrink-0"
          >
            <Bell className={`w-3.5 h-3.5 ${flashCount > 0 ? 'text-rose-400 animate-bounce' : 'text-[#00ff41]'}`} />
            <span className="font-bold uppercase tracking-wider text-[11px]">CRITICAL ALERTS</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              flashCount > 0 ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-[#262626] text-[#00ff41]'
            }`}>
              {flashCount} Flash • {priorityCount} Priority
            </span>
          </button>

          {/* Flash Ticker Headline */}
          {activeAlerts.length > 0 && (
            <div className="hidden md:flex items-center gap-2 text-xs truncate text-[#d4d4d4]">
              <span className="text-[#00ff41] font-bold">⚡ LATEST:</span>
              <span className="truncate text-white font-sans">{activeAlerts[0].title}</span>
              <span className="text-[10px] text-[#888888] font-mono shrink-0">
                ({activeAlerts[0].timestamp})
              </span>
            </div>
          )}
        </div>

        {/* Quick Toggles */}
        <div className="flex items-center gap-2">
          {onOpenWhatsAppAlertModal && (
            <button
              type="button"
              onClick={onOpenWhatsAppAlertModal}
              className="px-2.5 py-1 rounded bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/30 font-bold flex items-center gap-1.5 transition-colors text-[11px]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Alerts</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleMute}
            className={`p-1.5 rounded border transition-colors ${
              isMuted
                ? 'bg-[#121212] border-[#262626] text-[#888888]'
                : 'bg-[#121212] border-[#00ff41]/50 text-[#00ff41]'
            }`}
            title={isMuted ? 'Unmute tactical chimes' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Notification Drawer */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-40 bg-[#0a0a0a] border-b border-[#262626] p-4 shadow-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white uppercase text-xs">
                Active Operational Alerts ({filteredAlerts.length})
              </span>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {(['ALL', 'FLASH', 'PRIORITY', 'ROUTINE'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedFilter(tier)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                    selectedFilter === tier
                      ? 'bg-[#1a1a1a] text-[#00ff41] font-bold border border-[#00ff41]/40'
                      : 'text-[#888888] hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-[#888888] hover:text-white ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono">
            {filteredAlerts.length === 0 ? (
              <div className="p-4 text-center text-[#666666]">
                No alerts match the selected filter.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isFlash = alert.tier === 'FLASH';
                const isPriority = alert.tier === 'PRIORITY';

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isFlash
                        ? 'bg-rose-950/30 border-rose-700/80 text-rose-100'
                        : isPriority
                        ? 'bg-amber-950/20 border-amber-700/60 text-amber-100'
                        : 'bg-[#121212] border-[#262626] text-[#d4d4d4]'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${
                            isFlash
                              ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              : isPriority
                              ? 'bg-amber-600 text-black'
                              : 'bg-[#262626] text-[#00ff41]'
                          }`}
                        >
                          {alert.tier}
                        </span>
                        <span className="text-[10px] text-[#888888] font-mono uppercase">
                          [{alert.domain.toUpperCase()}]
                        </span>
                        <span className="text-white font-sans font-medium text-xs">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#a3a3a3] font-sans">
                        {alert.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span className="text-[10px] text-[#666666]">{alert.timestamp}</span>

                      {onNavigateToDesk && (
                        <button
                          type="button"
                          onClick={() => {
                            playTacticalBlip(1300);
                            onNavigateToDesk(alert.domain);
                            setIsOpen(false);
                          }}
                          className="px-2 py-1 rounded bg-[#1a1a1a] hover:bg-[#262626] text-[#00ff41] text-[10px] font-bold flex items-center gap-1 border border-[#333333]"
                        >
                          <Navigation className="w-3 h-3" />
                          View Desk
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDismiss(alert.id, e)}
                        className="p-1 rounded text-[#888888] hover:text-white"
                        title="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
