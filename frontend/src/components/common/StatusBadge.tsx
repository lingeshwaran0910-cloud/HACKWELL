import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  pulse?: boolean;
  size?: 'sm' | 'md';
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string; dot: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50',
    dot: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/50',
    dot: 'bg-rose-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800/50',
    dot: 'bg-blue-500',
  },
  neutral: {
    bg: 'bg-slate-100 dark:bg-slate-900/80',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
    dot: 'bg-slate-500',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  pulse = false,
  size = 'sm',
}) => {
  const style = variantStyles[variant];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-medium rounded-md border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${style.dot}`} />
      </span>
      <span className="tracking-tight">{label}</span>
    </span>
  );
};


