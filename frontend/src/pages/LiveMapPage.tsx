import React, { useState } from 'react';
import { CityOperationsMap } from '../components/map/CityOperationsMap';
import { Incident } from '@shared/types';

export const LiveMapPage: React.FC = () => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncidentId(incident.id);
  };

  return (
    <div className="flex-1 bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-2.5 flex flex-col overflow-hidden relative shadow-xs font-sans">
      {/* Full-Screen Interactive GIS Canvas */}
      <div className="flex-1 relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <CityOperationsMap
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleSelectIncident}
        />
      </div>
    </div>
  );
};
