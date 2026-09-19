import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, User } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { ThemeToggle } from '../common/ThemeToggle';
import { NotificationPanel } from '../common/NotificationPanel';

const routeSubtitleMap: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Command Center',
    subtitle: 'City-wide emergency response overview',
  },
  '/incidents': {
    title: 'Incident Intelligence',
    subtitle: 'Multi-source ingestion, evidence fusion & queue management',
  },
  '/map': {
    title: 'Live Operational Map',
    subtitle: 'Interactive GIS spatial operations & zone monitoring',
  },
  '/resources': {
    title: 'Fleet Resources',
    subtitle: 'Emergency vehicle tracking, telemetry & zone coverage',
  },
  '/hospitals': {
    title: 'Hospital Capacity',
    subtitle: 'Medical infrastructure load & pressure prediction',
  },
  '/intelligence': {
    title: 'Response Intelligence',
    subtitle: 'AI dispatch optimization & decision-support recommendations',
  },
  '/simulation': {
    title: 'Response Simulator',
    subtitle: 'What-if scenario evaluation & consequence analysis',
  },
  '/activity': {
    title: 'System Activity',
    subtitle: 'Real-time operational audit log & event timeline',
  },
};

export const Header: React.FC = () => {
  const location = useLocation();
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const routeInfo = routeSubtitleMap[location.pathname] || {
    title: 'Emergency Operations',
    subtitle: 'SafeCity AI Response Network',
  };

  return (
    <header className="h-16 bg-white dark:bg-[#0b1329] border-b border-slate-200 dark:border-slate-800/90 px-6 flex items-center justify-between gap-4 select-none shrink-0 shadow-xs z-20">
      {/* Left: Page Title & Subtitle */}
      <div>
        <h2 className="font-sans font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          {routeInfo.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-sans hidden sm:block">
          {routeInfo.subtitle}
        </p>
      </div>

      {/* Right Controls: System status, Notifications, Theme Toggle, UTC Clock, Operator */}
      <div className="flex items-center gap-3">
        {/* System Health */}
        <div className="hidden lg:block">
          <StatusBadge label="OPERATIONAL" variant="success" pulse={true} size="sm" />
        </div>

        {/* UTC Clock */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span>{timeString || 'T+00:00:00 UTC'}</span>
        </div>

        {/* Notifications Popover Drawer */}
        <NotificationPanel />

        {/* Real Light/Dark Mode Switcher */}
        <ThemeToggle />

        {/* Operator Profile */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-sans hidden xl:block">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight">Operator #04</span>
            <span className="text-[10px] text-slate-400 block leading-tight">EOC Shift Lead</span>
          </div>
        </div>
      </div>
    </header>
  );
};
