import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, User, Play, Pause, Radio } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { ThemeToggle } from '../common/ThemeToggle';
import { NotificationPanel } from '../common/NotificationPanel';
import { useApp } from '../../context/AppContext';

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
  const { isLiveSimRunning, toggleLiveSim, lastUpdatedSecondsAgo } = useApp();
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
    <header className="h-16 bg-white dark:bg-[#0b1329] border-b border-slate-200 dark:border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-3 select-none shrink-0 shadow-xs z-20">
      {/* Left: Page Title & Subtitle */}
      <div>
        <h2 className="font-sans font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          {routeInfo.title}
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans hidden md:block">
          {routeInfo.subtitle}
        </p>
      </div>

      {/* Center/Right Controls: Live Sim Control, Feed Indicator, Notifications, Theme, Clock */}
      <div className="flex items-center gap-2.5">
        {/* Live Simulation Start/Pause Toggle */}
        <button
          onClick={toggleLiveSim}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs cursor-pointer ${
            isLiveSimRunning
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-300'
          }`}
          title={isLiveSimRunning ? 'Pause Live Real-Time Event Feed' : 'Resume Live Real-Time Event Feed'}
        >
          {isLiveSimRunning ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE SIM ON</span>
              <Pause className="w-3 h-3 ml-0.5 text-emerald-600 dark:text-emerald-400" />
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>LIVE SIM PAUSED</span>
              <Play className="w-3 h-3 ml-0.5 text-amber-600 dark:text-amber-400" />
            </>
          )}
        </button>

        {/* Live Demo Feed Indicator & Last Updated */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400">
          <Radio className="w-3 h-3 text-purple-500 animate-pulse" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">DEMO FEED</span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span>Updated {lastUpdatedSecondsAgo}s ago</span>
        </div>

        {/* System Health Status */}
        <div className="hidden xl:block">
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
