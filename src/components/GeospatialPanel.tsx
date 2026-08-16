import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Flame,
  Globe,
  Radio,
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
import { WorldMapProjection } from './WorldMapProjection.js';
import { TwitterDisasterFeed } from './TwitterDisasterFeed.js';

interface GeospatialPanelProps {
  telemetry: ModuleTelemetry<GeospatialModuleData>;
  infrastructureTelemetry?: ModuleTelemetry<InfrastructureModuleData>;
  liteMode?: boolean;
}

export const GeospatialPanel: React.FC<GeospatialPanelProps> = ({
  telemetry,
  infrastructureTelemetry,
  liteMode = false,
}) => {
  const { data, status, latencyMs, lastUpdated, error } = telemetry;
  const [minMagFilter, setMinMagFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'map' | 'disasters' | 'quakes' | 'space' | 'weather'>('map');

  const filteredQuakes = data.earthquakes.items.filter((q) => q.mag >= minMagFilter);
  const space = data.spaceWeather;
  const disasterFeed = data.disasterFeed?.items || [];
  const criticalDisasterCount = data.disasterFeed?.criticalCount || disasterFeed.filter(d => d.urgency === 'CRITICAL BREAKING').length;

  const maritime = infrastructureTelemetry?.data?.maritime;
  const airTraffic = infrastructureTelemetry?.data?.airTraffic;

  return (
    <div id="geospatial-panel" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-sans flex flex-col gap-4 shadow-lg">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#121212] border border-[#262626] text-[#00ff41]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              GEOSPATIAL, HAZARDS & GLOBE RADAR
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
              USGS GeoJSON • NOAA SWPC • OpenMeteo AQI • NASA FIRMS • Twitter/X OSINT
            </div>
          </div>
        </div>

        {/* Telemetry latency & tabs */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#888888] hidden sm:inline">LATENCY: <strong className="text-[#00ff41]">{latencyMs}ms</strong></span>
          <div className="flex flex-wrap rounded bg-[#050505] p-0.5 border border-[#1a1a1a]">
            {[
              { id: 'map', label: 'Globe / Radar' },
              {
                id: 'disasters',
                label: 'Twitter Disasters',
                badge: criticalDisasterCount > 0 ? `${criticalDisasterCount} BREAKING` : undefined,
              },
              { id: 'quakes', label: 'Quakes' },
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

      {error && (
        <div className="p-2 rounded bg-amber-950/30 border border-amber-800/60 text-amber-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* High-Level Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
        {/* Metric 1: Quakes Count */}
        <div className="bg-[#050505] border border-[#1a1a1a] rounded p-2.5">
          <div className="text-[#888888] text-[10px] uppercase flex items-center justify-between">
            <span>24H Earthquakes</span>
            <Activity className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {data.earthquakes.totalCount}{' '}
            <span className="text-xs text-rose-400 font-normal">
              (Max M{data.earthquakes.maxMag})
            </span>
          </div>
          <div className="text-[10px] text-[#666666] mt-0.5">
            {data.earthquakes.significantCount} events ≥ M4.5
          </div>
        </div>

        {/* Metric 2: Live X/Twitter Disaster Feed */}
        <div className="bg-[#050505] border border-[#1a1a1a] rounded p-2.5">
          <div className="text-[#888888] text-[10px] uppercase flex items-center justify-between">
            <span>X / Twitter OSINT</span>
            <Sparkles className="w-3.5 h-3.5 text-[#00d1ff]" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {disasterFeed.length}{' '}
            <span className="text-xs text-rose-400 font-normal">
              ({criticalDisasterCount} Breaking)
            </span>
          </div>
          <div className="text-[10px] text-[#666666] mt-0.5">
            USGS • EMSC • NHC Feeds
          </div>
        </div>

        {/* Metric 3: NOAA Space Kp */}
        <div className="bg-[#050505] border border-[#1a1a1a] rounded p-2.5">
          <div className="text-[#888888] text-[10px] uppercase flex items-center justify-between">
            <span>Planetary Kp</span>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {space.kpCurrent}{' '}
            <span className="text-xs text-amber-400 font-normal">
              ({space.stormLevel})
            </span>
          </div>
          <div className="text-[10px] text-[#666666] mt-0.5">
            Radio Risk: <span className="text-[#d4d4d4]">{space.radioBlackoutRisk}</span>
          </div>
        </div>

        {/* Metric 4: NASA FIRMS Thermal */}
        <div className="bg-[#050505] border border-[#1a1a1a] rounded p-2.5">
          <div className="text-[#888888] text-[10px] uppercase flex items-center justify-between">
            <span>Thermal Hotspots</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {data.thermalAnomalies.totalHotspots}
          </div>
          <div className="text-[10px] text-[#666666] mt-0.5">
            {data.thermalAnomalies.highConfidenceCount} High Confidence
          </div>
        </div>
      </div>

      {/* TAB 1: INTERACTIVE 3D GLOBE / 2D MAP RADAR */}
      {activeTab === 'map' && (
        <WorldMapProjection
          earthquakes={data.earthquakes.items}
          fireAnomalies={data.thermalAnomalies.items}
          weatherHubs={data.weatherHubs}
          trackedVessels={maritime?.trackedVessels || []}
          chokepoints={maritime?.chokepoints || []}
          emergencySquawks={airTraffic?.emergencySquawks || []}
          gpsJammingZones={airTraffic?.gpsJammingZones || []}
          disasterTweets={disasterFeed}
          liteMode={liteMode}
        />
      )}

      {/* TAB 2: LIVE X / TWITTER NATURAL DISASTERS FEED */}
      {activeTab === 'disasters' && (
        <TwitterDisasterFeed
          dispatches={disasterFeed}
          onSelectCoordinate={() => setActiveTab('map')}
          liteMode={liteMode}
        />
      )}

      {/* TAB 3: USGS EARTHQUAKES LIST */}
      {activeTab === 'quakes' && (
        <div className="space-y-3">
          {/* Magnitude Filter */}
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-[#888888]">Filter by Magnitude:</span>
            <div className="flex gap-1">
              {[0, 4.0, 5.0, 6.0].map((mag) => (
                <button
                  key={mag}
                  type="button"
                  onClick={() => setMinMagFilter(mag)}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    minMagFilter === mag
                      ? 'bg-rose-950 border-rose-600 text-rose-300 font-bold'
                      : 'bg-[#050505] border-[#1a1a1a] text-[#888888] hover:text-[#d4d4d4]'
                  }`}
                >
                  {mag === 0 ? 'All' : `≥ M${mag}`}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
            {filteredQuakes.map((eq) => {
              const isMajor = eq.mag >= 6.0;
              const isSignificant = eq.mag >= 4.5;

              return (
                <div
                  key={eq.id}
                  className={`p-2.5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                    isMajor
                      ? 'bg-rose-950/30 border-rose-700/80 text-rose-100'
                      : isSignificant
                      ? 'bg-amber-950/20 border-amber-700/60 text-amber-100'
                      : 'bg-[#050505] border-[#1a1a1a] text-[#d4d4d4]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-1 rounded font-bold text-xs ${
                        isMajor
                          ? 'bg-rose-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : isSignificant
                          ? 'bg-amber-600 text-black font-bold'
                          : 'bg-[#1a1a1a] text-[#00ff41]'
                      }`}
                    >
                      M{eq.mag.toFixed(1)}
                    </span>
                    <div>
                      <div className="font-sans font-medium text-white text-xs">
                        {eq.place}
                      </div>
                      <div className="text-[10px] text-[#888888]">
                        Depth: {eq.coordinates[2]}km • {new Date(eq.time).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] self-end sm:self-auto">
                    {eq.tsunami === 1 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-900 text-rose-200 text-[10px] font-bold animate-pulse">
                        TSUNAMI WATCH
                      </span>
                    )}
                    <a
                      href={eq.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00ff41] hover:underline text-[11px]"
                    >
                      USGS Details ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: NOAA SPACE WEATHER */}
      {activeTab === 'space' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded bg-[#050505] border border-[#1a1a1a] space-y-2">
              <div className="text-[#888888] text-[11px] uppercase">Planetary Kp Index</div>
              <div className="text-2xl font-bold text-[#00ff41]">{space.kpCurrent}</div>
              <div className="w-full bg-[#161616] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${
                    space.kpCurrent >= 7 ? 'bg-rose-500' : space.kpCurrent >= 5 ? 'bg-amber-500' : 'bg-[#00ff41]'
                  }`}
                  style={{ width: `${Math.min(100, (space.kpCurrent / 9) * 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-[#666666]">
                <span>0 (Quiet)</span>
                <span>5 (Storm)</span>
                <span>9 (Extreme)</span>
              </div>
            </div>

            <div className="p-3 rounded bg-[#050505] border border-[#1a1a1a] space-y-2">
              <div className="text-[#888888] text-[11px] uppercase">Storm Classification</div>
              <div className="text-lg font-bold text-white">{space.stormLevel}</div>
              <div className="text-[11px] text-[#888888]">
                Estimated 24h Max: <strong className="text-amber-300">Kp {space.kpEstimated24hMax}</strong>
              </div>
            </div>

            <div className="p-3 rounded bg-[#050505] border border-[#1a1a1a] space-y-2">
              <div className="text-[#888888] text-[11px] uppercase">Comms & Grid Disruption</div>
              <div className="text-[11px] text-[#d4d4d4]">
                Radio Blackout Risk: <strong className="text-[#00ff41]">{space.radioBlackoutRisk}</strong>
              </div>
              <div className="text-[11px] text-[#d4d4d4]">
                Solar Radiation: <strong className="text-[#00d1ff]">{space.solarRadiationRisk}</strong>
              </div>
            </div>
          </div>

          {/* Kp Historical Trend */}
          {space.recentKpValues.length > 0 && (
            <div className="p-3 rounded bg-[#050505] border border-[#1a1a1a] text-xs font-mono">
              <div className="text-[#888888] text-[11px] uppercase mb-2">
                Planetary Kp 12-Hour Telemetry Trend
              </div>
              <div className="flex items-end gap-2 h-20 pt-2 border-b border-[#1a1a1a]">
                {space.recentKpValues.map((v, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        v.kp >= 7 ? 'bg-rose-500' : v.kp >= 5 ? 'bg-amber-500' : 'bg-[#00ff41]'
                      }`}
                      style={{ height: `${Math.max(12, (v.kp / 9) * 100)}%` }}
                    ></div>
                    <span className="text-[9px] text-[#888888]">{v.kp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: WEATHER & AQI HUBS */}
      {activeTab === 'weather' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-[#888888] text-[11px] uppercase">
                <th className="pb-2">Strategic Hub</th>
                <th className="pb-2">US AQI</th>
                <th className="pb-2">PM2.5 / PM10</th>
                <th className="pb-2">Temp / Wind</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {data.weatherHubs.map((hub) => {
                const aqiColor =
                  hub.aqiUs > 150
                    ? 'text-rose-400 bg-rose-950/60 border-rose-700'
                    : hub.aqiUs > 100
                    ? 'text-amber-400 bg-amber-950/60 border-amber-700'
                    : hub.aqiUs > 50
                    ? 'text-yellow-400 bg-yellow-950/40 border-yellow-800'
                    : 'text-[#00ff41] bg-[#121212] border-[#00ff41]/40';

                return (
                  <tr key={hub.city} className="hover:bg-[#121212]/60">
                    <td className="py-2.5 font-sans font-medium text-white">
                      {hub.city}, <span className="text-[#888888] text-xs">{hub.country}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${aqiColor}`}>
                        {hub.aqiUs} ({hub.aqiCategory})
                      </span>
                    </td>
                    <td className="py-2.5 text-[#d4d4d4]">
                      {hub.pm25} / {hub.pm10} µg/m³
                    </td>
                    <td className="py-2.5 text-[#d4d4d4]">
                      {hub.tempC}°C • {hub.windSpeedKmh} km/h
                    </td>
                    <td className="py-2.5">
                      {hub.anomalyFlag ? (
                        <span className="text-amber-400 text-[10px] font-bold">ANOMALY</span>
                      ) : (
                        <span className="text-[#666666] text-[10px]">NOMINAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
