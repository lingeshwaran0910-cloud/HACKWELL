import React, { useState, useRef, useEffect } from 'react';
import { Bell, ShieldAlert, Building2, Radio, Check, X } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: 'critical' | 'warning' | 'info';
}

export const NotificationPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Critical Incident Verified',
      desc: 'Multi-Vehicle Collision INC-001 in Zone 2 verified by CCTV telemetry.',
      time: '2m ago',
      unread: true,
      type: 'critical',
    },
    {
      id: 'notif-2',
      title: 'Hospital Capacity Alert',
      desc: 'Central Trauma Center approaching 80% capacity utilization.',
      time: '12m ago',
      unread: true,
      type: 'warning',
    },
    {
      id: 'notif-3',
      title: 'Telemetry Stale Warning',
      desc: 'Ambulance A12 GPS telemetry outdated (> 120s).',
      time: '25m ago',
      unread: false,
      type: 'info',
    },
  ]);

  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-sm relative flex items-center justify-center"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#0b1329]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-3.5 select-none text-xs font-sans">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Check className="w-3 h-3" />
                  Mark read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-2.5 rounded-lg border transition-colors flex items-start gap-2.5 ${
                  n.unread
                    ? 'bg-blue-50/60 dark:bg-slate-800/60 border-blue-200 dark:border-slate-700/80'
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === 'critical' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  ) : n.type === 'warning' ? (
                    <Building2 className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Radio className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">{n.title}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
