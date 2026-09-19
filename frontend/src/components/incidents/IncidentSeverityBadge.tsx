import React from 'react';

interface IncidentSeverityBadgeProps {
  severity: 1 | 2 | 3 | 4 | 5;
  size?: 'sm' | 'md';
}

export const IncidentSeverityBadge: React.FC<IncidentSeverityBadgeProps> = ({ severity, size = 'sm' }) => {
  let bgStyle = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300';
  let label = `Sev ${severity} · Low`;

  if (severity === 5) {
    bgStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 font-semibold';
    label = 'Sev 5 · Critical';
  } else if (severity === 4) {
    bgStyle = 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/80 text-orange-700 dark:text-orange-300 font-semibold';
    label = 'Sev 4 · High';
  } else if (severity === 3) {
    bgStyle = 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 font-medium';
    label = 'Sev 3 · Moderate';
  } else {
    bgStyle = 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-normal';
    label = `Sev ${severity} · Low`;
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-sans rounded-md border ${bgStyle} ${padding}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      <span className="tracking-tight">{label}</span>
    </span>
  );
};


