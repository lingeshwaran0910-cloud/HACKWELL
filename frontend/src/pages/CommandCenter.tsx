import React, { useState } from 'react';
import {
  Map,
  Building2,
  BrainCircuit,
  ShieldCheck,
} from 'lucide-react';
import { SectionHeader } from '../components/common/SectionHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { mockService } from '../services/mockService';
import { CityOperationsMap } from '../components/map/CityOperationsMap';
import { IncidentList } from '../components/incidents/IncidentList';
import { IncidentDetails } from '../components/incidents/IncidentDetails';
import { Incident, Hospital } from '@shared/types';

export const CommandCenter: React.FC = () => {
  const stats = mockService.getSummaryStats();
  const incidents = mockService.getIncidents();
  const hospitals = mockService.getHospitals();

  // Active selected incident state
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const selectedIncident = mockService.getIncidentById(selectedIncidentId);

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncidentId(incident.id);
  };

  const handleClearSelection = () => {
    setSelectedIncidentId(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
      {/* City-Wide Coverage & Status Bar */}
      <div className="bg-[#0b1329] border border-slate-800/80 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-sans shadow-md">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 font-medium">City Status:</span>
          <StatusBadge label={stats.riskZones > 0 ? 'COVERAGE RISK' : 'STABLE'} variant={stats.riskZones > 0 ? 'danger' : 'success'} />
          <span className="text-slate-700">|</span>
          <span className="text-slate-300 font-medium">{stats.totalZones} Zones Monitored</span>
        </div>

        <div className="flex items-center gap-5 text-slate-300 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Adequate: <strong className="text-slate-100 font-mono">{stats.adequateZones}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Marginal: <strong className="text-slate-100 font-mono">{stats.marginalZones}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Risk: <strong className="text-slate-100 font-mono">{stats.riskZones}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Command Center Grid */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
        {/* LEFT COLUMN: Active Incident Queue */}
        <div className="col-span-12 lg:col-span-3 flex flex-col overflow-hidden">
          <IncidentList
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={handleSelectIncident}
          />
        </div>

        {/* CENTER COLUMN: Interactive Leaflet City Operations Map */}
        <div className="col-span-12 lg:col-span-6 bg-[#0b1329] border border-slate-800/80 rounded-lg p-3 flex flex-col overflow-hidden relative shadow-xl">
          <SectionHeader
            title="City Operations Map"
            icon={<Map className="w-4 h-4 text-blue-400" />}
            subtitle="Hackwell Grid"
            action={
              <div className="flex items-center gap-2">
                <StatusBadge label="MAP ACTIVE" variant="success" pulse={true} />
              </div>
            }
          />

          {/* Interactive Leaflet Map Container */}
          <div className="flex-1 relative overflow-hidden rounded-md border border-slate-800/90">
            <CityOperationsMap
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={handleSelectIncident}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Incident Details OR AI Recommendations & Hospitals */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 overflow-hidden">
          {selectedIncident ? (
            <IncidentDetails
              incident={selectedIncident}
              onClose={handleClearSelection}
            />
          ) : (
            <>
              {/* AI / Optimization Recommendations Panel */}
              <div className="flex-1 bg-[#0b1329] border border-slate-800/80 rounded-lg p-3 flex flex-col overflow-hidden shadow-lg">
                <SectionHeader
                  title="AI Recommendations"
                  count={stats.totalRecommendations}
                  icon={<BrainCircuit className="w-4 h-4 text-amber-400" />}
                  action={<StatusBadge label="DETERMINISTIC" variant="info" size="sm" />}
                />
                <div className="flex-1 overflow-y-auto p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-lg space-y-2 text-xs font-sans">
                  <div className="p-2.5 bg-[#0f172a]/80 border border-slate-800 rounded-md">
                    <div className="flex items-center justify-between text-amber-400 font-semibold mb-1">
                      <span className="font-mono text-[11px]">rec-bundle-01</span>
                      <StatusBadge label="PROPOSED" variant="warning" size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Dispatch A12 + R01 + P01 to East Highway collision. Reroute A07 for mutual aid coverage.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between font-mono">
                      <span>Cost: 48.2</span>
                      <span className="text-amber-400 font-medium">COVERAGE RISK: HIGHWAY</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 border border-slate-800/60 rounded-md text-[11px] text-slate-400 leading-normal">
                    Select any incident in the queue or on the map to view detailed evidence intelligence & priority metrics.
                  </div>
                </div>
              </div>

              {/* Hospitals Panel */}
              <div className="h-52 bg-[#0b1329] border border-slate-800/80 rounded-lg p-3 flex flex-col overflow-hidden shadow-lg">
                <SectionHeader
                  title="Hospitals & Capacity"
                  count={hospitals.length}
                  icon={<Building2 className="w-4 h-4 text-emerald-400" />}
                />
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-sans">
                  {hospitals.map((h: Hospital) => (
                    <div key={h.id} className="p-2 bg-slate-900/60 hover:bg-slate-800/50 border border-slate-800/80 rounded-md flex items-center justify-between text-xs transition-colors">
                      <div>
                        <div className="font-medium text-slate-200">{h.name}</div>
                        <div className="text-[10px] text-slate-400">Load: {h.incomingLoad} incoming</div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-emerald-400 font-bold">{h.bedsAvailable}</span>
                        <span className="text-slate-500 text-[10px]">/{h.bedsTotal} beds</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
