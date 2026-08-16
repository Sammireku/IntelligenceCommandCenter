import { SpaceWeatherTelemetry } from '../../src/types.js';

export async function fetchNoaaSpaceWeather(): Promise<{
  data: SpaceWeatherTelemetry;
  latencyMs: number;
  status: 'ok' | 'degraded' | 'offline';
  error?: string;
}> {
  const startTime = Date.now();
  const endpoint = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rows = await response.json(); // Array of [time_tag, Kp, a_running, station_count]
    // The first row is headers: ["time_tag", "Kp", "a_running", "station_count"]
    const dataRows = Array.isArray(rows) && rows.length > 1 ? rows.slice(1) : [];

    const recentKpValues = dataRows.slice(-12).map((r: any) => ({
      time: r[0],
      kp: parseFloat(r[1]) || 0,
    }));

    const currentKp = recentKpValues.length > 0 ? recentKpValues[recentKpValues.length - 1].kp : 2.33;
    const maxKp = recentKpValues.reduce((max, item) => Math.max(max, item.kp), currentKp);

    let stormLevel: SpaceWeatherTelemetry['stormLevel'] = 'None';
    let radioBlackoutRisk: SpaceWeatherTelemetry['radioBlackoutRisk'] = 'Low';
    let solarRadiationRisk: SpaceWeatherTelemetry['solarRadiationRisk'] = 'Quiet';

    if (currentKp >= 9) {
      stormLevel = 'G5 Extreme';
      radioBlackoutRisk = 'Severe';
      solarRadiationRisk = 'Storm';
    } else if (currentKp >= 8) {
      stormLevel = 'G4 Severe';
      radioBlackoutRisk = 'Severe';
      solarRadiationRisk = 'Storm';
    } else if (currentKp >= 7) {
      stormLevel = 'G3 Strong';
      radioBlackoutRisk = 'High';
      solarRadiationRisk = 'Storm';
    } else if (currentKp >= 6) {
      stormLevel = 'G2 Moderate';
      radioBlackoutRisk = 'Moderate';
      solarRadiationRisk = 'Active';
    } else if (currentKp >= 5) {
      stormLevel = 'G1 Minor';
      radioBlackoutRisk = 'Moderate';
      solarRadiationRisk = 'Active';
    }

    return {
      data: {
        kpCurrent: Number(currentKp.toFixed(2)),
        kpEstimated24hMax: Number(maxKp.toFixed(2)),
        stormLevel,
        radioBlackoutRisk,
        solarRadiationRisk,
        latestTimestamp: recentKpValues.length > 0 ? recentKpValues[recentKpValues.length - 1].time : new Date().toISOString(),
        recentKpValues,
      },
      latencyMs: Date.now() - startTime,
      status: 'ok',
    };
  } catch (err: any) {
    console.warn('[Space Weather Source] Error:', err.message);
    return {
      data: {
        kpCurrent: 2.67,
        kpEstimated24hMax: 3.33,
        stormLevel: 'None',
        radioBlackoutRisk: 'Low',
        solarRadiationRisk: 'Quiet',
        latestTimestamp: new Date().toISOString(),
        recentKpValues: [
          { time: new Date(Date.now() - 3600000 * 3).toISOString(), kp: 2.0 },
          { time: new Date(Date.now() - 3600000 * 2).toISOString(), kp: 2.33 },
          { time: new Date(Date.now() - 3600000 * 1).toISOString(), kp: 2.67 },
          { time: new Date().toISOString(), kp: 2.67 },
        ],
      },
      latencyMs: Date.now() - startTime,
      status: 'degraded',
      error: 'NOAA SWPC telemetry degraded. Using planetary baseline.',
    };
  }
}
