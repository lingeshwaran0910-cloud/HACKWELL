import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Incident } from '@shared/types';
import { SectionHeader } from '../common/SectionHeader';
import { IncidentCard } from './IncidentCard';
import { IncidentFilters, IncidentFilterType, IncidentSortType } from './IncidentFilters';

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}) => {
  const [filter, setFilter] = useState<IncidentFilterType>('ALL');
  const [sort, setSort] = useState<IncidentSortType>('PRIORITY');

  // Filter & Sort logic
  const filteredAndSortedIncidents = useMemo(() => {
    let result = [...incidents];

    // Apply Filter
    if (filter === 'ACTIVE') {
      result = result.filter((i) => i.status !== 'RESOLVED');
    } else if (filter === 'CRITICAL') {
      result = result.filter((i) => i.severity >= 4);
    } else if (filter === 'SUSPECTED') {
      result = result.filter((i) => i.status === 'SUSPECTED' || i.verificationRequired || i.silentAnomaly);
    } else if (filter === 'VERIFIED') {
      result = result.filter((i) => i.status === 'VERIFIED' || i.status === 'CORROBORATED');
    } else if (filter === 'RESOLVED') {
      result = result.filter((i) => i.status === 'RESOLVED');
    }

    // Apply Sort
    if (sort === 'PRIORITY') {
      result.sort((a, b) => (b.priority?.score || 0) - (a.priority?.score || 0));
    } else if (sort === 'WAITING_TIME') {
      result.sort((a, b) => (b.priority?.waitingSeconds || 0) - (a.priority?.waitingSeconds || 0));
    } else if (sort === 'RECENT') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [incidents, filter, sort]);

  return (
    <div className="flex-1 bg-[#0b1329] border border-slate-800/80 rounded-lg p-3 flex flex-col overflow-hidden shadow-lg">
      <SectionHeader
        title="Active Incidents"
        count={incidents.length}
        icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
      />

      <IncidentFilters
        currentFilter={filter}
        onFilterChange={setFilter}
        currentSort={sort}
        onSortChange={setSort}
        count={filteredAndSortedIncidents.length}
      />

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {filteredAndSortedIncidents.length === 0 ? (
          <div className="h-40 border border-dashed border-slate-800/80 rounded-lg bg-slate-950/40 p-4 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-6 h-6 text-slate-500 mb-2" />
            <span className="text-xs font-sans font-medium text-slate-300">
              No incidents match filter "{filter}"
            </span>
            <span className="text-[11px] font-sans text-slate-500 mt-1">
              Select "All" to view all active emergency events.
            </span>
          </div>
        ) : (
          filteredAndSortedIncidents.map((inc) => (
            <IncidentCard
              key={inc.id}
              incident={inc}
              isSelected={inc.id === selectedIncidentId}
              onSelect={onSelectIncident}
            />
          ))
        )}
      </div>
    </div>
  );
};

