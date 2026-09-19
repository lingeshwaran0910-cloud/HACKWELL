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
        // Construct array of Leaflet lat/lng points: origin -> waypoints -> destination
        const points = [
          [route.origin.lat, route.origin.lng] as [number, number],
          ...(route.waypoints || []).map((w) => [w.lat, w.lng] as [number, number]),
          [route.destination.lat, route.destination.lng] as [number, number],
        ];

        const color = route.blocked ? '#ef4444' : '#3b82f6'; // Red if blocked, Blue otherwise

        return (
          <Polyline
            key={route.id}
            positions={points}
            pathOptions={{
              color,
              weight: 3,
              opacity: 0.8,
              dashArray: route.routingMode === 'SIMULATED' ? '6, 8' : undefined,
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="font-mono text-xs text-slate-100 p-1 min-w-[160px]">
                <div className="font-bold text-blue-400 border-b border-slate-700 pb-1 mb-1">
                  ROUTE: {route.id} ({route.routingMode})
                </div>
                <div className="text-[11px] text-slate-300">
                  ETA: <span className="font-bold text-amber-400">{route.etaMinutes} min</span> ({route.distanceKm} km)
                </div>
                {route.blocked && (
                  <div className="text-[10px] text-rose-400 font-bold mt-1">
                    ROAD BLOCKED
                  </div>
                )}
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
};
