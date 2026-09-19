import React from 'react';
import { Filter, ArrowUpDown } from 'lucide-react';

export type IncidentFilterType = 'ALL' | 'ACTIVE' | 'CRITICAL' | 'SUSPECTED' | 'VERIFIED' | 'RESOLVED';
export type IncidentSortType = 'PRIORITY' | 'WAITING_TIME' | 'RECENT';

interface IncidentFiltersProps {
  currentFilter: IncidentFilterType;
  onFilterChange: (filter: IncidentFilterType) => void;
  currentSort: IncidentSortType;
  onSortChange: (sort: IncidentSortType) => void;
  count: number;
}

export const IncidentFilters: React.FC<IncidentFiltersProps> = ({
  currentFilter,
  onFilterChange,
  currentSort,
  onSortChange,
  count,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2 mb-2 text-xs space-y-2 select-none">
      {/* Filter Options Strip */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-0.5 shrink-0" />
          {(['ALL', 'ACTIVE', 'CRITICAL', 'SUSPECTED', 'VERIFIED'] as IncidentFilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-2 py-1 rounded-md text-[11px] font-sans font-medium transition-all shrink-0 ${
                currentFilter === f
                  ? 'bg-blue-600/90 text-white shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : f === 'CRITICAL' ? 'Critical' : f === 'SUSPECTED' ? 'Suspected' : 'Verified'}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0 font-medium px-1">
          {count} items
        </span>
      </div>

      {/* Sort Options Strip */}
      <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5 text-[11px] font-sans">
        <div className="flex items-center gap-1 text-slate-400">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] uppercase font-semibold text-slate-400">Sort by:</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onSortChange('PRIORITY')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              currentSort === 'PRIORITY' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Priority
          </button>
          <button
            onClick={() => onSortChange('WAITING_TIME')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              currentSort === 'WAITING_TIME' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wait Time
          </button>
          <button
            onClick={() => onSortChange('RECENT')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              currentSort === 'RECENT' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Recent
          </button>
        </div>
      </div>
    </div>
  );
};

