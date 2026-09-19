import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { mockService } from '../services/mockService';
import { Incident, Resource, Hospital } from '@shared/types';
import { IncidentStatusBadge } from '../components/incidents/IncidentStatusBadge';
import { IncidentSeverityBadge } from '../components/incidents/IncidentSeverityBadge';
import { EvidenceList } from '../components/incidents/EvidenceList';
import { StatusBadge } from '../components/common/StatusBadge';

type TabType = 'overview' | 'evidence' | 'timeline' | 'response';

export const IncidentsPage: React.FC = () => {
  const incidents = mockService.getIncidents();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(incidents[0]?.id || null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const selectedIncident = mockService.getIncidentById(selectedIncidentId);

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

  const evidenceList = selectedIncident ? mockService.getEvidenceForIncident(selectedIncident.id) : [];
  const assignedResources = selectedIncident
    ? (selectedIncident.assignedResourceIds || [])
        .map((id) => mockService.getResourceById(id))
        .filter((r): r is Resource => r !== undefined)
    : [];
  const recommendedHospital: Hospital | undefined = selectedIncident
    ? mockService.getHospitalById(selectedIncident.recommendedHospitalId)
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
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
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
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
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

      {/* Main Workspace Split: Incident Data Table (Left) + Tabbed Details Panel (Right) */}
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
            {filteredIncidents.map((inc: Incident) => {
              const isSelected = inc.id === selectedIncidentId;
              const waitingMin = Math.round(inc.priority.waitingSeconds / 60);

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-slate-800/90 border-l-4 border-l-blue-600 border-slate-300 dark:border-slate-700 shadow-sm'
                      : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{inc.id}</span>
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
            })}
          </div>
        </div>

        {/* Incident Details Tabbed Workspace Panel */}
        <div className="col-span-12 lg:col-span-6 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-col shadow-xs overflow-hidden">
          {selectedIncident ? (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{selectedIncident.id}</span>
                    <IncidentSeverityBadge severity={selectedIncident.severity} size="sm" />
                    <IncidentStatusBadge status={selectedIncident.status} size="sm" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedIncident.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedIncidentId(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5 text-xs shrink-0">
                {(['overview', 'evidence', 'timeline', 'response'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {activeTab === 'overview' && (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Description</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">{selectedIncident.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Coordinates</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{selectedIncident.location.lat.toFixed(4)}, {selectedIncident.location.lng.toFixed(4)}</span>
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Age</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">{Math.round(selectedIncident.priority.waitingSeconds / 60)} min</span>
                      </div>
                    </div>

                    {/* Fused Facts */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Fused Facts</span>
                        {selectedIncident.hasConflict ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">CONFLICT</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">VERIFIED</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                        <div className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex justify-between">
                          <span className="text-slate-400">Victims</span>
                          <strong className="text-slate-900 dark:text-slate-100">{String(selectedIncident.fused.victimCount)}</strong>
                        </div>
                        <div className="p-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex justify-between">
                          <span className="text-slate-400">Injuries</span>
                          <strong className="text-slate-900 dark:text-slate-100">{String(selectedIncident.fused.injuryCount)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
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
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs">
              Select an incident to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
