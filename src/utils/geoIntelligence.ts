import {
  AssetWatchlistItem,
  DisasterTweetItem,
  EarthquakeItem,
  FireAnomalyItem,
  FlightAnomalyItem,
  KineticStrikeItem,
  MaritimeChokepointItem,
  MaritimeVesselItem,
  StormItem,
  TwelveHourSitrep,
  UserLocation,
  WebSdrChannel,
  WhatsAppAlertConfig,
  WindVector,
} from '../types.js';

// Calculate distance between two lat/lng points in kilometers using Haversine formula
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Generate active global storm data
export const ACTIVE_GLOBAL_STORMS: StormItem[] = [
  {
    id: 'storm-typhoon-malakas',
    name: 'Typhoon MALAKAS (Cat 4)',
    category: 'Category 4',
    basin: 'West Pacific',
    lat: 18.4,
    lng: 132.8,
    sustainedWindKmh: 215,
    gustsKmh: 260,
    centralPressureHpa: 935,
    movementHeading: 'NNW at 18 km/h',
    movementSpeedKmh: 18,
    forecastTrack: [
      [132.8, 18.4],
      [131.2, 21.6],
      [129.8, 25.4],
      [129.0, 29.8],
      [131.5, 33.2],
    ],
    warningStatus: 'Active Warning',
  },
  {
    id: 'storm-cyclone-gamane',
    name: 'Severe Tropical Cyclone GAMANE',
    category: 'Category 3',
    basin: 'Indian Ocean',
    lat: -14.2,
    lng: 50.8,
    sustainedWindKmh: 165,
    gustsKmh: 205,
    centralPressureHpa: 960,
    movementHeading: 'SSW at 12 km/h',
    movementSpeedKmh: 12,
    forecastTrack: [
      [50.8, -14.2],
      [49.5, -16.8],
      [48.2, -19.4],
      [48.0, -22.1],
    ],
    warningStatus: 'Active Warning',
  },
  {
    id: 'storm-nadine-caribbean',
    name: 'Tropical Storm NADINE',
    category: 'Tropical Depression',
    basin: 'North Atlantic',
    lat: 16.5,
    lng: -84.2,
    sustainedWindKmh: 85,
    gustsKmh: 110,
    centralPressureHpa: 998,
    movementHeading: 'W at 22 km/h',
    movementSpeedKmh: 22,
    forecastTrack: [
      [-84.2, 16.5],
      [-87.0, 17.2],
      [-90.5, 18.0],
    ],
    warningStatus: 'Watch',
  },
];

// Global wind flow streamline grid
export const GLOBAL_WIND_VECTORS: WindVector[] = [
  // North Atlantic Westerlies
  { lat: 45, lng: -40, speedKmh: 68, directionDeg: 250 },
  { lat: 50, lng: -25, speedKmh: 75, directionDeg: 260 },
  { lat: 55, lng: -10, speedKmh: 82, directionDeg: 245 },
  // Trade winds Pacific
  { lat: 15, lng: -140, speedKmh: 35, directionDeg: 75 },
  { lat: 12, lng: -160, speedKmh: 38, directionDeg: 80 },
  { lat: 10, lng: 160, speedKmh: 42, directionDeg: 85 },
  // Indian Ocean Monsoon
  { lat: 8, lng: 70, speedKmh: 48, directionDeg: 220 },
  { lat: 14, lng: 82, speedKmh: 54, directionDeg: 230 },
  // Roaring Forties (Southern Ocean)
  { lat: -45, lng: -60, speedKmh: 95, directionDeg: 275 },
  { lat: -48, lng: 20, speedKmh: 105, directionDeg: 280 },
  { lat: -46, lng: 90, speedKmh: 98, directionDeg: 270 },
  { lat: -45, lng: 150, speedKmh: 92, directionDeg: 265 },
  // West Pacific Typhoon Corridor
  { lat: 18, lng: 132, speedKmh: 145, directionDeg: 340 },
  { lat: 24, lng: 128, speedKmh: 88, directionDeg: 320 },
  // Mediterranean & Sahara Scirocco
  { lat: 34, lng: 18, speedKmh: 45, directionDeg: 190 },
  { lat: 26, lng: 12, speedKmh: 30, directionDeg: 160 },
];

// Geopolitical kinetic strikes & civil unrest points
export const ACTIVE_KINETIC_STRIKES: KineticStrikeItem[] = [
  {
    id: 'strike-red-sea-01',
    title: 'Anti-Ship Drone Interception in Bab-el-Mandeb',
    type: 'Drone Swarm',
    region: 'Southern Red Sea / Bab-el-Mandeb',
    country: 'Yemen / International Waters',
    lat: 12.8,
    lng: 43.4,
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    casualtyEstimate: '0 casualties (Vessel escorts engaged 3 UAVs)',
    actor: 'Ansar Allah / Allied Maritime Coalition',
    targetType: 'Commercial Container Transit Corridor',
    severity: 'FLASH',
    sourceUrl: 'https://ukmto.org',
  },
  {
    id: 'strike-dnipro-02',
    title: 'Precision Infrastructure Strike & Air Defense Engagement',
    type: 'Missile Strike',
    region: 'Dnipro Substation Grid',
    country: 'Ukraine',
    lat: 48.46,
    lng: 35.04,
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    casualtyEstimate: '3 injured, Power substation 330kV disabled',
    actor: 'Russian Armed Forces / Ukrainian Air Defense',
    targetType: 'High-Voltage Regional Transformer Grid',
    severity: 'FLASH',
    sourceUrl: 'https://liveuamap.com',
  },
  {
    id: 'strike-taiwan-strait-03',
    title: 'Joint Combat Patrol & Median Line Crossing',
    type: 'Naval Interdiction',
    region: 'Central Taiwan Strait',
    country: 'Taiwan Strait',
    lat: 24.1,
    lng: 119.8,
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    casualtyEstimate: '0 (24 PLA Sorties, 8 Surface Combatants)',
    actor: 'PLA Eastern Theater Command / ROC Navy',
    targetType: 'Air Defense Identification Zone (ADIZ)',
    severity: 'PRIORITY',
    sourceUrl: 'https://mnd.gov.tw',
  },
  {
    id: 'strike-golan-border-04',
    title: 'Cross-Border Artillery & Rocket Barrage',
    type: 'Border Skirmish',
    region: 'Northern Border / Upper Galilee',
    country: 'Israel / Lebanon',
    lat: 33.15,
    lng: 35.58,
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    casualtyEstimate: 'Structure damage, Brushfire ignited',
    actor: 'Hezbollah / IDF Northern Command',
    targetType: 'Military Observation Outpost',
    severity: 'FLASH',
    sourceUrl: 'https://idf.il',
  },
];

// WebSDR Military and Emergency Radio Band Channels
export const WEBSDR_CHANNELS: WebSdrChannel[] = [
  {
    id: 'websdr-121-500',
    name: 'International Aviation Distress Guard',
    freqMhz: '121.500 MHz',
    modulation: 'AM',
    band: 'Aviation Guard',
    activeSignalDb: -72,
    location: 'Frankfurt Central WebSDR Receiver',
    status: 'ONLINE',
    description: 'Civilian VHF emergency guard monitored 24/7 by Air Traffic Control & Search and Rescue.',
  },
  {
    id: 'websdr-243-000',
    name: 'NATO Military Aviation Emergency Guard',
    freqMhz: '243.000 MHz',
    modulation: 'AM',
    band: 'Military Emergency',
    activeSignalDb: -68,
    location: 'RAF Mildenhall SDR Node',
    status: 'ACTIVE TRAFFIC',
    description: 'Standard military air distress frequency. Monitored for tactical squawks & ejector beacons.',
  },
  {
    id: 'websdr-8992-000',
    name: 'USAF High Frequency Global Communications (HFGCS)',
    freqMhz: '8992.0 kHz (8.992 MHz)',
    modulation: 'USB',
    band: 'Strategic HFGCS',
    activeSignalDb: -64,
    location: 'Andrews AFB Relay (Virginia SDR)',
    status: 'ACTIVE TRAFFIC',
    description: 'Broadcasts Emergency Action Messages (EAMs) and SkyKing voice broadcasts to strategic airborne assets.',
  },
  {
    id: 'websdr-11175-000',
    name: 'USAF HFGCS Primary Worldwide Command',
    freqMhz: '11175.0 kHz (11.175 MHz)',
    modulation: 'USB',
    band: 'Strategic HFGCS',
    activeSignalDb: -58,
    location: 'Kwajalein Pacific SDR Station',
    status: 'ACTIVE TRAFFIC',
    description: 'Primary trans-oceanic military command channel for SAC bombers, RC-135 reconnaissance, and tankers.',
  },
  {
    id: 'websdr-500-000',
    name: 'International Maritime Telegraph Distress (Historical CW)',
    freqMhz: '500.0 kHz (0.500 MHz)',
    modulation: 'CW',
    band: 'Maritime Distress',
    activeSignalDb: -84,
    location: 'Ushant Radio SDR (Bay of Biscay)',
    status: 'ONLINE',
    description: 'Medium wave maritime distress frequency, now paired with GMDSS MF automated alerting.',
  },
];

// Monitored Asset Watchlist
export const ASSET_WATCHLIST: AssetWatchlistItem[] = [
  {
    id: 'asset-af1',
    name: 'SAM 28000 (Air Force One)',
    callsignOrImo: 'AF1 / SAM28000',
    type: 'VIP Government Aircraft',
    operator: 'USAF 89th Airlift Wing',
    lat: 38.8,
    lng: -77.0,
    status: 'Active Transponder',
    lastSeen: '12m ago • Andrews AFB to Ramstein corridor',
    notes: 'Primary Presidential VC-25B airborne transport with secure SATCOM link active.',
  },
  {
    id: 'asset-csg-ike',
    name: 'USS Dwight D. Eisenhower (CVN-69) Strike Group',
    callsignOrImo: 'IMO 9821456 / CSG-2',
    type: 'Carrier Strike Group',
    operator: 'US Navy 5th Fleet',
    lat: 13.6,
    lng: 48.2,
    status: 'Active Transponder',
    lastSeen: '4m ago • Gulf of Aden',
    notes: 'Operating in defensive posture supporting Operation Prosperity Guardian commercial shipping protection.',
  },
  {
    id: 'asset-rivet-joint',
    name: 'RC-135W Rivet Joint SIGINT',
    callsignOrImo: 'HOMER51 / ICAO AE01D5',
    type: 'VIP Government Aircraft',
    operator: 'USAF 55th Wing / RAF Waddington',
    lat: 54.8,
    lng: 19.4,
    status: 'Active Transponder',
    lastSeen: '18m ago • Baltic Sea / Kaliningrad perimeter',
    notes: 'Conducting ELINT orbit and radar frequency emission mapping along eastern NATO flank.',
  },
  {
    id: 'asset-dark-tanker-01',
    name: 'ARCTIC TITAN (Dark Fleet VLCC)',
    callsignOrImo: 'IMO 9312014 / MMSI 636018244',
    type: 'Strategic Transport',
    operator: 'Unregistered Panamanian Flag',
    lat: 25.8,
    lng: 57.2,
    status: 'Dark / Intermittent',
    lastSeen: '38m ago • Gulf of Oman',
    notes: 'AIS transponder intermittent. Observed transshipping 1.8M bbl crude oil via STS rendezvous.',
  },
  {
    id: 'asset-type055-nanchang',
    name: 'PLA Navy Nanchang (101) Type 055 Destroyer',
    callsignOrImo: 'PLAN-101 / PLAN-NORTH',
    type: 'Carrier Strike Group',
    operator: 'PLAN Northern Theater Navy',
    lat: 27.4,
    lng: 124.6,
    status: 'Stationary',
    lastSeen: '55m ago • East China Sea',
    notes: 'Leading 4-ship surface action group conducting live-fire surface-to-air missile exercises.',
  },
];

// Helper to construct WhatsApp Alert Share URL and text
export function generateWhatsAppAlertUrl(
  entity: {
    name: string;
    category: string;
    lat: number;
    lng: number;
    severity?: string;
    details?: string;
  },
  userLocation?: UserLocation,
  phoneNumber: string = ''
): string {
  const distance = userLocation
    ? calculateDistanceKm(userLocation.lat, userLocation.lng, entity.lat, entity.lng)
    : null;

  const nowStr = new Date().toUTCString();
  const text = `🚨 *CRUCIX CRISIS ALERT* 🚨
------------------------------------
📍 *Event:* ${entity.name}
🏷 *Category:* ${entity.category.toUpperCase()}
⚡ *Urgency:* ${entity.severity || 'CRITICAL'}
🌐 *Coordinates:* ${entity.lat.toFixed(4)}°, ${entity.lng.toFixed(4)}°
${distance !== null ? `📏 *Distance to you:* ${distance} km (${(distance * 0.539957).toFixed(0)} NM)` : ''}
🕒 *Time:* ${nowStr}
📝 *Sitrep:* ${entity.details || 'Active incident registered on global monitoring feeds.'}
------------------------------------
🔗 *Live OSINT Desk:* https://crucix-node.network/map?lat=${entity.lat}&lng=${entity.lng}
_Dispatched via Crucix Personal Intelligence Node_`;

  const encoded = encodeURIComponent(text);
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

// 12-Hour AI Sitrep Generator
export function generate12HourSitrep(
  earthquakes: EarthquakeItem[] = [],
  disasters: DisasterTweetItem[] = [],
  squawks: FlightAnomalyItem[] = [],
  fires: FireAnomalyItem[] = [],
  vessels: MaritimeVesselItem[] = []
): TwelveHourSitrep {
  const maxMag = earthquakes.length > 0 ? Math.max(...earthquakes.map((q) => q.mag)) : 5.8;
  const criticalDisasters = disasters.filter((d) => d.urgency === 'CRITICAL BREAKING');
  const darkVessels = vessels.filter((v) => v.anomalyFlag && v.anomalyFlag !== 'Nominal');
  const emergencyFlights = squawks.filter((s) => s.squawk === '7700' || s.squawk === '7600');

  return {
    timestamp: new Date().toISOString(),
    threatLevel: criticalDisasters.length > 0 || emergencyFlights.length > 0 ? 'HIGH' : 'ELEVATED',
    executiveSummary: `Over the preceding 12-hour monitoring cycle, global seismic telemetry recorded ${earthquakes.length} events (peaking at M${maxMag.toFixed(1)}), while OSINT feeds verified ${criticalDisasters.length} breaking disaster vectors and ${fires.length} thermal hotspots. Maritime chokepoints show ${darkVessels.length} vessel transponder anomalies, and airspace tracking detected ${squawks.length} emergency or tactical recon flights.`,
    timelinePoints: [
      {
        time: 'T-11h:20m',
        event: `USGS detected magnitude M${maxMag.toFixed(1)} tectonic release along active subduction zone with depth verification.`,
        domain: 'geospatial',
        severity: maxMag >= 6.0 ? 'FLASH' : 'PRIORITY',
      },
      {
        time: 'T-08h:45m',
        event: 'ADS-B transponder alert: High-altitude military reconnaissance orbit identified over Eastern European frontier.',
        domain: 'infrastructure',
        severity: 'PRIORITY',
      },
      {
        time: 'T-05h:10m',
        event: 'NASA FIRMS satellite sensors registered thermal anomaly cluster with >90% detection confidence.',
        domain: 'geospatial',
        severity: 'ROUTINE',
      },
      {
        time: 'T-02h:30m',
        event: 'AIS dark fleet divergence: Crude carrier switched off transponder at Bab-el-Mandeb approach corridor.',
        domain: 'infrastructure',
        severity: 'FLASH',
      },
      {
        time: 'T-00h:45m',
        event: 'X/Twitter disaster network verified emergency evacuation and flood advisory dispatch with geo-tags.',
        domain: 'geospatial',
        severity: 'PRIORITY',
      },
    ],
    metricsDelta: {
      quakesCount12h: earthquakes.length,
      maxMag12h: Number(maxMag.toFixed(1)),
      squawks12h: squawks.length,
      firesCount12h: fires.length,
      marketVixDelta: 1.4,
      darkFleetDeviations: darkVessels.length,
    },
    keyTakeaways: [
      'Elevated tectonic friction in circum-Pacific seismic zones remains within expected 12h baseline.',
      'Maritime tanker diversions around the Cape of Good Hope have increased transit latency by an average of 10.4 days.',
      'GPS jamming activity continues to concentrate over the Baltic basin, South China Sea, and Eastern Mediterranean.',
      'Airspace emergency squawks (7700) resolved with zero commercial hull losses in the current sweep interval.',
    ],
  };
}
