import React from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { Zone } from '@shared/types';

interface ZoneLayerProps {
  zones: Zone[];
  onSelectZone: (zone: Zone) => void;
}

const getZoneColors = (zone: Zone) => {
  if (zone.coverageStatus === 'COVERAGE_RISK' || zone.coverageStatus === 'BELOW_MINIMUM') {
    return { stroke: '#ef4444', fill: '#ef4444' }; // Red
  }
  if (zone.coverageStatus === 'MARGINAL') {
    return { stroke: '#f59e0b', fill: '#f59e0b' }; // Amber
  }
  switch (zone.observabilityBaseline) {
    case 'HIGH':
      return { stroke: '#3b82f6', fill: '#3b82f6' }; // Blue
    case 'PARTIAL':
      return { stroke: '#f59e0b', fill: '#f59e0b' }; // Amber
    case 'LOW':
      return { stroke: '#a855f7', fill: '#a855f7' }; // Purple
    default:
      return { stroke: '#64748b', fill: '#64748b' };
  }
};

export const ZoneLayer: React.FC<ZoneLayerProps> = ({ zones, onSelectZone }) => {
  return (
    <>
      {zones.map((zone) => {
        const positions = zone.polygon.map((pt) => [pt.lat, pt.lng] as [number, number]);
        const colors = getZoneColors(zone);

        return (
          <Polygon
            key={zone.id}
            positions={positions}
            pathOptions={{
              color: colors.stroke,
              fillColor: colors.fill,
              fillOpacity: 0.12,
              weight: 2,
              dashArray: zone.observabilityBaseline === 'LOW' ? '6, 6' : undefined,
            }}
            eventHandlers={{
              click: () => onSelectZone(zone),
            }}
          >
            <Tooltip permanent direction="center" className="zone-label-tooltip">
              <div className="font-mono text-[11px] font-bold text-slate-200 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800 shadow">
                {zone.name.toUpperCase()}
                <span className="block text-[9px] font-normal text-slate-400">
                  {zone.observabilityBaseline} OBS | {zone.coverageStatus}
                </span>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
};
