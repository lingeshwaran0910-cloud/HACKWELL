import React from 'react';
import { Polyline, Popup } from 'react-leaflet';
import { Route } from '@shared/types';

interface RouteLayerProps {
  routes: Route[];
}

export const RouteLayer: React.FC<RouteLayerProps> = ({ routes }) => {
  return (
    <>
      {routes.map((route) => {
        const points = (route.waypoints && route.waypoints.length > 0)
          ? route.waypoints.map((w) => [w.lat, w.lng] as [number, number])
          : [
              [route.origin.lat, route.origin.lng] as [number, number],
              [route.destination.lat, route.destination.lng] as [number, number],
            ];

        const isFallback = route.routingStatus === 'FALLBACK' || route.isSimulated;

        return (
          <React.Fragment key={route.id}>
            {!isFallback && (
              <Polyline
                positions={points}
                pathOptions={{
                  color: '#0284c7',
                  weight: 6.5,
                  opacity: 0.35,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            <Polyline
              positions={points}
              pathOptions={{
                color: route.blocked ? '#ef4444' : '#2563eb',
                weight: 3.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: isFallback ? '6, 8' : undefined,
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="font-sans text-xs p-1 min-w-[180px]">
                  <div className="font-bold text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1">
                    <span>{route.callSign || route.resourceId} → {route.targetTitle || 'Incident'}</span>
                  </div>

                  {route.routingStatus === 'SUCCESS' && route.distanceKm !== null && route.etaMinutes !== null ? (
                    <div className="space-y-1 text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distance:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{route.distanceKm} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ETA:</span>
                        <span className="font-mono font-bold text-amber-500">{route.etaMinutes} min</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5 border-t border-slate-200 dark:border-slate-800">
                        ✓ Real Road Route (OSRM)
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        Simulated Route (Road routing unavailable)
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
};
