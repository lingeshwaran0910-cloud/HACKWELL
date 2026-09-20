import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  PhoneCall,
  Camera,
  Cpu,
  Car,
  Globe,
  Search,
  MapPin,
  ExternalLink,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EvidenceSourceType, Incident, Evidence } from '@shared/types';

type CategoryKey = 'ALL' | '112' | 'CCTV' | 'TRAFFIC' | 'GPS' | 'IoT' | 'SATELLITE';
type SourceCategory = '112' | 'CCTV' | 'GPS' | 'TRAFFIC' | 'IoT' | 'SATELLITE';

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  sourceTypes: EvidenceSourceType[];
  icon: React.ReactNode;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: '112',
    label: '112',
    sourceTypes: ['EMERGENCY_CALL', 'CITIZEN_REPORT'],
    icon: <PhoneCall className="w-4 h-4 text-rose-500" />,
  },
  {
    key: 'CCTV',
    label: 'CCTV',
    sourceTypes: ['CCTV'],
    icon: <Camera className="w-4 h-4 text-blue-500" />,
  },
  {
    key: 'TRAFFIC',
    label: 'TRAFFIC',
    sourceTypes: ['TRAFFIC'],
    icon: <Car className="w-4 h-4 text-orange-500" />,
  },
  {
    key: 'GPS',
    label: 'GPS',
    sourceTypes: ['VEHICLE_TELEMETRY', 'GPS', 'RESOURCE_FEED'],
    icon: <Radio className="w-4 h-4 text-indigo-500" />,
  },
  {
    key: 'IoT',
    label: 'IoT',
    sourceTypes: ['IOT_SENSOR', 'WEATHER', 'ROAD_EVENT'],
    icon: <Cpu className="w-4 h-4 text-amber-500" />,
  },
  {
    key: 'SATELLITE',
    label: 'SATELLITE',
    sourceTypes: ['SATELLITE'],
    icon: <Globe className="w-4 h-4 text-purple-500" />,
  },
];

const getSourceCategory = (sourceType: EvidenceSourceType): SourceCategory => {
  if (['EMERGENCY_CALL', 'CITIZEN_REPORT'].includes(sourceType)) return '112';
  if (sourceType === 'CCTV') return 'CCTV';
  if (['VEHICLE_TELEMETRY', 'GPS', 'RESOURCE_FEED'].includes(sourceType)) return 'GPS';
  if (sourceType === 'TRAFFIC') return 'TRAFFIC';
  if (['IOT_SENSOR', 'WEATHER', 'ROAD_EVENT'].includes(sourceType)) return 'IoT';
  if (sourceType === 'SATELLITE') return 'SATELLITE';
  return '112';
};

interface SourceWording {
  sourceLabel: string;
  detectionTitle: string;
  evidenceBtnText: string;
  icon: string;
  categoryKey: SourceCategory;
}

const getSourceWording = (sourceType: EvidenceSourceType): SourceWording => {
  const cat = getSourceCategory(sourceType);
  switch (cat) {
    case '112':
      return {
        sourceLabel: sourceType === 'CITIZEN_REPORT' ? 'Citizen Report' : '112 Emergency Call',
        detectionTitle: 'Emergency call received',
        evidenceBtnText: 'View Call Details',
        icon: '🚨',
        categoryKey: '112',
      };
    case 'CCTV':
      return {
        sourceLabel: 'CCTV Camera',
        detectionTitle: 'Visual detection',
        evidenceBtnText: 'View Evidence',
        icon: '📹',
        categoryKey: 'CCTV',
      };
    case 'GPS':
      return {
        sourceLabel: sourceType === 'RESOURCE_FEED' ? 'Resource Telemetry' : 'GPS Telemetry',
        detectionTitle: 'Impact signal',
        evidenceBtnText: 'View Signal',
        icon: '🚗',
        categoryKey: 'GPS',
      };
    case 'TRAFFIC':
      return {
        sourceLabel: 'Traffic Sensor',
        detectionTitle: 'Traffic anomaly',
        evidenceBtnText: 'View Traffic Event',
        icon: '🚥',
        categoryKey: 'TRAFFIC',
      };
    case 'IoT':
      return {
        sourceLabel: sourceType === 'WEATHER' ? 'Weather Sensor' : sourceType === 'ROAD_EVENT' ? 'Road Sensor' : 'IoT Sensor',
        detectionTitle: 'Sensor anomaly',
        evidenceBtnText: 'View Sensor Event',
        icon: '📡',
        categoryKey: 'IoT',
      };
    case 'SATELLITE':
      return {
        sourceLabel: 'Satellite Observation',
        detectionTitle: 'Remote observation',
        evidenceBtnText: 'View Observation',
        icon: '🛰️',
        categoryKey: 'SATELLITE',
      };
  }
};

const getSourceMetadataDetails = (item: Evidence) => {
  const cat = getSourceCategory(item.sourceType);
  const meta = item.metadata || {};
  const raw = item.raw || {};

  switch (cat) {
    case '112':
      return {
        label1: 'CALL STATUS',
        value1: item.incidentId ? 'Received / Accepted' : 'Received / Verifying',
        label2: 'CALLER ID',
        value2: (meta.callerId as string) || (raw.callerId as string) || `Line #${item.id.slice(-4)}`,
      };
    case 'CCTV':
      return {
        label1: 'CAMERA',
        value1: (meta.cameraId as string) || (raw.cameraId as string) || `CAM-TVS-${item.id.slice(-4)}`,
        label2: 'FRAME STATUS',
        value2: item.confidence > 0.85 ? 'High Clarity' : 'Standard Feed',
      };
    case 'GPS':
      return {
        label1: 'DEVICE',
        value1: (meta.deviceId as string) || (raw.vehicleId as string) || `Registered Unit #${item.id.slice(-4)}`,
        label2: 'SIGNAL TYPE',
        value2: item.normalized.impactSignal ? 'G-Force Spike' : 'Location Pulse',
      };
    case 'TRAFFIC':
      return {
        label1: 'ROAD / CORRIDOR',
        value1: (meta.roadName as string) || (raw.road as string) || 'NH-81 / TVS Junction',
        label2: 'TRAFFIC STATUS',
        value2: item.normalized.speedKmh !== null && item.normalized.speedKmh < 15 ? 'Heavy Congestion' : 'Moderate Flow',
      };
    case 'IoT':
      return {
        label1: 'SENSOR',
        value1: (meta.sensorId as string) || (raw.sensorId as string) || `IOT-Grid-${item.id.slice(-4)}`,
        label2: 'READING',
        value2: item.normalized.hazardClass ? `Hazard: ${item.normalized.hazardClass}` : 'Vibration Anomaly',
      };
    case 'SATELLITE':
      return {
        label1: 'AREA',
        value1: (meta.sector as string) || (raw.area as string) || 'Sector B - Trichy Outer',
        label2: 'RESOLUTION',
        value2: '0.5m Optical / Infrared',
      };
  }
};

const getTimelineForIncident = (incId: string, allEvidence: Evidence[], allIncidents: Incident[]) => {
  const inc = allIncidents.find((i) => i.id === incId);
  const incEvidence = allEvidence.filter((e) => e.incidentId === incId);

  const events: { time: string; label: string; icon: string }[] = [];

  const sortedEv = [...incEvidence].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sortedEv.forEach((ev) => {
    const wording = getSourceWording(ev.sourceType);
    const timeStr = new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    events.push({
      time: timeStr,
      label: `${wording.sourceLabel}: ${ev.normalized.narrative || wording.detectionTitle}`,
      icon: wording.icon,
    });
  });

  if (inc) {
    const incTime = new Date(inc.createdAt || inc.firstReportedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    events.push({
      time: incTime,
      label: `Incident ${inc.id} ${inc.status.toLowerCase()}`,
      icon: '🛡️',
    });
  }

  return events;
};

export const LiveInputsPage: React.FC = () => {
  const navigate = useNavigate();
  const { evidence, incidents, lastUpdatedSecondsAgo } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(evidence[0]?.id || null);
  const [showExpandedDetails, setShowExpandedDetails] = useState<boolean>(false);
  const [previewEvidence, setPreviewEvidence] = useState<Evidence | null>(null);

  // Filtered evidence stream (newest first)
  const filteredEvidence = useMemo(() => {
    return evidence.filter((item) => {
      if (selectedCategory !== 'ALL') {
        const cat = CATEGORIES.find((c) => c.key === selectedCategory);
        if (cat && !cat.sourceTypes.includes(item.sourceType)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesSource = item.sourceType.toLowerCase().includes(q);
        const matchesNarrative = (item.normalized.narrative || '').toLowerCase().includes(q);
        const matchesIncident = item.incidentId ? item.incidentId.toLowerCase().includes(q) : false;
        if (!matchesId && !matchesSource && !matchesNarrative && !matchesIncident) {
          return false;
        }
      }

      return true;
    });
  }, [evidence, selectedCategory, searchQuery]);

  // Selected event
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return filteredEvidence[0] || evidence[0] || null;
    return evidence.find((e) => e.id === selectedEventId) || filteredEvidence[0] || null;
  }, [evidence, filteredEvidence, selectedEventId]);

  // Related incident
  const relatedIncident: Incident | undefined = useMemo(() => {
    if (!selectedEvent || !selectedEvent.incidentId) return undefined;
    return incidents.find((i) => i.id === selectedEvent.incidentId);
  }, [selectedEvent, incidents]);

  // Evidence linked to related incident
  const evidenceForIncident = useMemo(() => {
    if (!relatedIncident) return [];
    return evidence.filter((e) => e.incidentId === relatedIncident.id);
  }, [relatedIncident, evidence]);

  // Distinct source types for corroboration
  const distinctCorroborationSources = useMemo(() => {
    const sources = new Set<EvidenceSourceType>();
    evidenceForIncident.forEach((e) => sources.add(e.sourceType));
    return Array.from(sources);
  }, [evidenceForIncident]);

  // Timeline events
  const timelineItems = useMemo(() => {
    if (!relatedIncident) return [];
    return getTimelineForIncident(relatedIncident.id, evidence, incidents);
  }, [relatedIncident, evidence, incidents]);

  const getCategoryForSourceType = (st: EvidenceSourceType): CategoryConfig => {
    return (
      CATEGORIES.find((c) => c.sourceTypes.includes(st)) || {
        key: '112',
        label: st,
        sourceTypes: [st],
        icon: <Zap className="w-4 h-4 text-slate-500" />,
      }
    );
  };

  const handleViewOnMap = (lat: number, lng: number, incidentId?: string | null) => {
    navigate('/map', {
      state: {
        center: { lat, lng },
        selectedIncidentId: incidentId || null,
      },
    });
  };

  const handleViewIncident = (incidentId: string) => {
    navigate(`/incidents/${incidentId}`, { state: { selectedIncidentId: incidentId } });
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden font-sans select-none p-3 sm:p-4">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            LIVE INPUTS
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time incoming signals <span className="text-slate-300 dark:text-slate-700">·</span> 6 sources connected <span className="text-slate-300 dark:text-slate-700">·</span> 3.3 events/min
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>● LIVE</span>
          </div>
          <span className="text-slate-400">Updated {lastUpdatedSecondsAgo}s ago</span>
        </div>
      </div>

      {/* 2. FILTER BAR (Small Pill Buttons & Search) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0 py-1">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ALL
          </button>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.key)}
                className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search inputs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs rounded-full border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
          />
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (70% LEFT LIVE INPUT LIST / 30% RIGHT DETAILS) */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0">

        {/* LEFT COLUMN: LIVE INPUT LIST (~70% width: 8 cols) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
          <div className="pb-1.5 mb-1 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              LIVE INPUTS ({filteredEvidence.length})
            </h3>
            <span className="font-mono text-[11px] text-slate-400">Newest first</span>
          </div>

          {/* CLEAN SCANNABLE ROW LIST */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 pr-1">
            {filteredEvidence.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No incoming data matches the selected filter or search query.
              </div>
            ) : (
              filteredEvidence.map((item) => {
                const cat = getCategoryForSourceType(item.sourceType);
                const isSelected = selectedEvent && item.id === selectedEvent.id;
                const formattedTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEventId(item.id)}
                    className={`p-3 transition-colors cursor-pointer text-xs space-y-1 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-slate-800/80 border-l-4 border-l-blue-600 rounded-r-lg font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    {/* Row Content Layout */}
                    <div className="flex items-center justify-between gap-3">
                      
                      {/* Left: Source Icon + Source Name + Narrative */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="shrink-0">{cat.icon}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 w-16 shrink-0 truncate">
                          {cat.label}
                        </span>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
                          {item.normalized.narrative || `${item.sourceType} Signal`}
                        </h4>
                      </div>

                      {/* Right: Location & Time */}
                      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-xs font-mono shrink-0">
                        <span className="hidden sm:inline">
                          {item.location ? `${item.location.lat.toFixed(4)}°, ${item.location.lng.toFixed(4)}°` : 'Trichy Grid'}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">{formattedTime}</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INPUT DETAILS (~30% width: 4 cols) */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col shadow-xs overflow-hidden">
          
          <div className="pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              INPUT DETAILS
            </h3>

            {selectedEvent && (
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {selectedEvent.id}
              </span>
            )}
          </div>

          {selectedEvent ? (
            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 text-xs font-sans">
              
              {/* 1. SOURCE & DETECTION TITLE */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
                    <span className="text-sm">{getSourceWording(selectedEvent.sourceType).icon}</span>
                    <span>{getSourceWording(selectedEvent.sourceType).sourceLabel}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(selectedEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                  {getSourceWording(selectedEvent.sourceType).detectionTitle}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-950/60 p-1.5 rounded border border-slate-200 dark:border-slate-800/80 mt-1">
                  "{selectedEvent.normalized.narrative || 'Telemetry payload ingested into SafeCity core.'}"
                </p>
              </div>

              {/* 2. TYPE-SPECIFIC INFORMATION GRID */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {/* Source Metadata 1 */}
                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    {getSourceMetadataDetails(selectedEvent).label1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {getSourceMetadataDetails(selectedEvent).value1}
                  </span>
                </div>

                {/* Source Metadata 2 */}
                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    {getSourceMetadataDetails(selectedEvent).label2}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {getSourceMetadataDetails(selectedEvent).value2}
                  </span>
                </div>

                {/* Location */}
                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">LOCATION</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate block">
                    {selectedEvent.location ? `${selectedEvent.location.lat.toFixed(4)}°, ${selectedEvent.location.lng.toFixed(4)}°` : 'Trichy Grid'}
                  </span>
                </div>

                {/* Confidence */}
                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">CONFIDENCE</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                    {Math.round(selectedEvent.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* 3. INCIDENT CONNECTION SECTION */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  INCIDENT CONNECTION
                </span>

                {relatedIncident ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                          {relatedIncident.id}
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs line-clamp-1">
                          {relatedIncident.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="text-slate-500">Status: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{relatedIncident.status}</strong></span>
                      <span className="text-slate-500">Evidence: <strong className="text-slate-800 dark:text-slate-200 font-mono">{evidenceForIncident.length} sources</strong></span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                      No incident created yet
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 rounded border border-amber-200 dark:border-amber-800">
                      Awaiting corroboration
                    </span>
                  </div>
                )}
              </div>

              {/* 4. MULTI-SOURCE CORROBORATION (Shown only if > 1 evidence source linked) */}
              {relatedIncident && distinctCorroborationSources.length > 1 && (
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      CORROBORATED BY
                    </span>
                    <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
                      Corroborated by {distinctCorroborationSources.length} sources
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {distinctCorroborationSources.map((st) => {
                      const w = getSourceWording(st);
                      return (
                        <span
                          key={st}
                          className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 rounded font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                        >
                          <span>{w.sourceLabel}</span>
                          <span className="text-emerald-500 font-bold">✓</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. INPUT TIMELINE (Shown if timeline events exist) */}
              {timelineItems.length > 0 && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    INPUT TIMELINE
                  </span>
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                    {timelineItems.map((t, idx) => (
                      <div key={idx} className="text-[11px] flex items-baseline gap-2">
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">{t.time}</span>
                        <span className="text-slate-800 dark:text-slate-200 truncate">{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. EXPANDABLE MORE DETAILS TOGGLE */}
              <div className="pt-1">
                <button
                  onClick={() => setShowExpandedDetails(!showExpandedDetails)}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showExpandedDetails ? 'Hide technical payload details' : 'Show technical payload details'}</span>
                  {showExpandedDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showExpandedDetails && (
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                      <span>Freshness:</span>
                      <span className="font-bold">{selectedEvent.freshnessSeconds}s ago</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                      <span>Stale Status:</span>
                      <span className="font-bold">{selectedEvent.stale ? 'STALE' : 'FRESH'}</span>
                    </div>
                    {selectedEvent.normalized.speedKmh !== null && (
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span>Speed Reading:</span>
                        <span className="font-bold">{selectedEvent.normalized.speedKmh} km/h</span>
                      </div>
                    )}
                    {selectedEvent.normalized.impactSignal !== null && (
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span>Impact Signal:</span>
                        <span className="font-bold text-rose-500">{selectedEvent.normalized.impactSignal ? 'DETECTED' : 'NORMAL'}</span>
                      </div>
                    )}
                    {selectedEvent.normalized.hazardClass && (
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                        <span>Hazard Class:</span>
                        <span className="font-bold text-amber-500">{selectedEvent.normalized.hazardClass}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7. CONTEXTUAL ACTION BUTTONS */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                {/* Contextual Primary Action Button */}
                {relatedIncident ? (
                  <button
                    onClick={() => handleViewIncident(relatedIncident.id)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Open Incident ({relatedIncident.id})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (selectedEvent.location) {
                        handleViewOnMap(selectedEvent.location.lat, selectedEvent.location.lng, null);
                      }
                    }}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Monitor Signal</span>
                  </button>
                )}

                {/* Secondary Evidence Action Button */}
                <button
                  onClick={() => setPreviewEvidence(selectedEvent)}
                  className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{getSourceWording(selectedEvent.sourceType).evidenceBtnText}</span>
                </button>

                {/* View on Live Map (if location exists) */}
                {selectedEvent.location && (
                  <button
                    onClick={() => handleViewOnMap(selectedEvent.location!.lat, selectedEvent.location!.lng, selectedEvent.incidentId)}
                    className="w-full py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>View on Live Map</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* EMPTY DETAILS STATE */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-1.5 font-sans">
              <Zap className="w-6 h-6 opacity-40" />
              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                INPUT DETAILS
              </h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Select an incoming input row from the list to view its details.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* EVIDENCE PREVIEW MODAL */}
      {previewEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl font-sans text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <span className="text-lg">{getSourceWording(previewEvidence.sourceType).icon}</span>
                <span>{getSourceWording(previewEvidence.sourceType).evidenceBtnText}</span>
              </div>
              <button
                onClick={() => setPreviewEvidence(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-2.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>ID: {previewEvidence.id}</span>
                  <span>{new Date(previewEvidence.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold leading-relaxed">
                  {previewEvidence.normalized.narrative || 'Evidence payload registered by SafeCity ingestion engine.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded">
                  <span className="text-slate-400 block text-[9px]">QUALITY CONFIDENCE</span>
                  <strong className="text-blue-600 dark:text-blue-400 text-xs">{Math.round(previewEvidence.confidence * 100)}%</strong>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded">
                  <span className="text-slate-400 block text-[9px]">SOURCE TYPE</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-xs">{previewEvidence.sourceType}</strong>
                </div>
              </div>

              {/* Signal breakdown */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5 text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block border-b border-slate-200 dark:border-slate-800 pb-1">
                  Normalized Stream Payload
                </span>
                {previewEvidence.normalized.speedSeriesKmh && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Speed Series:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{previewEvidence.normalized.speedSeriesKmh.join(' → ')} km/h</span>
                  </div>
                )}
                {previewEvidence.normalized.impactSignal !== null && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Impact Telemetry:</span>
                    <span className={`font-bold ${previewEvidence.normalized.impactSignal ? 'text-rose-500' : 'text-slate-400'}`}>
                      {previewEvidence.normalized.impactSignal ? 'IMPACT DETECTED' : 'NORMAL'}
                    </span>
                  </div>
                )}
                {previewEvidence.normalized.airbagDeployed !== null && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Airbag Sensor:</span>
                    <span className={`font-bold ${previewEvidence.normalized.airbagDeployed ? 'text-rose-500' : 'text-slate-400'}`}>
                      {previewEvidence.normalized.airbagDeployed ? 'DEPLOYED' : 'INTACT'}
                    </span>
                  </div>
                )}
                {previewEvidence.normalized.hazardClass && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Hazard Category:</span>
                    <span className="font-bold text-orange-500">{previewEvidence.normalized.hazardClass}</span>
                  </div>
                )}
                {!previewEvidence.normalized.speedSeriesKmh &&
                 previewEvidence.normalized.impactSignal === null &&
                 !previewEvidence.normalized.hazardClass && (
                  <div className="text-[11px] text-slate-500 italic py-1">
                    Evidence preview payload registered. Stream details verified by SafeCity ingestion engine.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPreviewEvidence(null)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveInputsPage;
