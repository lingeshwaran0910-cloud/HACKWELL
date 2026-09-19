import React from 'react';
import { X, AlertTriangle, Ambulance, Building2, Shield, Info } from 'lucide-react';
import { Incident, Resource, Hospital, Zone, Evidence } from '@shared/types';
import { StatusBadge } from '../common/StatusBadge';
import { mockService } from '../../services/mockService';

export type SelectedMapItem =
  | { type: 'incident'; item: Incident }
  | { type: 'resource'; item: Resource }
  | { type: 'hospital'; item: Hospital }
  | { type: 'zone'; item: Zone }
  | null;

interface MapDetailPanelProps {
  selectedItem: SelectedMapItem;
  onClose: () => void;
}

export const MapDetailPanel: React.FC<MapDetailPanelProps> = ({ selectedItem, onClose }) => {
  if (!selectedItem) return null;

  return (
    <div className="absolute top-14 right-3 z-[1000] w-80 max-h-[calc(100%-68px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl p-3.5 text-xs font-sans text-slate-800 dark:text-slate-200 overflow-y-auto select-text transition-colors">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {selectedItem.type === 'incident' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
          {selectedItem.type === 'resource' && <Ambulance className="w-4 h-4 text-blue-500" />}
          {selectedItem.type === 'hospital' && <Building2 className="w-4 h-4 text-emerald-500" />}
          {selectedItem.type === 'zone' && <Shield className="w-4 h-4 text-purple-500" />}
          <span>{selectedItem.type}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* INCIDENT DETAILS */}
      {selectedItem.type === 'incident' && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedItem.item.title}</h3>
              <StatusBadge label={selectedItem.item.status} variant="info" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{selectedItem.item.description}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 py-1">
            <StatusBadge label={`SEVERITY ${selectedItem.item.severity}/5`} variant={selectedItem.item.severity >= 4 ? 'danger' : 'warning'} />
            <StatusBadge label={`${selectedItem.item.observability} OBS`} variant={selectedItem.item.observability === 'HIGH' ? 'success' : 'warning'} />
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2 space-y-1 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">ID</span>
              <span className="font-mono font-medium">{selectedItem.item.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zone</span>
              <span className="font-medium">{selectedItem.item.zoneId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location</span>
              <span className="font-mono text-[11px]">{selectedItem.item.location.lat.toFixed(4)}, {selectedItem.item.location.lng.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reported</span>
              <span>{new Date(selectedItem.item.firstReportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Fused Summary */}
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2 space-y-1">
            <div className="font-bold text-slate-500 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1 flex items-center justify-between">
              <span>Fused Facts</span>
              <span className="text-[9px] font-normal text-slate-400" title="Fused from active sensor feeds">Confidence 92%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-400">Victims:</span> <span className="font-semibold">{typeof selectedItem.item.fused.victimCount === 'number' ? selectedItem.item.fused.victimCount : 'Unknown'}</span></div>
              <div><span className="text-slate-400">Injuries:</span> <span className="font-semibold">{typeof selectedItem.item.fused.injuryCount === 'number' ? selectedItem.item.fused.injuryCount : 'Unknown'}</span></div>
            </div>
            
            {selectedItem.item.hasConflict && (
              <div className="mt-1.5 p-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 rounded text-rose-700 dark:text-rose-300 text-[10px] flex items-start gap-1">
                <Info className="w-3 h-3 shrink-0 mt-0.5 text-rose-500" />
                <span>Source conflict on injury counts. Counts held at UNKNOWN.</span>
              </div>
            )}
          </div>

          {/* Priority & Response Debt */}
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Priority Score</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedItem.item.priority.score}/100</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Response Debt</div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{selectedItem.item.responseDebt.value}</div>
            </div>
          </div>

          {/* Linked Evidence */}
          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2">
            <div className="font-bold text-slate-500 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">Evidence Feeds ({selectedItem.item.evidenceIds.length})</div>
            <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
              {mockService.getEvidenceForIncident(selectedItem.item.id).map((ev: Evidence) => (
                <div key={ev.id} className="text-[10px] bg-white dark:bg-slate-900 px-1.5 py-1 rounded border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{ev.sourceType}</span>
                  <span className="text-slate-400">{(ev.confidence * 100).toFixed(0)}% conf</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESOURCE DETAILS */}
      {selectedItem.type === 'resource' && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-blue-600 dark:text-blue-400">{selectedItem.item.callSign}</h3>
              <StatusBadge label={selectedItem.item.status} variant={selectedItem.item.status === 'AVAILABLE' ? 'success' : 'warning'} />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Unit Type: {selectedItem.item.type}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2 space-y-1 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Home Zone</span>
              <span>{selectedItem.item.homeZoneId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location</span>
              <span className="font-mono text-[11px]">{selectedItem.item.location ? `${selectedItem.item.location.lat.toFixed(4)}, ${selectedItem.item.location.lng.toFixed(4)}` : 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned</span>
              <span>{selectedItem.item.assignmentIncidentId || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hospital</span>
              <span>{selectedItem.item.destinationHospitalId || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Capabilities</span>
              <span className="text-[11px] font-medium">{selectedItem.item.capabilities.join(', ') || 'Standard'}</span>
            </div>
          </div>
        </div>
      )}

      {/* HOSPITAL DETAILS */}
      {selectedItem.type === 'hospital' && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{selectedItem.item.name}</h3>
              <StatusBadge label={selectedItem.item.predictedPressure.level} variant={selectedItem.item.predictedPressure.level === 'HIGH' ? 'danger' : 'info'} />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Zone: {selectedItem.item.zoneId}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2 space-y-1.5 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Available Beds</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedItem.item.bedsAvailable} / {selectedItem.item.bedsTotal}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Incoming Inbound</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{selectedItem.item.incomingLoad} units</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Capabilities</span>
              <div className="flex flex-wrap gap-1">
                {selectedItem.item.capabilities.map((c) => (
                  <span key={c} className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZONE DETAILS */}
      {selectedItem.type === 'zone' && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-purple-600 dark:text-purple-300">{selectedItem.item.name}</h3>
              <StatusBadge label={selectedItem.item.coverageStatus} variant={selectedItem.item.coverageStatus === 'ADEQUATE' ? 'success' : 'warning'} />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Observability: {selectedItem.item.observabilityBaseline}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/80 rounded border border-slate-200 dark:border-slate-800 p-2 space-y-1 text-[11px]">
            <div className="font-bold text-slate-500 text-[10px] uppercase border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">Active Unit Coverage</div>
            <div className="flex justify-between"><span>Ambulance</span><span className="font-semibold">{selectedItem.item.currentCoverage.ambulance} / {selectedItem.item.minCoverage.ambulance} min</span></div>
            <div className="flex justify-between"><span>Police</span><span className="font-semibold">{selectedItem.item.currentCoverage.police} / {selectedItem.item.minCoverage.police} min</span></div>
            <div className="flex justify-between"><span>Fire</span><span className="font-semibold">{selectedItem.item.currentCoverage.fire} / {selectedItem.item.minCoverage.fire} min</span></div>
            <div className="flex justify-between"><span>Rescue</span><span className="font-semibold">{selectedItem.item.currentCoverage.rescue} / {selectedItem.item.minCoverage.rescue} min</span></div>
          </div>
        </div>
      )}
    </div>
  );
};
