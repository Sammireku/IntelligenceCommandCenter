import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Anchor,
  Compass,
  ExternalLink,
  Lock,
  Navigation,
  Plane,
  Radio,
  Search,
  Server,
  Shield,
  Ship,
  WifiOff,
  Zap,
} from 'lucide-react';
import { InfrastructureModuleData, ModuleTelemetry } from '../types.js';

interface InfrastructurePanelProps {
  telemetry: ModuleTelemetry<InfrastructureModuleData>;
  liteMode?: boolean;
}

export const InfrastructurePanel: React.FC<InfrastructurePanelProps> = ({ telemetry, liteMode = false }) => {
  const { data, status, latencyMs, error } = telemetry;
  const [cveSearch, setCveSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'maritime' | 'aviation' | 'cisa' | 'outages'>('maritime');

  const filteredCves = (data.cisaKev?.recentAdded || []).filter((cve) => {
    if (!cveSearch.trim()) return true;
    const q = cveSearch.toLowerCase();
    return (
      cve.cveID.toLowerCase().includes(q) ||
      cve.vendorProject.toLowerCase().includes(q) ||
      cve.product.toLowerCase().includes(q) ||
      cve.shortDescription.toLowerCase().includes(q)
    );
  });

  const maritime = data.maritime || {
    chokepoints: [],
    trackedVessels: [],
    stats: {
      totalTrackedVessels: 48920,
      globalChokepointCongestionIndex: 64,
      redSeaDiversionRatePercent: 58.4,
      balticDryIndex: 1894,
      activeNavalAdvisories: 7,
    },
  };

  const airTraffic = data.airTraffic || {
    totalTrackedAircraft: 14850,
    emergencySquawks: [],
    gpsJammingZones: [],
    anomalousEventsCount: 0,
  };

  return (
    <div id="infrastructure-panel" className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 font-sans flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-sky-950/40 border border-sky-700/60 text-sky-400">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
              MARITIME, AVIATION & CYBER INFRASTRUCTURE
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold border ${
                  status === 'ok'
                    ? 'bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800'
                }`}
              >
                {status === 'ok' ? 'LIVE AIS / ADS-B' : 'DEGRADED'}
              </span>
            </h2>
            <div className="text-[11px] font-mono text-[#737373]">
              Global Chokepoints • Dark Fleet AIS • OpenSky ADS-B • GPS Jamming • CISA KEV
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex rounded bg-[#050505] p-0.5 border border-[#1a1a1a] font-mono text-xs">
          {(['maritime', 'aviation', 'cisa', 'outages'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded text-[11px] uppercase transition-colors flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-[#141414] text-[#00d1ff] font-bold border border-[#262626]'
                  : 'text-[#737373] hover:text-[#d4d4d4]'
              }`}
            >
              {tab === 'maritime' && <Ship className="w-3 h-3" />}
              {tab === 'aviation' && <Plane className="w-3 h-3" />}
              {tab === 'cisa' && <Shield className="w-3 h-3" />}
              {tab === 'outages' && <WifiOff className="w-3 h-3" />}
              {tab === 'maritime' ? 'Maritime' : tab === 'aviation' ? 'Airspace & GPS' : tab === 'cisa' ? 'CISA KEV' : 'Net Outages'}
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
            <span>Maritime Chokepoints</span>
            <Ship className="w-3 h-3 text-sky-400" />
          </div>
          <div className="text-sm font-bold text-neutral-100 mt-1">
            {maritime.chokepoints.length} Straits Monitored
          </div>
          <div className="text-[10px] text-amber-400 mt-0.5">
            {maritime.stats.redSeaDiversionRatePercent}% Red Sea Diverted
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>Aviation Radar & ADS-B</span>
            <Plane className="w-3 h-3 text-[#00d1ff]" />
          </div>
          <div className="text-sm font-bold text-[#00d1ff] mt-1">
            {airTraffic.totalTrackedAircraft.toLocaleString()} Aircraft
          </div>
          <div className="text-[10px] text-rose-400 mt-0.5">
            {airTraffic.emergencySquawks.length} Squawks / Recon
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>GPS Jamming Zones</span>
            <Radio className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-300 mt-1">
            {airTraffic.gpsJammingZones?.length || 3} Active EW Zones
          </div>
          <div className="text-[10px] text-[#888888] mt-0.5">
            Suwalki / Levant / Red Sea
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-[#1a1a1a] rounded p-2.5 flex flex-col justify-between">
          <div className="text-[#666666] text-[10px] uppercase flex items-center justify-between">
            <span>CISA KEV Catalog</span>
            <Shield className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-bold text-neutral-100 mt-1">
            {data.cisaKev?.totalCatalogCount || 1220} CVEs
          </div>
          <div className="text-[10px] text-rose-400 mt-0.5">
            {data.cisaKev?.ransomwareTargetedCount || 412} Ransomware Exploited
          </div>
        </div>
      </div>

      {/* TAB 1: MARITIME INTELLIGENCE */}
      {activeTab === 'maritime' && (
        <div className="space-y-4">
          {/* Chokepoint Grid */}
          <div>
            <div className="text-xs font-mono font-bold text-[#d4d4d4] uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-sky-400" /> Strategic Global Maritime Chokepoints
              </span>
              <span className="text-[10px] text-[#737373]">AIS Telemetry & Naval Advisory Live Feeds</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {maritime.chokepoints.map((cp) => {
                const isHighRisk = cp.status === 'High Risk' || cp.status === 'Restricted';
                const statusColor =
                  cp.status === 'Restricted'
                    ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                    : cp.status === 'High Risk'
                    ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                    : cp.status === 'Congested'
                    ? 'bg-yellow-950/40 border-yellow-700/50 text-yellow-300'
                    : 'bg-[#141414] border-[#262626] text-[#00ff41]';

                return (
                  <div
                    key={cp.id}
                    className={`p-3 rounded border space-y-2 font-mono text-xs ${
                      isHighRisk
                        ? 'bg-[#0e0909] border-rose-900/50'
                        : 'bg-[#0c0c0c] border-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div>
                        <div className="font-bold text-white text-xs">{cp.name}</div>
                        <div className="text-[10px] text-[#737373]">{cp.location}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusColor}`}>
                          {cp.status}
                        </span>
                        <div className="text-[10px] text-[#888888] mt-0.5">Risk: <span className="font-bold text-neutral-200">{cp.riskScore}/100</span></div>
                      </div>
                    </div>

                    <div className="bg-[#050505] p-2 rounded border border-[#171717] text-[11px] font-sans text-[#a3a3a3]">
                      <div className="text-sky-300 font-mono text-[10px] font-semibold mb-0.5">TRADE FLOW:</div>
                      {cp.flowDescription}
                    </div>

                    {cp.securityAlert && (
                      <div className="text-[11px] font-sans text-amber-300/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                        <span className="font-mono font-bold text-[10px] text-amber-400 block mb-0.5">SECURITY ADVISORY:</span>
                        {cp.securityAlert}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1 text-[10px] text-[#888888] pt-1 border-t border-[#1a1a1a]">
                      <div>24h Transits: <span className="text-white font-bold">{cp.transitVolume24h}</span></div>
                      <div>Avg Delay: <span className="text-amber-400 font-bold">{cp.averageDelayHours}h</span></div>
                      <div>Queue: <span className="text-[#00d1ff] font-bold">{cp.vesselsWaiting} ships</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-Interest Tracked Vessels & Dark Fleet Anomalies */}
          <div>
            <div className="text-xs font-mono font-bold text-[#d4d4d4] uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#00d1ff]" /> High-Interest Monitored Vessels & Dark Fleet AIS Flags
              </span>
              <span className="text-[10px] text-[#737373]">MMSI Real-Time Positioning</span>
            </div>

            <div className="space-y-2">
              {maritime.trackedVessels.map((vessel) => {
                const isDarkFleet = vessel.anomalyFlag && vessel.anomalyFlag.includes('Dark Fleet');
                const isLoitering = vessel.anomalyFlag && vessel.anomalyFlag.includes('Loitering');

                return (
                  <div
                    key={vessel.mmsi}
                    className={`p-3 rounded border font-mono text-xs space-y-1.5 ${
                      isDarkFleet || isLoitering
                        ? 'bg-rose-950/20 border-rose-800/80'
                        : 'bg-[#0c0c0c] border-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <Ship className="w-4 h-4 text-[#00d1ff]" />
                        <span className="font-bold text-white text-xs">{vessel.vesselName}</span>
                        <span className="text-[10px] text-[#737373]">[{vessel.flag}]</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#141414] border border-[#262626] text-[10px] text-[#a3a3a3]">
                          {vessel.vesselType}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-[#888888]">MMSI: {vessel.mmsi}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            vessel.riskRating === 'High'
                              ? 'bg-rose-600 text-white'
                              : 'bg-[#141414] text-[#00ff41] border border-[#262626]'
                          }`}
                        >
                          {vessel.riskRating.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#a3a3a3] bg-[#050505] p-2 rounded border border-[#171717]">
                      <div>Destination: <span className="text-white font-medium">{vessel.destination}</span></div>
                      <div>Speed: <span className="text-[#00ff41] font-bold">{vessel.speedKnots} kts</span></div>
                      <div>Course: <span className="text-white font-bold">{vessel.courseDegrees}°</span></div>
                      <div>Draught: <span className="text-sky-300 font-bold">{vessel.draughtMeters} m</span></div>
                    </div>

                    {vessel.anomalyFlag && vessel.anomalyFlag !== 'Nominal' && (
                      <div className="text-[11px] font-sans text-rose-300 bg-rose-950/40 p-1.5 rounded border border-rose-800/60 flex items-center gap-1.5">
                        <AlertOctagon className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span><strong>ANOMALY FLAG:</strong> {vessel.anomalyFlag}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AVIATION & AIRSPACE RADAR */}
      {activeTab === 'aviation' && (
        <div className="space-y-4">
          {/* GPS Jamming & EW Spoofing Zones */}
          <div>
            <div className="text-xs font-mono font-bold text-[#d4d4d4] uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400" /> Electronic Warfare & GNSS/GPS Jamming Airspace Zones
              </span>
              <span className="text-[10px] text-[#737373]">ADS-B Spoofing & NOTAM Telemetry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {(airTraffic.gpsJammingZones || []).map((jam) => (
                <div key={jam.id} className="p-3 rounded bg-amber-950/20 border border-amber-800/60 font-mono text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">{jam.region}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700">
                      R: {jam.radiusKm}km
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[#d4d4d4] leading-relaxed">
                    {jam.impactDescription}
                  </p>
                  <div className="text-[10px] text-[#888888] pt-1 border-t border-amber-900/30">
                    Affected FIRs: <span className="text-amber-200">{jam.primaryAffectedAirspace}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Flight Transponders & Reconnaissance */}
          <div>
            <div className="text-xs font-mono font-bold text-[#d4d4d4] uppercase mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-[#00d1ff]" /> Active ADS-B Transponders, Squawks & ISR Reconnaissance
              </span>
              <span className="text-[10px] text-[#737373]">OpenSky Network Feeds</span>
            </div>

            <div className="space-y-2">
              {airTraffic.emergencySquawks.map((fl) => {
                const isEmerg = fl.squawk === '7700' || fl.squawk === '7600' || fl.squawk === '7500';
                const isRecon = fl.squawkType === 'SIGINT Reconnaissance';

                return (
                  <div
                    key={fl.icao24}
                    className={`p-3 rounded border font-mono text-xs space-y-2 ${
                      isEmerg
                        ? 'bg-rose-950/40 border-rose-600 shadow-[0_0_12px_rgba(225,29,72,0.2)]'
                        : isRecon
                        ? 'bg-indigo-950/30 border-indigo-800/80'
                        : 'bg-[#0c0c0c] border-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <Plane className={`w-4 h-4 ${isEmerg ? 'text-rose-400' : isRecon ? 'text-indigo-400' : 'text-[#00d1ff]'}`} />
                        <span className="font-bold text-white text-xs">{fl.callsign}</span>
                        <span className="text-[10px] text-[#888888]">({fl.originCountry})</span>
                        {fl.aircraftType && (
                          <span className="px-1.5 py-0.2 rounded bg-[#141414] border border-[#262626] text-[10px] text-neutral-300">
                            {fl.aircraftType}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isEmerg
                              ? 'bg-rose-600 text-white animate-pulse'
                              : isRecon
                              ? 'bg-indigo-600 text-white'
                              : 'bg-[#141414] text-[#00ff41] border border-[#262626]'
                          }`}
                        >
                          {fl.squawkType}
                        </span>
                        <span className="text-[10px] text-[#666666]">ICAO: {fl.icao24}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#050505] p-2 rounded border border-[#171717]">
                      <div>Altitude: <span className="text-[#00d1ff] font-bold">{fl.altitudeFt?.toLocaleString()} ft</span></div>
                      <div>Velocity: <span className="text-[#00ff41] font-bold">{fl.velocityKnots} kts</span></div>
                      <div>Heading: <span className="text-white font-bold">{fl.heading}°</span></div>
                      <div>Route: <span className="text-amber-300 font-medium truncate">{fl.route || 'Airway Direct'}</span></div>
                    </div>

                    {fl.details && (
                      <p className="text-[11px] font-sans text-[#b0b0b0] leading-relaxed">
                        {fl.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CISA KEV */}
      {activeTab === 'cisa' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#525252]" />
            <input
              type="text"
              value={cveSearch}
              onChange={(e) => setCveSearch(e.target.value)}
              placeholder="Search CISA KEV (e.g. Fortinet, Windows Kernel, CVE-2026)..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-[#050505] border border-[#1a1a1a] text-xs font-mono text-[#d4d4d4] placeholder-[#525252] focus:outline-none focus:border-[#00ff41] transition-colors"
            />
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredCves.map((cve) => {
              const isRansomware = cve.knownRansomwareCampaignUse === 'Known';

              return (
                <div
                  key={cve.cveID}
                  className={`p-3 rounded border space-y-1.5 ${
                    isRansomware
                      ? 'bg-rose-950/20 border-rose-800/80 text-rose-100'
                      : 'bg-[#0c0c0c] border-[#1a1a1a] text-[#d4d4d4]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#00ff41] text-xs">{cve.cveID}</span>
                      <span className="text-[#525252]">•</span>
                      <span className="text-white font-medium">
                        {cve.vendorProject} {cve.product}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRansomware ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold shadow-[0_0_6px_rgba(239,68,68,0.4)]">
                          RANSOMWARE USE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#888888] border border-[#1f1f1f] text-[10px]">
                          WEAPONIZED
                        </span>
                      )}
                      <span className="text-[10px] text-[#666666]">Added: {cve.dateAdded}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#a3a3a3] font-sans leading-relaxed">
                    {cve.shortDescription}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#737373] border-t border-[#1a1a1a]">
                    <span className="truncate">Required Action: {cve.requiredAction}</span>
                    <a
                      href={`https://nvd.nist.gov/vuln/detail/${cve.cveID}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00ff41] hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                    >
                      NVD Detail <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: INTERNET OUTAGES */}
      {activeTab === 'outages' && (
        <div className="space-y-2">
          {(data.internetOutages || []).map((outage, idx) => (
            <div
              key={idx}
              className="p-3 rounded bg-[#0c0c0c] border border-amber-900/40 space-y-1.5"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-neutral-100">{outage.region}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold uppercase">
                  {outage.impactLevel} Impact
                </span>
              </div>
              <p className="text-xs text-[#a3a3a3] font-sans">{outage.cause}</p>
              <div className="text-[10px] font-mono text-[#666666] flex items-center justify-between pt-1">
                <span>ASN: {outage.asn || 'Multi-Transit'}</span>
                <span>Status: {outage.status} • {new Date(outage.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

