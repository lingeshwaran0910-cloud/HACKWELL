import React from 'react';

interface SectionHeaderProps {
  title: string;
  count?: number | string;
  icon?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  icon,
  subtitle,
  action,
}) => {
  return (
    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800/80">
      <div className="flex items-center gap-2">
        {icon && <span className="text-slate-500 dark:text-slate-400">{icon}</span>}
        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100 font-sans">
          {title}
        </h3>
        {count !== undefined && (
          <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700/60">
            {count}
          </span>
        )}
        {subtitle && <span className="text-xs text-slate-500 dark:text-slate-400 font-sans font-normal">{subtitle}</span>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};


