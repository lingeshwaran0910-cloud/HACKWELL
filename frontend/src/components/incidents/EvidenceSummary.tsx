import React from 'react';
import { Evidence } from '@shared/types';

interface EvidenceSummaryProps {
  evidenceList: Evidence[];
}

export const EvidenceSummary: React.FC<EvidenceSummaryProps> = ({ evidenceList }) => {
  if (!evidenceList.length) {
    return (
      <div className="text-[11px] font-sans text-slate-500 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
        No evidence items registered for this incident.
      </div>
    );
  }

  // Count per source type
  const countsBySource = evidenceList.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.sourceType] = (acc[ev.sourceType] || 0) + 1;
    return acc;
  }, {});

  // Calculate average confidence
  const avgConfidence = Math.round(
    (evidenceList.reduce((sum, ev) => sum + ev.confidence, 0) / evidenceList.length) * 100
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg p-3 font-sans text-xs mb-3 space-y-2 select-none">
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800/80 pb-1">
        <span>Evidence Breakdown</span>
        <span className="text-blue-600 dark:text-blue-400 font-mono">Avg Quality: {avgConfidence}%</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {Object.entries(countsBySource).map(([sourceType, count]) => (
          <div key={sourceType} className="bg-white dark:bg-slate-950/70 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-slate-700 dark:text-slate-300 font-medium">{sourceType.replace('_', ' ')}</span>
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-mono font-bold text-[10px]">
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
