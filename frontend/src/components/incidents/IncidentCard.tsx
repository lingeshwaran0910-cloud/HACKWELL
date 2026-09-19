import React from 'react';
import { Clock, ShieldAlert, Radio, AlertCircle } from 'lucide-react';
import { Incident } from '@shared/types';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { IncidentSeverityBadge } from './IncidentSeverityBadge';

interface IncidentCardProps {
  incident: Incident;
  isSelected: boolean;
  onSelect: (incident: Incident) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ incident, isSelected, onSelect }) => {
  const waitingMinutes = Math.round((incident.priority?.waitingSeconds || 0) / 60);

  return (
    <div
      onClick={() => onSelect(incident)}
      className={`p-3 rounded-lg border cursor-pointer transition-all select-none ${
        isSelected
          ? 'bg-slate-800/90 border-l-4 border-l-blue-500 border-slate-700 shadow-md ring-1 ring-blue-500/30'
          : 'bg-[#0f172a]/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
      }`}
    >
      {/* Top Bar: Title, ID & Severity */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-mono text-[11px] font-semibold text-blue-400">{incident.id}</span>
            <span className="text-[11px] font-sans text-slate-400 font-medium">• {incident.zoneId}</span>
          </div>
          <h3 className="font-sans font-semibold text-slate-100 text-xs leading-snug line-clamp-1">{incident.title}</h3>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <IncidentSeverityBadge severity={incident.severity} size="sm" />
        </div>
      </div>

      {/* Badges Strip */}
      <div className="flex flex-wrap items-center gap-1.5 my-2 font-sans">
        <IncidentStatusBadge status={incident.status} size="sm" />
        <span className="text-[10px] px-2 py-0.5 bg-slate-950/80 text-slate-300 border border-slate-800 rounded-md font-medium">
          {incident.type}
        </span>
      </div>

      {/* Warning Flags */}
      {(incident.hasConflict || incident.silentAnomaly || incident.verificationRequired) && (
        <div className="flex flex-wrap gap-1.5 mb-2 font-sans">
          {incident.hasConflict && (
            <span className="text-[10px] px-2 py-0.5 bg-rose-950/70 text-rose-300 border border-rose-800/80 rounded-md font-medium flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Source Conflict
            </span>
          )}
          {incident.silentAnomaly && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-950/70 text-amber-300 border border-amber-800/80 rounded-md font-medium flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400" />
              Unreported Anomaly
            </span>
          )}
          {incident.verificationRequired && !incident.silentAnomaly && (
            <span className="text-[10px] px-2 py-0.5 bg-slate-950/80 text-amber-300 border border-amber-800/60 rounded-md font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              Verification Needed
            </span>
          )}
        </div>
      )}

      {/* Footer Metrics */}
      <div className="flex items-center justify-between text-[11px] font-sans text-slate-400 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="font-mono text-[10px]">Reported {waitingMinutes} min ago</span>
        </div>
        <div>
          <span>Debt: <strong className="font-mono text-rose-400">{incident.responseDebt.value}</strong></span>
        </div>
        <div className="font-mono text-[10px]">
          <span>Ev: <strong className="text-slate-200">{incident.evidenceIds.length}</strong></span>
          <span className="ml-1.5 text-slate-500">| Units: <strong className="text-blue-300">{incident.assignedResourceIds.length}</strong></span>
        </div>
      </div>
    </div>
  );
};

