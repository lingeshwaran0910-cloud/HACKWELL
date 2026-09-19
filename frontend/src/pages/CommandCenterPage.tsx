import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Ambulance,
  Building2,
  BrainCircuit,
  Map,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { IncidentSeverityBadge } from '../components/incidents/IncidentSeverityBadge';
import { IncidentStatusBadge } from '../components/incidents/IncidentStatusBadge';
import { CityOperationsMap } from '../components/map/CityOperationsMap';
import { mockService } from '../services/mockService';
import { Incident } from '@shared/types';

export const CommandCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const stats = mockService.getSummaryStats();
  const incidents = mockService.getIncidents();
  const hospitals = mockService.getHospitals();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Top 3 urgent incidents
  const urgentIncidents = [...incidents]
    .sort((a, b) => b.priority.score - a.priority.score)
    .slice(0, 3);

  const highPressureHospitalsCount = hospitals.filter(
    (h) => h.predictedPressure.level === 'HIGH' || h.predictedPressure.level === 'MODERATE'
  ).length;

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 select-none">
      {/* Page Title & Overview */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Command Center</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono font-medium border border-blue-200 dark:border-blue-800">
              Trichy Emergency Overview
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real Tiruchirappalli city geography • Live simulated operational feed
          </p>
        </div>
      </div>

      {/* Executive KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Active Incidents */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider" title="Active un-resolved incidents in Trichy">
              Active Incidents
            </span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.activeIncidents}
            </span>
            <span className="text-[11px] font-sans text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              Active
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">Total: {stats.totalIncidents}</span>
            <Link to="/incidents" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Incidents →
            </Link>
          </div>
        </div>

        {/* KPI 2: Critical Severity */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Critical
            </span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
              {incidents.filter((i) => i.severity >= 4).length}
            </span>
            <span className="text-[11px] text-slate-400">
              Sev 4-5 high priority
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-slate-400">Max wait: 12 min</span>
            <Link to="/incidents" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Review →
            </Link>
          </div>
        </div>

        {/* KPI 3: Available Resources */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Available Units
            </span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
              <Ambulance className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.availableResources}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              / {stats.totalResources} fleet units
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-emerald-600 dark:text-emerald-400">Coverage OK</span>
            <Link to="/resources" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Fleet →
            </Link>
          </div>
        </div>

        {/* KPI 4: Hospital Capacity */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hospital Pressure
            </span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
              {highPressureHospitalsCount}
            </span>
            <span className="text-[11px] text-slate-400">
              alerting of {stats.totalHospitals} hospitals
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-emerald-600 dark:text-emerald-400">KMC 42 beds</span>
            <Link to="/hospitals" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Hospitals →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Trichy Interactive Map (~65%) & Critical Incidents (~35%) */}
      <div className="grid grid-cols-12 gap-4 flex-1 min-h-[480px]">
        {/* LEFT ~65%: Trichy Operations Map */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col shadow-xs relative">
          <SectionHeader
            title="Trichy GIS Map"
            icon={<Map className="w-4 h-4 text-blue-500" />}
            subtitle="Tiruchirappalli Operational View"
            action={
              <button
                onClick={() => navigate('/map')}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-xs"
              >
                <span>Full Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <CityOperationsMap
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={(inc) => {
                setSelectedIncidentId(inc.id);
                navigate('/incidents');
              }}
            />
          </div>
        </div>

        {/* RIGHT ~35%: Critical Incidents & Decision Proposal */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
          {/* Critical Incident Feed */}
          <div className="flex-1 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col shadow-xs">
            <SectionHeader
              title="Critical Incidents"
              count={urgentIncidents.length}
              icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
              action={
                <Link to="/incidents" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  View All →
                </Link>
              }
            />

            <div className="space-y-2 overflow-y-auto pr-1 mt-1">
              {urgentIncidents.map((inc: Incident) => (
                <div
                  key={inc.id}
                  onClick={() => navigate('/incidents')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-colors flex items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{inc.id}</span>
                      <IncidentSeverityBadge severity={inc.severity} size="sm" />
                      <IncidentStatusBadge status={inc.status} size="sm" />
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">{inc.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{inc.description.split('.')[0]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-amber-600 dark:text-amber-400 font-mono text-xs font-bold">{inc.priority.score}</span>
                    <span className="block text-[10px] text-slate-400">Score</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intelligence Recommendation */}
          <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex flex-col shadow-xs">
            <SectionHeader
              title="Recommendation"
              icon={<BrainCircuit className="w-4 h-4 text-amber-500" />}
              action={<StatusBadge label="PROPOSED" variant="warning" size="sm" />}
            />
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-900 dark:text-slate-100">Deploy AMB-014</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">3.2 min ETA</span>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-medium">Trauma Capable</span>
                <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-medium">Coverage Protected</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Target: KMC Hospital</span>
                <Link to="/intelligence" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Review →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
