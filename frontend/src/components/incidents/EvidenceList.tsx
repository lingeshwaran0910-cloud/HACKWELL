import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Incident, Evidence, Conflict } from '@shared/types';
import { EvidenceSummary } from './EvidenceSummary';
import { EvidenceItem } from './EvidenceItem';

interface EvidenceListProps {
  incident: Incident;
  evidenceList: Evidence[];
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ incident, evidenceList }) => {
  return (
    <div className="space-y-3">
      {/* Evidence Summary Stats */}
      <EvidenceSummary evidenceList={evidenceList} />

      {/* EVIDENCE CONFLICT CARD */}
      {(incident.hasConflict || (incident.conflicts && incident.conflicts.length > 0)) && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-lg p-3 font-sans text-xs text-rose-800 dark:text-rose-200 space-y-2 shadow-xs select-none">
          <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider text-xs border-b border-rose-200 dark:border-rose-800/80 pb-1">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Evidence Conflict Detected</span>
          </div>

          <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
            Independent evidence sources disagree on ground facts. Fused counts held at <strong className="underline">UNKNOWN</strong>. Verification required before dispatch escalation.
          </p>

          {incident.conflicts && incident.conflicts.map((conflict: Conflict, idx: number) => (
            <div key={idx} className="bg-white dark:bg-slate-950/80 border border-rose-200 dark:border-rose-900/80 rounded-md p-2 text-[11px] space-y-1">
              <div className="font-semibold text-amber-700 dark:text-amber-300">
                Conflicting Field: <span className="font-mono">{conflict.field}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] mt-1 font-sans">
                {conflict.values.map((v, valIdx) => (
                  <div key={valIdx} className="bg-slate-50 dark:bg-slate-900/90 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="text-slate-500 dark:text-slate-400">{v.sourceType.replace('_', ' ')}</div>
                    <div className="font-mono font-bold text-xs mt-0.5">Value: {String(v.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline / List of Evidence Items */}
      <div className="space-y-2">
        <div className="font-sans text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center justify-between">
          <span>Evidence Feeds ({evidenceList.length})</span>
          <span className="text-[10px] text-slate-400 font-mono font-normal">T+0 Ingest</span>
        </div>

        {evidenceList.length === 0 ? (
          <div className="text-xs font-sans text-slate-500 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
            No evidence items linked to this incident.
          </div>
        ) : (
          evidenceList.map((evidence) => (
            <EvidenceItem key={evidence.id} evidence={evidence} />
          ))
        )}
      </div>
    </div>
  );
};
