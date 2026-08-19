import { AlertItem, AlertTier, SweepDelta, SweepPayload } from '../src/types.js';

export function calculateSweepDelta(
  current: Omit<SweepPayload, 'delta' | 'alerts'>,
  previous: SweepPayload | null
): { delta: SweepDelta; alerts: AlertItem[] } {
  const alerts: AlertItem[] = [];
  const deltaChanges: SweepDelta['changes'] = [];

  const nowIso = new Date().toISOString();

  // 1. EVALUATE GEOSPATIAL & HAZARDS
  const earthquakes = current.geospatial.data.earthquakes.items || [];
  const prevQuakeIds = new Set(previous?.geospatial.data.earthquakes.items.map((q) => q.id) || []);

  for (const eq of earthquakes) {
    const isNew = !prevQuakeIds.has(eq.id);
    if (eq.mag >= 6.0) {
      alerts.push({
        id: `alert-eq-${eq.id}`,
        tier: 'FLASH',
        domain: 'geospatial',
        title: `🔴 FLASH: Major M${eq.mag.toFixed(1)} Earthquake Detected`,
        summary: `${eq.place} at depth ${eq.coordinates[2]}km. Tsunami flag: ${eq.tsunami ? 'YES' : 'NO'}.`,
        timestamp: new Date(eq.time).toISOString(),
        metrics: { Magnitude: `M${eq.mag.toFixed(1)}`, Depth: `${eq.coordinates[2]}km` },
        sourceUrl: eq.url,
        highlight: true,
      });

      if (isNew) {
        deltaChanges.push({
          domain: 'Geospatial',
          type: 'added',
          message: `Major M${eq.mag.toFixed(1)} seismic event registered in ${eq.place}`,
          severity: 'FLASH',
        });
      }
    } else if (eq.mag >= 4.5) {
      alerts.push({
        id: `alert-eq-${eq.id}`,
        tier: 'PRIORITY',
        domain: 'geospatial',
        title: `🟡 PRIORITY: Significant M${eq.mag.toFixed(1)} Earthquake`,
        summary: `${eq.place}. Felt reports: ${eq.felt || 'N/A'}.`,
        timestamp: new Date(eq.time).toISOString(),
        metrics: { Magnitude: `M${eq.mag.toFixed(1)}` },
        sourceUrl: eq.url,
      });

      if (isNew) {
        deltaChanges.push({
          domain: 'Geospatial',
          type: 'added',
          message: `M${eq.mag.toFixed(1)} earthquake recorded near ${eq.place}`,
          severity: 'PRIORITY',
        });
      }
    }
  }

  // NOAA Space Weather
  const spaceWeather = current.geospatial.data.spaceWeather;
  if (spaceWeather.kpCurrent >= 7) {
    alerts.push({
      id: `alert-sw-kp-${Date.now()}`,
      tier: 'FLASH',
      domain: 'geospatial',
      title: `🔴 FLASH: Severe Geomagnetic Storm (${spaceWeather.stormLevel})`,
      summary: `NOAA Planetary K-index reached ${spaceWeather.kpCurrent}. Satellite and high-frequency radio blackout risk ELEVATED.`,
      timestamp: nowIso,
      metrics: { 'Kp Index': spaceWeather.kpCurrent, Storm: spaceWeather.stormLevel },
    });
    deltaChanges.push({
      domain: 'Space Weather',
      type: 'escalated',
      message: `Geomagnetic storm escalated to ${spaceWeather.stormLevel} (Kp ${spaceWeather.kpCurrent})`,
      severity: 'FLASH',
    });
  } else if (spaceWeather.kpCurrent >= 5) {
    alerts.push({
      id: `alert-sw-kp-${Date.now()}`,
      tier: 'PRIORITY',
      domain: 'geospatial',
      title: `🟡 PRIORITY: Geomagnetic Disturbance (${spaceWeather.stormLevel})`,
      summary: `NOAA Kp Index at ${spaceWeather.kpCurrent}. Auroral enhancement and minor grid fluctuations observed.`,
      timestamp: nowIso,
      metrics: { 'Kp Index': spaceWeather.kpCurrent },
    });
  }

  // Weather & AQI Extremes
  for (const hub of current.geospatial.data.weatherHubs || []) {
    if (hub.aqiUs > 150) {
      alerts.push({
        id: `alert-aqi-${hub.city}`,
        tier: 'PRIORITY',
        domain: 'geospatial',
        title: `🟡 PRIORITY: Severe Air Quality Anomaly (${hub.city})`,
        summary: `${hub.city}, ${hub.country} recorded US AQI of ${hub.aqiUs} (${hub.aqiCategory}) with PM2.5 at ${hub.pm25} µg/m³.`,
        timestamp: nowIso,
        metrics: { AQI: hub.aqiUs, 'PM2.5': `${hub.pm25} µg/m³` },
      });
      deltaChanges.push({
        domain: 'Environment',
        type: 'escalated',
        message: `AQI in ${hub.city} surged to ${hub.aqiUs} (${hub.aqiCategory})`,
        severity: 'PRIORITY',
      });
    }
  }

  // Live Natural Disaster X / Twitter Dispatches
  for (const dispatch of current.geospatial.data.disasterFeed?.items || []) {
    if (dispatch.urgency === 'CRITICAL BREAKING') {
      alerts.push({
        id: `alert-tw-${dispatch.id}`,
        tier: 'FLASH',
        domain: 'geospatial',
        title: `🔴 FLASH: ${dispatch.disasterType.toUpperCase()} - ${dispatch.authorName}`,
        summary: `${dispatch.text.slice(0, 160)}...`,
        timestamp: dispatch.timestamp,
        metrics: { Disaster: dispatch.disasterType, Handle: dispatch.handle, Location: dispatch.location.name },
        sourceUrl: dispatch.sourceUrl,
        highlight: true,
      });
    }
  }

  // 2. EVALUATE MARKETS & ECONOMY
  for (const ticker of current.markets.data.tickers || []) {
    const absChange = Math.abs(ticker.change24h);
    if (absChange >= 5.0) {
      alerts.push({
        id: `alert-mkt-${ticker.symbol}`,
        tier: 'FLASH',
        domain: 'markets',
        title: `🔴 FLASH: High Volatility Spike in ${ticker.name} (${ticker.symbol})`,
        summary: `${ticker.symbol} moved ${ticker.change24h > 0 ? '+' : ''}${ticker.change24h}% in 24h to ${ticker.price.toLocaleString()} ${ticker.unit || ''}.`,
        timestamp: nowIso,
        metrics: { Price: `${ticker.price.toLocaleString()}`, Change: `${ticker.change24h}%` },
      });
      deltaChanges.push({
        domain: 'Markets',
        type: 'escalated',
        message: `${ticker.symbol} experienced sharp intraday volatility (${ticker.change24h > 0 ? '+' : ''}${ticker.change24h}%)`,
        severity: 'FLASH',
      });
    } else if (absChange >= 2.0) {
      alerts.push({
        id: `alert-mkt-${ticker.symbol}`,
        tier: 'PRIORITY',
        domain: 'markets',
        title: `🟡 PRIORITY: Notable Movement in ${ticker.symbol}`,
        summary: `${ticker.name} recorded ${ticker.change24h > 0 ? '+' : ''}${ticker.change24h}% 24h delta. Current: ${ticker.price.toLocaleString()} ${ticker.unit || ''}.`,
        timestamp: nowIso,
        metrics: { Change: `${ticker.change24h}%` },
      });
    }
  }

  // 3. EVALUATE PUBLIC HEALTH, DISCOVERIES & ALTERNATIVE MEDICINE
  for (const paper of current.health.data.papers || []) {
    if (paper.threatLevel === 'Emerging Threat') {
      alerts.push({
        id: `alert-paper-${paper.id}`,
        tier: 'PRIORITY',
        domain: 'health',
        title: `🟡 PRIORITY: Emerging Bio-Surveillance Publication`,
        summary: `${paper.title} (${paper.journal}, ${paper.pubDate}). Key vectors: ${paper.relevanceKeywords.join(', ')}.`,
        timestamp: nowIso,
        sourceUrl: paper.url,
      });
    }
  }

  // Medical Discoveries
  for (const disc of current.health.data.discoveries || []) {
    if (disc.clinicalPhase === 'Phase III Clinical Trial' || disc.clinicalPhase === 'Phase II Multi-Center') {
      alerts.push({
        id: `alert-disc-${disc.id}`,
        tier: 'PRIORITY',
        domain: 'health',
        title: `🟢 DISCOVERY: ${disc.category} Breakthrough (${disc.clinicalPhase})`,
        summary: `${disc.title}. ${disc.keyFindings}`,
        timestamp: nowIso,
        sourceUrl: disc.url,
        metrics: { Journal: disc.journal, Phase: disc.clinicalPhase, Category: disc.category },
      });
    }
  }

  // Verified Alternative Medicine Trials
  for (const alt of current.health.data.alternativeMedicine || []) {
    if (alt.evidenceLevel === 'Double-Blind Placebo-Controlled RCT' || alt.evidenceLevel === 'Systematic Review & Meta-Analysis') {
      alerts.push({
        id: `alert-alt-${alt.id}`,
        tier: 'ROUTINE',
        domain: 'health',
        title: `🌿 PHYTOMEDICINE: ${alt.commonName} Clinical Trial Summary`,
        summary: `${alt.primaryIndication}: ${alt.keyClinicalOutcomes} (${alt.evidenceLevel}, ${alt.sampleSize}).`,
        timestamp: nowIso,
        sourceUrl: alt.url,
        metrics: { Botanical: alt.botanicalName, Dosage: alt.testedDosage, PMID: alt.pmid },
      });
    }
  }

  for (const outbreak of current.health.data.outbreaks || []) {
    if (outbreak.alertLevel === 'PRIORITY' || outbreak.alertLevel === 'FLASH') {
      alerts.push({
        id: `alert-ob-${outbreak.id}`,
        tier: outbreak.alertLevel,
        domain: 'health',
        title: `${outbreak.alertLevel === 'FLASH' ? '🔴 FLASH' : '🟡 PRIORITY'}: Pathogen Alert - ${outbreak.pathogen}`,
        summary: `${outbreak.region}: ${outbreak.details} (Source: ${outbreak.source})`,
        timestamp: nowIso,
        metrics: { Pathogen: outbreak.pathogen, Source: outbreak.source },
      });
    }
  }

  // 4. EVALUATE INFRASTRUCTURE, CYBER, AVIATION & MARITIME
  for (const cve of current.infrastructure.data.cisaKev.recentAdded || []) {
    if (cve.knownRansomwareCampaignUse === 'Known') {
      alerts.push({
        id: `alert-cve-${cve.cveID}`,
        tier: 'FLASH',
        domain: 'infrastructure',
        title: `🔴 FLASH: CISA KEV Exploited Zero-Day (${cve.cveID})`,
        summary: `${cve.vendorProject} ${cve.product}: ${cve.vulnerabilityName}. Active ransomware weaponization confirmed.`,
        timestamp: nowIso,
        metrics: { CVE: cve.cveID, Vendor: cve.vendorProject, Ransomware: 'CONFIRMED' },
        highlight: true,
      });
    } else {
      alerts.push({
        id: `alert-cve-${cve.cveID}`,
        tier: 'PRIORITY',
        domain: 'infrastructure',
        title: `🟡 PRIORITY: Newly Added CISA KEV Vulnerability (${cve.cveID})`,
        summary: `${cve.vendorProject} ${cve.product} - ${cve.shortDescription.slice(0, 140)}...`,
        timestamp: nowIso,
        metrics: { CVE: cve.cveID, Added: cve.dateAdded },
      });
    }
  }

  // Maritime Chokepoints & Dark Fleet Vessels
  for (const cp of current.infrastructure.data.maritime?.chokepoints || []) {
    if (cp.status === 'Restricted' || cp.riskScore >= 75) {
      alerts.push({
        id: `alert-maritime-${cp.id}`,
        tier: cp.riskScore >= 90 ? 'FLASH' : 'PRIORITY',
        domain: 'infrastructure',
        title: `${cp.riskScore >= 90 ? '🔴 FLASH' : '🟡 PRIORITY'}: Maritime Strait Alert - ${cp.name}`,
        summary: `${cp.location} (${cp.status}): ${cp.securityAlert || cp.flowDescription}. Delays: ${cp.averageDelayHours}h.`,
        timestamp: nowIso,
        metrics: { Transit: `${cp.transitVolume24h}/day`, 'Risk Score': `${cp.riskScore}/100`, Waiting: `${cp.vesselsWaiting} ships` },
        highlight: cp.riskScore >= 90,
      });
      deltaChanges.push({
        domain: 'Maritime',
        type: 'escalated',
        message: `${cp.name} security posture elevated (${cp.status}, Risk ${cp.riskScore}/100)`,
        severity: cp.riskScore >= 90 ? 'FLASH' : 'PRIORITY',
      });
    }
  }

  for (const vessel of current.infrastructure.data.maritime?.trackedVessels || []) {
    if (vessel.riskRating === 'High') {
      alerts.push({
        id: `alert-vessel-${vessel.mmsi}`,
        tier: 'PRIORITY',
        domain: 'infrastructure',
        title: `🟡 PRIORITY: Anomaly Detected on Vessel ${vessel.vesselName}`,
        summary: `${vessel.flag} ${vessel.vesselType} [MMSI: ${vessel.mmsi}]: ${vessel.anomalyFlag}. Speed: ${vessel.speedKnots} kts.`,
        timestamp: nowIso,
        metrics: { Vessel: vessel.vesselName, Type: vessel.vesselType, Anomaly: vessel.anomalyFlag || 'N/A' },
      });
    }
  }

  // Aviation GPS Jamming & Emergency Squawks
  for (const jam of current.infrastructure.data.airTraffic?.gpsJammingZones || []) {
    if (jam.severity.startsWith('Severe')) {
      alerts.push({
        id: `alert-gps-jam-${jam.id}`,
        tier: 'PRIORITY',
        domain: 'infrastructure',
        title: `🟡 PRIORITY: Severe GPS/GNSS Jamming Zone (${jam.region})`,
        summary: `${jam.impactDescription} (Primary FIRs: ${jam.primaryAffectedAirspace}).`,
        timestamp: nowIso,
        metrics: { Region: jam.region, Radius: `${jam.radiusKm}km`, Severity: 'Severe' },
      });
    }
  }

  // Flight emergencies (Squawk 7700 / Reconnaissance)
  for (const fl of current.infrastructure.data.airTraffic?.emergencySquawks || []) {
    if (fl.squawk === '7700') {
      alerts.push({
        id: `alert-flight-${fl.icao24}`,
        tier: 'FLASH',
        domain: 'infrastructure',
        title: `🔴 FLASH: Transponder Emergency Squawk 7700`,
        summary: `Aircraft ${fl.callsign || fl.icao24} (${fl.aircraftType || fl.originCountry}) broadcasting General Emergency on ${fl.route || 'active airway'}. ${fl.details || ''}`,
        timestamp: fl.lastContact || nowIso,
        metrics: { Callsign: fl.callsign, Squawk: '7700', Alt: `${fl.altitudeFt}ft`, Speed: `${fl.velocityKnots}kts` },
        highlight: true,
      });
      deltaChanges.push({
        domain: 'Aviation',
        type: 'escalated',
        message: `Aircraft ${fl.callsign || fl.icao24} declared Squawk 7700 in-flight emergency`,
        severity: 'FLASH',
      });
    } else if (fl.squawkType === 'SIGINT Reconnaissance') {
      alerts.push({
        id: `alert-flight-recon-${fl.icao24}`,
        tier: 'ROUTINE',
        domain: 'infrastructure',
        title: `🔵 AIRSPACE: Military/SIGINT Asset Active (${fl.callsign})`,
        summary: `${fl.originCountry} ${fl.aircraftType}: ${fl.details || 'Active reconnaissance orbit'}.`,
        timestamp: fl.lastContact || nowIso,
        metrics: { Callsign: fl.callsign, Type: fl.aircraftType || 'ISR', Altitude: `${fl.altitudeFt}ft` },
      });
    }
  }

  // 5. ROUTINE SWEEP CONFIRMATION
  alerts.push({
    id: `alert-routine-${Date.now()}`,
    tier: 'ROUTINE',
    domain: 'synthesis',
    title: `🔵 ROUTINE: MILZ Sentry Parallel Sweep Completed`,
    summary: `Synchronized telemetry across USGS, NOAA SWPC, OpenMeteo, CoinGecko, Macro, Europe PMC, Medical Discoveries, Alternative Medicine RCTs, Maritime AIS, and OpenSky feeds.`,
    timestamp: nowIso,
    metrics: { 'Sweep Duration': `${current.sweepDurationMs}ms` },
  });

  // Calculate counts
  let flashCount = 0;
  let priorityCount = 0;
  let routineCount = 0;

  for (const a of alerts) {
    if (a.tier === 'FLASH') flashCount++;
    else if (a.tier === 'PRIORITY') priorityCount++;
    else routineCount++;
  }

  if (deltaChanges.length === 0) {
    deltaChanges.push({
      domain: 'System',
      type: 'resolved',
      message: 'All monitoring parameters within standard operational thresholds.',
      severity: 'ROUTINE',
    });
  }

  const delta: SweepDelta = {
    timestamp: nowIso,
    newAlertsCount: alerts.length,
    flashCount,
    priorityCount,
    routineCount,
    changes: deltaChanges,
  };

  return { delta, alerts };
}
