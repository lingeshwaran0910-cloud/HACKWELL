import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Filter,
  X,
  Radio,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Incident, Resource, Hospital, EvidenceSourceType } from '@shared/types';
import { IncidentStatusBadge } from '../components/incidents/IncidentStatusBadge';
import { IncidentSeverityBadge } from '../components/incidents/IncidentSeverityBadge';
import { EvidenceList } from '../components/incidents/EvidenceList';
import { StatusBadge } from '../components/common/StatusBadge';

type TabType = 'input_details' | 'evidence' | 'timeline' | 'response';

const getSourceDisplay = (sourceType?: EvidenceSourceType) => {
  switch (sourceType) {
    case 'EMERGENCY_CALL':
      return <span className="flex items-center gap-1.5"><span className="text-base">🚨</span> <span>112 Emergency Call</span></span>;
    case 'CCTV':
      return <span className="flex items-center gap-1.5"><span className="text-base">📹</span> <span>CCTV / Camera</span></span>;
    case 'IOT_SENSOR':
      return <span className="flex items-center gap-1.5"><span className="text-base">📡</span> <span>IoT Sensor</span></span>;
    case 'TRAFFIC':
      return <span className="flex items-center gap-1.5"><span className="text-base">🚥</span> <span>Traffic Sensor</span></span>;
    case 'VEHICLE_TELEMETRY':
      return <span className="flex items-center gap-1.5"><span className="text-base">🚗</span> <span>GPS Telemetry</span></span>;
    case 'GPS':
      return <span className="flex items-center gap-1.5"><span className="text-base">🌐</span> <span>GPS Signal</span></span>;
    case 'SATELLITE':
      return <span className="flex items-center gap-1.5"><span className="text-base">🛰️</span> <span>Satellite / Hazard Data</span></span>;
    case 'CITIZEN_REPORT':
      return <span className="flex items-center gap-1.5"><span className="text-base">👤</span> <span>Citizen Report</span></span>;
    case 'WEATHER':
      return <span className="flex items-center gap-1.5"><span className="text-base">☁️</span> <span>Weather Alert</span></span>;
    case 'HOSPITAL_FEED':
      return <span className="flex items-center gap-1.5"><span className="text-base">🏥</span> <span>Hospital Feed</span></span>;
    case 'RESOURCE_FEED':
      return <span className="flex items-center gap-1.5"><span className="text-base">🚑</span> <span>Resource Telemetry</span></span>;
    case 'ROAD_EVENT':
      return <span className="flex items-center gap-1.5"><span className="text-base">🚧</span> <span>Road Event</span></span>;
    default:
      return <span className="flex items-center gap-1.5"><span className="text-base">📻</span> <span>Emergency Input Source</span></span>;
  }
};

const formatReceivedTime = (ts?: string) => {
  if (!ts) return 'Unknown';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getLocationName = (inc: Incident) => {
  const zoneNameMap: Record<string, string> = {
    ZONE_A: 'Trichy Junction',
    ZONE_B: 'Chatram Bus Stand',
    ZONE_C: 'Thillai Nagar',
    ZONE_D: 'KK Nagar',
    ZONE_E: 'Srirangam',
  };
  const name = zoneNameMap[inc.zoneId] || inc.zoneId;
  return `${name} (${inc.location.lat.toFixed(4)}, ${inc.location.lng.toFixed(4)})`;
};

export const IncidentsPage: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ incidentId?: string }>();
  const [searchParams] = useSearchParams();
  const queryIncidentId = searchParams.get('selectedIncidentId');
  const { incidents, evidence, resources, hospitals } = useApp();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const targetIdFromNav = params.incidentId || queryIncidentId || (location.state as { selectedIncidentId?: string })?.selectedIncidentId;

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    targetIdFromNav || incidents[0]?.id || null
  );
  const [activeTab, setActiveTab] = useState<TabType>('input_details');

  useEffect(() => {
    if (targetIdFromNav) {
      setSelectedIncidentId(targetIdFromNav);
    }
  }, [targetIdFromNav]);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) return incidents[0];
    return incidents.find((i) => i.id.toLowerCase() === selectedIncidentId.toLowerCase()) || incidents[0];
  }, [incidents, selectedIncidentId]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (filterSeverity === 'CRITICAL' && inc.severity < 4) return false;
      if (filterSeverity === 'HIGH' && inc.severity !== 4) return false;

      if (filterStatus === 'ACTIVE' && inc.status === 'RESOLVED') return false;
      if (filterStatus === 'SUSPECTED' && inc.status !== 'SUSPECTED') return false;
      if (filterStatus === 'VERIFIED' && inc.status !== 'VERIFIED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inc.id.toLowerCase().includes(q);
        const matchesTitle = inc.title.toLowerCase().includes(q);
        const matchesZone = inc.zoneId.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesZone) return false;
      }

      return true;
    });
  }, [incidents, filterSeverity, filterStatus, searchQuery]);

  const evidenceList = selectedIncident
    ? evidence.filter((e) => e.incidentId === selectedIncident.id)
    : [];

  const assignedResources = selectedIncident
    ? (selectedIncident.assignedResourceIds || [])
        .map((id) => resources.find((r) => r.id === id))
        .filter((r): r is Resource => r !== undefined)
    : [];

  const recommendedHospital: Hospital | undefined = selectedIncident
    ? hospitals.find((h) => h.id === selectedIncident.recommendedHospitalId)
    : undefined;

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden font-sans select-none">
      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {['ALL', 'CRITICAL', 'HIGH'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {['ALL', 'ACTIVE', 'SUSPECTED', 'VERIFIED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search ID, title, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-56"
          />
        </div>
      </div>

      {/* Main Workspace Split: Incident Data Table (Left) + Input Details Panel (Right) */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0">
        {/* Incident List Table */}
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-col shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Incidents</span>
            </h3>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {filteredIncidents.length} active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredIncidents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
                No active emergency incidents match the current search or filter criteria.
              </div>
            ) : (
              filteredIncidents.map((inc: Incident) => {
                const isSelected = selectedIncident && inc.id === selectedIncident.id;
                const isNew = inc.status === 'NEW' || inc.status === 'SUSPECTED' || (selectedIncidentId && inc.id.toLowerCase() === selectedIncidentId.toLowerCase());
                const waitingMin = Math.round(inc.priority.waitingSeconds / 60);

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all card-no-scale ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-slate-800/90 border-l-4 border-l-blue-600 border-slate-300 dark:border-slate-700 shadow-xs'
                      : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{inc.id}</span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-[9px] font-bold rounded border border-emerald-500/30 uppercase tracking-wider">
                            NEW INCIDENT
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{inc.zoneId}</span>
                      </div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">{inc.title}</h4>
                    </div>
                    <IncidentSeverityBadge severity={inc.severity} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      <IncidentStatusBadge status={inc.status} size="sm" />
                      {inc.hasConflict && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded font-medium">
                          Conflict
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{waitingMin}m ago</span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Input Details Card (Right Panel) */}
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-col shadow-xs overflow-hidden">
          {selectedIncident ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase rounded border border-blue-200 dark:border-blue-800/80 tracking-wider">
                      Input Details
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{selectedIncident.id}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedIncident.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedIncidentId(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5 text-xs shrink-0">
                {[
                  { id: 'input_details', label: 'Input Details' },
                  { id: 'evidence', label: 'Evidence Feeds' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'response', label: 'Response' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {activeTab === 'input_details' && (
                  evidenceList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 my-auto">
                      <Radio className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-50" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">No input details available</p>
                      <p className="text-[11px] text-slate-500 mt-1">No incoming evidence feeds are linked to this incident.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs font-sans">
                      {/* Operational Context Header */}
                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg text-blue-900 dark:text-blue-200 text-[11px] leading-snug">
                        <span className="font-bold block text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                          SafeCity Ingestion Analysis
                        </span>
                        What information caused SafeCity to understand this incident?
                      </div>

                      {/* Main Key-Value Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Source */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source</span>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {getSourceDisplay(evidenceList[0]?.sourceType)}
                          </div>
                        </div>

                        {/* Received */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Received</span>
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {formatReceivedTime(evidenceList[0]?.timestamp || selectedIncident.firstReportedAt)}
                          </div>
                        </div>

                        {/* Location */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location</span>
                          <div className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate" title={getLocationName(selectedIncident)}>
                            {getLocationName(selectedIncident)}
                          </div>
                        </div>

                        {/* Severity & Status */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Severity & Status</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <IncidentSeverityBadge severity={selectedIncident.severity} size="sm" />
                            <IncidentStatusBadge status={selectedIncident.status} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* Narrative Report */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Report</span>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed italic bg-white dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800">
                          "{evidenceList[0]?.normalized?.narrative || selectedIncident.description}"
                        </p>
                      </div>

                      {/* Contributing Evidence Sources */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Evidence</span>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">{evidenceList.length} feed(s)</span>
                        </div>
                        <div className="space-y-1.5 bg-white dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs">
                          {evidenceList.map((ev, idx) => (
                            <div key={ev.id || idx} className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                              <span className="text-blue-500 font-bold">•</span>
                              <div className="flex-1 flex items-center justify-between">
                                <span>{getSourceDisplay(ev.sourceType)}</span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {Math.round((ev.confidence || 0.9) * 100)}% confidence
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}

                {activeTab === 'evidence' && (
                  <EvidenceList incident={selectedIncident} evidenceList={evidenceList} />
                )}

                {activeTab === 'timeline' && (
                  <div className="space-y-2 text-xs font-sans">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">Timeline</span>
                      <div className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                        <div className="text-[11px]">
                          <span className="font-mono text-slate-400">{new Date(selectedIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 ml-2">Ingested</span>
                        </div>
                        <div className="text-[11px]">
                          <span className="font-mono text-slate-400">{new Date(selectedIncident.firstReportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 ml-2">Corroborated</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'response' && (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">Assigned Fleet</span>
                      {assignedResources.length === 0 ? (
                        <div className="text-amber-600 dark:text-amber-400 font-medium">No units assigned yet</div>
                      ) : (
                        assignedResources.map((res) => (
                          <div key={res.id} className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex justify-between items-center font-mono">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{res.callSign}</span>
                            <StatusBadge label={res.status} variant="info" size="sm" />
                          </div>
                        ))
                      )}
                    </div>

                    {recommendedHospital && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg flex justify-between items-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Hospital Target</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{recommendedHospital.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs font-sans">
              <Radio className="w-8 h-8 text-slate-500 mb-2 opacity-60" />
              <p className="font-semibold text-slate-300">No input details available</p>
              <p className="text-[11px] text-slate-500 mt-1">Select an incident to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

