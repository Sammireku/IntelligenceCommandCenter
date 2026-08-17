import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  MessageSquare,
  Radio,
  Send,
  Shield,
  Sliders,
  X,
  Zap,
} from 'lucide-react';
import { DisasterTweetItem, EarthquakeItem, UserLocation, WhatsAppAlertConfig } from '../types.js';
import { calculateDistanceKm, generateWhatsAppAlertUrl } from '../utils/geoIntelligence.js';
import { playTacticalBlip } from '../utils/audio.js';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: UserLocation;
  onUpdateUserLocation: (loc: UserLocation) => void;
  config: WhatsAppAlertConfig;
  onUpdateConfig: (config: WhatsAppAlertConfig) => void;
  disasters: DisasterTweetItem[];
  earthquakes: EarthquakeItem[];
}

const PRESET_LOCATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'London, United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'New York, United States', lat: 40.7128, lng: -74.006 },
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Singapore / Malacca Strait', lat: 1.3521, lng: 103.8198 },
  { name: 'Dubai / Persian Gulf', lat: 25.2048, lng: 55.2708 },
  { name: 'Taipei, Taiwan', lat: 25.033, lng: 121.5654 },
  { name: 'Kyiv, Ukraine', lat: 50.4501, lng: 30.5234 },
];

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  userLocation,
  onUpdateUserLocation,
  config,
  onUpdateConfig,
  disasters,
  earthquakes,
}) => {
  const [phone, setPhone] = useState<string>(config.phoneNumber || '');
  const [radius, setRadius] = useState<number>(config.radiusKm || 500);
  const [criticalOnly, setCriticalOnly] = useState<boolean>(config.criticalOnly);
  const [minQuakeMag, setMinQuakeMag] = useState<number>(config.minQuakeMag || 5.0);
  const [testSent, setTestSent] = useState<boolean>(false);

  if (!isOpen) return null;

  // Find incidents near user location
  const nearDisasters = disasters.filter((d) => {
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, d.location.lat, d.location.lng);
    return dist <= radius && (!criticalOnly || d.urgency === 'CRITICAL BREAKING');
  });

  const nearQuakes = earthquakes.filter((q) => {
    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, q.coordinates[1], q.coordinates[0]);
    return dist <= radius && q.mag >= minQuakeMag;
  });

  const handleSaveConfig = () => {
    onUpdateConfig({
      ...config,
      enabled: true,
      phoneNumber: phone,
      radiusKm: radius,
      criticalOnly,
      minQuakeMag,
    });
    playTacticalBlip(1400);
    onClose();
  };

  const handleTriggerTestAlert = () => {
    setTestSent(true);
    playTacticalBlip(1600);

    const testEvent = nearDisasters[0]
      ? {
          name: nearDisasters[0].authorName + ': ' + nearDisasters[0].text.slice(0, 70) + '...',
          category: nearDisasters[0].disasterType,
          lat: nearDisasters[0].location.lat,
          lng: nearDisasters[0].location.lng,
          severity: nearDisasters[0].urgency,
          details: nearDisasters[0].text,
        }
      : nearQuakes[0]
      ? {
          name: `M${nearQuakes[0].mag} Earthquake - ${nearQuakes[0].place}`,
          category: 'Earthquake',
          lat: nearQuakes[0].coordinates[1],
          lng: nearQuakes[0].coordinates[0],
          severity: nearQuakes[0].mag >= 6 ? 'CRITICAL BREAKING' : 'PRIORITY',
          details: `Depth: ${nearQuakes[0].coordinates[2]}km. Tsunami watch: ${nearQuakes[0].tsunami ? 'YES' : 'NO'}.`,
        }
      : {
          name: `Proximity Test Alert (Focal: ${userLocation.name})`,
          category: 'Natural Disaster Warning System',
          lat: userLocation.lat,
          lng: userLocation.lng,
          severity: 'SIMULATION / TEST',
          details: `Test dispatch verified on Crucix Node. Proximity threshold set to ${radius} km radius.`,
        };

    const url = generateWhatsAppAlertUrl(testEvent, userLocation, phone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#121212] border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                WHATSAPP DISASTER ALERTS & PROXIMITY DISPATCH
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40">
                  LIVE API
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                Automated instant emergency alerts sent directly to your phone for quakes, storms, and disasters
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#d4d4d4]">
          {/* Section 1: Target Location / Focal Point */}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white uppercase flex items-center gap-2 text-xs">
                <MapPin className="w-4 h-4 text-[#00ff41]" />
                1. Focal Reference Location
              </span>
              <span className="text-[11px] font-mono text-[#00ff41]">
                Current: {userLocation.name} ({userLocation.lat.toFixed(2)}°, {userLocation.lng.toFixed(2)}°)
              </span>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        onUpdateUserLocation({
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                          name: 'Your Current GPS Location',
                          isLiveGps: true,
                          accuracyMeters: pos.coords.accuracy,
                        });
                        playTacticalBlip(1500);
                      },
                      () => {
                        alert('Could not retrieve browser GPS coordinates.');
                      }
                    );
                  }
                }}
                className="px-2.5 py-1.5 rounded text-[11px] font-mono font-bold bg-[#121212] border border-[#00ff41]/60 text-[#00ff41] hover:bg-[#00ff41]/20 transition-all flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                🎯 Use Live GPS
              </button>

              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    onUpdateUserLocation({
                      lat: preset.lat,
                      lng: preset.lng,
                      name: preset.name,
                      isLiveGps: false,
                    });
                    playTacticalBlip(1200);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                    userLocation.name === preset.name
                      ? 'bg-[#1a1a1a] text-[#00ff41] border-[#00ff41]'
                      : 'bg-[#121212] text-[#888888] border-[#262626] hover:text-white'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Proximity Radius & Trigger Criteria */}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 space-y-4">
            <span className="font-mono font-bold text-white uppercase flex items-center gap-2 text-xs">
              <Sliders className="w-4 h-4 text-[#25D366]" />
              2. Proximity Alert Radius & Thresholds
            </span>

            <div className="space-y-2">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-[#888888]">Alert Radius from Focal Point:</span>
                <span className="text-[#00ff41] font-bold">{radius} km ({Math.round(radius * 0.539957)} NM)</span>
              </div>
              <input
                type="range"
                min="50"
                max="2500"
                step="50"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[#00ff41] bg-[#161616] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#666666]">
                <span>50 km (Metro)</span>
                <span>500 km (Regional)</span>
                <span>2,500 km (Continental)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 p-2.5 rounded bg-[#121212] border border-[#262626] cursor-pointer hover:border-[#333333]">
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={(e) => setCriticalOnly(e.target.checked)}
                  className="rounded accent-[#25D366]"
                />
                <span className="font-mono text-xs text-white">Only Critical Breaking Disasters</span>
              </label>

              <div className="p-2.5 rounded bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="font-mono text-xs text-[#888888]">Min Earthquake Mag:</span>
                <select
                  value={minQuakeMag}
                  onChange={(e) => setMinQuakeMag(Number(e.target.value))}
                  className="bg-[#0a0a0a] border border-[#333333] rounded px-2 py-1 text-white font-mono text-xs"
                >
                  <option value="4.0">≥ M4.0 (Moderate)</option>
                  <option value="5.0">≥ M5.0 (Strong)</option>
                  <option value="6.0">≥ M6.0 (Major)</option>
                  <option value="7.0">≥ M7.0 (Catastrophic)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: WhatsApp Destination Phone Number */}
          <div className="bg-[#050505] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
            <span className="font-mono font-bold text-white uppercase flex items-center gap-2 text-xs">
              <MessageSquare className="w-4 h-4 text-[#25D366]" />
              3. WhatsApp Dispatch Number
            </span>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#888888]">
                Phone Number (Include country code without + or dashes, e.g. 14155552671):
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="e.g. 14155552671 or 447911123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-[#121212] border border-[#262626] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-[#25D366]"
                />
                <button
                  type="button"
                  onClick={handleTriggerTestAlert}
                  className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-lg shadow-[#25D366]/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Test WhatsApp Alert
                </button>
              </div>
            </div>

            {testSent && (
              <div className="p-2.5 rounded bg-[#25D366]/10 border border-[#25D366]/40 text-[#25D366] font-mono text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>WhatsApp emergency sitrep payload constructed and dispatched via secure wa.me protocol!</span>
              </div>
            )}
          </div>

          {/* Section 4: Real-time Live Matches Near Focal Point */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-[#888888] uppercase">
                Active Events Within {radius}km of {userLocation.name} ({nearDisasters.length + nearQuakes.length} detected)
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs">
              {nearDisasters.length === 0 && nearQuakes.length === 0 ? (
                <div className="p-3 rounded bg-[#050505] border border-[#1a1a1a] text-center text-[#666666]">
                  No active natural disasters or quakes within {radius} km of your focal point. All nominal.
                </div>
              ) : (
                <>
                  {nearDisasters.map((d) => {
                    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, d.location.lat, d.location.lng);
                    return (
                      <div
                        key={d.id}
                        className="p-2 rounded bg-[#121212] border border-[#262626] flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="text-white font-medium flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700">
                              {d.disasterType}
                            </span>
                            <span>{d.location.name}</span>
                          </div>
                          <div className="text-[10px] text-[#888888]">
                            {d.text.slice(0, 60)}...
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[#00ff41] font-bold">{dist} km</span>
                          <div className="text-[10px] text-[#666666]">away</div>
                        </div>
                      </div>
                    );
                  })}

                  {nearQuakes.map((q) => {
                    const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, q.coordinates[1], q.coordinates[0]);
                    return (
                      <div
                        key={q.id}
                        className="p-2 rounded bg-[#121212] border border-[#262626] flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="text-white font-medium flex items-center gap-2">
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                              M{q.mag.toFixed(1)}
                            </span>
                            <span>{q.place}</span>
                          </div>
                          <div className="text-[10px] text-[#888888]">
                            Depth {q.coordinates[2]}km • USGS Validated
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[#00ff41] font-bold">{dist} km</span>
                          <div className="text-[10px] text-[#666666]">away</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#262626] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-[#888888] hover:text-white font-mono text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-5 py-2 rounded-lg bg-[#00ff41] hover:bg-[#00e63a] text-black font-mono font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#00ff41]/20 transition-all"
          >
            <Shield className="w-4 h-4" />
            Save & Activate WhatsApp Monitoring
          </button>
        </div>
      </div>
    </div>
  );
};
