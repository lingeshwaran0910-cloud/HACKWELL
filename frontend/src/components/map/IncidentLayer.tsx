import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Incident } from '@shared/types';
import { createIncidentIcon } from './mapIcons';

interface IncidentLayerProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (incident: Incident) => void;
}

export const IncidentLayer: React.FC<IncidentLayerProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}) => {
  return (
    <>
      {incidents.map((incident) => {
        const isSelected = incident.id === selectedIncidentId;
        const icon = createIncidentIcon(incident, isSelected);

        return (
          <Marker
            key={incident.id}
            position={[incident.location.lat, incident.location.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectIncident(incident),
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="font-mono text-xs text-slate-100 p-1 min-w-[200px]">
                <div className="font-bold text-rose-400 border-b border-slate-700 pb-1 mb-1">
                  {incident.title}
                </div>
                <div className="text-[11px] text-slate-300 mb-1">
                  ID: <span className="text-blue-300">{incident.id}</span> | SEVERITY: <span className="font-bold text-amber-400">{incident.severity}/5</span>
                </div>
                <div className="text-[11px] text-slate-300 mb-1">
                  STATUS: <span className="font-bold text-slate-200">{incident.status}</span>
                </div>
                <div className="text-[10px] text-slate-400 mb-1">
                  ZONE: {incident.zoneId} | OBS: {incident.observability}
                </div>
                <div className="text-[10px] text-slate-400">
                  PEOPLE: {typeof incident.fused.victimCount === 'number' ? incident.fused.victimCount : 'Unknown'}
                  {incident.hasConflict ? ' (Conflict)' : ''}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
