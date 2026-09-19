import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Resource } from '@shared/types';
import { createResourceIcon } from './mapIcons';

interface ResourceLayerProps {
  resources: Resource[];
  selectedResourceId: string | null;
  onSelectResource: (resource: Resource) => void;
}

export const ResourceLayer: React.FC<ResourceLayerProps> = ({
  resources,
  selectedResourceId,
  onSelectResource,
}) => {
  return (
    <>
      {resources.map((resource) => {
        // Skip rendering on map if GPS location is unavailable
        if (!resource.location) return null;

        const isSelected = resource.id === selectedResourceId;
        const icon = createResourceIcon(resource, isSelected);

        return (
          <Marker
            key={resource.id}
            position={[resource.location.lat, resource.location.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectResource(resource),
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="font-mono text-xs text-slate-100 p-1 min-w-[180px]">
                <div className="font-bold text-blue-400 border-b border-slate-700 pb-1 mb-1">
                  {resource.callSign} ({resource.type})
                </div>
                <div className="text-[11px] text-slate-300 mb-1">
                  STATUS: <span className="font-bold text-amber-400">{resource.status}</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  HOME ZONE: {resource.homeZoneId}
                </div>
                <div className="text-[10px] text-slate-400">
                  ASSIGNMENT: {resource.assignmentIncidentId || 'None'}
                </div>
                {resource.stale && (
                  <div className="text-[10px] text-rose-400 font-bold mt-1">
                    STALE GPS ({resource.freshnessSeconds}s ago)
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
