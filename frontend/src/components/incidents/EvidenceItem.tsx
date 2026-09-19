import React from 'react';
import { Radio, Phone, Video, Car, Activity, Cpu, Globe, Satellite, User, Cloud } from 'lucide-react';
import { Evidence, EvidenceSourceType } from '@shared/types';
import { StatusBadge } from '../common/StatusBadge';

interface EvidenceItemProps {
  evidence: Evidence;
}

const getSourceIcon = (sourceType: EvidenceSourceType) => {
  switch (sourceType) {
    case 'EMERGENCY_CALL':
      return <Phone className="w-3.5 h-3.5 text-blue-400" />;
    case 'CCTV':
      return <Video className="w-3.5 h-3.5 text-purple-400" />;
    case 'VEHICLE_TELEMETRY':
      return <Car className="w-3.5 h-3.5 text-rose-400" />;
    case 'TRAFFIC':
      return <Activity className="w-3.5 h-3.5 text-amber-400" />;
    case 'IOT_SENSOR':
      return <Cpu className="w-3.5 h-3.5 text-emerald-400" />;
    case 'GPS':
      return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
    case 'SATELLITE':
      return <Satellite className="w-3.5 h-3.5 text-orange-400" />;
    case 'CITIZEN_REPORT':
      return <User className="w-3.5 h-3.5 text-indigo-400" />;
    case 'WEATHER':
      return <Cloud className="w-3.5 h-3.5 text-sky-400" />;
    default:
      return <Radio className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const getFreshnessLabel = (evidence: Evidence) => {
  if (evidence.stale) return { label: 'Stale', variant: 'danger' as const };
  if (evidence.freshnessSeconds < 120) return { label: 'Fresh', variant: 'success' as const };
  if (evidence.freshnessSeconds < 600) return { label: 'Recent', variant: 'warning' as const };
  return { label: 'Stale', variant: 'danger' as const };
};

export const EvidenceItem: React.FC<EvidenceItemProps> = ({ evidence }) => {
  const freshness = getFreshnessLabel(evidence);
  const confidencePct = Math.round(evidence.confidence * 100);

  return (
    <div className="bg-[#0f172a]/60 border border-slate-800/80 rounded-lg p-3 font-sans text-xs space-y-2 select-none">
      {/* Top Bar: Source Type, ID, Freshness, Confidence */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
        <div className="flex items-center gap-1.5">
          {getSourceIcon(evidence.sourceType)}
          <span className="font-semibold text-slate-200 text-xs">{evidence.sourceType.replace('_', ' ')}</span>
          <span className="text-[11px] font-mono text-blue-400">({evidence.id})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge label={freshness.label} variant={freshness.variant} size="sm" />
          <span className="px-1.5 py-0.5 bg-slate-950/80 text-slate-300 border border-slate-800 rounded-md text-[10px] font-mono">
            Quality: {confidencePct}%
          </span>
        </div>
      </div>


      {/* Narrative */}
      {evidence.normalized.narrative && (
        <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
          {evidence.normalized.narrative}
        </p>
      )}

      {/* Normalized Signals */}
      <div className="flex flex-wrap gap-1 text-[10px]">
        {evidence.normalized.speedSeriesKmh && (
          <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 border border-slate-800 rounded">
            Speed: {evidence.normalized.speedSeriesKmh.join('→')} km/h
          </span>
        )}
        {evidence.normalized.impactSignal !== null && (
          <span className={`px-1.5 py-0.2 rounded border ${evidence.normalized.impactSignal ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
            Impact: {evidence.normalized.impactSignal ? 'YES' : 'NO'}
          </span>
        )}
        {evidence.normalized.airbagDeployed !== null && (
          <span className={`px-1.5 py-0.2 rounded border ${evidence.normalized.airbagDeployed ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
            Airbag: {evidence.normalized.airbagDeployed ? 'DEPLOYED' : 'NO'}
          </span>
        )}
        {evidence.normalized.hazardClass && (
          <span className="px-1.5 py-0.2 bg-orange-950 text-orange-300 border border-orange-800 rounded font-bold">
            Hazard: {evidence.normalized.hazardClass}
          </span>
        )}
        {evidence.normalized.roadBlocked !== null && (
          <span className={`px-1.5 py-0.2 rounded border ${evidence.normalized.roadBlocked ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'}`}>
            Road Blocked: {evidence.normalized.roadBlocked ? 'YES' : 'NO'}
          </span>
        )}
        {evidence.normalized.congestionIndex !== null && (
          <span className="px-1.5 py-0.2 bg-slate-950 text-amber-300 border border-slate-800 rounded">
            Congestion Index: {evidence.normalized.congestionIndex}
          </span>
        )}
      </div>

      {/* Metadata & Timestamp */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
        <span>Time: {new Date(evidence.timestamp).toLocaleTimeString()}</span>
        <span>
          Location: {evidence.location ? `${evidence.location.lat.toFixed(4)}, ${evidence.location.lng.toFixed(4)}` : 'Area BBox / No Street GPS'}
        </span>
      </div>
    </div>
  );
};
