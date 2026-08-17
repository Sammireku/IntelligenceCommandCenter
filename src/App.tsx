import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertOctagon,
  BrainCircuit,
  Globe,
  Radio,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Header } from './components/Header.js';
import { DeltaSidebar } from './components/DeltaSidebar.js';
import { WorldMapProjection } from './components/WorldMapProjection.js';
import { AiSummary12Hour } from './components/AiSummary12Hour.js';
import { NotificationCenter } from './components/NotificationCenter.js';
import { GeospatialPanel } from './components/GeospatialPanel.js';
import { MarketsPanel } from './components/MarketsPanel.js';
import { HealthPanel } from './components/HealthPanel.js';
import { InfrastructurePanel } from './components/InfrastructurePanel.js';
import { SynthesisPanel } from './components/SynthesisPanel.js';
import { HistoryModal } from './components/HistoryModal.js';
import { WhatsAppAlertModal } from './components/WhatsAppAlertModal.js';
import { WebSdrRadioModal } from './components/WebSdrRadioModal.js';
import { AssetWatchlistModal } from './components/AssetWatchlistModal.js';
import { MetadataSandboxModal } from './components/MetadataSandboxModal.js';
import { SweepPayload, UserLocation, WhatsAppAlertConfig } from './types.js';
import { playFlashAlertChime, playSweepCompleteChime, playTacticalBlip } from './utils/audio.js';

export function App() {
  const [sweep, setSweep] = useState<SweepPayload | null>(null);
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [nextSweepTimestamp, setNextSweepTimestamp] = useState<number>(Date.now() + 15 * 60 * 1000);
  const [sweepIntervalMinutes, setSweepIntervalMinutes] = useState<number>(15);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [webSdrModalOpen, setWebSdrModalOpen] = useState<boolean>(false);
  const [watchlistModalOpen, setWatchlistModalOpen] = useState<boolean>(false);
  const [sandboxModalOpen, setSandboxModalOpen] = useState<boolean>(false);

  // User Focal Location for Proximity Intelligence & Alerting
  const [userLocation, setUserLocation] = useState<UserLocation>(() => {
    const saved = localStorage.getItem('crucix_user_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      lat: 35.6762,
      lng: 139.6503,
      name: 'Tokyo, Japan (Default Node)',
      isLiveGps: false,
    };
  });

  // WhatsApp Alert Configuration
  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppAlertConfig>(() => {
    const saved = localStorage.getItem('crucix_whatsapp_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      enabled: false,
      phoneNumber: '',
      radiusKm: 500,
      criticalOnly: true,
      minQuakeMag: 5.0,
    };
  });

  const [liteMode, setLiteMode] = useState<boolean>(() => {
    return localStorage.getItem('crucix_lite_mode') === 'true';
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Save location & whatsapp config to localStorage
  const handleUpdateUserLocation = (loc: UserLocation) => {
    setUserLocation(loc);
    localStorage.setItem('crucix_user_location', JSON.stringify(loc));
  };

  const handleUpdateWhatsAppConfig = (cfg: WhatsAppAlertConfig) => {
    setWhatsAppConfig(cfg);
    localStorage.setItem('crucix_whatsapp_config', JSON.stringify(cfg));
  };

  // Navigate directly to an info desk
  const handleNavigateToDesk = (deskId: string) => {
    playTacticalBlip(1400);
    const element =
      document.getElementById(`${deskId}-panel`) ||
      document.getElementById('geospatial-panel') ||
      document.getElementById('infrastructure-panel');

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Initialize SSE Connection & Fallback fetch
  useEffect(() => {
    let reconnectTimer: any;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.addEventListener('sweep:init', (e: MessageEvent) => {
        try {
          const payload: SweepPayload = JSON.parse(e.data);
          setSweep(payload);
          setNextSweepTimestamp(Date.now() + sweepIntervalMinutes * 60 * 1000);
        } catch (err) {
          console.warn('Failed parsing sweep:init:', err);
        }
      });

      es.addEventListener('sweep:start', () => {
        setIsSweeping(true);
      });

      es.addEventListener('sweep:update', (e: MessageEvent) => {
        try {
          const payload: SweepPayload = JSON.parse(e.data);
          setSweep(payload);
          setIsSweeping(false);
          setNextSweepTimestamp(Date.now() + sweepIntervalMinutes * 60 * 1000);

          if (payload.delta.flashCount > 0) {
            playFlashAlertChime();
          } else {
            playSweepCompleteChime();
          }
        } catch (err) {
          console.warn('Failed parsing sweep:update:', err);
        }
      });

      es.addEventListener('sweep:error', (e: MessageEvent) => {
        setIsSweeping(false);
        console.warn('Sweep error event received:', e.data);
      });

      es.onerror = () => {
        setSseConnected(false);
        es.close();
        reconnectTimer = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    fetchLatestSweep();
    fetchConfig();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [sweepIntervalMinutes]);

  const fetchLatestSweep = async () => {
    try {
      const res = await fetch('/api/sweep/latest');
      if (res.ok) {
        const data = await res.json();
        setSweep(data);
      }
    } catch (err) {
      console.warn('Fallback sweep fetch failed:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.sweepIntervalMinutes) {
          setSweepIntervalMinutes(data.sweepIntervalMinutes);
        }
      }
    } catch (err) {
      console.warn('Config fetch failed:', err);
    }
  };

  const handleTriggerSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await fetch('/api/sweep/trigger', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.sweep) {
          setSweep(json.sweep);
          setNextSweepTimestamp(Date.now() + sweepIntervalMinutes * 60 * 1000);
          if (json.sweep.delta.flashCount > 0) {
            playFlashAlertChime();
          } else {
            playSweepCompleteChime();
          }
        }
      }
    } catch (err) {
      console.warn('Manual trigger failed:', err);
    } finally {
      setIsSweeping(false);
    }
  };

  const handleChangeInterval = async (mins: number) => {
    setSweepIntervalMinutes(mins);
    setNextSweepTimestamp(Date.now() + mins * 60 * 1000);
    try {
      await fetch('/api/config', {
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify({ intervalMinutes: mins }),
      });
    } catch (err) {
      console.warn('Failed updating interval:', err);
    }
  };

  const handleResynthesize = async () => {
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/synthesize', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.synthesis && sweep) {
          setSweep({
            ...sweep,
            synthesis: json.synthesis,
          });
          playSweepCompleteChime();
        }
      }
    } catch (err) {
      console.warn('Synthesis trigger failed:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleToggleLiteMode = () => {
    const next = !liteMode;
    setLiteMode(next);
    localStorage.setItem('crucix_lite_mode', next.toString());
  };

  return (
    <div className={`min-h-screen bg-[#050505] text-[#d4d4d4] flex flex-col font-sans select-none ${liteMode ? '' : 'tactical-grid'}`}>
      {/* 1. Top Fixed HUD Header */}
      <Header
        sweep={sweep}
        isSweeping={isSweeping}
        sseConnected={sseConnected}
        nextSweepTimestamp={nextSweepTimestamp}
        sweepIntervalMinutes={sweepIntervalMinutes}
        onTriggerSweep={handleTriggerSweep}
        onChangeInterval={handleChangeInterval}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenWhatsAppModal={() => setWhatsAppModalOpen(true)}
        onOpenWebSdrModal={() => setWebSdrModalOpen(true)}
        onOpenWatchlistModal={() => setWatchlistModalOpen(true)}
        onOpenSandboxModal={() => setSandboxModalOpen(true)}
        liteMode={liteMode}
        onToggleLiteMode={handleToggleLiteMode}
      />

      {/* 2. Critical Activity Ticker & Notification Center */}
      <NotificationCenter
        alerts={sweep?.alerts || []}
        userLocation={userLocation}
        onOpenWhatsAppAlertModal={() => setWhatsAppModalOpen(true)}
        onNavigateToDesk={handleNavigateToDesk}
      />

      {/* 3. Full-Width Global Surveillance Radar Projection */}
      {sweep && (
        <section id="full-width-global-map-section" className="w-full px-2.5 sm:px-4 py-2 bg-[#02050b] border-b border-[#162338]">
          <WorldMapProjection
            earthquakes={sweep?.geospatial?.data?.earthquakes?.items || []}
            fireAnomalies={sweep?.geospatial?.data?.fireAnomalies || sweep?.geospatial?.data?.thermalAnomalies?.items || []}
            weatherHubs={sweep?.geospatial?.data?.weatherHubs || []}
            trackedVessels={sweep?.infrastructure?.data?.maritime?.trackedVessels || []}
            chokepoints={sweep?.infrastructure?.data?.maritime?.chokepoints || []}
            emergencySquawks={sweep?.infrastructure?.data?.airTraffic?.emergencySquawks || []}
            gpsJammingZones={sweep?.infrastructure?.data?.airTraffic?.gpsJammingZones || []}
            disasterTweets={sweep?.geospatial?.data?.disasterFeed?.items || []}
            userLocation={userLocation}
            onUpdateUserLocation={handleUpdateUserLocation}
            onOpenWhatsAppModal={() => setWhatsAppModalOpen(true)}
            onNavigateToDesk={handleNavigateToDesk}
            liteMode={liteMode}
          />
        </section>
      )}

      {/* 4. Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Real-time Delta Stream Sidebar */}
        <DeltaSidebar
          delta={sweep?.delta || null}
          alerts={sweep?.alerts || []}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          liteMode={liteMode}
        />

        {/* Primary Command Canvas */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-5">
          {!sweep ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center font-mono">
              <div className="relative">
                <RefreshCw className="w-12 h-12 text-[#00ff41] animate-spin" />
                <div className="absolute inset-0 bg-[#00ff41]/20 blur-xl rounded-full"></div>
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white uppercase tracking-widest">
                  CRUCIX INTELLIGENCE SWEEP ENGINE
                </h2>
                <p className="text-xs text-[#888888] max-w-md">
                  Initializing parallel workers across USGS, NOAA, CoinGecko, Europe PMC, CISA KEV, and OpenSky...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* 12-HOUR CRISIS AI SYNTHESIS & TEMPORAL SITREP                            */}
              {/* ========================================================================= */}
              <AiSummary12Hour
                earthquakes={sweep?.geospatial?.data?.earthquakes?.items || []}
                disasters={sweep?.geospatial?.data?.disasterFeed?.items || []}
                emergencySquawks={sweep?.infrastructure?.data?.airTraffic?.emergencySquawks || []}
                fireAnomalies={sweep?.geospatial?.data?.fireAnomalies || sweep?.geospatial?.data?.thermalAnomalies?.items || []}
                trackedVessels={sweep?.infrastructure?.data?.maritime?.trackedVessels || []}
                onOpenDesk={handleNavigateToDesk}
                liteMode={liteMode}
              />

              {/* ========================================================================= */}
              {/* CROSS-DOMAIN AI SYNTHESIS BRIEFING                                       */}
              {/* ========================================================================= */}
              <SynthesisPanel
                synthesis={sweep?.synthesis}
                onResynthesize={handleResynthesize}
                isSynthesizing={isSynthesizing}
                liteMode={liteMode}
              />

              {/* ========================================================================= */}
              {/* PRIMARY 2x2 DOMAIN INTELLIGENCE DESKS MATRIX                             */}
              {/* ========================================================================= */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* 1. Geospatial & Hazards Desk */}
                {sweep?.geospatial && (
                  <GeospatialPanel
                    telemetry={sweep.geospatial}
                    infrastructureTelemetry={sweep.infrastructure}
                    liteMode={liteMode}
                  />
                )}

                {/* 2. Infrastructure, Maritime, Air Traffic & Cyber Desk */}
                {sweep?.infrastructure && (
                  <InfrastructurePanel
                    telemetry={sweep.infrastructure}
                    liteMode={liteMode}
                  />
                )}

                {/* 3. Markets, Macro & Sanctions Desk */}
                {sweep?.markets && (
                  <MarketsPanel
                    telemetry={sweep.markets}
                    liteMode={liteMode}
                  />
                )}

                {/* 4. Public Health & Bio-Research Desk */}
                {sweep?.health && (
                  <HealthPanel
                    telemetry={sweep.health}
                    liteMode={liteMode}
                  />
                )}
              </div>

              {/* Footer System Telemetry */}
              <footer className="pt-4 pb-6 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-[#737373]">
                <div className="flex items-center gap-3">
                  <span className="text-[#00ff41] font-bold">CRUCIX OSINT NODE v3.5</span>
                  <span>•</span>
                  <span>Photorealistic Earth Vector Projection</span>
                  <span>•</span>
                  <span>Proximity WhatsApp Dispatch</span>
                  <span>•</span>
                  <span>12h AI Temporal Sitrep</span>
                </div>
                <div>
                  Last Sweep: {new Date(sweep.timestamp).toLocaleString()} ({sweep.sweepDurationMs}ms)
                </div>
              </footer>
            </>
          )}
        </main>
      </div>

      {/* WhatsApp Disaster Alert & Proximity Dispatcher Modal */}
      <WhatsAppAlertModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        userLocation={userLocation}
        onUpdateUserLocation={handleUpdateUserLocation}
        config={whatsAppConfig}
        onUpdateConfig={handleUpdateWhatsAppConfig}
        disasters={sweep?.geospatial?.data?.disasterFeed?.items || []}
        earthquakes={sweep?.geospatial?.data?.earthquakes?.items || []}
      />

      {/* WebSDR SIGINT Radio & Military Scanner Modal */}
      <WebSdrRadioModal
        isOpen={webSdrModalOpen}
        onClose={() => setWebSdrModalOpen(false)}
      />

      {/* High-Value Asset Watchlist Modal */}
      <AssetWatchlistModal
        isOpen={watchlistModalOpen}
        onClose={() => setWatchlistModalOpen(false)}
        onSelectCoordinate={(lat, lng) => {
          const mapEl = document.getElementById('top-global-radar-map');
          if (mapEl) {
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      {/* Geolocation, Sun-Shadow, and Wayback Verification Sandbox */}
      <MetadataSandboxModal
        isOpen={sandboxModalOpen}
        onClose={() => setSandboxModalOpen(false)}
      />

      {/* Historical Snapshots Modal */}
      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectSweep={(historicalSweep) => {
          setSweep(historicalSweep);
          playTacticalBlip(1200);
        }}
      />
    </div>
  );
}

export default App;
