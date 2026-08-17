import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Flame,
  Globe,
  Radio,
  Search,
  Sparkles,
  Sun,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import {
  DisasterTweetItem,
  GeospatialModuleData,
  InfrastructureModuleData,
  ModuleTelemetry,
} from '../types.js';
import { TwitterDisasterFeed } from './TwitterDisasterFeed.js';
import { ACTIVE_KINETIC_STRIKES } from '../utils/geoIntelligence.js';

interface GeospatialPanelProps {
  telemetry: ModuleTelemetry<GeospatialModuleData>;
  infrastructureTelemetry?: ModuleTelemetry<InfrastructureModuleData>;
  liteMode?: boolean;
  onSelectEntity?: (entity: any) => void;
}

export const GeospatialPanel: React.FC<GeospatialPanelProps> = ({
  telemetry,
  infrastructureTelemetry,
  liteMode = false,
  onSelectEntity,
}) => {
  const { data, status, latencyMs, lastUpdated, error } = telemetry || {};
  const [minMagFilter, setMinMagFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'disasters' | 'quakes' | 'wildfires' | 'strikes' | 'space' | 'weather'>('disasters');

  const earthquakes = data?.earthquakes || { items: [], totalCount: 0, maxMag: 0, maxMagnitude: 0 };
  const earthquakeItems = earthquakes.items || [];
  const filteredQuakes = earthquakeItems.filter((q) => q.mag >= minMagFilter);
  const maxMagVal = earthquakes.maxMag || (earthquakes as any).maxMagnitude || (earthquakeItems.length > 0 ? Math.max(...earthquakeItems.map(q => q.mag)) : 0);

  const fireAnomalies = data?.fireAnomalies || data?.thermalAnomalies?.items || [];
  const weatherHubs = data?.weatherHubs || [];
  const space = data?.spaceWeather || {
    kpIndex: 2.1,
    kpCurrent: 2.1,
    geomagneticStormRisk: 'Quiet',
    solarWindSpeedKmS: 412,
    solarWindDensityPcm3: 5.4,
    solarFlareThreat: 'Low (C-Class)',
  };
  const disasterFeed = data?.disasterFeed?.items || [];
  const criticalDisasterCount = data?.disasterFeed?.criticalCount || disasterFeed.filter(d => d.urgency === 'CRITICAL BREAKING').length;

  return (
    <div id="geospatial-panel" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4 font-sans flex flex-col gap-4 shadow-xl">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#121212] border border-[#262626] text-[#00ff41]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              GEOSPATIAL, SEISMIC & HAZARDS DESK
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${
                  status === 'ok'
                    ? 'bg-[#121212] text-[#00ff41] border-[#00ff41]/50'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}
              >
                {status === 'ok' ? 'LIVE' : 'DEGRADED'}
              </span>
            </h2>
            <div className="text-[11px] font-mono text-[#888888]">
              USGS Seismology • NASA FIRMS Thermal • Twitter/X Disaster OSINT • NOAA SWPC
            </div>
          </div>
        </div>

        {/* Telemetry latency & tabs */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#888888] hidden sm:inline">LATENCY: <strong className="text-[#00ff41]">{latencyMs || 0}ms</strong></span>
          <div className="flex flex-wrap rounded bg-[#050505] p-0.5 border border-[#1a1a1a]">
            {[
              {
                id: 'disasters',
                label: 'Twitter Disasters',
                badge: criticalDisasterCount > 0 ? `${criticalDisasterCount} FLASH` : undefined,
              },
              { id: 'quakes', label: `Quakes (${earthquakes.totalCount || earthquakeItems.length})` },
              { id: 'wildfires', label: `Fires (${fireAnomalies.length})` },
              { id: 'strikes', label: `Strikes (${ACTIVE_KINETIC_STRIKES.length})` },
              { id: 'space', label: 'Space Wx' },
              { id: 'weather', label: 'AQI Hubs' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] uppercase transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-[#1a1a1a] text-[#00ff41] font-bold border border-[#262626]'
                    : 'text-[#888888] hover:text-[#d4d4d4]'
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: Real-time Twitter / X Disaster OSINT Feed */}
      {activeTab === 'disasters' && (
        <TwitterDisasterFeed
          tweets={disasterFeed}
          lastUpdated={lastUpdated ? new Date(lastUpdated).getTime() : Date.now()}
          sourceCount={data?.disasterFeed?.sourcesMonitored || 14}
        />
      )}

      {/* TAB 2: Earthquakes & Seismic Ruptures */}
      {activeTab === 'quakes' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded bg-[#050505] border border-[#1a1a1a] font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#888888]">Filter by Magnitude:</span>
              {[0, 4.0, 5.0, 6.0].map((mag) => (
                <button
                  key={mag}
                  type="button"
                  onClick={() => setMinMagFilter(mag)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    minMagFilter === mag
                      ? 'bg-[#1a1a1a] text-[#00ff41] font-bold border border-[#00ff41]/50'
                      : 'text-[#888888] hover:text-white'
                  }`}
                >
                  {mag === 0 ? 'All' : `≥ M${mag}`}
                </button>
              ))}
            </div>

            <div className="text-[#888888]">
              Max Mag: <strong className="text-rose-400">M{Number(maxMagVal).toFixed(1)}</strong> •
              Total: <strong className="text-white">{filteredQuakes.length}</strong>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {filteredQuakes.map((eq) => {
              const isMajor = eq.mag >= 6.0;
              const isSignificant = eq.mag >= 5.0;

              return (
                <div
                  key={eq.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                    isMajor
                      ? 'bg-rose-950/20 border-rose-700/80 text-rose-100'
                      : isSignificant
                      ? 'bg-amber-950/20 border-amber-700/60 text-amber-100'
                      : 'bg-[#050505] border-[#1a1a1a] text-[#d4d4d4]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-2 py-1 rounded font-bold text-sm text-center min-w-[50px] ${
                        isMajor
                          ? 'bg-rose-600 text-white'
                          : isSignificant
                          ? 'bg-amber-600 text-black'
                          : 'bg-[#121212] text-[#00ff41] border border-[#262626]'
                      }`}
                    >
                      M{eq.mag.toFixed(1)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{eq.place}</div>
                      <div className="text-[10px] text-[#888888]">
                        Depth: {eq.coordinates[2]}km • Tsunami Watch: {eq.tsunami ? 'YES' : 'NO'} • Felt: {eq.felt || '0'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-[#888888]">
                      {new Date(eq.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {eq.url && (
                      <a
                        href={eq.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#00ff41] hover:underline"
                      >
                        USGS Report ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: NASA FIRMS Thermal Anomalies (Wildfires) */}
      {activeTab === 'wildfires' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded bg-[#050505] border border-[#1a1a1a] flex items-center justify-between font-mono text-xs">
            <span className="text-[#888888]">Active Thermal Hotspots Detected:</span>
            <span className="text-orange-400 font-bold">{fireAnomalies.length} Detected by VIIRS Satellite</span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {fireAnomalies.map((fire) => (
              <div
                key={fire.id}
                className="p-3 rounded-lg bg-[#050505] border border-[#1a1a1a] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-orange-950/40 border border-orange-700/60 text-orange-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">{fire.region}</div>
                    <div className="text-[10px] text-[#888888]">
                      Coord: ({fire.lat.toFixed(2)}°, {fire.lng.toFixed(2)}°) • Brightness: {fire.brightness}K
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-orange-400 font-bold">{fire.frp} MW</div>
                  <div className="text-[10px] text-[#888888] uppercase">{fire.confidence} confidence</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Kinetic Strikes & Conflict Incidents */}
      {activeTab === 'strikes' && (
        <div className="space-y-3">
          <div className="p-2.5 rounded bg-[#050505] border border-[#1a1a1a] flex items-center justify-between font-mono text-xs">
            <span className="text-[#888888]">Geopolitical Kinetic Incidents:</span>
            <span className="text-rose-400 font-bold">{ACTIVE_KINETIC_STRIKES.length} Active Incidents</span>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 font-mono text-xs pr-1">
            {ACTIVE_KINETIC_STRIKES.map((strike) => (
              <div
                key={strike.id}
                className="p-3.5 rounded-lg bg-[#050505] border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                      {strike.severity}
                    </span>
                    <span className="font-bold text-white">{strike.title}</span>
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Actor: <strong className="text-white">{strike.actor}</strong> • Target: <span className="text-[#00d1ff]">{strike.targetType}</span> • Region: {strike.region}
                  </div>
                  {strike.casualtyEstimate && (
                    <div className="text-[10px] text-amber-400">
                      Casualty Estimate: {strike.casualtyEstimate}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#666666]">{strike.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Space Weather NOAA SWPC */}
      {activeTab === 'space' && (
        <div className="p-4 rounded-lg bg-[#050505] border border-[#1a1a1a] space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded bg-[#121212] border border-[#262626]">
              <div className="text-[10px] text-[#888888] uppercase">Kp-Index (Geomagnetic)</div>
              <div className="text-lg font-bold text-[#00ff41] mt-1">{space.kpIndex || space.kpCurrent || 2.1}</div>
              <div className="text-[10px] text-[#888888]">{space.geomagneticStormRisk || space.stormLevel || 'Quiet'}</div>
            </div>

            <div className="p-3 rounded bg-[#121212] border border-[#262626]">
              <div className="text-[10px] text-[#888888] uppercase">Solar Wind Speed</div>
              <div className="text-lg font-bold text-[#00d1ff] mt-1">{space.solarWindSpeedKmS || 412} km/s</div>
              <div className="text-[10px] text-[#888888]">DSCOVR Satellite</div>
            </div>

            <div className="p-3 rounded bg-[#121212] border border-[#262626]">
              <div className="text-[10px] text-[#888888] uppercase">Solar Wind Density</div>
              <div className="text-lg font-bold text-white mt-1">{space.solarWindDensityPcm3 || 5.4} p/cm³</div>
              <div className="text-[10px] text-[#888888]">Plasma Flow</div>
            </div>

            <div className="p-3 rounded bg-[#121212] border border-[#262626]">
              <div className="text-[10px] text-[#888888] uppercase">Solar Flare Threat</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{space.solarFlareThreat || 'Low (C-Class)'}</div>
              <div className="text-[10px] text-[#888888]">GOES X-Ray Sensor</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: OpenMeteo Global Air Quality & Weather Hubs */}
      {activeTab === 'weather' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
          {weatherHubs.map((hub) => (
            <div
              key={hub.city}
              className="p-3 rounded-lg bg-[#050505] border border-[#1a1a1a] space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{hub.city}</span>
                <span className="text-[10px] text-[#888888]">{hub.country}</span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <div>
                  <span className="text-[#00ff41] font-bold text-sm">{hub.tempC}°C</span>
                  <div className="text-[10px] text-[#888888]">{hub.weatherCondition || hub.condition || 'Clear'}</div>
                </div>

                <div className="text-right">
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#121212] border border-[#262626] text-[#00d1ff]">
                    AQI {hub.airQualityIndex || hub.aqiUs || 42} ({hub.aqiCategory})
                  </span>
                  <div className="text-[10px] text-[#888888] mt-0.5">PM2.5: {hub.pm25} µg/m³</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
