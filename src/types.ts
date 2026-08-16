export type AlertTier = 'FLASH' | 'PRIORITY' | 'ROUTINE';

export interface AlertItem {
  id: string;
  tier: AlertTier;
  domain: 'geospatial' | 'markets' | 'health' | 'infrastructure' | 'synthesis';
  title: string;
  summary: string;
  timestamp: string;
  metrics?: Record<string, string | number>;
  sourceUrl?: string;
  highlight?: boolean;
}

export interface SweepDelta {
  timestamp: string;
  newAlertsCount: number;
  flashCount: number;
  priorityCount: number;
  routineCount: number;
  changes: {
    domain: string;
    type: 'added' | 'escalated' | 'deescalated' | 'resolved';
    message: string;
    severity: AlertTier;
  }[];
}

export interface EarthquakeItem {
  id: string;
  mag: number;
  place: string;
  time: number;
  url: string;
  tsunami: number;
  alert: string | null;
  coordinates: [number, number, number]; // [lng, lat, depth]
  felt?: number;
  significance: number;
}

export interface SpaceWeatherTelemetry {
  kpCurrent: number;
  kpEstimated24hMax: number;
  stormLevel: 'None' | 'G1 Minor' | 'G2 Moderate' | 'G3 Strong' | 'G4 Severe' | 'G5 Extreme';
  radioBlackoutRisk: 'Low' | 'Moderate' | 'High' | 'Severe';
  solarRadiationRisk: 'Quiet' | 'Active' | 'Storm';
  latestTimestamp: string;
  recentKpValues: { time: string; kp: number }[];
}

export interface WeatherHubItem {
  city: string;
  country: string;
  lat: number;
  lng: number;
  tempC: number;
  windSpeedKmh: number;
  aqiUs: number;
  aqiCategory: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  pm25: number;
  pm10: number;
  condition: string;
  anomalyFlag?: boolean;
}

export interface FireAnomalyItem {
  id: string;
  region: string;
  lat: number;
  lng: number;
  brightness: number;
  confidence: 'nominal' | 'high' | 'low';
  acqDate: string;
  frp: number; // Fire Radiative Power (MW)
}

export interface DisasterTweetItem {
  id: string;
  authorName: string;
  handle: string;
  verified: boolean;
  avatarBadge: string;
  badgeType: 'Official Agency' | 'OSINT Monitor' | 'Meteorologist' | 'First Responder' | 'Seismology Lab';
  timestamp: string;
  timeAgo: string;
  disasterType: 'Earthquake' | 'Wildfire' | 'Cyclone / Storm' | 'Tsunami / Floods' | 'Volcano' | 'Extreme Weather';
  urgency: 'CRITICAL BREAKING' | 'PRIORITY SITREP' | 'ADVISORY' | 'RESOLVED';
  text: string;
  location: {
    name: string;
    lat: number;
    lng: number;
    country: string;
  };
  metrics: {
    retweets: number;
    likes: number;
    replies: number;
    views?: string;
  };
  media?: {
    type: 'satellite' | 'radar' | 'seismograph' | 'map' | 'photo';
    caption: string;
    tag: string;
  };
  sourceUrl: string;
  isLive: boolean;
}

export interface GeospatialModuleData {
  earthquakes: {
    totalCount: number;
    maxMag: number;
    significantCount: number;
    items: EarthquakeItem[];
  };
  spaceWeather: SpaceWeatherTelemetry;
  weatherHubs: WeatherHubItem[];
  thermalAnomalies: {
    totalHotspots: number;
    highConfidenceCount: number;
    items: FireAnomalyItem[];
  };
  disasterFeed: {
    totalActiveDispatches: number;
    criticalCount: number;
    items: DisasterTweetItem[];
  };
}

export interface MarketTickerItem {
  symbol: string;
  name: string;
  category: 'crypto' | 'index' | 'commodity' | 'forex' | 'yield';
  price: number;
  change24h: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  unit?: string;
  sparkline?: number[];
}

export interface MacroIndicatorItem {
  name: string;
  code: string;
  value: string | number;
  previous: string | number;
  trend: 'up' | 'down' | 'flat';
  frequency: string;
  impact: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface MarketsModuleData {
  tickers: MarketTickerItem[];
  macro: MacroIndicatorItem[];
  marketStatus: {
    crypto24hVol: string;
    volatilityIndex: number;
    yieldCurveInversion: boolean;
    spread10Y2Y: number;
    dominantTrend: 'Risk-On' | 'Risk-Off' | 'Neutral' | 'Mixed';
  };
}

export interface ResearchPaperItem {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  pubDate: string;
  doi?: string;
  url?: string;
  abstractSnippet?: string;
  relevanceKeywords: string[];
  threatLevel: 'Emerging Threat' | 'Clinical Breakthrough' | 'Surveillance Update' | 'Standard';
}

export interface MedicalDiscoveryItem {
  id: string;
  title: string;
  category: 'Oncology' | 'Gene Editing & CRISPR' | 'Neurodegenerative' | 'Immunology & mRNA' | 'Regenerative Medicine' | 'Infectious Disease' | 'Longevity & Metabolism';
  journal: string;
  pubDate: string;
  authors: string[];
  clinicalPhase: 'Phase III Clinical Trial' | 'Phase II Multi-Center' | 'Phase I Human Trial' | 'Preclinical Breakthrough' | 'FDA Accelerated Approval';
  mechanism: string;
  keyFindings: string;
  translationImpact: string;
  doi?: string;
  pmid?: string;
  url?: string;
}

export interface AlternativeMedicineResearchItem {
  id: string;
  botanicalName: string;
  commonName: string;
  primaryIndication: string;
  evidenceLevel: 'Double-Blind Placebo-Controlled RCT' | 'Systematic Review & Meta-Analysis' | 'Cochrane Systematic Review' | 'Multi-Center Clinical Trial';
  sampleSize: string;
  testedDosage: string;
  activeBioactives: string;
  mechanismOfAction: string;
  keyClinicalOutcomes: string;
  safetyAndInteractions: string;
  journal: string;
  pubYear: string;
  pmid: string;
  doi?: string;
  url?: string;
}

export interface HealthOutbreakItem {
  id: string;
  pathogen: string;
  region: string;
  casesReported?: string;
  source: 'WHO' | 'CDC' | 'ProMED' | 'GlobalSurveillance';
  alertLevel: AlertTier;
  date: string;
  details: string;
}

export interface HealthModuleData {
  papers: ResearchPaperItem[];
  discoveries: MedicalDiscoveryItem[];
  alternativeMedicine: AlternativeMedicineResearchItem[];
  outbreaks: HealthOutbreakItem[];
  keywordHighlights: { keyword: string; count: number }[];
  bioRiskIndex: number; // 0 - 100
}

export interface CisaKevItem {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  knownRansomwareCampaignUse: 'Known' | 'Unknown';
}

export interface InternetOutageItem {
  region: string;
  cause: string;
  impactLevel: 'Major' | 'Moderate' | 'Minor';
  asn?: string;
  timestamp: string;
  status: 'Active' | 'Investigating' | 'Resolved';
}

export interface FlightAnomalyItem {
  icao24: string;
  callsign: string;
  originCountry: string;
  aircraftType?: string;
  route?: string;
  squawk: string;
  squawkType: '7700 Emergency' | '7600 Radio Failure' | '7500 Hijack' | '7777 Military / Intercept' | 'SIGINT Reconnaissance' | 'Standard';
  altitudeFt?: number;
  velocityKnots?: number;
  lat?: number;
  lng?: number;
  heading?: number;
  lastContact: string;
  details?: string;
}

export interface GpsJammingZoneItem {
  id: string;
  region: string;
  lat: number;
  lng: number;
  radiusKm: number;
  severity: 'Severe (80%+ Flights Affected)' | 'Moderate' | 'Sporadic';
  impactDescription: string;
  primaryAffectedAirspace: string;
  firstDetected: string;
}

export interface MaritimeChokepointItem {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  status: 'Nominal' | 'Congested' | 'High Risk' | 'Restricted';
  transitVolume24h: number;
  flowDescription: string; // e.g. "20.5M bpd Crude (21% Global Supply)"
  riskScore: number; // 1 - 100
  securityAlert?: string;
  averageDelayHours: number;
  vesselsWaiting: number;
}

export interface MaritimeVesselItem {
  mmsi: string;
  vesselName: string;
  flag: string;
  vesselType: 'Crude Oil Tanker' | 'LNG Carrier' | 'Ultra Large Container' | 'Bulk Carrier' | 'SIGINT / Oceanographic' | 'Naval Escort';
  destination: string;
  lat: number;
  lng: number;
  courseDegrees: number;
  speedKnots: number;
  draughtMeters: number;
  anomalyFlag?: string; // e.g. "AIS Gap / Dark Fleet Behavior", "Abrupt Course Deviation"
  riskRating: 'High' | 'Elevated' | 'Nominal';
}

export interface MaritimeModuleData {
  chokepoints: MaritimeChokepointItem[];
  trackedVessels: MaritimeVesselItem[];
  stats: {
    totalTrackedVessels: number;
    globalChokepointCongestionIndex: number; // 0 - 100
    redSeaDiversionRatePercent: number;
    balticDryIndex: number;
    activeNavalAdvisories: number;
  };
}

export interface InfrastructureModuleData {
  cisaKev: {
    totalCatalogCount: number;
    recentAdded: CisaKevItem[];
    ransomwareTargetedCount: number;
  };
  internetOutages: InternetOutageItem[];
  airTraffic: {
    totalTrackedAircraft: number;
    emergencySquawks: FlightAnomalyItem[];
    gpsJammingZones: GpsJammingZoneItem[];
    anomalousEventsCount: number;
  };
  maritime: MaritimeModuleData;
}

export interface AISynthesisReport {
  timestamp: string;
  executiveBrief: string;
  threatLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  keyFindings: string[];
  crossDomainCorrelations: {
    domains: string[];
    observation: string;
    probability: 'High' | 'Medium' | 'Speculative';
  }[];
  tradeAndHedgeHypotheses: {
    title: string;
    thesis: string;
    affectedAssets: string[];
    timeframe: 'Immediate (<24h)' | 'Short-Term (1-7d)' | 'Medium-Term (1-4w)';
    riskLevel: 'Low' | 'Moderate' | 'High';
  }[];
  geopoliticalImplications: string[];
}

export interface ModuleTelemetry<T> {
  status: 'ok' | 'degraded' | 'offline';
  latencyMs: number;
  lastUpdated: string;
  sourceEndpoint: string;
  error?: string;
  data: T;
}

export interface SweepPayload {
  sweepId: string;
  timestamp: string;
  sweepDurationMs: number;
  overallStatus: 'OPTIMAL' | 'DEGRADED' | 'WARNING' | 'CRITICAL';
  alerts: AlertItem[];
  delta: SweepDelta;
  geospatial: ModuleTelemetry<GeospatialModuleData>;
  markets: ModuleTelemetry<MarketsModuleData>;
  health: ModuleTelemetry<HealthModuleData>;
  infrastructure: ModuleTelemetry<InfrastructureModuleData>;
  synthesis?: AISynthesisReport;
}

export interface SweepHistorySummary {
  sweepId: string;
  timestamp: string;
  alertsCount: {
    flash: number;
    priority: number;
    routine: number;
  };
  durationMs: number;
  status: string;
  topHeadline: string;
}
