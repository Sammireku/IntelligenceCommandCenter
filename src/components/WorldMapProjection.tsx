import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  Anchor,
  Compass,
  ExternalLink,
  Eye,
  Flame,
  Globe as GlobeIcon,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Plane,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Ship,
  Sparkles,
  Sun,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import {
  DisasterTweetItem,
  EarthquakeItem,
  FireAnomalyItem,
  FlightAnomalyItem,
  GpsJammingZoneItem,
  MaritimeChokepointItem,
  MaritimeVesselItem,
  WeatherHubItem,
} from '../types.js';

interface WorldMapProjectionProps {
  earthquakes?: EarthquakeItem[];
  fireAnomalies?: FireAnomalyItem[];
  weatherHubs?: WeatherHubItem[];
  trackedVessels?: MaritimeVesselItem[];
  chokepoints?: MaritimeChokepointItem[];
  emergencySquawks?: FlightAnomalyItem[];
  gpsJammingZones?: GpsJammingZoneItem[];
  disasterTweets?: DisasterTweetItem[];
  liteMode?: boolean;
}

// 2D Equirectangular projection (800 x 400 SVG space)
function project2D(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * 800;
  const y = ((90 - lat) / 180) * 400;
  return [x, y];
}

// 3D Orthographic projection to a sphere with radius R centered at (cx, cy)
function project3D(
  lng: number,
  lat: number,
  rotLng: number,
  rotLat: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number; visible: boolean; cosC: number } {
  const rad = Math.PI / 180;
  const phi = lat * rad;
  const lambda = lng * rad;
  const phi0 = rotLat * rad;
  const lambda0 = rotLng * rad;

  const cosC =
    Math.sin(phi0) * Math.sin(phi) +
    Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

  const visible = cosC > 0.05; // Visible on the front hemisphere

  const x = cx + radius * Math.cos(phi) * Math.sin(lambda - lambda0);
  const y =
    cy -
    radius *
      (Math.cos(phi0) * Math.sin(phi) -
        Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

  return { x, y, visible, cosC };
}

// Vector continent definition for 3D & 2D rendering
const CONTINENTS: { name: string; points: [number, number][] }[] = [
  {
    name: 'North America',
    points: [
      [-165, 68], [-140, 70], [-100, 72], [-65, 60], [-55, 50], [-70, 42],
      [-80, 25], [-90, 20], [-105, 20], [-115, 30], [-125, 48], [-165, 60],
    ],
  },
  {
    name: 'Central America',
    points: [[-90, 20], [-80, 10], [-77, 8], [-85, 12], [-100, 18]],
  },
  {
    name: 'South America',
    points: [
      [-75, 10], [-60, 5], [-35, -5], [-38, -18], [-55, -35], [-68, -55],
      [-75, -45], [-72, -20], [-80, -2],
    ],
  },
  {
    name: 'Eurasia',
    points: [
      [-10, 36], [0, 42], [15, 55], [30, 70], [60, 73], [100, 75], [170, 68],
      [140, 50], [120, 35], [105, 20], [80, 10], [60, 25], [40, 30], [25, 35],
      [10, 36],
    ],
  },
  {
    name: 'Africa',
    points: [
      [-15, 30], [10, 37], [32, 31], [50, 12], [42, -10], [30, -32],
      [18, -34], [10, -5], [-15, 12],
    ],
  },
  {
    name: 'Australia',
    points: [
      [115, -22], [130, -12], [145, -15], [150, -35], [135, -38],
      [115, -34],
    ],
  },
  {
    name: 'Japan & Maritime East Asia',
    points: [[130, 32], [142, 44], [140, 36], [132, 30]],
  },
  {
    name: 'Greenland',
    points: [[-50, 60], [-20, 70], [-25, 82], [-60, 80]],
  },
];

export const WorldMapProjection: React.FC<WorldMapProjectionProps> = ({
  earthquakes = [],
  fireAnomalies = [],
  weatherHubs = [],
  trackedVessels = [],
  chokepoints = [],
  emergencySquawks = [],
  gpsJammingZones = [],
  disasterTweets = [],
  liteMode = false,
}) => {
  // Projection mode: 2D tactical map or 3D interactive HUD globe
  const [projectionMode, setProjectionMode] = useState<'2d' | '3d'>('3d');

  // Layer Visibility Toggles
  const [showVessels, setShowVessels] = useState(true);
  const [showFlights, setShowFlights] = useState(true);
  const [showChokepoints, setShowChokepoints] = useState(true);
  const [showGpsJamming, setShowGpsJamming] = useState(true);
  const [showQuakes, setShowQuakes] = useState(true);
  const [showFires, setShowFires] = useState(true);
  const [showDisasters, setShowDisasters] = useState(true);
  const [showWeather, setShowWeather] = useState(false);

  // Selected Entity State for rich Inspector card
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'vessel' | 'flight' | 'chokepoint' | 'jamming' | 'quake' | 'fire' | 'disaster' | 'weather';
    data: any;
    screenCoords?: [number, number];
  } | null>(null);

  // 3D Globe Rotation & Drag State
  const [rotLng, setRotLng] = useState<number>(35); // Center near Middle East / Europe by default
  const [rotLat, setRotLat] = useState<number>(18);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const dragStartRef = useRef<{ x: number; y: number; startLng: number; startLat: number } | null>(null);

  // Cursor coordinates tracking
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-rotate 3D globe animation loop
  useEffect(() => {
    if (projectionMode !== '3d' || !autoRotate || isDragging) return;
    const interval = setInterval(() => {
      setRotLng((prev) => (prev + 0.25) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [projectionMode, autoRotate, isDragging]);

  // Mouse / Touch handlers for 3D globe drag rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (projectionMode !== '3d') return;
    setIsDragging(true);
    setAutoRotate(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startLng: rotLng,
      startLat: rotLat,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current && projectionMode === '3d') {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const sensitivity = 0.4;
      const newLng = (dragStartRef.current.startLng - dx * sensitivity) % 360;
      const newLat = Math.max(-80, Math.min(80, dragStartRef.current.startLat + dy * sensitivity));
      setRotLng(newLng);
      setRotLat(newLat);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Jump camera directly to given coordinates
  const jumpToCoords = (lng: number, lat: number) => {
    setRotLng(lng);
    setRotLat(lat);
    setAutoRotate(false);
  };

  const globeRadius = 175 * zoomLevel;
  const globeCenter = { cx: 400, cy: 200 };

  // Calculate 3D projected continents
  const projectedContinents = useMemo(() => {
    if (projectionMode !== '3d') return [];
    return CONTINENTS.map((cont) => {
      const projectedPoints = cont.points.map(([lng, lat]) =>
        project3D(lng, lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy)
      );
      // Construct SVG path string
      const visiblePoints = projectedPoints.filter((p) => p.visible);
      if (visiblePoints.length < 2) return null;

      const pathData = projectedPoints
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ') + ' Z';

      return { name: cont.name, path: pathData };
    }).filter(Boolean);
  }, [projectionMode, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy]);

  return (
    <div id="world-map-projection-container" className="relative w-full bg-[#030303] border border-[#1a1a1a] rounded-lg overflow-hidden p-3 select-none flex flex-col gap-2">
      {/* TOP CONTROLS & HUD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1a1a1a] text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff41] animate-pulse"></span>
          <span className="font-mono uppercase tracking-widest text-[#00ff41] font-semibold text-xs">
            REAL-TIME MULTI-DOMAIN GLOBE & RADAR
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#111111] text-[#888888] border border-[#222222]">
            {projectionMode === '3d' ? '3D ORTHOGRAPHIC SPHERE' : '2D TACTICAL EQUIRECTANGULAR'}
          </span>
        </div>

        {/* View Switcher & Quick Jump Dropdown */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* Quick Target Navigation */}
          <select
            id="quick-jump-target"
            className="px-2 py-1 rounded bg-[#0a0a0a] border border-[#222222] text-[#00d1ff] text-[11px] focus:outline-none cursor-pointer"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'hormuz') jumpToCoords(56.25, 26.56);
              else if (val === 'babelmandeb') jumpToCoords(43.33, 12.58);
              else if (val === 'malacca') jumpToCoords(101.5, 2.5);
              else if (val === 'suwalki') jumpToCoords(20.5, 55.0);
              else if (val === 'pacific_titan') jumpToCoords(57.14, 25.82);
              else if (val === 'rivet_joint') jumpToCoords(31.42, 43.85);
              else if (val === 'taiwan') jumpToCoords(121.65, 23.85);
              else if (val === 'greece') jumpToCoords(22.35, 37.5);
            }}
            defaultValue=""
          >
            <option value="" disabled>🎯 Jump Target...</option>
            <option value="hormuz">Strait of Hormuz (26.56°N, 56.25°E)</option>
            <option value="babelmandeb">Bab-el-Mandeb Strait (12.58°N, 43.33°E)</option>
            <option value="malacca">Strait of Malacca (2.50°N, 101.5°E)</option>
            <option value="suwalki">Suwalki GPS Jamming (55.00°N, 20.50°E)</option>
            <option value="pacific_titan">PACIFIC TITAN Tanker</option>
            <option value="rivet_joint">RC-135W Rivet Joint Recon</option>
            <option value="taiwan">Taiwan M6.8 Quake Epicenter</option>
            <option value="greece">Peloponnese Wildfire (Greece)</option>
          </select>

          {/* Projection Mode Switcher */}
          <div className="flex rounded bg-[#0a0a0a] p-0.5 border border-[#222222]">
            <button
              type="button"
              id="mode-3d-globe"
              onClick={() => setProjectionMode('3d')}
              className={`px-2.5 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                projectionMode === '3d'
                  ? 'bg-[#1f1f1f] text-[#00ff41] font-bold border border-[#333333]'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <GlobeIcon className="w-3 h-3" /> 3D Globe
            </button>
            <button
              type="button"
              id="mode-2d-map"
              onClick={() => setProjectionMode('2d')}
              className={`px-2.5 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                projectionMode === '2d'
                  ? 'bg-[#1f1f1f] text-[#00d1ff] font-bold border border-[#333333]'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <Compass className="w-3 h-3" /> 2D Map
            </button>
          </div>

          {/* 3D controls */}
          {projectionMode === '3d' && (
            <button
              type="button"
              id="toggle-auto-rotate"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors flex items-center gap-1 ${
                autoRotate
                  ? 'bg-[#111111] text-[#00ff41] border-[#00ff41]/40'
                  : 'bg-[#0a0a0a] text-[#666666] border-[#222222]'
              }`}
              title="Toggle Auto Rotation"
            >
              <RefreshCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{autoRotate ? 'ROTATING' : 'PAUSED'}</span>
            </button>
          )}

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-[#222222] text-[#aaaaaa] hover:text-white text-xs"
              title="Zoom Out"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-1.5 py-0.5 rounded bg-[#0a0a0a] border border-[#222222] text-[#888888] hover:text-white text-[10px]"
              title="Reset Zoom"
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
              className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-[#222222] text-[#aaaaaa] hover:text-white text-xs"
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* LAYER FILTER BUTTONS */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        <button
          type="button"
          onClick={() => setShowVessels(!showVessels)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showVessels
              ? 'bg-[#0e1620] border-cyan-500/70 text-cyan-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Ship className="w-3 h-3" /> Vessels ({trackedVessels.length})
        </button>

        <button
          type="button"
          onClick={() => setShowFlights(!showFlights)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showFlights
              ? 'bg-[#181404] border-yellow-500/70 text-yellow-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Plane className="w-3 h-3" /> Flights ({emergencySquawks.length})
        </button>

        <button
          type="button"
          onClick={() => setShowChokepoints(!showChokepoints)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showChokepoints
              ? 'bg-[#180e0e] border-rose-600/70 text-rose-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Anchor className="w-3 h-3" /> Chokepoints ({chokepoints.length})
        </button>

        <button
          type="button"
          onClick={() => setShowGpsJamming(!showGpsJamming)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showGpsJamming
              ? 'bg-[#1a0f1e] border-purple-500/70 text-purple-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Radio className="w-3 h-3" /> GPS Jamming ({gpsJammingZones.length})
        </button>

        <button
          type="button"
          onClick={() => setShowQuakes(!showQuakes)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showQuakes
              ? 'bg-[#1a0a0c] border-red-500/70 text-red-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Zap className="w-3 h-3" /> Quakes ({earthquakes.length})
        </button>

        <button
          type="button"
          onClick={() => setShowFires(!showFires)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showFires
              ? 'bg-[#1a1005] border-orange-500/70 text-orange-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Flame className="w-3 h-3" /> Wildfires ({fireAnomalies.length})
        </button>

        <button
          type="button"
          onClick={() => setShowDisasters(!showDisasters)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showDisasters
              ? 'bg-[#05161c] border-sky-400/80 text-sky-300 font-bold'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Sparkles className="w-3 h-3" /> X/Twitter OSINT ({disasterTweets.length})
        </button>

        <button
          type="button"
          onClick={() => setShowWeather(!showWeather)}
          className={`px-2 py-0.5 rounded transition-colors border flex items-center gap-1 ${
            showWeather
              ? 'bg-[#061510] border-emerald-500/70 text-emerald-300'
              : 'bg-[#080808] border-[#1f1f1f] text-[#555555]'
          }`}
        >
          <Wind className="w-3 h-3" /> AQI Hubs ({weatherHubs.length})
        </button>
      </div>

      {/* CANVAS / SVG INTERACTIVE MAP & GLOBE DISPLAY */}
      <div
        className="relative w-full aspect-[2/1] min-h-[360px] max-h-[560px] overflow-hidden bg-[#020202] rounded border border-[#1a1a1a] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background Space Grid & Radial Atmosphere Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#151515_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40"></div>

        {projectionMode === '3d' && (
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              width: `${globeRadius * 2.15}px`,
              height: `${globeRadius * 2.15}px`,
              left: `${globeCenter.cx - globeRadius * 1.075}px`,
              top: `${globeCenter.cy - globeRadius * 1.075}px`,
              background: 'radial-gradient(circle, rgba(0,209,255,0.06) 0%, rgba(0,255,65,0.02) 65%, transparent 75%)',
            }}
          />
        )}

        <svg
          viewBox="0 0 800 400"
          className="w-full h-full"
          onClick={() => setSelectedEntity(null)}
        >
          {/* ========================================================================= */}
          {/* 3D GLOBE RENDERING PIPELINE */}
          {/* ========================================================================= */}
          {projectionMode === '3d' && (
            <g id="globe-3d-group">
              {/* Globe Base Sphere & Shadow */}
              <defs>
                <radialGradient id="globeSphereGradient" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#101820" />
                  <stop offset="60%" stopColor="#080c10" />
                  <stop offset="100%" stopColor="#020406" />
                </radialGradient>
                <radialGradient id="atmosphereRim" cx="50%" cy="50%" r="50%">
                  <stop offset="85%" stopColor="transparent" />
                  <stop offset="96%" stopColor="rgba(0, 209, 255, 0.25)" />
                  <stop offset="100%" stopColor="rgba(0, 255, 65, 0.4)" />
                </radialGradient>
              </defs>

              {/* Globe Sphere Disc */}
              <circle
                cx={globeCenter.cx}
                cy={globeCenter.cy}
                r={globeRadius}
                fill="url(#globeSphereGradient)"
                stroke="#1f2937"
                strokeWidth="1.5"
              />

              {/* Atmosphere rim overlay */}
              <circle
                cx={globeCenter.cx}
                cy={globeCenter.cy}
                r={globeRadius}
                fill="url(#atmosphereRim)"
                pointerEvents="none"
              />

              {/* 3D Latitude Parallels */}
              {[-60, -30, 0, 30, 60].map((lat) => {
                const points: string[] = [];
                for (let lng = 0; lng <= 360; lng += 8) {
                  const p = project3D(lng, lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (p.visible) {
                    points.push(`${points.length === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
                  }
                }
                if (points.length < 2) return null;
                return (
                  <path
                    key={`lat-${lat}`}
                    d={points.join(' ')}
                    fill="none"
                    stroke={lat === 0 ? 'rgba(0, 255, 65, 0.25)' : 'rgba(255, 255, 255, 0.05)'}
                    strokeWidth={lat === 0 ? '1' : '0.5'}
                    strokeDasharray={lat === 0 ? 'none' : '3 3'}
                  />
                );
              })}

              {/* 3D Longitude Meridians */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((lng) => {
                const points: string[] = [];
                for (let lat = -80; lat <= 80; lat += 5) {
                  const p = project3D(lng, lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (p.visible) {
                    points.push(`${points.length === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
                  }
                }
                if (points.length < 2) return null;
                return (
                  <path
                    key={`meridian-${lng}`}
                    d={points.join(' ')}
                    fill="none"
                    stroke={lng === 0 ? 'rgba(0, 209, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)'}
                    strokeWidth={lng === 0 ? '1' : '0.5'}
                  />
                );
              })}

              {/* 3D Continent Vector Silhouettes */}
              {projectedContinents.map((cont, idx) => (
                <path
                  key={`cont-3d-${idx}`}
                  d={cont?.path}
                  fill="#0d181e"
                  stroke="#1c303d"
                  strokeWidth="0.75"
                />
              ))}

              {/* 3D LAYER: GPS JAMMING ZONES */}
              {showGpsJamming &&
                gpsJammingZones.map((zone) => {
                  const p = project3D(zone.lng, zone.lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const rad = (zone.radiusKm / 15) * (globeRadius / 175);
                  const isSelected = selectedEntity?.data?.id === zone.id;

                  return (
                    <g
                      key={`jam-3d-${zone.id}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'jamming', data: zone, screenCoords: [p.x, p.y] });
                      }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={rad}
                        fill="rgba(168, 85, 247, 0.18)"
                        stroke="#a855f7"
                        strokeWidth={isSelected ? 2 : 1}
                        strokeDasharray="4 2"
                        className="animate-pulse"
                      />
                      <circle cx={p.x} cy={p.y} r={3} fill="#c084fc" />
                    </g>
                  );
                })}

              {/* 3D LAYER: CHOKEPOINTS */}
              {showChokepoints &&
                chokepoints.map((cp) => {
                  const p = project3D(cp.lng, cp.lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const isSelected = selectedEntity?.data?.id === cp.id;
                  const color = cp.status === 'High Risk' ? '#ef4444' : cp.status === 'Restricted' ? '#f97316' : cp.status === 'Congested' ? '#eab308' : '#00ff41';

                  return (
                    <g
                      key={`cp-3d-${cp.id}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'chokepoint', data: cp, screenCoords: [p.x, p.y] });
                      }}
                    >
                      <rect
                        x={p.x - 4}
                        y={p.y - 4}
                        width="8"
                        height="8"
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        transform={`rotate(45, ${p.x}, ${p.y})`}
                      />
                      <text
                        x={p.x + 7}
                        y={p.y + 3}
                        fill="#d1d5db"
                        fontSize="8"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-medium"
                      >
                        ⚓ {cp.name.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}

              {/* 3D LAYER: VESSELS */}
              {showVessels &&
                trackedVessels.map((v) => {
                  const p = project3D(v.lng, v.lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const isDark = v.anomalyFlag && v.anomalyFlag !== 'Nominal';
                  const color = isDark ? '#ef4444' : '#00d1ff';
                  const isSelected = selectedEntity?.data?.mmsi === v.mmsi;

                  return (
                    <g
                      key={`vessel-3d-${v.mmsi}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'vessel', data: v, screenCoords: [p.x, p.y] });
                      }}
                    >
                      {/* Vessel direction arrow */}
                      <polygon
                        points={`${p.x},${p.y - 5} ${p.x + 3.5},${p.y + 4} ${p.x - 3.5},${p.y + 4}`}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        transform={`rotate(${v.courseDegrees}, ${p.x}, ${p.y})`}
                      />
                      <text
                        x={p.x + 6}
                        y={p.y + 3}
                        fill={isDark ? '#f87171' : '#9ca3af'}
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-semibold"
                      >
                        🚢 {v.vesselName}
                      </text>
                    </g>
                  );
                })}

              {/* 3D LAYER: FLIGHTS */}
              {showFlights &&
                emergencySquawks.map((flight) => {
                  const p = project3D(flight.lng || 0, flight.lat || 0, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const isEmergency = flight.squawk === '7700';
                  const isRecon = flight.squawkType === 'SIGINT Reconnaissance';
                  const color = isEmergency ? '#ef4444' : isRecon ? '#f59e0b' : '#38bdf8';
                  const isSelected = selectedEntity?.data?.icao24 === flight.icao24;

                  return (
                    <g
                      key={`flight-3d-${flight.icao24}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'flight', data: flight, screenCoords: [p.x, p.y] });
                      }}
                    >
                      {isEmergency && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="12"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1"
                          className="animate-ping"
                        />
                      )}
                      <polygon
                        points={`${p.x},${p.y - 6} ${p.x + 4.5},${p.y + 4} ${p.x},${p.y + 2} ${p.x - 4.5},${p.y + 4}`}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        transform={`rotate(${flight.heading || 0}, ${p.x}, ${p.y})`}
                      />
                      <text
                        x={p.x + 7}
                        y={p.y + 3}
                        fill={color}
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-bold"
                      >
                        ✈ {flight.callsign} {isEmergency ? '[7700]' : ''}
                      </text>
                    </g>
                  );
                })}

              {/* 3D LAYER: DISASTER TWEET BEACONS */}
              {showDisasters &&
                disasterTweets.map((tweet) => {
                  const p = project3D(tweet.location.lng, tweet.location.lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const isSelected = selectedEntity?.data?.id === tweet.id;
                  const isCritical = tweet.urgency === 'CRITICAL BREAKING';

                  return (
                    <g
                      key={`tweet-3d-${tweet.id}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'disaster', data: tweet, screenCoords: [p.x, p.y] });
                      }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="10"
                        fill="none"
                        stroke={isCritical ? '#ef4444' : '#38bdf8'}
                        strokeWidth="1.2"
                        className="animate-ping"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 6 : 4.5}
                        fill={isCritical ? '#ef4444' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={p.x + 6}
                        y={p.y + 3}
                        fill="#38bdf8"
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-bold"
                      >
                        🐦 {tweet.handle}
                      </text>
                    </g>
                  );
                })}

              {/* 3D LAYER: EARTHQUAKES */}
              {showQuakes &&
                earthquakes.map((eq) => {
                  const p = project3D(eq.coordinates[0], eq.coordinates[1], rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const isMajor = eq.mag >= 6.0;
                  const isSignificant = eq.mag >= 4.5;
                  const color = isMajor ? '#ef4444' : isSignificant ? '#f59e0b' : '#38bdf8';
                  const radius = Math.max(3, (eq.mag - 2) * 2.5);
                  const isSelected = selectedEntity?.data?.id === eq.id;

                  return (
                    <g
                      key={`quake-3d-${eq.id}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'quake', data: eq, screenCoords: [p.x, p.y] });
                      }}
                    >
                      {isMajor && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={radius * 2}
                          fill="none"
                          stroke={color}
                          strokeWidth="1"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={radius}
                        fill={color}
                        fillOpacity="0.85"
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 0.75}
                      />
                    </g>
                  );
                })}

              {/* 3D LAYER: THERMAL WILDFIRES */}
              {showFires &&
                fireAnomalies.map((fire) => {
                  const p = project3D(fire.lng, fire.lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const isSelected = selectedEntity?.data?.id === fire.id;

                  return (
                    <g
                      key={`fire-3d-${fire.id}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'fire', data: fire, screenCoords: [p.x, p.y] });
                      }}
                    >
                      <polygon
                        points={`${p.x},${p.y - 5} ${p.x + 4},${p.y + 3} ${p.x - 4},${p.y + 3}`}
                        fill="#f97316"
                        stroke="#fbbf24"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                      />
                    </g>
                  );
                })}

              {/* 3D LAYER: WEATHER HUBS */}
              {showWeather &&
                weatherHubs.map((hub) => {
                  const p = project3D(hub.lng, hub.lat, rotLng, rotLat, globeRadius, globeCenter.cx, globeCenter.cy);
                  if (!p.visible) return null;
                  const color = hub.aqiUs > 150 ? '#ef4444' : hub.aqiUs > 100 ? '#f59e0b' : '#00ff41';
                  const isSelected = selectedEntity?.data?.city === hub.city;

                  return (
                    <g
                      key={`hub-3d-${hub.city}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'weather', data: hub, screenCoords: [p.x, p.y] });
                      }}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isSelected ? 5 : 3.5}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                      />
                      <text
                        x={p.x + 5}
                        y={p.y + 3}
                        fill="#9ca3af"
                        fontSize="7"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white"
                      >
                        {hub.city}
                      </text>
                    </g>
                  );
                })}
            </g>
          )}

          {/* ========================================================================= */}
          {/* 2D TACTICAL EQUIRECTANGULAR PROJECTION PIPELINE */}
          {/* ========================================================================= */}
          {projectionMode === '2d' && (
            <g id="map-2d-group">
              {/* 2D Graticule Grid Lines */}
              <g stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.75" strokeDasharray="3 3">
                <line x1="100" y1="0" x2="100" y2="400" />
                <line x1="200" y1="0" x2="200" y2="400" />
                <line x1="300" y1="0" x2="300" y2="400" />
                <line x1="400" y1="0" x2="400" y2="400" stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="none" />
                <line x1="500" y1="0" x2="500" y2="400" />
                <line x1="600" y1="0" x2="600" y2="400" />
                <line x1="700" y1="0" x2="700" y2="400" />
                <line x1="0" y1="100" x2="800" y2="100" />
                <line x1="0" y1="200" x2="800" y2="200" stroke="rgba(255, 255, 255, 0.15)" strokeDasharray="none" />
                <line x1="0" y1="300" x2="800" y2="300" />
              </g>

              {/* 2D Continental Silhouettes */}
              <g fill="#0e1419" stroke="#1f2937" strokeWidth="0.75">
                <path d="M 120 70 L 160 65 L 210 75 L 250 85 L 235 120 L 215 140 L 205 175 L 180 185 L 165 170 L 140 145 L 115 120 Z" />
                <path d="M 280 40 L 330 35 L 340 70 L 300 80 Z" />
                <path d="M 230 195 L 265 210 L 290 245 L 280 300 L 250 345 L 235 320 L 225 250 L 220 210 Z" />
                <path d="M 390 85 L 430 75 L 470 95 L 460 130 L 420 135 L 390 120 Z" />
                <path d="M 390 140 L 450 140 L 485 180 L 470 260 L 440 300 L 410 270 L 380 200 L 380 160 Z" />
                <path d="M 470 70 L 590 60 L 680 80 L 720 120 L 670 160 L 620 170 L 560 170 L 520 140 L 470 100 Z" />
                <path d="M 640 260 L 710 260 L 720 310 L 670 330 L 640 300 Z" />
                <path d="M 700 130 L 710 145 L 705 160 L 695 145 Z" />
              </g>

              {/* 2D GPS Jamming Zones */}
              {showGpsJamming &&
                gpsJammingZones.map((zone) => {
                  const [cx, cy] = project2D(zone.lng, zone.lat);
                  const isSelected = selectedEntity?.data?.id === zone.id;
                  return (
                    <g
                      key={`jam-2d-${zone.id}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'jamming', data: zone, screenCoords: [cx, cy] });
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={zone.radiusKm / 12}
                        fill="rgba(168, 85, 247, 0.15)"
                        stroke="#a855f7"
                        strokeWidth={isSelected ? 2 : 1}
                        strokeDasharray="4 2"
                      />
                      <circle cx={cx} cy={cy} r={3} fill="#c084fc" />
                    </g>
                  );
                })}

              {/* 2D Chokepoints */}
              {showChokepoints &&
                chokepoints.map((cp) => {
                  const [cx, cy] = project2D(cp.lng, cp.lat);
                  const isSelected = selectedEntity?.data?.id === cp.id;
                  const color = cp.status === 'High Risk' ? '#ef4444' : cp.status === 'Restricted' ? '#f97316' : cp.status === 'Congested' ? '#eab308' : '#00ff41';

                  return (
                    <g
                      key={`cp-2d-${cp.id}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'chokepoint', data: cp, screenCoords: [cx, cy] });
                      }}
                    >
                      <rect
                        x={cx - 4}
                        y={cy - 4}
                        width="8"
                        height="8"
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        transform={`rotate(45, ${cx}, ${cy})`}
                      />
                      <text
                        x={cx + 6}
                        y={cy + 3}
                        fill="#d1d5db"
                        fontSize="8"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-semibold"
                      >
                        ⚓ {cp.name}
                      </text>
                    </g>
                  );
                })}

              {/* 2D Vessels */}
              {showVessels &&
                trackedVessels.map((v) => {
                  const [cx, cy] = project2D(v.lng, v.lat);
                  const isDark = v.anomalyFlag && v.anomalyFlag !== 'Nominal';
                  const color = isDark ? '#ef4444' : '#00d1ff';
                  const isSelected = selectedEntity?.data?.mmsi === v.mmsi;

                  return (
                    <g
                      key={`vessel-2d-${v.mmsi}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'vessel', data: v, screenCoords: [cx, cy] });
                      }}
                    >
                      <polygon
                        points={`${cx},${cy - 5} ${cx + 3.5},${cy + 4} ${cx - 3.5},${cy + 4}`}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        transform={`rotate(${v.courseDegrees}, ${cx}, ${cy})`}
                      />
                      <text
                        x={cx + 6}
                        y={cy + 3}
                        fill={isDark ? '#f87171' : '#9ca3af'}
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-medium"
                      >
                        🚢 {v.vesselName}
                      </text>
                    </g>
                  );
                })}

              {/* 2D Flights */}
              {showFlights &&
                emergencySquawks.map((flight) => {
                  const [cx, cy] = project2D(flight.lng || 0, flight.lat || 0);
                  const isEmergency = flight.squawk === '7700';
                  const isRecon = flight.squawkType === 'SIGINT Reconnaissance';
                  const color = isEmergency ? '#ef4444' : isRecon ? '#f59e0b' : '#38bdf8';
                  const isSelected = selectedEntity?.data?.icao24 === flight.icao24;

                  return (
                    <g
                      key={`flight-2d-${flight.icao24}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'flight', data: flight, screenCoords: [cx, cy] });
                      }}
                    >
                      {isEmergency && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r="12"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1"
                          className="animate-ping"
                        />
                      )}
                      <polygon
                        points={`${cx},${cy - 6} ${cx + 4.5},${cy + 4} ${cx},${cy + 2} ${cx - 4.5},${cy + 4}`}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                        transform={`rotate(${flight.heading || 0}, ${cx}, ${cy})`}
                      />
                      <text
                        x={cx + 7}
                        y={cy + 3}
                        fill={color}
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-bold"
                      >
                        ✈ {flight.callsign} {isEmergency ? '[7700]' : ''}
                      </text>
                    </g>
                  );
                })}

              {/* 2D Disaster Tweets */}
              {showDisasters &&
                disasterTweets.map((tweet) => {
                  const [cx, cy] = project2D(tweet.location.lng, tweet.location.lat);
                  const isSelected = selectedEntity?.data?.id === tweet.id;
                  const isCritical = tweet.urgency === 'CRITICAL BREAKING';

                  return (
                    <g
                      key={`tweet-2d-${tweet.id}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'disaster', data: tweet, screenCoords: [cx, cy] });
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r="10"
                        fill="none"
                        stroke={isCritical ? '#ef4444' : '#38bdf8'}
                        strokeWidth="1.2"
                        className="animate-ping"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4.5}
                        fill={isCritical ? '#ef4444' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={cx + 6}
                        y={cy + 3}
                        fill="#38bdf8"
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-bold"
                      >
                        🐦 {tweet.handle}
                      </text>
                    </g>
                  );
                })}

              {/* 2D Earthquakes */}
              {showQuakes &&
                earthquakes.map((eq) => {
                  const [cx, cy] = project2D(eq.coordinates[0], eq.coordinates[1]);
                  const isMajor = eq.mag >= 6.0;
                  const isSignificant = eq.mag >= 4.5;
                  const color = isMajor ? '#ef4444' : isSignificant ? '#f59e0b' : '#38bdf8';
                  const radius = Math.max(3, (eq.mag - 2) * 2.8);
                  const isSelected = selectedEntity?.data?.id === eq.id;

                  return (
                    <g
                      key={`quake-2d-${eq.id}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'quake', data: eq, screenCoords: [cx, cy] });
                      }}
                    >
                      {isMajor && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius * 2}
                          fill="none"
                          stroke={color}
                          strokeWidth="1"
                          className="animate-ping"
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={color}
                        fillOpacity="0.85"
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 0.75}
                      />
                    </g>
                  );
                })}

              {/* 2D Fires */}
              {showFires &&
                fireAnomalies.map((fire) => {
                  const [cx, cy] = project2D(fire.lng, fire.lat);
                  const isSelected = selectedEntity?.data?.id === fire.id;
                  return (
                    <g
                      key={`fire-2d-${fire.id}`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'fire', data: fire, screenCoords: [cx, cy] });
                      }}
                    >
                      <polygon
                        points={`${cx},${cy - 5} ${cx + 4},${cy + 3} ${cx - 4},${cy + 3}`}
                        fill="#f97316"
                        stroke="#fbbf24"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                      />
                    </g>
                  );
                })}

              {/* 2D Weather Hubs */}
              {showWeather &&
                weatherHubs.map((hub) => {
                  const [cx, cy] = project2D(hub.lng, hub.lat);
                  const color = hub.aqiUs > 150 ? '#ef4444' : hub.aqiUs > 100 ? '#f59e0b' : '#00ff41';
                  const isSelected = selectedEntity?.data?.city === hub.city;
                  return (
                    <g
                      key={`hub-2d-${hub.city}`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntity({ type: 'weather', data: hub, screenCoords: [cx, cy] });
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 5 : 3.5}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 1.5 : 0.5}
                      />
                      <text
                        x={cx + 6}
                        y={cy + 3}
                        fill="#888888"
                        fontSize="7.5"
                        fontFamily="monospace"
                        className="pointer-events-none group-hover:fill-white font-medium"
                      >
                        {hub.city}
                      </text>
                    </g>
                  );
                })}
            </g>
          )}
        </svg>

        {/* 3D DRAG INSTRUCTION WATERMARK */}
        {projectionMode === '3d' && (
          <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-[#555555] pointer-events-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-ping"></span>
            CLICK & DRAG TO ORBIT 360° // CURRENT VIEW: {rotLat.toFixed(0)}°N, {rotLng.toFixed(0)}°E
          </div>
        )}

        {/* RICH HUD INSPECTOR TOOLTIP CARD */}
        {selectedEntity && (
          <div
            id="map-entity-hud-card"
            className="absolute z-30 bg-[#0c0e12]/95 border border-[#2a3746] rounded-lg p-3.5 shadow-2xl text-xs font-mono max-w-sm backdrop-blur pointer-events-auto"
            style={{
              left: `${Math.min(65, Math.max(5, (selectedEntity.screenCoords?.[0] || 400) / 8))} %`,
              top: `${Math.min(60, Math.max(10, (selectedEntity.screenCoords?.[1] || 200) / 4))} %`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-[#1f2937] pb-1.5 mb-2">
              <span className="font-bold uppercase tracking-wider text-[#00ff41] flex items-center gap-1.5 text-[11px]">
                {selectedEntity.type === 'vessel' && <Ship className="w-3.5 h-3.5 text-cyan-400" />}
                {selectedEntity.type === 'flight' && <Plane className="w-3.5 h-3.5 text-amber-400" />}
                {selectedEntity.type === 'chokepoint' && <Anchor className="w-3.5 h-3.5 text-rose-400" />}
                {selectedEntity.type === 'jamming' && <Radio className="w-3.5 h-3.5 text-purple-400" />}
                {selectedEntity.type === 'quake' && <Zap className="w-3.5 h-3.5 text-rose-400" />}
                {selectedEntity.type === 'fire' && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                {selectedEntity.type === 'disaster' && <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
                {selectedEntity.type === 'weather' && <Wind className="w-3.5 h-3.5 text-emerald-400" />}
                {selectedEntity.type.toUpperCase()} TELEMETRY
              </span>
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                className="text-[#888888] hover:text-white px-1 font-bold"
              >
                ✕
              </button>
            </div>

            {/* 1. VESSEL INSPECTOR */}
            {selectedEntity.type === 'vessel' && (
              <div className="space-y-1.5 text-[#d4d4d4] text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-white text-xs">{selectedEntity.data.vesselName}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#161616] text-[#00d1ff] border border-[#2a2a2a]">
                    {selectedEntity.data.vesselType}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#05080c] p-2 rounded border border-[#1a2332]">
                  <div>MMSI: <strong className="text-white">{selectedEntity.data.mmsi}</strong></div>
                  <div>Flag: <strong className="text-white">{selectedEntity.data.flag}</strong></div>
                  <div>Speed: <strong className="text-[#00ff41]">{selectedEntity.data.speedKnots} kts</strong></div>
                  <div>Course: <strong className="text-white">{selectedEntity.data.courseDegrees}°</strong></div>
                  <div>Draught: <strong className="text-white">{selectedEntity.data.draughtMeters} m</strong></div>
                  <div>Coordinates: <strong className="text-[#00d1ff]">{selectedEntity.data.lat.toFixed(2)}°, {selectedEntity.data.lng.toFixed(2)}°</strong></div>
                </div>
                <div>Destination: <strong className="text-white">{selectedEntity.data.destination}</strong></div>
                {selectedEntity.data.anomalyFlag && selectedEntity.data.anomalyFlag !== 'Nominal' && (
                  <div className="p-1.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[10px]">
                    ⚠️ <strong>ANOMALY:</strong> {selectedEntity.data.anomalyFlag}
                  </div>
                )}
                <a
                  href={`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${selectedEntity.data.mmsi}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-[#00d1ff] hover:underline text-[10px]"
                >
                  Live AIS Track on MarineTraffic ↗
                </a>
              </div>
            )}

            {/* 2. FLIGHT INSPECTOR */}
            {selectedEntity.type === 'flight' && (
              <div className="space-y-1.5 text-[#d4d4d4] text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-white text-xs">{selectedEntity.data.callsign}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    selectedEntity.data.squawk === '7700' ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-[#181818] text-amber-300'
                  }`}>
                    {selectedEntity.data.squawkType}
                  </span>
                </div>
                <div className="text-[10px] text-[#aaaaaa]">{selectedEntity.data.aircraftType} • {selectedEntity.data.originCountry}</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#05080c] p-2 rounded border border-[#1a2332]">
                  <div>ICAO24: <strong className="text-white">{selectedEntity.data.icao24}</strong></div>
                  <div>Squawk: <strong className={selectedEntity.data.squawk === '7700' ? 'text-rose-400 font-bold' : 'text-white'}>{selectedEntity.data.squawk}</strong></div>
                  <div>Altitude: <strong className="text-[#38bdf8]">{selectedEntity.data.altitudeFt?.toLocaleString()} ft</strong></div>
                  <div>Speed: <strong className="text-white">{selectedEntity.data.velocityKnots} kts</strong></div>
                  <div>Heading: <strong className="text-white">{selectedEntity.data.heading}°</strong></div>
                  <div>Coords: <strong className="text-[#00d1ff]">{selectedEntity.data.lat?.toFixed(2)}°, {selectedEntity.data.lng?.toFixed(2)}°</strong></div>
                </div>
                <div>Route: <strong className="text-white">{selectedEntity.data.route}</strong></div>
                {selectedEntity.data.details && (
                  <p className="text-[10px] text-[#9ca3af] italic bg-[#0a0a0a] p-1.5 rounded border border-[#1f1f1f]">
                    {selectedEntity.data.details}
                  </p>
                )}
                <a
                  href={`https://www.flightradar24.com/${selectedEntity.data.callsign}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-[#38bdf8] hover:underline text-[10px]"
                >
                  Live ADS-B Radar on FlightRadar24 ↗
                </a>
              </div>
            )}

            {/* 3. CHOKEPOINT INSPECTOR */}
            {selectedEntity.type === 'chokepoint' && (
              <div className="space-y-1.5 text-[#d4d4d4] text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-white text-xs">{selectedEntity.data.name}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 font-bold border border-rose-800">
                    {selectedEntity.data.status}
                  </span>
                </div>
                <div className="text-[10px] text-[#888888]">{selectedEntity.data.location}</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#05080c] p-2 rounded border border-[#1a2332]">
                  <div>Risk Index: <strong className="text-rose-400">{selectedEntity.data.riskScore}/100</strong></div>
                  <div>24h Transits: <strong className="text-white">{selectedEntity.data.transitVolume24h}</strong></div>
                  <div>Avg Delay: <strong className="text-amber-400">{selectedEntity.data.averageDelayHours} hrs</strong></div>
                  <div>Queue: <strong className="text-white">{selectedEntity.data.vesselsWaiting} waiting</strong></div>
                </div>
                <div>Flow: <strong className="text-white">{selectedEntity.data.flowDescription}</strong></div>
                {selectedEntity.data.securityAlert && (
                  <div className="p-1.5 rounded bg-amber-950/30 border border-amber-800/50 text-amber-300 text-[10px]">
                    📢 {selectedEntity.data.securityAlert}
                  </div>
                )}
              </div>
            )}

            {/* 4. GPS JAMMING INSPECTOR */}
            {selectedEntity.type === 'jamming' && (
              <div className="space-y-1.5 text-[#d4d4d4] text-[11px]">
                <span className="font-sans font-bold text-white text-xs">{selectedEntity.data.region}</span>
                <div className="text-[10px] text-purple-300 font-bold">Severity: {selectedEntity.data.severity}</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#05080c] p-2 rounded border border-[#1a2332]">
                  <div>Radius: <strong className="text-white">{selectedEntity.data.radiusKm} km</strong></div>
                  <div>Coordinates: <strong className="text-[#00d1ff]">{selectedEntity.data.lat.toFixed(2)}°, {selectedEntity.data.lng.toFixed(2)}°</strong></div>
                </div>
                <p className="text-[10px] text-[#e5e5e5]">{selectedEntity.data.impactDescription}</p>
                <div className="text-[10px] text-[#888888]">Primary FIRs: {selectedEntity.data.primaryAffectedAirspace}</div>
              </div>
            )}

            {/* 5. DISASTER TWEET INSPECTOR */}
            {selectedEntity.type === 'disaster' && (
              <div className="space-y-1.5 text-[#d4d4d4] text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-sans font-bold text-white text-xs">{selectedEntity.data.authorName}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 font-bold">
                    {selectedEntity.data.urgency}
                  </span>
                </div>
                <div className="text-[10px] text-[#38bdf8] font-mono">{selectedEntity.data.handle} • {selectedEntity.data.timeAgo}</div>
                <p className="text-[11px] text-[#f3f4f6] leading-relaxed bg-[#05080c] p-2 rounded border border-[#1a2332]">
                  {selectedEntity.data.text}
                </p>
                <div className="text-[10px] text-[#888888] flex items-center justify-between">
                  <span>Location: {selectedEntity.data.location.name}</span>
                  <span>RT: {selectedEntity.data.metrics.retweets} • Likes: {selectedEntity.data.metrics.likes}</span>
                </div>
                <a
                  href={selectedEntity.data.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-[#38bdf8] hover:underline text-[10px]"
                >
                  View Original Dispatch on X ↗
                </a>
              </div>
            )}

            {/* 6. EARTHQUAKE INSPECTOR */}
            {selectedEntity.type === 'quake' && (
              <div className="space-y-1.5 text-[#d4d4d4] text-[11px]">
                <p className="font-sans font-bold text-white text-xs">{selectedEntity.data.place}</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#05080c] p-2 rounded border border-[#1a2332]">
                  <div>Magnitude: <strong className="text-rose-400 font-bold">M{selectedEntity.data.mag}</strong></div>
                  <div>Depth: <strong className="text-[#00d1ff]">{selectedEntity.data.coordinates[2]} km</strong></div>
                  <div>Coordinates: <strong className="text-white">{selectedEntity.data.coordinates[1].toFixed(2)}°, {selectedEntity.data.coordinates[0].toFixed(2)}°</strong></div>
                  <div>Tsunami: <strong className={selectedEntity.data.tsunami ? 'text-rose-400' : 'text-[#00ff41]'}>{selectedEntity.data.tsunami ? 'WARNING' : 'NONE'}</strong></div>
                </div>
                <a
                  href={selectedEntity.data.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-1 text-[#00ff41] hover:underline text-[10px]"
                >
                  View on USGS.gov ↗
                </a>
              </div>
            )}

            {/* 7. THERMAL FIRE INSPECTOR */}
            {selectedEntity.type === 'fire' && (
              <div className="space-y-1 text-[#d4d4d4] text-[11px]">
                <p className="font-sans font-bold text-white text-xs">{selectedEntity.data.region}</p>
                <div>Radiative Power: <strong className="text-amber-400">{selectedEntity.data.frp} MW</strong></div>
                <div>Confidence: <strong className="text-amber-300 uppercase">{selectedEntity.data.confidence}</strong></div>
                <div>Detected: {selectedEntity.data.acqDate}</div>
              </div>
            )}

            {/* 8. WEATHER HUB INSPECTOR */}
            {selectedEntity.type === 'weather' && (
              <div className="space-y-1 text-[#d4d4d4] text-[11px]">
                <p className="font-sans font-bold text-white text-xs">{selectedEntity.data.city}, {selectedEntity.data.country}</p>
                <div>AQI: <strong className="text-[#00d1ff] font-bold">{selectedEntity.data.aqiUs} ({selectedEntity.data.aqiCategory})</strong></div>
                <div>PM2.5: {selectedEntity.data.pm25} µg/m³ | Temp: {selectedEntity.data.tempC}°C</div>
                <div>Condition: {selectedEntity.data.condition}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER METRICS & LEGEND BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] font-mono text-[#737373] border-t border-[#141414]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-[#00d1ff]">
            <Ship className="w-3 h-3" /> Vessel Tracking
          </span>
          <span className="flex items-center gap-1 text-amber-300">
            <Plane className="w-3 h-3" /> ADS-B Flights
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <Anchor className="w-3 h-3" /> Chokepoints
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <Radio className="w-3 h-3" /> GPS Jamming
          </span>
          <span className="flex items-center gap-1 text-sky-400">
            <Sparkles className="w-3 h-3" /> X/Twitter Disaster Beacons
          </span>
          <span className="flex items-center gap-1 text-rose-500">
            ● Quakes
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            ▲ Thermal Fires
          </span>
        </div>

        <div className="text-[#555555]">
          CLICK ANY VESSEL, FLIGHT OR CHOKEPOINT FOR FULL TELEMETRY
        </div>
      </div>
    </div>
  );
};
