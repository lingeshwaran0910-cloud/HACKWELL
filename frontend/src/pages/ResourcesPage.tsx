import React, { useState, useMemo } from 'react';
import { Ambulance, Radio, CheckCircle2, Clock, Filter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Resource } from '@shared/types';
import { StatusBadge } from '../components/common/StatusBadge';

export const ResourcesPage: React.FC = () => {
  const { resources } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Summary Metrics
  const totalCount = resources.length;
  const availableCount = resources.filter((r) => r.status === 'AVAILABLE').length;
  const assignedCount = resources.filter((r) => r.status === 'ASSIGNED' || r.status === 'EN_ROUTE' || r.status === 'TRANSPORTING' || r.status === 'AT_INCIDENT').length;
  const staleCount = resources.filter((r) => r.stale).length;

  // Filtered list
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (statusFilter === 'AVAILABLE' && r.status !== 'AVAILABLE') return false;
      if (statusFilter === 'ASSIGNED' && r.status !== 'ASSIGNED' && r.status !== 'AT_INCIDENT') return false;
      if (statusFilter === 'EN_ROUTE' && r.status !== 'EN_ROUTE' && r.status !== 'TRANSPORTING') return false;
      if (statusFilter === 'STALE' && !r.stale) return false;

      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCallsign = r.callSign.toLowerCase().includes(query);
        const matchesId = r.id.toLowerCase().includes(query);
        const matchesZone = r.homeZoneId.toLowerCase().includes(query);
        if (!matchesCallsign && !matchesId && !matchesZone) return false;
      }

      return true;
    });
  }, [resources, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-3 font-sans select-none pb-6">
      {/* Fleet Overview KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Fleet</span>
            <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{totalCount}</div>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
            <Ambulance className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Available</span>
            <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{availableCount}</div>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Active Fleet</span>
            <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{assignedCount}</div>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3.5 flex items-center justify-between shadow-xs kpi-card-interactive">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Stale GPS</span>
            <div className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{staleCount}</div>
          </div>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400">
            <Radio className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Fleet Controls & Search Filter Strip */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'STALE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="AMBULANCE">Ambulance</option>
            <option value="POLICE_UNIT">Police</option>
            <option value="FIRE_UNIT">Fire Engine</option>
            <option value="RESCUE_UNIT">Rescue Team</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search callsign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-40"
            />
          </div>
        </div>
      </div>

      {/* Fleet Resource Rows */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-col shadow-xs">
        <div className="space-y-2">
          {filteredResources.length === 0 ? (
            <div className="p-6 text-center text-slate-400 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 font-sans">
              No emergency fleet resources match the current search or filter criteria.
            </div>
          ) : (
            filteredResources.map((res: Resource) => (
            <div
              key={res.id}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs card-interactive"
            >
              <div className="flex items-center gap-3">
                <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 w-20">
                  {res.callSign}
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-medium w-28">
                  {res.type.replace('_UNIT', '')}
                </div>
                <StatusBadge label={res.status} variant={res.status === 'AVAILABLE' ? 'success' : 'warning'} size="sm" />
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                <div>Zone: <span className="text-slate-900 dark:text-slate-200 font-semibold">{res.homeZoneId}</span></div>
                {res.etaMinutes !== null && (
                  <div>ETA: <span className="text-amber-600 dark:text-amber-400 font-bold">{res.etaMinutes} min</span></div>
                )}
                {res.assignmentIncidentId && (
                  <div>Inc: <span className="text-blue-600 dark:text-blue-400">{res.assignmentIncidentId}</span></div>
                )}
                {res.stale && (
                  <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded text-[9px] font-bold">
                    STALE GPS
                  </span>
                )}
              </div>
            </div>
          )))}
        </div>
      </div>
    </div>
  );
};
