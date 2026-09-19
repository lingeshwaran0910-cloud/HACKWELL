import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  Map,
  Ambulance,
  Building2,
  BrainCircuit,
  Sliders,
  History,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export const SidebarNav: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Command Center',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/incidents',
      label: 'Incidents',
      icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/map',
      label: 'Live Map',
      icon: <Map className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/resources',
      label: 'Fleet Resources',
      icon: <Ambulance className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/hospitals',
      label: 'Hospitals',
      icon: <Building2 className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/intelligence',
      label: 'Response Intelligence',
      icon: <BrainCircuit className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/simulation',
      label: 'Simulation',
      icon: <Sliders className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/activity',
      label: 'System Activity',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-[#0b1329] border-r border-slate-200 dark:border-slate-800/90 flex flex-col justify-between select-none shrink-0 h-screen transition-all duration-300 z-30 relative shadow-sm ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md transition-colors z-40"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Top Header & Brand */}
      <div>
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="p-1.5 bg-blue-600/10 dark:bg-blue-950/80 border border-blue-500/30 rounded-lg text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-sans font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  SafeCity AI
                </h1>
              </div>
              <p className="text-[10px] font-sans text-slate-500 dark:text-slate-400 truncate">
                Emergency Intelligence
              </p>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="p-2 space-y-1">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Operations Workspace
            </div>
          )}

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-between px-3 py-2.5'} rounded-lg text-xs font-sans transition-all group ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border-l-4 border-l-blue-600 dark:border-l-blue-500 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium'
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Status Widget */}
      <div className={`p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 ${isCollapsed ? 'text-center' : ''}`}>
        {!isCollapsed ? (
          <div className="space-y-1 font-sans text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Systems Operational</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
              Last sync: {new Date().toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Systems Operational">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        )}
      </div>
    </aside>
  );
};
