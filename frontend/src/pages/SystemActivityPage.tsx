import React, { useState, useMemo } from 'react';
import { History, Filter, Search } from 'lucide-react';
import { mockService } from '../services/mockService';

export const SystemActivityPage: React.FC = () => {
  const systemEvents = mockService.getSystemEvents();
  const incidents = mockService.getIncidents();
  const evidence = mockService.getEvidence();

  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Combine system events with evidence ingestion and incident updates into a unified timeline
  const combinedLog = useMemo(() => {
    const logs: Array<{
      id: string;
      timestamp: string;
      severity: 'INFO' | 'WARNING' | 'CRITICAL';
      category: string;
      title: string;
      details: string;
    }> = [];

    // System Events
    systemEvents.forEach((se) => {
      logs.push({
        id: se.id,
        timestamp: se.timestamp,
        severity: se.severity,
        category: se.type.toUpperCase(),
        title: se.message,
        details: `${se.entityType || 'SYSTEM'} (${se.entityId || 'SYS-00'})`,
      });
    });

    // Evidence Ingestion Events
    evidence.forEach((ev) => {
      logs.push({
        id: `LOG-EV-${ev.id}`,
        timestamp: ev.ingestedAt,
        severity: ev.stale ? 'WARNING' : 'INFO',
        category: 'EVIDENCE',
        title: `${ev.sourceType.replace('_', ' ')} feed ingested`,
        details: `Confidence: ${Math.round(ev.confidence * 100)}%`,
      });
    });

    // Incident lifecycle events
    incidents.forEach((inc) => {
      logs.push({
        id: `LOG-INC-${inc.id}`,
        timestamp: inc.firstReportedAt,
        severity: inc.severity >= 4 ? 'CRITICAL' : 'WARNING',
        category: 'INCIDENT',
        title: `${inc.title} (${inc.id})`,
        details: `Zone ${inc.zoneId} • Priority ${inc.priority.score}/100`,
      });
    });

    // Sort descending by timestamp
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [systemEvents, evidence, incidents]);

  // Apply search & severity filters
  const filteredLogs = useMemo(() => {
    return combinedLog.filter((log) => {
      if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = log.title.toLowerCase().includes(q);
        const matchesCat = log.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat) return false;
      }
      return true;
    });
  }, [combinedLog, filterSeverity, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 font-sans select-none">
      {/* Banner */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-lg text-blue-600 dark:text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Activity Timeline</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Audit log of system events</p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{filteredLogs.length} Events</span>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
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
            className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs rounded-lg border border-slate-200 dark:border-slate-800 pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-44"
          />
        </div>
      </div>

      {/* Compact Event Timeline */}
      <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs shadow-xs hover:shadow-md transition-shadow relative"
          >
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 w-12 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{log.title}</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-slate-400">{log.details}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                log.severity === 'CRITICAL' ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
              }`}>
                {log.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
