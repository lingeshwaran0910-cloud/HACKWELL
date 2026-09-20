import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Key,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const allAccessModules = [
    { key: 'ALL', label: 'Command Center', path: '/' },
    { key: 'INCIDENTS', label: 'Incidents Queue', path: '/incidents' },
    { key: 'ALL', label: 'Live Inputs', path: '/inputs' },
    { key: 'MAP', label: 'Live Map GIS', path: '/map' },
    { key: 'POLICE_RESOURCES', label: 'Fleet Resources', path: '/resources' },
    { key: 'HOSPITALS', label: 'Hospitals', path: '/hospitals' },
    { key: 'ALL', label: 'Intelligence AI', path: '/intelligence' },
    { key: 'ALL', label: 'Simulation Engine', path: '/simulation' },
    { key: 'ACTIVITY', label: 'Activity Logs', path: '/activity' },
  ];

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden font-sans select-none p-4 sm:p-6 max-w-4xl mx-auto w-full">
      
      {/* Top Profile Card */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-950/80 border border-blue-500/30 flex items-center justify-center font-bold text-xl text-blue-600 dark:text-blue-400">
              {currentUser.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {currentUser.name}
                </h1>
                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full font-mono text-[10px] font-bold">
                  ● {currentUser.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentUser.role} <span className="text-slate-300 dark:text-slate-700">·</span> {currentUser.department}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              OPERATOR ID
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
              {currentUser.operatorId}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              ROLE
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {currentUser.role}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              DEPARTMENT
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {currentUser.department}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              SHIFT STATUS
            </span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate block">
              {currentUser.shift}
            </span>
          </div>

        </div>

        {/* Operational Access Permissions List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span>Role Operational Access Permissions</span>
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {currentUser.permissions.includes('ALL') ? 'Full System Access (ALL)' : `Restricted Role (${currentUser.permissions.length} modules)`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {allAccessModules.map((mod) => {
              const isAllowed =
                currentUser.permissions.includes('ALL') ||
                currentUser.permissions.includes(mod.key);

              return (
                <div
                  key={mod.label}
                  className={`p-2.5 rounded-xl border flex items-center justify-between font-medium ${
                    isAllowed
                      ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/40 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{mod.label}</span>
                  </div>
                  {isAllowed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="text-[9px] font-mono text-slate-400 uppercase">Restricted</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Audit Note */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Session Audit ID: SYS-SES-{currentUser.operatorId}-2026</span>
          </div>
          <span>SafeCity Demo Mode</span>
        </div>

      </div>

    </div>
  );
};

export default ProfilePage;
