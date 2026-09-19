import React from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Ambulance,
  Building2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { Incident, Resource, Hospital } from '@shared/types';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { IncidentSeverityBadge } from './IncidentSeverityBadge';
import { EvidenceList } from './EvidenceList';
import { mockService } from '../../services/mockService';

interface IncidentDetailsProps {
  incident: Incident;
  onClose: () => void;
  onSelectResource?: (resource: Resource) => void;
}

export const IncidentDetails: React.FC<IncidentDetailsProps> = ({
  incident,
  onClose,
  onSelectResource,
}) => {
  const evidenceList = mockService.getEvidenceForIncident(incident.id);
  const waitingMinutes = Math.round((incident.priority?.waitingSeconds || 0) / 60);

  // Get assigned resource objects
  const assignedResources = (incident.assignedResourceIds || [])
    .map((resId) => mockService.getResourceById(resId))
    .filter((r): r is Resource => r !== undefined);

  // Get recommended hospital object
  const recommendedHospital: Hospital | undefined = mockService.getHospitalById(incident.recommendedHospitalId);

  return (
    <div className="h-full flex flex-col bg-[#0b1329] border border-slate-800/80 rounded-lg p-3.5 font-sans text-xs text-slate-200 overflow-hidden shadow-xl select-text">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-3 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] uppercase font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Incident Details</span>
            <span className="text-blue-400 font-mono text-xs">({incident.id})</span>
          </div>
          <h2 className="font-bold text-sm text-slate-100">{incident.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          title="Close details panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>


      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Badges Strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          <IncidentSeverityBadge severity={incident.severity} size="sm" />
          <IncidentStatusBadge status={incident.status} size="sm" />
          <span className="px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded text-[10px] font-semibold">
            TYPE: {incident.type}
          </span>
          <span className="px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded text-[10px] font-semibold">
            ZONE: {incident.zoneId}
          </span>
          <span className="px-2 py-0.5 bg-slate-900 text-purple-300 border border-slate-800 rounded text-[10px] font-semibold">
            OBS: {incident.observability}
          </span>
        </div>

        {/* Narrative Description */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1">
          <div className="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-800 pb-0.5 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-blue-400" />
            <span>Narrative & Description</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {incident.description}
          </p>
        </div>

        {/* Location & Timestamps */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Coordinates</div>
            <div className="text-slate-200 font-mono">
              {incident.location.lat.toFixed(4)} N, {incident.location.lng.toFixed(4)} E
            </div>
            <div className="text-[10px] text-slate-500">
              Uncertainty: ±{incident.locationUncertaintyMeters || 'Unknown'}m
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded p-2 space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Reported & Wait</div>
            <div className="text-slate-200">
              {new Date(incident.firstReportedAt).toLocaleTimeString()}
            </div>
            <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{waitingMinutes} minutes waiting</span>
            </div>
          </div>
        </div>

        {/* Priority & Response Debt Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-2">
          <div className="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-800 pb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Priority & Response Debt
            </span>
            <span className="text-amber-400 font-bold text-xs">Score: {incident.priority.score}/100</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">Urgency Level:</span> <strong className="text-amber-400">{incident.priority.urgency}/5</strong>
            </div>
            <div>
              <span className="text-slate-500">Response Debt:</span> <strong className="text-rose-400">{incident.responseDebt.value}</strong>
            </div>
          </div>

          {incident.responseDebt.formula && (
            <div className="text-[10px] bg-slate-950 p-1.5 rounded border border-slate-800 text-slate-300 font-mono">
              <span className="text-slate-500 block text-[9px] mb-0.5">Formula:</span>
              {incident.responseDebt.formula}
            </div>
          )}

          {incident.priority.reasons && incident.priority.reasons.length > 0 && (
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <span className="text-slate-500 block font-semibold text-[9px]">Priority Drivers:</span>
              {incident.priority.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-1 text-slate-300">
                  <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fused Ground Facts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1.5">
          <div className="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>Fused Ground Facts</span>
            {incident.hasConflict ? (
              <span className="text-rose-400 font-bold text-[10px]">CONFLICT PRESENT</span>
            ) : (
              <span className="text-emerald-400 text-[10px]">CORROBORATED</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Fused Victims:</span>
              <strong className="text-slate-100 text-xs">
                {typeof incident.fused.victimCount === 'number' ? incident.fused.victimCount : 'UNKNOWN'}
              </strong>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Fused Injuries:</span>
              <strong className="text-slate-100 text-xs">
                {typeof incident.fused.injuryCount === 'number' ? incident.fused.injuryCount : 'UNKNOWN'}
              </strong>
            </div>
          </div>

          {incident.fused.notes && incident.fused.notes.length > 0 && (
            <div className="text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800/80 space-y-0.5">
              {incident.fused.notes.map((note, idx) => (
                <div key={idx}>• {note}</div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Emergency Resources */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-2">
          <div className="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-800 pb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Ambulance className="w-3.5 h-3.5 text-blue-400" /> Assigned Fleet Units
            </span>
            <span className="text-blue-300 font-bold">{assignedResources.length} Units</span>
          </div>

          {assignedResources.length === 0 ? (
            <div className="text-[11px] text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800/60 text-center font-bold">
              No emergency units assigned yet — Recommendation PROPOSED
            </div>
          ) : (
            <div className="space-y-1.5">
              {assignedResources.map((res) => (
                <div
                  key={res.id}
                  onClick={() => onSelectResource && onSelectResource(res)}
                  className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-300">{res.callSign}</span>
                    <span className="text-slate-400 text-[10px]">{res.type.replace('_UNIT', '')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 text-[10px]">{res.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommended Hospital */}
        {recommendedHospital && (
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1">
            <div className="font-bold text-slate-400 text-[10px] uppercase border-b border-slate-800 pb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recommended Hospital</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-bold text-emerald-400">{recommendedHospital.name}</span>
              <span className="text-slate-400 text-[10px]">Available: {recommendedHospital.bedsAvailable} beds</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Capabilities: {recommendedHospital.capabilities.join(', ')}
            </div>
          </div>
        )}

        {/* Evidence Section */}
        <EvidenceList incident={incident} evidenceList={evidenceList} />
      </div>
    </div>
  );
};
