import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { calculateSweepDelta } from './delta.js';
import { fetchFirmsThermalAnomalies } from './sources/firms.js';
import { fetchInfrastructureData } from './sources/infrastructure.js';
import { fetchMarketsData } from './sources/finance.js';
import { fetchPubMedHealthData } from './sources/pubmed.js';
import { fetchNoaaSpaceWeather } from './sources/spaceWeather.js';
import { fetchUsgsEarthquakes } from './sources/usgs.js';
import { fetchOpenMeteoWeatherAqi } from './sources/weather.js';
import { fetchDisasterTwitterFeed } from './sources/twitterDisaster.js';
import { generateCrossDomainSynthesis } from './synthesis.js';
import {
  GeospatialModuleData,
  HealthModuleData,
  InfrastructureModuleData,
  MarketsModuleData,
  ModuleTelemetry,
  SweepHistorySummary,
  SweepPayload,
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const LATEST_SWEEP_FILE = path.join(DATA_DIR, 'latest_sweep.json');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

// In-memory active sweep state & SSE subscribers
let latestSweepCache: SweepPayload | null = null;
let isSweeping = false;
let sweepIntervalMinutes = 15;
let sweepTimer: NodeJS.Timeout | null = null;
let nextSweepTimestamp = Date.now() + sweepIntervalMinutes * 60 * 1000;
const sseClients: Set<Response> = new Set();

// Load latest sweep from file if present
try {
  if (fs.existsSync(LATEST_SWEEP_FILE)) {
    const raw = fs.readFileSync(LATEST_SWEEP_FILE, 'utf-8');
    latestSweepCache = JSON.parse(raw);
    console.log(`[Sweep Engine] Loaded latest sweep cache (${latestSweepCache?.sweepId})`);
  }
} catch (err) {
  console.warn('[Sweep Engine] Could not read latest_sweep.json:', err);
}

export function subscribeSSE(res: Response): () => void {
  sseClients.add(res);
  console.log(`[SSE] Client connected. Total active clients: ${sseClients.size}`);

  // Send initial connected event + latest sweep
  sendSseToClient(res, 'connected', {
    message: 'Crucix SSE telemetry stream established',
    activeClients: sseClients.size,
    nextSweepTimestamp,
    sweepIntervalMinutes,
    latestSweepAvailable: Boolean(latestSweepCache),
  });

  if (latestSweepCache) {
    sendSseToClient(res, 'sweep_complete', latestSweepCache);
  }

  return () => {
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected. Total active clients: ${sseClients.size}`);
  };
}

export function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function sendSseToClient(client: Response, event: string, data: any) {
  try {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    sseClients.delete(client);
  }
}

export async function performSweep(manualTrigger = false): Promise<SweepPayload> {
  if (isSweeping) {
    console.log('[Sweep Engine] Sweep already in progress, returning active/cached state.');
    if (latestSweepCache) return latestSweepCache;
  }

  isSweeping = true;
  const sweepId = `sweep-${Date.now()}`;
  const sweepStart = Date.now();
  console.log(`[Sweep Engine] Starting parallel sweep (${sweepId}) [Manual: ${manualTrigger}]`);

  broadcastSSE('sweep_start', {
    sweepId,
    timestamp: new Date().toISOString(),
    manualTrigger,
  });

  try {
    // 1. EXECUTE PARALLEL SWEEP USING Promise.allSettled()
    const [usgsRes, noaaRes, weatherRes, firmsRes, twitterRes, financeRes, pubmedRes, infraRes] = await Promise.allSettled([
      fetchUsgsEarthquakes(),
      fetchNoaaSpaceWeather(),
      fetchOpenMeteoWeatherAqi(),
      fetchFirmsThermalAnomalies(),
      fetchDisasterTwitterFeed(),
      fetchMarketsData(),
      fetchPubMedHealthData(),
      fetchInfrastructureData(),
    ]);

    broadcastSSE('sweep_progress', { stage: 'sources_fetched', percent: 60 });

    // 2. UNIFY GEOSPATIAL TELEMETRY
    const usgsData = usgsRes.status === 'fulfilled' ? usgsRes.value : null;
    const noaaData = noaaRes.status === 'fulfilled' ? noaaRes.value : null;
    const weatherData = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
    const firmsData = firmsRes.status === 'fulfilled' ? firmsRes.value : null;
    const twitterData = twitterRes.status === 'fulfilled' ? twitterRes.value : null;

    const earthquakesData = usgsData?.data || { totalCount: 0, maxMag: 0, maxMagnitude: 0, significantCount: 0, items: [] };
    const thermalAnomaliesData = firmsData?.data || { totalHotspots: 0, highConfidenceCount: 0, items: [] };
    const twitterDisasterData = twitterData?.data || { totalActiveDispatches: 0, criticalCount: 0, sourcesMonitored: 14, items: [] };

    const geospatialTelemetry: ModuleTelemetry<GeospatialModuleData> = {
      status: usgsData?.status === 'ok' && noaaData?.status === 'ok' ? 'ok' : 'degraded',
      latencyMs: Math.max(usgsData?.latencyMs || 0, noaaData?.latencyMs || 0, weatherData?.latencyMs || 0),
      lastUpdated: new Date().toISOString(),
      sourceEndpoint: 'USGS GeoJSON + NOAA SWPC + OpenMeteo + NASA FIRMS + Twitter/X OSINT',
      data: {
        earthquakes: {
          ...earthquakesData,
          maxMagnitude: earthquakesData.maxMag || (earthquakesData as any).maxMagnitude || 0,
        },
        spaceWeather: noaaData?.data || {
          kpCurrent: 2.0,
          kpEstimated24hMax: 3.0,
          kpIndex: 2.1,
          geomagneticStormRisk: 'Quiet',
          solarWindSpeedKmS: 412,
          solarWindDensityPcm3: 5.4,
          solarFlareThreat: 'Low (C-Class)',
          stormLevel: 'None',
          radioBlackoutRisk: 'Low',
          solarRadiationRisk: 'Quiet',
          latestTimestamp: new Date().toISOString(),
          recentKpValues: [],
        },
        weatherHubs: weatherData?.data || [],
        thermalAnomalies: thermalAnomaliesData,
        fireAnomalies: thermalAnomaliesData.items || [],
        disasterFeed: twitterDisasterData,
      },
      error: usgsData?.error || noaaData?.error,
    };

    // 3. UNIFY MARKETS TELEMETRY
    const finData = financeRes.status === 'fulfilled' ? financeRes.value : null;
    const marketsTelemetry: ModuleTelemetry<MarketsModuleData> = {
      status: finData?.status || 'degraded',
      latencyMs: finData?.latencyMs || 0,
      lastUpdated: new Date().toISOString(),
      sourceEndpoint: 'CoinGecko API + Yahoo Finance Public Quotes + Macro FRED Proxies',
      data: finData?.data || {
        tickers: [],
        macro: [],
        marketStatus: {
          crypto24hVol: '$0',
          volatilityIndex: 15,
          yieldCurveInversion: false,
          spread10Y2Y: 0.15,
          dominantTrend: 'Neutral',
        },
      },
      error: finData?.error,
    };

    // 4. UNIFY HEALTH & BIO-RESEARCH TELEMETRY
    const healthData = pubmedRes.status === 'fulfilled' ? pubmedRes.value : null;
    const healthTelemetry: ModuleTelemetry<HealthModuleData> = {
      status: healthData?.status || 'degraded',
      latencyMs: healthData?.latencyMs || 0,
      lastUpdated: new Date().toISOString(),
      sourceEndpoint: 'Europe PMC / PubMed Search API + Global Surveillance + Phytopharmacology Databases',
      data: healthData?.data || {
        papers: [],
        discoveries: [],
        alternativeMedicine: [],
        outbreaks: [],
        keywordHighlights: [],
        bioRiskIndex: 25,
      },
      error: healthData?.error,
    };

    // 5. UNIFY INFRASTRUCTURE, CYBER & MARITIME TELEMETRY
    const infData = infraRes.status === 'fulfilled' ? infraRes.value : null;
    const infraTelemetry: ModuleTelemetry<InfrastructureModuleData> = {
      status: infData?.status || 'degraded',
      latencyMs: infData?.latencyMs || 0,
      lastUpdated: new Date().toISOString(),
      sourceEndpoint: 'CISA KEV Catalog + Cloudflare Radar + OpenSky ADS-B + Global Maritime AIS Feeds',
      data: infData?.data || {
        cisaKev: { totalCatalogCount: 0, recentAdded: [], ransomwareTargetedCount: 0 },
        internetOutages: [],
        airTraffic: { totalTrackedAircraft: 0, emergencySquawks: [], gpsJammingZones: [], anomalousEventsCount: 0 },
        maritime: {
          chokepoints: [],
          trackedVessels: [],
          stats: {
            totalTrackedVessels: 0,
            globalChokepointCongestionIndex: 50,
            redSeaDiversionRatePercent: 50,
            balticDryIndex: 1800,
            activeNavalAdvisories: 0,
          },
        },
      },
      error: infData?.error,
    };

    const sweepDurationMs = Date.now() - sweepStart;

    // 6. DELTA CALCULATION & ALERTS CLASSIFICATION
    const rawSweepWithoutDelta = {
      sweepId,
      timestamp: new Date().toISOString(),
      sweepDurationMs,
      overallStatus: 'OPTIMAL' as const,
      geospatial: geospatialTelemetry,
      markets: marketsTelemetry,
      health: healthTelemetry,
      infrastructure: infraTelemetry,
    };

    const { delta, alerts } = calculateSweepDelta(rawSweepWithoutDelta, latestSweepCache);

    broadcastSSE('sweep_progress', { stage: 'delta_calculated', percent: 80 });

    // 7. CROSS-DOMAIN AI SYNTHESIS (GEMINI / HEURISTIC)
    let synthesis;
    try {
      synthesis = await generateCrossDomainSynthesis(
        geospatialTelemetry.data,
        marketsTelemetry.data,
        healthTelemetry.data,
        infraTelemetry.data
      );
    } catch (err: any) {
      console.warn('[Sweep Engine] Synthesis step failed:', err.message);
    }

    // Determine overall system status
    let overallStatus: SweepPayload['overallStatus'] = 'OPTIMAL';
    if (delta.flashCount > 0) {
      overallStatus = 'CRITICAL';
    } else if (delta.priorityCount > 0) {
      overallStatus = 'WARNING';
    } else if (
      geospatialTelemetry.status !== 'ok' ||
      marketsTelemetry.status !== 'ok' ||
      healthTelemetry.status !== 'ok' ||
      infraTelemetry.status !== 'ok'
    ) {
      overallStatus = 'DEGRADED';
    }

    const completedSweep: SweepPayload = {
      ...rawSweepWithoutDelta,
      overallStatus,
      alerts,
      delta,
      synthesis,
    };

    // 8. ATOMIC JSON PERSISTENCE (Zero Database Hot Cache + Cold History Archive)
    await saveSweepAtomic(completedSweep);

    latestSweepCache = completedSweep;
    nextSweepTimestamp = Date.now() + sweepIntervalMinutes * 60 * 1000;

    console.log(
      `[Sweep Engine] Sweep ${sweepId} completed in ${sweepDurationMs}ms. Status: ${overallStatus}. Alerts: ${alerts.length} (Flash: ${delta.flashCount}, Priority: ${delta.priorityCount})`
    );

    // 9. BROADCAST VIA SSE
    broadcastSSE('sweep_complete', completedSweep);

    // If flash alerts occurred, broadcast dedicated flash event
    if (delta.flashCount > 0) {
      const flashAlerts = alerts.filter((a) => a.tier === 'FLASH');
      broadcastSSE('alert_flash', {
        count: flashAlerts.length,
        alerts: flashAlerts,
        timestamp: new Date().toISOString(),
      });
    }

    return completedSweep;
  } catch (err: any) {
    console.error('[Sweep Engine] Sweep error:', err);
    throw err;
  } finally {
    isSweeping = false;
  }
}

async function saveSweepAtomic(sweep: SweepPayload) {
  try {
    const tempFile = `${LATEST_SWEEP_FILE}.tmp`;
    const jsonStr = JSON.stringify(sweep, null, 2);

    // Atomic write for hot cache
    fs.writeFileSync(tempFile, jsonStr, 'utf-8');
    fs.renameSync(tempFile, LATEST_SWEEP_FILE);

    // Archive in cold history
    const historyFile = path.join(HISTORY_DIR, `${sweep.sweepId}.json`);
    fs.writeFileSync(historyFile, jsonStr, 'utf-8');

    // Clean old history archives (keep latest 30)
    pruneHistory();
  } catch (err) {
    console.warn('[Sweep Engine] Failed to save sweep JSON:', err);
  }
}

function pruneHistory() {
  try {
    const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json'));
    if (files.length > 30) {
      files.sort().slice(0, files.length - 30).forEach((f) => {
        fs.unlinkSync(path.join(HISTORY_DIR, f));
      });
    }
  } catch (err) {
    // Ignore prune errors
  }
}

export function getLatestSweep(): SweepPayload | null {
  return latestSweepCache;
}

export function getHistoryList(): SweepHistorySummary[] {
  try {
    const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
    return files.slice(0, 20).map((file) => {
      try {
        const content = fs.readFileSync(path.join(HISTORY_DIR, file), 'utf-8');
        const sweep: SweepPayload = JSON.parse(content);
        return {
          sweepId: sweep.sweepId,
          timestamp: sweep.timestamp,
          alertsCount: {
            flash: sweep.delta.flashCount,
            priority: sweep.delta.priorityCount,
            routine: sweep.delta.routineCount,
          },
          durationMs: sweep.sweepDurationMs,
          status: sweep.overallStatus,
          topHeadline: sweep.alerts.find((a) => a.tier === 'FLASH' || a.tier === 'PRIORITY')?.title || 'Routine monitoring normal',
        };
      } catch {
        return {
          sweepId: file.replace('.json', ''),
          timestamp: new Date().toISOString(),
          alertsCount: { flash: 0, priority: 0, routine: 0 },
          durationMs: 0,
          status: 'OPTIMAL',
          topHeadline: 'Historical sweep archive',
        };
      }
    });
  } catch {
    return [];
  }
}

export function getHistoricalSweep(sweepId: string): SweepPayload | null {
  try {
    const filePath = path.join(HISTORY_DIR, `${sweepId}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.warn(`[Sweep Engine] Could not read historical sweep ${sweepId}:`, err);
  }
  return null;
}

export function setSweepIntervalMinutes(minutes: number) {
  sweepIntervalMinutes = Math.max(1, Math.min(1440, minutes));
  console.log(`[Sweep Engine] Sweep interval set to ${sweepIntervalMinutes} minutes.`);
  scheduleNextCronSweep();
}

export function getSweepConfig() {
  return {
    sweepIntervalMinutes,
    nextSweepTimestamp,
    isSweeping,
    totalHistoryCount: fs.existsSync(HISTORY_DIR) ? fs.readdirSync(HISTORY_DIR).length : 0,
    connectedSseClients: sseClients.size,
  };
}

export function initSweepScheduler() {
  console.log(`[Sweep Engine] Initializing Cron Engine with ${sweepIntervalMinutes}m interval.`);
  // Perform initial sweep on startup if cache missing or older than 15 mins
  const shouldRunInitial = !latestSweepCache || Date.now() - new Date(latestSweepCache.timestamp).getTime() > 15 * 60 * 1000;

  if (shouldRunInitial) {
    setTimeout(() => {
      performSweep(false).catch((e) => console.error('[Sweep Engine] Initial sweep failed:', e));
    }, 1500);
  }

  scheduleNextCronSweep();

  // Heartbeat ping to keep SSE connections healthy
  setInterval(() => {
    broadcastSSE('ping', {
      timestamp: new Date().toISOString(),
      nextSweepTimestamp,
    });
  }, 15000);
}

function scheduleNextCronSweep() {
  if (sweepTimer) clearInterval(sweepTimer);
  sweepTimer = setInterval(() => {
    console.log('[Sweep Engine] Cron timer triggered scheduled sweep.');
    performSweep(false).catch((e) => console.error('[Sweep Engine] Cron sweep error:', e));
  }, sweepIntervalMinutes * 60 * 1000);
  nextSweepTimestamp = Date.now() + sweepIntervalMinutes * 60 * 1000;
}
