import React, { useState, useEffect } from 'react';
import { Building2, Activity, Ambulance, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Hospital, Resource, Incident } from '@shared/types';
import { StatusBadge } from '../components/common/StatusBadge';

export const HospitalsPage: React.FC = () => {
  const { hospitals, resources, incidents } = useApp();
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHospitalId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalBeds = hospitals.reduce((acc, h) => acc + h.bedsTotal, 0);
  const availableBeds = hospitals.reduce(
    (acc, h) => acc + (typeof h.bedsAvailable === 'number' ? h.bedsAvailable : 0),
    0
  );
  const totalIncoming = hospitals.reduce((acc, h) => acc + h.incomingLoad, 0);
  const highPressureCount = hospitals.filter(
    (h) => h.predictedPressure.level === 'HIGH' || h.predictedPressure.level === 'MODERATE'
  ).length;

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  // Incoming resources for selected hospital
  const incomingResourcesForHospital = (hospitalId: string): Resource[] => {
    return resources.filter(
      (r) =>
        r.destinationHospitalId === hospitalId ||
        (r.assignmentIncidentId &&
          incidents.find((i) => i.id === r.assignmentIncidentId)?.recommendedHospitalId === hospitalId)
    );
  };

  // Associated incidents routing casualties to hospital
  const incidentsForHospital = (hospitalId: string): Incident[] => {
    return incidents.filter((i) => i.recommendedHospitalId === hospitalId && i.status !== 'RESOLVED');
  };

  return (
    <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1 font-sans select-none pb-6">
      {/* Overview Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Trauma Centers
            </span>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {hospitals.length}
            </div>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Beds Available
            </span>
            <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {availableBeds} / {totalBeds}
            </div>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Ambulances En Route
            </span>
            <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {totalIncoming} {totalIncoming === 1 ? 'Ambulance' : 'Ambulances'}
            </div>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400">
            <Ambulance className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Hospital Pressure
            </span>
            <div className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {highPressureCount} Alerting
            </div>
          </div>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Hospitals Workspace: FULL-WIDTH Grid of Hospital Cards (NEVER SHRINKS) */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {hospitals.map((h: Hospital) => {
          const avail = typeof h.bedsAvailable === 'number' ? h.bedsAvailable : 0;
          const occupied = h.bedsTotal - avail;
          const pctOccupied = Math.round((occupied / h.bedsTotal) * 100);
          const activeIncidentsForHosp = incidentsForHospital(h.id);
          const isSelected = selectedHospitalId === h.id;

          return (
            <div
              key={h.id}
              onClick={() => setSelectedHospitalId(h.id)}
              className={`bg-white dark:bg-[#0b1329] border rounded-xl p-4 flex flex-col justify-between shadow-xs space-y-3 cursor-pointer transition-all card-interactive ${
                isSelected
                  ? 'border-2 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Title & Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-500" />
                      {h.name}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Zone {h.zoneId}
                    </span>
                  </div>
                  <StatusBadge
                    label={`PRESSURE: ${h.predictedPressure.level}`}
                    variant={
                      h.predictedPressure.level === 'HIGH'
                        ? 'danger'
                        : h.predictedPressure.level === 'MODERATE'
                        ? 'warning'
                        : 'success'
                    }
                    size="sm"
                  />
                </div>
              </div>

              {/* Bed Capacity Meter */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                  <span>Bed Capacity Used ({pctOccupied}%)</span>
                  <span className="font-mono text-[11px]">
                    {avail} Available / {h.bedsTotal} Total
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pctOccupied > 80
                        ? 'bg-rose-500'
                        : pctOccupied > 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pctOccupied}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                  <span>Occupied: {occupied} beds</span>
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center gap-1">
                    <Ambulance className="w-3.5 h-3.5" />
                    {h.incomingLoad} Ambulances En Route
                  </span>
                </div>
              </div>

              {/* Active Receiving Incident Relationships */}
              {activeIncidentsForHosp.length > 0 && (
                <div className="p-2 bg-blue-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-800 rounded-lg text-[11px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Receiving Emergencies
                  </span>
                  <div className="space-y-1">
                    {activeIncidentsForHosp.map((inc) => (
                      <div key={inc.id} className="flex justify-between items-center text-slate-800 dark:text-slate-200 font-medium">
                        <span className="truncate">{inc.title}</span>
                        <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold shrink-0">{inc.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capabilities Badges */}
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                  Capabilities
                </span>
                <div className="flex flex-wrap gap-1">
                  {h.capabilities.map((cap, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md text-[10px] font-medium"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Hospital Centered Modal Window */}
      {selectedHospital && (() => {
        const avail = typeof selectedHospital.bedsAvailable === 'number' ? selectedHospital.bedsAvailable : 0;
        const occupied = selectedHospital.bedsTotal - avail;
        const pctOccupied = Math.round((occupied / selectedHospital.bedsTotal) * 100);
        const incoming = incomingResourcesForHospital(selectedHospital.id);
        const linkedIncidents = incidentsForHospital(selectedHospital.id);
        const isDiverting = pctOccupied >= 90 || selectedHospital.predictedPressure.level === 'HIGH';

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans text-xs">
            {/* Transparent Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
              onClick={() => setSelectedHospitalId(null)}
            />

            {/* Centered Modal Content Card */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col p-5 space-y-4 z-10 max-h-[85vh] overflow-hidden modal-entrance">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 shrink-0">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    {selectedHospital.name}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Zone {selectedHospital.zoneId} • Emergency Trauma Center
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={`PRESSURE: ${selectedHospital.predictedPressure.level}`}
                    variant={
                      selectedHospital.predictedPressure.level === 'HIGH'
                        ? 'danger'
                        : selectedHospital.predictedPressure.level === 'MODERATE'
                        ? 'warning'
                        : 'success'
                    }
                    size="sm"
                  />
                  <button
                    onClick={() => setSelectedHospitalId(null)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                    title="Close window (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* 1. Top Compact KPI Row (4 metrics) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                      Capacity Used
                    </span>
                    <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {pctOccupied}%
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                      Available Beds
                    </span>
                    <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {avail} / {selectedHospital.bedsTotal}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                      En Route
                    </span>
                    <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {incoming.length} {incoming.length === 1 ? 'Ambulance' : 'Ambulances'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
                      Diversion
                    </span>
                    <span className={`font-mono text-xs font-bold mt-1 block ${isDiverting ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isDiverting ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {/* 2. Overview: Emergency Capacity Utilization Meter */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span>Emergency Bed Utilization</span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {occupied} Occupied • {avail} Available
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pctOccupied > 80
                          ? 'bg-rose-500'
                          : pctOccupied > 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pctOccupied}%` }}
                    />
                  </div>
                </div>

                {/* 3. Operational Pressure & Diversion Basis */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Operational Surge Basis
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      ID: {selectedHospital.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {selectedHospital.predictedPressure.basis || 'Trauma center emergency intake and ICU bed saturation monitoring.'}
                  </p>
                </div>

                {/* 4. Incoming Ambulances En Route */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      Ambulances En Route ({incoming.length})
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {incoming.length === 0 ? (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-lg text-slate-400 text-xs">
                        No ambulances currently in transit to this hospital.
                      </div>
                    ) : (
                      incoming.map((res) => (
                        <div
                          key={res.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Ambulance className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{res.callSign}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">({res.type})</span>
                          </div>
                          <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-[11px]">
                            {res.status} {res.etaMinutes ? `• ETA ${res.etaMinutes}m` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 5. Related Emergency Incidents */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                    Linked Emergency Incidents ({linkedIncidents.length})
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {linkedIncidents.length === 0 ? (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-lg text-slate-400 text-xs">
                        No active emergencies currently routing casualties to this facility.
                      </div>
                    ) : (
                      linkedIncidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{inc.title}</span>
                          </div>
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold shrink-0 text-[11px]">{inc.id}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 6. Capabilities */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span className="text-slate-400 font-semibold block mb-1.5 uppercase text-[10px]">
                    Specialty Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHospital.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium rounded-md border border-slate-200 dark:border-slate-800 text-[11px]"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
