import React, { useState, useMemo } from 'react';
import { History, Filter, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SystemActivityPage: React.FC = () => {
  const { activityLogs } = useApp();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Apply search & severity filters
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = log.title.toLowerCase().includes(q);
        const matchesCat = log.category.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat && !matchesDetails) return false;
      }
      return true;
    });
  }, [activityLogs, filterSeverity, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 font-sans select-none pb-4">
      {/* Banner */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-lg text-blue-600 dark:text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              System Activity Timeline
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-700/50">
                REAL-TIME AUDIT LOG
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live operational event history & telemetry audit stream
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
          {filteredLogs.length} Events
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-48"
          />
        </div>
      </div>

      {/* Compact Event Timeline */}
      <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-white dark:bg-[#0b1329] rounded-xl border border-slate-200 dark:border-slate-800">
            No matching activity events found.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs shadow-xs hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 w-16 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {log.title}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
                <span className="text-slate-400 hidden sm:inline">{log.details}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    log.severity === 'CRITICAL'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : log.severity === 'WARNING'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {log.category}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
