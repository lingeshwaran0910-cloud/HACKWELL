import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Incident, Resource, Hospital, Route, Evidence } from '@shared/types';
import {
  realtimeEngine,
  AlertNotificationItem,
  ActivityLogEntry,
} from '../services/realtimeEngine';
import { mockService } from '../services/mockService';

interface AppContextType {
  incidents: Incident[];
  resources: Resource[];
  hospitals: Hospital[];
  routes: Route[];
  evidence: Evidence[];
  alerts: AlertNotificationItem[];
  activityLogs: ActivityLogEntry[];
  isLiveSimRunning: boolean;
  toggleLiveSim: () => void;
  lastUpdatedSecondsAgo: number;
  lastUpdatedTimestamp: string;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  summaryStats: ReturnType<typeof mockService.getSummaryStats>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cityWorld, setCityWorld] = useState(() => realtimeEngine.getCityWorld());
  const [alerts, setAlerts] = useState(() => realtimeEngine.getAlerts());
  const [activityLogs, setActivityLogs] = useState(() => realtimeEngine.getActivityLogs());
  const [isLiveSimRunning, setIsLiveSimRunning] = useState(() => realtimeEngine.getIsLiveSimRunning());
  const [lastUpdatedTimestamp, setLastUpdatedTimestamp] = useState(() => realtimeEngine.getLastUpdatedTimestamp());
  const [lastUpdatedSecondsAgo, setLastUpdatedSecondsAgo] = useState<number>(0);

  // Subscribe to real-time engine state changes
  useEffect(() => {
    const unsubscribe = realtimeEngine.subscribe(() => {
      setCityWorld({ ...realtimeEngine.getCityWorld() });
      setAlerts([...realtimeEngine.getAlerts()]);
      setActivityLogs([...realtimeEngine.getActivityLogs()]);
      setIsLiveSimRunning(realtimeEngine.getIsLiveSimRunning());
      setLastUpdatedTimestamp(realtimeEngine.getLastUpdatedTimestamp());
    });
    return () => unsubscribe();
  }, []);

  // Timer to tick "Last updated X sec ago" every second
  useEffect(() => {
    const updateSeconds = () => {
      const ts = new Date(lastUpdatedTimestamp).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
      setLastUpdatedSecondsAgo(diffSec);
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedTimestamp]);

  const toggleLiveSim = () => {
    realtimeEngine.toggleLiveSim();
  };

  const markAlertRead = (id: string) => {
    realtimeEngine.markAlertRead(id);
  };

  const markAllAlertsRead = () => {
    realtimeEngine.markAllAlertsRead();
  };

  const summaryStats = mockService.getSummaryStats();

  return (
    <AppContext.Provider
      value={{
        incidents: cityWorld.incidents || [],
        resources: cityWorld.resources || [],
        hospitals: cityWorld.hospitals || [],
        routes: cityWorld.routes || [],
        evidence: cityWorld.evidence || [],
        alerts,
        activityLogs,
        isLiveSimRunning,
        toggleLiveSim,
        lastUpdatedSecondsAgo,
        lastUpdatedTimestamp,
        markAlertRead,
        markAllAlertsRead,
        summaryStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
