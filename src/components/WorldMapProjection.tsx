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
  Minimize2,
  Navigation,
  Plane,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Ship,
  Sparkles,
  Sun,
  Volume2,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  DisasterTweetItem,
  EarthquakeItem,
  FireAnomalyItem,
  FlightAnomalyItem,
  GpsJammingZoneItem,
  KineticStrikeItem,
  MaritimeChokepointItem,
  MaritimeVesselItem,
  StormItem,
  UserLocation,
  WeatherHubItem,
  WindVector,
} from '../types.js';
import {
  ACTIVE_GLOBAL_STORMS,
  ACTIVE_KINETIC_STRIKES,
  GLOBAL_WIND_VECTORS,
  calculateDistanceKm,
  generateWhatsAppAlertUrl,
} from '../utils/geoIntelligence.js';
import { playTacticalBlip } from '../utils/audio.js';
import { EntityDetailCard, SelectedEntityData } from './EntityDetailCard.js';

interface WorldMapProjectionProps {
  earthquakes?: EarthquakeItem[];
  fireAnomalies?: FireAnomalyItem[];
  weatherHubs?: WeatherHubItem[];
  trackedVessels?: MaritimeVesselItem[];
  chokepoints?: MaritimeChokepointItem[];
  emergencySquawks?: FlightAnomalyItem[];
  gpsJammingZones?: GpsJammingZoneItem[];
  disasterTweets?: DisasterTweetItem[];
  userLocation: UserLocation;
  onUpdateUserLocation: (loc: UserLocation) => void;
  onOpenWhatsAppModal: () => void;
  onNavigateToDesk: (deskId: string) => void;
  liteMode?: boolean;
}

// 2D Projection helper (1000 x 500 SVG canvas for ultra crisp full-width detail)
function project2D(lng: number, lat: number): [number, number] {
  const safeLng = isNaN(lng) ? 0 : Math.max(-180, Math.min(180, lng));
  const safeLat = isNaN(lat) ? 0 : Math.max(-85, Math.min(85, lat));
  const x = ((safeLng + 180) / 360) * 1000;
  const y = ((90 - safeLat) / 180) * 500;
  return [x, y];
}

// 3D Orthographic projection to sphere
function project3D(
  lng: number,
  lat: number,
  rotLng: number,
  rotLat: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number; visible: boolean; cosC: number } {
  const safeLng = isNaN(lng) ? 0 : lng;
  const safeLat = isNaN(lat) ? 0 : lat;
  const rad = Math.PI / 180;
  const phi = safeLat * rad;
  const lambda = safeLng * rad;
  const phi0 = (rotLat || 0) * rad;
  const lambda0 = (rotLng || 0) * rad;

  const cosC =
    Math.sin(phi0) * Math.sin(phi) +
    Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

  const visible = cosC > 0.05;

  const x = cx + radius * Math.cos(phi) * Math.sin(lambda - lambda0);
  const y =
    cy -
    radius *
      (Math.cos(phi0) * Math.sin(phi) -
        Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

  return { x: isNaN(x) ? cx : x, y: isNaN(y) ? cy : y, visible, cosC };
}

// HIGH-FIDELITY REALISTIC CONTINENT & REGION VECTOR POLYGONS
interface Landmass {
  name: string;
  points: [number, number][];
  biomeGradient: string;
  elevationRidge?: [number, number][];
}

const HIGH_RES_LANDMASSES: Landmass[] = [
  // 1. NORTH AMERICA
  {
    name: 'North America Main',
    points: [
      [-168, 65], [-162, 70], [-150, 71], [-135, 69], [-120, 74], [-105, 74],
      [-95, 73], [-82, 65], [-76, 58], [-64, 60], [-55, 52], [-60, 46],
      [-66, 44], [-70, 42], [-75, 38], [-76, 35], [-80, 31], [-81, 25],
      [-82, 28], [-88, 30], [-94, 29], [-97, 26], [-97, 21], [-92, 18],
      [-88, 21], [-83, 15], [-77, 8], [-80, 8], [-84, 10], [-90, 14],
      [-96, 16], [-102, 19], [-106, 23], [-110, 24], [-115, 30], [-117, 32],
      [-121, 35], [-124, 40], [-124, 48], [-128, 52], [-134, 57], [-145, 60],
      [-155, 58], [-165, 59], [-168, 65],
    ],
    biomeGradient: 'url(#biome-north-america)',
    elevationRidge: [
      [-120, 52], [-115, 45], [-110, 40], [-107, 34], [-103, 26],
    ],
  },
  {
    name: 'Alaska Peninsula & Aleutian Arc',
    points: [
      [-165, 59], [-160, 56], [-155, 58], [-150, 60], [-142, 60], [-145, 61],
      [-155, 63], [-164, 62],
    ],
    biomeGradient: 'url(#biome-taiga)',
  },
  {
    name: 'Greenland Ice Sheet',
    points: [
      [-50, 60], [-42, 60], [-35, 65], [-20, 70], [-18, 77], [-25, 82],
      [-40, 83], [-55, 82], [-60, 76], [-55, 70], [-52, 65],
    ],
    biomeGradient: 'url(#biome-ice)',
  },
  {
    name: 'Canadian Arctic Archipelago',
    points: [
      [-110, 74], [-95, 76], [-80, 78], [-70, 74], [-75, 70], [-90, 69],
      [-105, 70],
    ],
    biomeGradient: 'url(#biome-ice)',
  },

  // 2. CARIBBEAN ISLANDS
  {
    name: 'Cuba',
    points: [[-84, 22], [-80, 23], [-75, 20], [-77, 19], [-83, 21]],
    biomeGradient: 'url(#biome-rainforest)',
  },
  {
    name: 'Hispaniola & Puerto Rico',
    points: [[-74, 19], [-70, 19], [-66, 18], [-68, 17], [-73, 18]],
    biomeGradient: 'url(#biome-rainforest)',
  },

  // 3. SOUTH AMERICA
  {
    name: 'South America Main',
    points: [
      [-77, 8], [-72, 11], [-65, 11], [-60, 8], [-52, 4], [-45, -1],
      [-36, -5], [-35, -9], [-38, -13], [-40, -18], [-44, -23], [-49, -28],
      [-54, -34], [-60, -38], [-65, -43], [-67, -50], [-68, -55], [-72, -54],
      [-74, -50], [-75, -45], [-72, -38], [-71, -30], [-74, -20], [-77, -12],
      [-81, -5], [-80, 1], [-77, 8],
    ],
    biomeGradient: 'url(#biome-south-america)',
    elevationRidge: [
      [-76, 6], [-74, -5], [-72, -15], [-70, -25], [-71, -36], [-73, -48],
    ],
  },

  // 4. EUROPE
  {
    name: 'Europe Main',
    points: [
      [-9, 38], [-9, 43], [-3, 44], [-1, 47], [4, 49], [9, 54], [14, 55],
      [22, 56], [28, 59], [30, 68], [40, 67], [50, 64], [55, 60], [48, 50],
      [42, 46], [35, 45], [30, 42], [24, 38], [22, 36], [16, 38], [14, 42],
      [9, 44], [3, 42], [-2, 37], [-6, 36],
    ],
    biomeGradient: 'url(#biome-europe)',
    elevationRidge: [[6, 46], [10, 46], [14, 46]],
  },
  {
    name: 'British Isles & Ireland',
    points: [
      [-5, 50], [-1, 51], [1, 53], [-1, 57], [-4, 58], [-6, 55], [-4, 52],
    ],
    biomeGradient: 'url(#biome-europe)',
  },
  {
    name: 'Ireland',
    points: [[-10, 52], [-8, 54], [-6, 54], [-6, 52], [-9, 51]],
    biomeGradient: 'url(#biome-europe)',
  },
  {
    name: 'Scandinavia (Norway & Sweden)',
    points: [
      [5, 59], [9, 58], [13, 56], [18, 60], [24, 65], [29, 70], [22, 71],
      [14, 68], [8, 63], [5, 59],
    ],
    biomeGradient: 'url(#biome-taiga)',
  },
  {
    name: 'Italy & Sicily',
    points: [
      [9, 44], [12, 44], [16, 41], [18, 40], [16, 38], [14, 37], [13, 40],
      [11, 43],
    ],
    biomeGradient: 'url(#biome-europe)',
  },

  // 5. AFRICA
  {
    name: 'Africa Main',
    points: [
      [-17, 30], [-10, 35], [-2, 36], [8, 37], [16, 32], [26, 32], [32, 31],
      [34, 27], [37, 22], [42, 15], [51, 12], [47, 7], [42, 0], [40, -10],
      [35, -22], [32, -28], [28, -33], [20, -34], [16, -29], [12, -18],
      [10, -5], [8, 4], [3, 6], [-5, 5], [-12, 7], [-17, 14], [-17, 24],
      [-17, 30],
    ],
    biomeGradient: 'url(#biome-africa)',
    elevationRidge: [
      [36, 12], [38, 5], [36, -5], [34, -15],
    ],
  },
  {
    name: 'Madagascar',
    points: [
      [47, -13], [50, -16], [48, -23], [44, -25], [44, -19], [46, -15],
    ],
    biomeGradient: 'url(#biome-rainforest)',
  },

  // 6. MIDDLE EAST
  {
    name: 'Arabian Peninsula & Levant',
    points: [
      [34, 31], [40, 33], [46, 31], [50, 28], [55, 25], [60, 22], [58, 16],
      [52, 14], [45, 13], [42, 16], [38, 22], [35, 27],
    ],
    biomeGradient: 'url(#biome-desert)',
  },

  // 7. ASIA & EURASIA
  {
    name: 'Asia Main (Eurasian Landmass)',
    points: [
      [55, 60], [65, 68], [75, 72], [90, 75], [110, 76], [130, 73],
      [150, 71], [170, 68], [178, 65], [170, 60], [160, 56], [155, 52],
      [145, 48], [135, 42], [125, 40], [120, 34], [118, 25], [110, 20],
      [105, 14], [101, 8], [98, 14], [92, 21], [85, 22], [78, 28], [72, 24],
      [68, 25], [60, 25], [52, 33], [48, 40], [48, 50], [55, 60],
    ],
    biomeGradient: 'url(#biome-asia)',
    elevationRidge: [
      [75, 35], [85, 32], [95, 30], [102, 28],
    ],
  },
  {
    name: 'Indian Subcontinent',
    points: [
      [68, 24], [74, 28], [82, 26], [88, 22], [84, 16], [80, 10], [77, 8],
      [73, 14], [70, 19],
    ],
    biomeGradient: 'url(#biome-rainforest)',
  },
  {
    name: 'Sri Lanka',
    points: [[80, 9], [81, 8], [81, 6], [80, 6]],
    biomeGradient: 'url(#biome-rainforest)',
  },
  {
    name: 'Korean Peninsula',
    points: [[125, 39], [129, 38], [129, 35], [126, 35]],
    biomeGradient: 'url(#biome-asia)',
  },
  {
    name: 'Japan Archipelago (Honshu, Hokkaido, Kyushu)',
    points: [
      [141, 45], [145, 44], [141, 41], [138, 37], [133, 34], [130, 32],
      [131, 34], [136, 36], [140, 39],
    ],
    biomeGradient: 'url(#biome-europe)',
  },
  {
    name: 'Taiwan',
    points: [[120, 25], [122, 25], [121, 22], [120, 22]],
    biomeGradient: 'url(#biome-rainforest)',
  },
  {
    name: 'Philippines Archipelago',
    points: [
      [120, 18], [123, 17], [125, 13], [126, 8], [122, 6], [120, 10],
      [118, 14],
    ],
    biomeGradient: 'url(#biome-rainforest)',
  },
  {
    name: 'Indonesian Archipelago (Sumatra, Java, Borneo, Papua)',
    points: [
      [96, 4], [102, 1], [106, -5], [112, -7], [118, -8], [125, -8],
      [135, -4], [140, -3], [145, -6], [140, -8], [130, -5], [120, -2],
      [110, 0], [100, 3],
    ],
    biomeGradient: 'url(#biome-rainforest)',
  },

  // 8. OCEANIA & AUSTRALIA
  {
    name: 'Australia Main',
    points: [
      [114, -22], [120, -18], [130, -12], [138, -16], [143, -12], [148, -18],
      [153, -27], [150, -34], [144, -38], [136, -35], [128, -32], [118, -35],
      [114, -28], [114, -22],
    ],
    biomeGradient: 'url(#biome-australia)',
    elevationRidge: [[148, -20], [150, -28], [146, -36]],
  },
  {
    name: 'Tasmania',
    points: [[145, -41], [148, -41], [148, -43], [145, -43]],
    biomeGradient: 'url(#biome-europe)',
  },
  {
    name: 'New Zealand',
    points: [
      [173, -35], [177, -38], [174, -42], [170, -45], [167, -46], [170, -42],
    ],
    biomeGradient: 'url(#biome-europe)',
  },

  // 9. ANTARCTICA
  {
    name: 'Antarctica Continent',
    points: [
      [-180, -78], [-140, -74], [-90, -72], [-65, -64], [-55, -66],
      [-30, -70], [0, -68], [40, -67], [80, -66], [120, -65], [160, -72],
      [180, -78], [180, -85], [-180, -85],
    ],
    biomeGradient: 'url(#biome-ice)',
  },
];

// Major Global Megacities for Realistic Night Lights
const GLOBAL_CITY_LIGHTS: { name: string; lat: number; lng: number; intensity: number }[] = [
  { name: 'Tokyo', lat: 35.67, lng: 139.65, intensity: 1.0 },
  { name: 'Shanghai', lat: 31.23, lng: 121.47, intensity: 0.95 },
  { name: 'Beijing', lat: 39.9, lng: 116.4, intensity: 0.9 },
  { name: 'Seoul', lat: 37.56, lng: 126.97, intensity: 0.9 },
  { name: 'Guangzhou / HK', lat: 22.8, lng: 113.8, intensity: 1.0 },
  { name: 'Delhi', lat: 28.61, lng: 77.2, intensity: 0.9 },
  { name: 'Mumbai', lat: 19.07, lng: 72.87, intensity: 0.85 },
  { name: 'Dubai', lat: 25.2, lng: 55.27, intensity: 0.9 },
  { name: 'Singapore', lat: 1.35, lng: 103.82, intensity: 0.95 },
  { name: 'London', lat: 51.5, lng: -0.12, intensity: 0.95 },
  { name: 'Paris', lat: 48.85, lng: 2.35, intensity: 0.9 },
  { name: 'Frankfurt / Rhine', lat: 50.11, lng: 8.68, intensity: 0.85 },
  { name: 'Moscow', lat: 55.75, lng: 37.61, intensity: 0.8 },
  { name: 'Cairo', lat: 30.04, lng: 31.23, intensity: 0.8 },
  { name: 'New York', lat: 40.71, lng: -74.0, intensity: 1.0 },
  { name: 'Chicago', lat: 41.87, lng: -87.62, intensity: 0.85 },
  { name: 'Los Angeles', lat: 34.05, lng: -118.24, intensity: 0.95 },
  { name: 'San Francisco', lat: 37.77, lng: -122.41, intensity: 0.85 },
  { name: 'Mexico City', lat: 19.43, lng: -99.13, intensity: 0.85 },
  { name: 'São Paulo', lat: -23.55, lng: -46.63, intensity: 0.9 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.38, intensity: 0.75 },
  { name: 'Johannesburg', lat: -26.2, lng: 28.04, intensity: 0.7 },
  { name: 'Sydney', lat: -33.86, lng: 151.2, intensity: 0.8 },
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
  userLocation,
  onUpdateUserLocation,
  onOpenWhatsAppModal,
  onNavigateToDesk,
  liteMode = false,
}) => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<[number, number]>([0, 0]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<[number, number]>([0, 0]);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntityData | null>(null);
  const [radarSweepAngle, setRadarSweepAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [globeRotation, setGlobeRotation] = useState<[number, number]>([15, 12]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [nightModeTerminator, setNightModeTerminator] = useState<boolean>(true);

  // Layer Toggles
  const [layers, setLayers] = useState({
    userFocal: true,
    flights: true,
    vessels: true,
    chokepoints: true,
    earthquakes: true,
    wildfires: true,
    storms: true,
    windFlow: true,
    disasters: true,
    gpsJamming: true,
    strikes: true,
    topography: true,
    cityLights: true,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Radar sweep animation
  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      setRadarSweepAngle((prev) => (prev + 1.0) % 360);
      if (autoRotate && viewMode === '3d') {
        setGlobeRotation(([lng, lat]) => [(lng + 0.3) % 360, lat]);
      }
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [autoRotate, viewMode]);

  // Center on user focal point
  const handleCenterOnUser = () => {
    playTacticalBlip(1600);
    if (viewMode === '3d') {
      setGlobeRotation([-userLocation.lng, userLocation.lat]);
    } else {
      const [ux, uy] = project2D(userLocation.lng, userLocation.lat);
      setPanOffset([500 - ux * zoomLevel, 250 - uy * zoomLevel]);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => {
    playTacticalBlip(1200);
    setZoomLevel((z) => Math.min(4.5, z + 0.35));
  };
  const handleZoomOut = () => {
    playTacticalBlip(1000);
    setZoomLevel((z) => Math.max(1, z - 0.35));
  };
  const handleResetZoom = () => {
    playTacticalBlip(1100);
    setZoomLevel(1);
    setPanOffset([0, 0]);
  };

  // Drag handlers for 2D Pan and 3D Rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart([e.clientX, e.clientY]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart[0];
    const dy = e.clientY - dragStart[1];
    setDragStart([e.clientX, e.clientY]);

    if (viewMode === '2d') {
      setPanOffset(([px, py]) => [px + dx, py + dy]);
    } else {
      setGlobeRotation(([lng, lat]) => [
        (lng - dx * 0.4) % 360,
        Math.max(-75, Math.min(75, lat + dy * 0.4)),
      ]);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Jump camera to coordinates
  const handleJumpToCoord = (lat: number, lng: number) => {
    playTacticalBlip(1500);
    if (viewMode === '3d') {
      setGlobeRotation([-lng, lat]);
    } else {
      const [targetX, targetY] = project2D(lng, lat);
      setZoomLevel(2.0);
      setPanOffset([500 - targetX * 2.0, 250 - targetY * 2.0]);
    }
  };

  const toggleLayer = (layerKey: keyof typeof layers) => {
    playTacticalBlip(1300);
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Compute Solar Subsolar Point for Twilight Terminator (~0° Lat approx, UTC hour)
  const sunLng = useMemo(() => {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    // Subsolar point moves 360 degrees in 24 hours: 12 UTC = 0° lng, 0 UTC = 180° lng
    return ((12 - utcHours) * 15 + 360) % 360 - 180;
  }, []);

  const [sunX] = project2D(sunLng, 0);

  return (
    <div
      ref={containerRef}
      id="top-global-radar-map"
      className={`w-full bg-[#03060d] border border-[#162338] rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans transition-all relative ${
        isFullscreen ? 'fixed inset-2 z-50 h-[96vh]' : 'w-full'
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="px-3 py-2.5 bg-[#070d18] border-b border-[#162338] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono select-none">
        {/* Left: Map Title & Status */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] shadow-sm shadow-[#00ff41]/20">
            <GlobeIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider">
                PHOTOREALISTIC GLOBAL SURVEILLANCE RADAR
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0e2744] text-[#00d1ff] border border-[#00d1ff]/50">
                FULL-SPAN LIVE GIS
              </span>
            </div>
            <div className="text-[10px] text-[#6b859e] hidden sm:block">
              Photorealistic Biome Elevation • Bathymetry Shelf • ADS-B Aircraft • AIS Tankers • USGS Seismology • NASA FIRMS
            </div>
          </div>
        </div>

        {/* Right: View Mode & Zoom Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Center on user button */}
          <button
            type="button"
            onClick={handleCenterOnUser}
            className="px-2.5 py-1 rounded bg-[#00ff41]/20 hover:bg-[#00ff41]/30 border border-[#00ff41]/60 text-[#00ff41] font-bold flex items-center gap-1.5 text-xs transition-all shadow-sm"
            title={`Center map on ${userLocation.name}`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">🎯 Center on Me</span>
            <span className="sm:hidden">Me</span>
          </button>

          {/* 2D Satellite vs 3D Globe Toggle */}
          <div className="flex rounded bg-[#040811] p-0.5 border border-[#162338]">
            <button
              type="button"
              onClick={() => {
                setViewMode('2d');
                playTacticalBlip(1200);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                viewMode === '2d'
                  ? 'bg-[#102a45] text-[#00ff41] border border-[#1d4b7a]'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              2D Photorealistic
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('3d');
                playTacticalBlip(1200);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                viewMode === '3d'
                  ? 'bg-[#102a45] text-[#00ff41] border border-[#1d4b7a]'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              3D Globe
            </button>
          </div>

          {/* 3D Auto Rotate */}
          {viewMode === '3d' && (
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                autoRotate
                  ? 'bg-[#00d1ff]/20 text-[#00d1ff] border-[#00d1ff]/60'
                  : 'bg-[#040811] text-[#888888] border-[#162338]'
              }`}
            >
              {autoRotate ? 'Orbit: ON' : 'Orbit: OFF'}
            </button>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#040811] p-0.5 rounded border border-[#162338]">
            <button
              type="button"
              onClick={handleZoomIn}
              className="px-2 py-0.5 rounded text-[#888888] hover:text-white hover:bg-[#162338]"
              title="Zoom In"
            >
              +
            </button>
            <span className="px-1 text-[10px] text-[#00d1ff] font-bold">
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="px-2 py-0.5 rounded text-[#888888] hover:text-white hover:bg-[#162338]"
              title="Zoom Out"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 rounded text-[10px] text-[#888888] hover:text-white hover:bg-[#162338]"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded bg-[#040811] hover:bg-[#162338] border border-[#162338] text-[#888888] hover:text-white"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Layer Filters Strip */}
      <div className="px-3 py-1.5 bg-[#050b14] border-b border-[#162338] flex flex-wrap items-center gap-1.5 text-[11px] font-mono select-none overflow-x-auto">
        <span className="text-[#55718a] uppercase text-[10px] tracking-wider mr-1 flex items-center gap-1">
          <Layers className="w-3 h-3 text-[#00d1ff]" />
          GIS Layers:
        </span>

        {/* User Focal Point */}
        <button
          type="button"
          onClick={() => toggleLayer('userFocal')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.userFocal
              ? 'bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41]/60 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Compass className="w-3 h-3" />
          You ({userLocation?.name?.slice(0, 10) || 'Home'})
        </button>

        {/* Storms */}
        <button
          type="button"
          onClick={() => toggleLayer('storms')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.storms
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Wind className="w-3 h-3" />
          Storms ({ACTIVE_GLOBAL_STORMS.length})
        </button>

        {/* Wind Streamlines */}
        <button
          type="button"
          onClick={() => toggleLayer('windFlow')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.windFlow
              ? 'bg-teal-950/80 text-teal-300 border-teal-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <span>💨</span>
          Wind Streams
        </button>

        {/* Twitter Disaster OSINT */}
        <button
          type="button"
          onClick={() => toggleLayer('disasters')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.disasters
              ? 'bg-rose-950/80 text-rose-300 border-rose-600 font-bold animate-pulse'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          Disasters ({disasterTweets.length})
        </button>

        {/* Earthquakes */}
        <button
          type="button"
          onClick={() => toggleLayer('earthquakes')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.earthquakes
              ? 'bg-amber-950/80 text-amber-300 border-amber-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Activity className="w-3 h-3" />
          Quakes ({earthquakes.length})
        </button>

        {/* Flights ADS-B */}
        <button
          type="button"
          onClick={() => toggleLayer('flights')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.flights
              ? 'bg-sky-950/80 text-sky-300 border-sky-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Plane className="w-3 h-3" />
          ADS-B Flights ({emergencySquawks.length})
        </button>

        {/* Maritime Vessels */}
        <button
          type="button"
          onClick={() => toggleLayer('vessels')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.vessels
              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Ship className="w-3 h-3" />
          AIS Maritime ({trackedVessels.length})
        </button>

        {/* Wildfires FIRMS */}
        <button
          type="button"
          onClick={() => toggleLayer('wildfires')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.wildfires
              ? 'bg-orange-950/80 text-orange-300 border-orange-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Flame className="w-3 h-3" />
          Wildfires ({fireAnomalies.length})
        </button>

        {/* Kinetic Strikes */}
        <button
          type="button"
          onClick={() => toggleLayer('strikes')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.strikes
              ? 'bg-red-950/80 text-red-300 border-red-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <AlertOctagon className="w-3 h-3" />
          Strikes ({ACTIVE_KINETIC_STRIKES.length})
        </button>

        {/* GPS Jamming */}
        <button
          type="button"
          onClick={() => toggleLayer('gpsJamming')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.gpsJamming
              ? 'bg-purple-950/80 text-purple-300 border-purple-600 font-bold'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Radio className="w-3 h-3" />
          GPS Jamming ({gpsJammingZones.length})
        </button>

        {/* City Night Lights */}
        <button
          type="button"
          onClick={() => toggleLayer('cityLights')}
          className={`px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
            layers.cityLights
              ? 'bg-amber-950/60 text-amber-200 border-amber-500/70'
              : 'bg-[#070d18] text-[#4d667c] border-[#162338]'
          }`}
        >
          <Sun className="w-3 h-3" />
          City Lights
        </button>
      </div>

      {/* Primary Interactive Full-Width GIS Canvas */}
      <div
        className="relative w-full h-[460px] md:h-[540px] lg:h-[580px] bg-[#02050b] cursor-crosshair overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* ========================================================================= */}
        {/* 2D PHOTOREALISTIC SATELLITE VECTOR PROJECTION (1000 x 500 space)         */}
        {/* ========================================================================= */}
        {viewMode === '2d' && (
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full block pointer-events-auto"
            style={{
              transform: `translate(${panOffset[0]}px, ${panOffset[1]}px) scale(${zoomLevel})`,
              transformOrigin: '500px 250px',
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
          >
            <defs>
              {/* Photorealistic Ocean Bathymetry Gradient */}
              <radialGradient id="ocean-bathymetry" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stopColor="#082342" />
                <stop offset="35%" stopColor="#05162c" />
                <stop offset="70%" stopColor="#030c1a" />
                <stop offset="100%" stopColor="#01060e" />
              </radialGradient>

              {/* Realistic Biome Topographic Multi-stop Gradients */}
              <linearGradient id="biome-north-america" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#193b22" /> {/* Canadian Boreal */}
                <stop offset="35%" stopColor="#2c5127" /> {/* Great Lakes */}
                <stop offset="65%" stopColor="#5c6628" /> {/* Great Plains */}
                <stop offset="85%" stopColor="#8c773a" /> {/* Southwest Arid */}
                <stop offset="100%" stopColor="#264821" /> {/* Coastal Green */}
              </linearGradient>

              <linearGradient id="biome-south-america" x1="0%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#15471e" /> {/* Amazon Basin */}
                <stop offset="45%" stopColor="#0e3d16" />
                <stop offset="75%" stopColor="#4f5e2d" /> {/* Cerrado/Pampas */}
                <stop offset="100%" stopColor="#676e65" /> {/* Andes Ridge */}
              </linearGradient>

              <linearGradient id="biome-europe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#274f2d" />
                <stop offset="55%" stopColor="#375a31" />
                <stop offset="100%" stopColor="#766f3f" /> {/* Mediterranean */}
              </linearGradient>

              <linearGradient id="biome-taiga" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#122a1b" />
                <stop offset="100%" stopColor="#183624" />
              </linearGradient>

              <linearGradient id="biome-africa" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8d6e3c" /> {/* Sahara Sand */}
                <stop offset="32%" stopColor="#a37f40" /> {/* Sahel */}
                <stop offset="55%" stopColor="#164d23" /> {/* Congo Rainforest */}
                <stop offset="80%" stopColor="#4f6029" /> {/* Savanna */}
                <stop offset="100%" stopColor="#675736" /> {/* Kalahari */}
              </linearGradient>

              <linearGradient id="biome-desert" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9e7b41" />
                <stop offset="100%" stopColor="#b58d4e" />
              </linearGradient>

              <linearGradient id="biome-asia" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#183520" /> {/* Siberia */}
                <stop offset="35%" stopColor="#556037" /> {/* Steppes */}
                <stop offset="65%" stopColor="#274e2a" /> {/* East China */}
                <stop offset="85%" stopColor="#6b6148" /> {/* Tibetan Plateau */}
                <stop offset="100%" stopColor="#184a22" /> {/* Indochina */}
              </linearGradient>

              <linearGradient id="biome-rainforest" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10471c" />
                <stop offset="100%" stopColor="#0a3614" />
              </linearGradient>

              <linearGradient id="biome-australia" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8f4625" /> {/* Red Outback */}
                <stop offset="55%" stopColor="#a6612f" />
                <stop offset="100%" stopColor="#3d572d" /> {/* Coastal Green */}
              </linearGradient>

              <linearGradient id="biome-ice" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#edf6fc" />
                <stop offset="100%" stopColor="#cbe1ef" />
              </linearGradient>

              {/* Coastal Cyan Glow Filter */}
              <filter id="coastal-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* City Lights Glow Filter */}
              <filter id="city-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Deep Ocean Basin */}
            <rect width="1000" height="500" fill="url(#ocean-bathymetry)" />

            {/* Bathymetric Oceanic Trenches & Continental Shelves */}
            <g opacity="0.6">
              {/* Mid-Atlantic Ridge */}
              <path
                d="M 450,60 Q 420,150 460,250 T 450,400"
                stroke="#0e3a63"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                fill="none"
              />
              {/* Mariana Trench & Pacific Rim */}
              <path
                d="M 850,120 Q 900,250 860,380"
                stroke="#0e3a63"
                strokeWidth="2"
                strokeDasharray="5 5"
                fill="none"
              />
            </g>

            {/* Precision Latitude & Longitude Graticule Matrix */}
            <g stroke="#10253d" strokeWidth="0.5" opacity="0.65">
              {/* Equator */}
              <line x1="0" y1="250" x2="1000" y2="250" stroke="#1d4d7a" strokeWidth="1" strokeDasharray="4 4" />
              {/* Tropics */}
              <line x1="0" y1="185" x2="1000" y2="185" stroke="#16395c" strokeWidth="0.75" />
              <line x1="0" y1="315" x2="1000" y2="315" stroke="#16395c" strokeWidth="0.75" />
              {/* Prime Meridian */}
              <line x1="500" y1="0" x2="500" y2="500" stroke="#1d4d7a" strokeWidth="1" strokeDasharray="4 4" />
              {/* Meridians */}
              {[125, 250, 375, 625, 750, 875].map((mx) => (
                <line key={mx} x1={mx} y1="0" x2={mx} y2="500" />
              ))}
              {[62, 125, 375, 437].map((my) => (
                <line key={my} x1="0" y1={my} x2="1000" y2={my} />
              ))}
            </g>

            {/* Render High-Fidelity Realistic Landmasses */}
            {HIGH_RES_LANDMASSES.map((land) => {
              const pathData = land.points
                .map((pt, i) => {
                  const [px, py] = project2D(pt[0], pt[1]);
                  return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              return (
                <g key={land.name}>
                  {/* Continental Shelf Turquoise Coastal Shallows */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#00b4d8"
                    strokeWidth="5"
                    opacity="0.3"
                    filter="url(#coastal-glow)"
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#175073"
                    strokeWidth="2"
                    opacity="0.8"
                  />

                  {/* Continent Surface with Biome Texturing */}
                  <path
                    d={pathData}
                    fill={land.biomeGradient}
                    stroke="#234a36"
                    strokeWidth="0.85"
                    className="transition-colors hover:brightness-110"
                  />

                  {/* Topographic Mountain Ridges */}
                  {layers.topography && land.elevationRidge && (
                    <polyline
                      points={land.elevationRidge
                        .map((pt) => {
                          const [rx, ry] = project2D(pt[0], pt[1]);
                          return `${rx.toFixed(1)},${ry.toFixed(1)}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#8b7355"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.75"
                    />
                  )}
                </g>
              );
            })}

            {/* City Night Lights Layer */}
            {layers.cityLights &&
              GLOBAL_CITY_LIGHTS.map((city) => {
                const [cx, cy] = project2D(city.lng, city.lat);
                return (
                  <g key={city.name} opacity="0.85">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3.5 * city.intensity}
                      fill="#ffd166"
                      opacity="0.6"
                      filter="url(#city-glow)"
                    />
                    <circle cx={cx} cy={cy} r={1.5} fill="#ffffff" />
                  </g>
                );
              })}

            {/* GPS Jamming Zones */}
            {layers.gpsJamming &&
              gpsJammingZones.map((zone) => {
                const [zx, zy] = project2D(zone.lng, zone.lat);
                const r = (zone.radiusKm / 40000) * 1000;

                return (
                  <g
                    key={zone.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1400);
                      setSelectedEntity({
                        type: 'jamming',
                        title: `GPS/EW Jamming: ${zone.region}`,
                        subtitle: zone.primaryAffectedAirspace,
                        lat: zone.lat,
                        lng: zone.lng,
                        severity: 'FLASH',
                        attributes: [
                          { label: 'Severity', value: zone.severity, color: 'text-amber-400' },
                          { label: 'Radius', value: `${zone.radiusKm} km`, color: 'text-white' },
                          { label: 'FIR Airspace', value: zone.primaryAffectedAirspace, color: 'text-[#00d1ff]' },
                        ],
                        description: zone.impactDescription,
                        deskId: 'airtraffic',
                        deskLabel: 'ADS-B Airspace',
                        rawItem: zone,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={zx}
                      cy={zy}
                      r={Math.max(14, r)}
                      fill="rgba(168, 85, 247, 0.15)"
                      stroke="#a855f7"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <circle
                      cx={zx}
                      cy={zy}
                      r={Math.max(7, r * 0.5)}
                      fill="rgba(168, 85, 247, 0.25)"
                      stroke="#c084fc"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

            {/* Animated Real-Time Wind Flow Streamlines */}
            {layers.windFlow &&
              GLOBAL_WIND_VECTORS.map((wv, idx) => {
                const [wx, wy] = project2D(wv.lng, wv.lat);
                const len = 16 + (wv.speedKmh / 150) * 14;
                const rad = (wv.directionDeg * Math.PI) / 180;
                const endX = wx + Math.sin(rad) * len;
                const endY = wy - Math.cos(rad) * len;

                const windColor =
                  wv.speedKmh > 90
                    ? '#f43f5e'
                    : wv.speedKmh > 60
                    ? '#fbbf24'
                    : wv.speedKmh > 35
                    ? '#34d399'
                    : '#38bdf8';

                return (
                  <g key={`wind-${idx}`} opacity="0.8">
                    <line
                      x1={wx}
                      y1={wy}
                      x2={endX}
                      y2={endY}
                      stroke={windColor}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx={endX} cy={endY} r="1.5" fill={windColor} />
                  </g>
                );
              })}

            {/* Active Cyclones & Tropical Storms */}
            {layers.storms &&
              ACTIVE_GLOBAL_STORMS.map((storm) => {
                const [sx, sy] = project2D(storm.lng, storm.lat);

                return (
                  <g
                    key={storm.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1500);
                      setSelectedEntity({
                        type: 'storm',
                        title: storm.name,
                        subtitle: `${storm.basin} • Sustained ${storm.sustainedWindKmh} km/h`,
                        lat: storm.lat,
                        lng: storm.lng,
                        severity: 'CRITICAL',
                        attributes: [
                          { label: 'Category', value: storm.category, color: 'text-rose-400' },
                          { label: 'Sustained Winds', value: `${storm.sustainedWindKmh} km/h`, color: 'text-white' },
                          { label: 'Gusts', value: `${storm.gustsKmh} km/h`, color: 'text-amber-400' },
                          { label: 'Pressure', value: `${storm.centralPressureHpa} hPa`, color: 'text-[#00d1ff]' },
                          { label: 'Movement', value: storm.movementHeading, color: 'text-white' },
                          { label: 'Status', value: storm.warningStatus, color: 'text-rose-300' },
                        ],
                        description: `Extreme meteorological cyclonic system tracked with central vortex pressure of ${storm.centralPressureHpa} hPa.`,
                        deskId: 'geospatial',
                        deskLabel: 'Geospatial Desk',
                        rawItem: storm,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={sx}
                      cy={sy}
                      r="18"
                      fill="rgba(6, 182, 212, 0.15)"
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeDasharray="6 3"
                    />
                    <circle
                      cx={sx}
                      cy={sy}
                      r="28"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1"
                      strokeDasharray="8 4"
                      opacity="0.75"
                    />
                    <circle cx={sx} cy={sy} r="4" fill="#06b6d4" className="animate-ping" />
                    <circle cx={sx} cy={sy} r="3" fill="#ffffff" />
                    <text
                      x={sx + 12}
                      y={sy - 10}
                      fill="#22d3ee"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {storm.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

            {/* Maritime Strategic Chokepoints */}
            {layers.chokepoints &&
              chokepoints.map((cp) => {
                const [cx, cy] = project2D(cp.lng, cp.lat);
                const isHighRisk = cp.riskScore > 60;

                return (
                  <g
                    key={cp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1400);
                      setSelectedEntity({
                        type: 'chokepoint',
                        title: `Strategic Chokepoint: ${cp.name}`,
                        subtitle: cp.location,
                        lat: cp.lat,
                        lng: cp.lng,
                        severity: isHighRisk ? 'FLASH' : 'PRIORITY',
                        attributes: [
                          { label: 'Risk Score', value: `${cp.riskScore}/100`, color: isHighRisk ? 'text-rose-400' : 'text-amber-400' },
                          { label: 'Status', value: cp.status, color: 'text-white' },
                          { label: 'Transit Flow', value: cp.flowDescription, color: 'text-[#00ff41]' },
                          { label: 'Vessels Waiting', value: cp.vesselsWaiting, color: 'text-white' },
                          { label: 'Avg Delay', value: `${cp.averageDelayHours} hrs`, color: 'text-amber-300' },
                        ],
                        description: cp.securityAlert || `Key international maritime transit bottleneck handling ${cp.flowDescription}.`,
                        deskId: 'infrastructure',
                        deskLabel: 'Infrastructure Desk',
                        rawItem: cp,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r="6"
                      fill={isHighRisk ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 209, 255, 0.35)'}
                      stroke={isHighRisk ? '#ef4444' : '#00d1ff'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={cx + 8}
                      y={cy + 3}
                      fill={isHighRisk ? '#f87171' : '#7dd3fc'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {cp.name}
                    </text>
                  </g>
                );
              })}

            {/* Geopolitical Kinetic Strikes */}
            {layers.strikes &&
              ACTIVE_KINETIC_STRIKES.map((strike) => {
                const [kx, ky] = project2D(strike.lng, strike.lat);

                return (
                  <g
                    key={strike.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1500);
                      setSelectedEntity({
                        type: 'strike',
                        title: strike.title,
                        subtitle: `${strike.type} • ${strike.region}`,
                        lat: strike.lat,
                        lng: strike.lng,
                        severity: strike.severity,
                        attributes: [
                          { label: 'Type', value: strike.type, color: 'text-rose-400' },
                          { label: 'Actor', value: strike.actor, color: 'text-white' },
                          { label: 'Target', value: strike.targetType, color: 'text-[#00d1ff]' },
                          { label: 'Impact', value: strike.casualtyEstimate || 'Report Pending', color: 'text-amber-400' },
                        ],
                        description: `Kinetic incident registered on live OSINT mapping feeds.`,
                        sourceUrl: strike.sourceUrl,
                        deskId: 'geospatial',
                        deskLabel: 'Geospatial Desk',
                        rawItem: strike,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={kx} cy={ky} r="10" fill="rgba(244, 63, 94, 0.35)" className="animate-ping" />
                    <polygon
                      points={`${kx},${ky - 6} ${kx + 6},${ky + 4} ${kx - 6},${ky + 4}`}
                      fill="#f43f5e"
                      stroke="#ffffff"
                      strokeWidth="0.75"
                    />
                  </g>
                );
              })}

            {/* NASA FIRMS Wildfires (Thermal Hotspots) */}
            {layers.wildfires &&
              fireAnomalies.map((fire) => {
                const [fx, fy] = project2D(fire.lng, fire.lat);
                const isHighConf = fire.confidence === 'high';

                return (
                  <g
                    key={fire.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1300);
                      setSelectedEntity({
                        type: 'wildfire',
                        title: `Thermal Hotspot: ${fire.region || 'Active Anomaly'}`,
                        subtitle: `NASA FIRMS VIIRS Sensor • FRP ${fire.frp} MW`,
                        lat: fire.lat,
                        lng: fire.lng,
                        severity: fire.frp > 100 ? 'FLASH' : 'PRIORITY',
                        attributes: [
                          { label: 'FRP (Power)', value: `${fire.frp} MW`, color: 'text-orange-400' },
                          { label: 'Brightness', value: `${fire.brightness} K`, color: 'text-white' },
                          { label: 'Confidence', value: fire.confidence?.toUpperCase() || 'HIGH', color: isHighConf ? 'text-[#00ff41]' : 'text-amber-400' },
                          { label: 'Acquired Date', value: fire.acqDate, color: 'text-[#888888]' },
                        ],
                        description: `Satellite thermal radiation detection with fire radiative power of ${fire.frp} MW.`,
                        deskId: 'geospatial',
                        deskLabel: 'Geospatial Desk',
                        rawItem: fire,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={fx}
                      cy={fy}
                      r={Math.min(7, Math.max(3, fire.frp / 25))}
                      fill="#f97316"
                      stroke="#ffedd5"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}

            {/* USGS Earthquakes */}
            {layers.earthquakes &&
              earthquakes.map((eq) => {
                if (!eq.coordinates || eq.coordinates.length < 2) return null;
                const [qx, qy] = project2D(eq.coordinates[0], eq.coordinates[1]);
                const isMajor = eq.mag >= 6.0;
                const isSignificant = eq.mag >= 4.5;
                const radius = Math.max(4.5, (eq.mag - 2.5) * 3.2);
                const color = isMajor ? '#ef4444' : isSignificant ? '#f59e0b' : '#00ff41';

                return (
                  <g
                    key={eq.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1400);
                      setSelectedEntity({
                        type: 'earthquake',
                        title: `M${eq.mag.toFixed(1)} - ${eq.place}`,
                        subtitle: `USGS Seismology • Depth ${eq.coordinates[2]} km`,
                        lat: eq.coordinates[1],
                        lng: eq.coordinates[0],
                        severity: isMajor ? 'FLASH' : isSignificant ? 'PRIORITY' : 'ROUTINE',
                        attributes: [
                          { label: 'Magnitude', value: `M${eq.mag.toFixed(1)}`, color: isMajor ? 'text-rose-400' : 'text-amber-400' },
                          { label: 'Depth', value: `${eq.coordinates[2]} km`, color: 'text-white' },
                          { label: 'Tsunami Watch', value: eq.tsunami === 1 ? 'ACTIVE' : 'NONE', color: eq.tsunami === 1 ? 'text-rose-400' : 'text-[#00ff41]' },
                          { label: 'Felt Reports', value: eq.felt || 'N/A', color: 'text-white' },
                        ],
                        description: `Tectonic rupture registered at ${eq.place}. Depth: ${eq.coordinates[2]}km.`,
                        sourceUrl: eq.url,
                        deskId: 'geospatial',
                        deskLabel: 'Geospatial Desk',
                        rawItem: eq,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    {isSignificant && (
                      <circle
                        cx={qx}
                        cy={qy}
                        r={radius * 2}
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                        opacity="0.45"
                        className="animate-ping"
                      />
                    )}
                    <circle cx={qx} cy={qy} r={radius} fill={color} stroke="#ffffff" strokeWidth="1" />
                    {isSignificant && (
                      <text
                        x={qx + radius + 4}
                        y={qy + 3}
                        fill={color}
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        M{eq.mag.toFixed(1)}
                      </text>
                    )}
                  </g>
                );
              })}

            {/* AIS Maritime Vessels */}
            {layers.vessels &&
              trackedVessels.map((vessel) => {
                const [vx, vy] = project2D(vessel.lng, vessel.lat);
                const isAnomaly = vessel.anomalyFlag && vessel.anomalyFlag !== 'Nominal';
                const rad = ((vessel.courseDegrees || 0) * Math.PI) / 180;
                const endX = vx + Math.sin(rad) * 10;
                const endY = vy - Math.cos(rad) * 10;

                return (
                  <g
                    key={vessel.mmsi}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1400);
                      setSelectedEntity({
                        type: 'vessel',
                        title: vessel.vesselName,
                        subtitle: `${vessel.vesselType} • Flag: ${vessel.flag}`,
                        lat: vessel.lat,
                        lng: vessel.lng,
                        severity: isAnomaly ? 'FLASH' : 'ROUTINE',
                        attributes: [
                          { label: 'Speed', value: `${vessel.speedKnots} kts`, color: 'text-white' },
                          { label: 'Course', value: `${vessel.courseDegrees}°`, color: 'text-white' },
                          { label: 'Draught', value: `${vessel.draughtMeters}m`, color: 'text-[#00d1ff]' },
                          { label: 'Destination', value: vessel.destination, color: 'text-[#00ff41]' },
                          { label: 'Anomaly Flag', value: vessel.anomalyFlag || 'Nominal', color: isAnomaly ? 'text-rose-400' : 'text-[#00ff41]' },
                        ],
                        description: `Commercial transit tracked via satellite AIS. Destination: ${vessel.destination}. Current speed ${vessel.speedKnots} knots.`,
                        deskId: 'infrastructure',
                        deskLabel: 'Infrastructure Desk',
                        rawItem: vessel,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <line x1={vx} y1={vy} x2={endX} y2={endY} stroke={isAnomaly ? '#f43f5e' : '#38bdf8'} strokeWidth="1.5" />
                    <circle
                      cx={vx}
                      cy={vy}
                      r="4"
                      fill={isAnomaly ? '#f43f5e' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

            {/* ADS-B Aircraft Transponders */}
            {layers.flights &&
              emergencySquawks.map((flight) => {
                if (flight.lat === undefined || flight.lng === undefined) return null;
                const [ax, ay] = project2D(flight.lng, flight.lat);
                const isEmergency = flight.squawk === '7700' || flight.squawk === '7600';
                const headingRad = ((flight.heading || 0) * Math.PI) / 180;
                const vLen = 12;
                const endX = ax + Math.sin(headingRad) * vLen;
                const endY = ay - Math.cos(headingRad) * vLen;

                return (
                  <g
                    key={flight.icao24}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1500);
                      setSelectedEntity({
                        type: 'flight',
                        title: `Flight ${flight.callsign} (${flight.icao24})`,
                        subtitle: `${flight.aircraftType || 'Aircraft'} • ${flight.originCountry}`,
                        lat: flight.lat!,
                        lng: flight.lng!,
                        severity: isEmergency ? 'FLASH' : 'PRIORITY',
                        attributes: [
                          { label: 'Squawk Code', value: flight.squawk, color: isEmergency ? 'text-rose-400' : 'text-amber-400' },
                          { label: 'Squawk Type', value: flight.squawkType, color: 'text-white' },
                          { label: 'Altitude', value: `${flight.altitudeFt || 0} ft`, color: 'text-[#00d1ff]' },
                          { label: 'Speed', value: `${flight.velocityKnots || 0} kts`, color: 'text-white' },
                          { label: 'Heading', value: `${flight.heading || 0}°`, color: 'text-white' },
                          { label: 'Route', value: flight.route || 'Tactical Track', color: 'text-[#00ff41]' },
                        ],
                        description: `ADS-B transponder broadcast for ${flight.callsign}. Squawk ${flight.squawk} (${flight.squawkType}).`,
                        deskId: 'infrastructure',
                        deskLabel: 'Infrastructure Desk',
                        rawItem: flight,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    {isEmergency && (
                      <circle cx={ax} cy={ay} r="10" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" />
                    )}
                    <line x1={ax} y1={ay} x2={endX} y2={endY} stroke={isEmergency ? '#ef4444' : '#38bdf8'} strokeWidth="1.5" />
                    <polygon
                      points={`${ax},${ay - 4} ${ax + 3},${ay + 3} ${ax - 3},${ay + 3}`}
                      fill={isEmergency ? '#ef4444' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth="0.75"
                    />
                    <text
                      x={ax + 6}
                      y={ay + 2}
                      fill={isEmergency ? '#f87171' : '#7dd3fc'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {flight.callsign}
                    </text>
                  </g>
                );
              })}

            {/* X / Twitter Live Disaster Feeds */}
            {layers.disasters &&
              disasterTweets.map((tweet) => {
                if (!tweet.location) return null;
                const [tx, ty] = project2D(tweet.location.lng, tweet.location.lat);
                const isCritical = tweet.urgency === 'CRITICAL BREAKING';

                return (
                  <g
                    key={tweet.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      playTacticalBlip(1500);
                      setSelectedEntity({
                        type: 'disaster',
                        title: `${tweet.disasterType}: ${tweet.location.name}`,
                        subtitle: `${tweet.authorName} (${tweet.handle}) • ${tweet.badgeType}`,
                        lat: tweet.location.lat,
                        lng: tweet.location.lng,
                        severity: isCritical ? 'FLASH' : 'PRIORITY',
                        attributes: [
                          { label: 'Disaster Type', value: tweet.disasterType, color: 'text-rose-400' },
                          { label: 'Urgency', value: tweet.urgency, color: isCritical ? 'text-rose-300' : 'text-amber-300' },
                          { label: 'Location', value: tweet.location.name, color: 'text-white' },
                          { label: 'Verified Org', value: tweet.authorName, color: 'text-[#00ff41]' },
                          { label: 'Dispatched', value: tweet.timeAgo, color: 'text-[#888888]' },
                        ],
                        description: tweet.text,
                        sourceUrl: tweet.sourceUrl,
                        deskId: 'geospatial',
                        deskLabel: 'Geospatial Desk',
                        rawItem: tweet,
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={tx}
                      cy={ty}
                      r="7"
                      fill={isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 209, 255, 0.4)'}
                      stroke={isCritical ? '#ef4444' : '#00d1ff'}
                      strokeWidth="1.5"
                    />
                    <circle cx={tx} cy={ty} r="3" fill="#ffffff" />
                  </g>
                );
              })}

            {/* User Location Focal Pin */}
            {layers.userFocal && userLocation && (
              <g
                onClick={(e) => {
                  e.stopPropagation();
                  playTacticalBlip(1600);
                  onOpenWhatsAppModal();
                }}
                className="cursor-pointer"
              >
                {(() => {
                  const [ux, uy] = project2D(userLocation.lng, userLocation.lat);
                  return (
                    <>
                      <circle cx={ux} cy={uy} r="35" fill="none" stroke="#00ff41" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                      <circle cx={ux} cy={uy} r="20" fill="none" stroke="#00ff41" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
                      <circle cx={ux} cy={uy} r="8" fill="rgba(0, 255, 65, 0.3)" className="animate-ping" />
                      <circle cx={ux} cy={uy} r="5" fill="#00ff41" stroke="#ffffff" strokeWidth="1.5" />
                      <text
                        x={ux + 8}
                        y={uy + 3}
                        fill="#00ff41"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        YOU ({userLocation.name?.slice(0, 10) || 'LOCATION'})
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        )}

        {/* ========================================================================= */}
        {/* 3D INTERACTIVE PHOTOREALISTIC ORBIT GLOBE PROJECTION                      */}
        {/* ========================================================================= */}
        {viewMode === '3d' && (
          <svg viewBox="0 0 1000 500" className="w-full h-full block pointer-events-auto">
            <defs>
              <radialGradient id="globe-sphere-grad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#0f2f54" />
                <stop offset="50%" stopColor="#07172e" />
                <stop offset="85%" stopColor="#020814" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
              <filter id="globe-glow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Atmosphere Rayleigh Scattering Halo */}
            <circle cx="500" cy="250" r="195" fill="none" stroke="#00d1ff" strokeWidth="4" opacity="0.3" filter="url(#globe-glow)" />

            {/* Sphere Background */}
            <circle cx="500" cy="250" r="190" fill="url(#globe-sphere-grad)" stroke="#1a3b66" strokeWidth="1.5" />

            {/* 3D High-Res Continents */}
            {HIGH_RES_LANDMASSES.map((land) => {
              const projectedPoints = land.points.map((pt) =>
                project3D(pt[0], pt[1], globeRotation[0], globeRotation[1], 190, 500, 250)
              );

              const visibleCount = projectedPoints.filter((p) => p.visible).length;
              if (visibleCount < 2) return null;

              const pathData = projectedPoints
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                .join(' ') + ' Z';

              return (
                <path
                  key={land.name}
                  d={pathData}
                  fill={land.biomeGradient}
                  stroke="#264834"
                  strokeWidth="0.85"
                  opacity="0.95"
                />
              );
            })}

            {/* 3D Earthquakes */}
            {layers.earthquakes &&
              earthquakes.map((eq) => {
                if (!eq.coordinates || eq.coordinates.length < 2) return null;
                const proj = project3D(
                  eq.coordinates[0],
                  eq.coordinates[1],
                  globeRotation[0],
                  globeRotation[1],
                  190,
                  500,
                  250
                );
                if (!proj.visible) return null;

                const isMajor = eq.mag >= 6.0;
                const color = isMajor ? '#ef4444' : '#f59e0b';

                return (
                  <circle
                    key={eq.id}
                    cx={proj.x}
                    cy={proj.y}
                    r={Math.max(3.5, (eq.mag - 3) * 2.5)}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1"
                    onClick={() => {
                      playTacticalBlip(1400);
                      setSelectedEntity({
                        type: 'earthquake',
                        title: `M${eq.mag.toFixed(1)} - ${eq.place}`,
                        subtitle: `USGS Seismology • Depth ${eq.coordinates[2]} km`,
                        lat: eq.coordinates[1],
                        lng: eq.coordinates[0],
                        severity: isMajor ? 'FLASH' : 'PRIORITY',
                        attributes: [
                          { label: 'Magnitude', value: `M${eq.mag.toFixed(1)}`, color: 'text-rose-400' },
                          { label: 'Depth', value: `${eq.coordinates[2]} km`, color: 'text-white' },
                          { label: 'Tsunami Watch', value: eq.tsunami === 1 ? 'YES' : 'NO', color: 'text-[#00ff41]' },
                        ],
                        description: `Earthquake registered at ${eq.place}. Depth: ${eq.coordinates[2]}km.`,
                        deskId: 'geospatial',
                        deskLabel: 'Geospatial Desk',
                        rawItem: eq,
                      });
                    }}
                    className="cursor-pointer"
                  />
                );
              })}

            {/* 3D User Location */}
            {layers.userFocal && userLocation && (() => {
              const uProj = project3D(
                userLocation.lng,
                userLocation.lat,
                globeRotation[0],
                globeRotation[1],
                190,
                500,
                250
              );
              if (!uProj.visible) return null;

              return (
                <g>
                  <circle cx={uProj.x} cy={uProj.y} r="10" fill="rgba(0, 255, 65, 0.4)" className="animate-ping" />
                  <circle cx={uProj.x} cy={uProj.y} r="5" fill="#00ff41" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    x={uProj.x + 8}
                    y={uProj.y + 3}
                    fill="#00ff41"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    YOU
                  </text>
                </g>
              );
            })()}
          </svg>
        )}

        {/* HUD Quick Jump Targets & Target Search Strip */}
        <div className="absolute bottom-2 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap gap-1.5 pointer-events-auto font-mono text-[10px]">
            <span className="px-2 py-1 rounded bg-[#070d18]/90 border border-[#162338] text-[#55718a] uppercase font-bold">
              🎯 Tactical Jump:
            </span>
            {[
              { name: 'Bab-el-Mandeb', lat: 12.8, lng: 43.4 },
              { name: 'Strait of Hormuz', lat: 26.5, lng: 56.2 },
              { name: 'Taiwan Strait', lat: 24.1, lng: 119.8 },
              { name: 'Malacca Strait', lat: 2.2, lng: 102.1 },
              { name: 'Suwałki Gap', lat: 54.2, lng: 23.3 },
              { name: 'Panama Canal', lat: 9.1, lng: -79.7 },
            ].map((tgt) => (
              <button
                key={tgt.name}
                type="button"
                onClick={() => handleJumpToCoord(tgt.lat, tgt.lng)}
                className="px-2 py-1 rounded bg-[#070d18]/90 hover:bg-[#102a45] border border-[#162338] hover:border-[#00d1ff] text-[#d4d4d4] hover:text-[#00d1ff] transition-colors"
              >
                {tgt.name}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto">
            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-black font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-[#25D366]/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Configure WhatsApp Alert Hub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Entity Inspector Modal / HUD Card */}
      <EntityDetailCard
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        userLocation={userLocation}
        onNavigateToDesk={onNavigateToDesk}
        onOpenWhatsAppModal={onOpenWhatsAppModal}
      />
    </div>
  );
};
