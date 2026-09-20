import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  PlusCircle,
  Radio,
  AlertTriangle,
  Map,
  Ambulance,
  Building2,
  BrainCircuit,
  Sliders,
  History,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export const SidebarNav: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Command Center',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/report',
      label: 'Report Emergency',
      icon: <PlusCircle className="w-4 h-4 shrink-0 text-rose-500" />,
    },
    {
      path: '/inputs',
      label: 'Live Inputs',
      icon: <Radio className="w-4 h-4 shrink-0" />,
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
      label: 'Intelligence',
      icon: <BrainCircuit className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/simulation',
      label: 'Simulation',
      icon: <Sliders className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/activity',
      label: 'Activity',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: <User className="w-4 h-4 shrink-0 text-blue-500" />,
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-[#0b1329] border-r border-slate-200 dark:border-slate-800/90 flex flex-col justify-between select-none shrink-0 h-screen transition-all duration-300 z-30 relative shadow-xs ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand & Toggle Header */}
        <div
          className={`p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 ${
            isCollapsed ? 'flex-col gap-2.5' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-600/10 dark:bg-blue-950/80 border border-blue-500/30 rounded-xl text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-sans font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 truncate">
                  SafeCity AI
                </h1>
                <p className="text-[10px] font-sans text-slate-500 dark:text-slate-400 truncate">
                  Emergency Operations
                </p>
              </div>
            )}
          </div>

          {/* Toggle Control Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1 flex-1">
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
              aria-label={item.label}
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

      {/* Bottom Status Footer & Sign Out */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 shrink-0 space-y-2">
        {currentUser && (
          <button
            onClick={handleSignOut}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full py-1.5 px-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            {!isCollapsed && <span>Sign Out</span>}
            <LogOut className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}

        {!isCollapsed ? (
          <div className="space-y-0.5 font-sans text-xs pt-1 border-t border-slate-200 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Systems Operational</span>
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-400 font-mono">
              Officer: {currentUser?.operatorId || 'EOC-004'}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
};

