import React, { useState } from 'react';
import { BrainCircuit, CheckCircle2, XCircle, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { mockService } from '../services/mockService';
import { Recommendation, RecommendationState } from '@shared/types';
import { StatusBadge } from '../components/common/StatusBadge';

export const IntelligencePage: React.FC = () => {
  const recommendations = mockService.getRecommendations();
  const [decisions, setDecisions] = useState<Record<string, RecommendationState>>({});
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});

  const handleDecision = (recId: string, state: RecommendationState) => {
    setDecisions((prev) => ({ ...prev, [recId]: state }));
  };

  const toggleWhy = (recId: string) => {
    setExpandedWhy((prev) => ({ ...prev, [recId]: !prev[recId] }));
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 font-sans select-none">
      {/* Banner */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-600 dark:text-amber-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Response Intelligence</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Decision support proposals for human oversight</p>
          </div>
        </div>

        <StatusBadge label="HUMAN OVERSIGHT" variant="info" size="sm" />
      </div>

      {/* Recommendations Feed */}
      <div className="space-y-3">
        {recommendations.map((rec: Recommendation) => {
          const currentState = decisions[rec.id] || rec.state;
          const showWhy = expandedWhy[rec.id] || false;

          return (
            <div
              key={rec.id}
              className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 flex flex-col space-y-3 shadow-xs"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{rec.id}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Target: <strong className="font-mono text-blue-600 dark:text-blue-400">{rec.incidentId}</strong></span>
                </div>
                <StatusBadge
                  label={currentState}
                  variant={currentState === 'ACCEPTED' ? 'success' : currentState === 'REJECTED' ? 'danger' : 'warning'}
                  size="sm"
                />
              </div>

              {/* Scannable Recommendation Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Action</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">Deploy AMB-014</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">ETA</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">3.2 min</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Coverage</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs">Protected</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Hospital Target</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">KMC (No overload)</span>
                </div>
              </div>

              {/* Toggle Why / Explainability */}
              <div>
                <button
                  onClick={() => toggleWhy(rec.id)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  <span>Why?</span>
                  {showWhy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showWhy && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Reasoning</span>
                    {rec.reasons.map((r, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400">• {r}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Operator Action Bar */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => handleDecision(rec.id, 'ACCEPTED')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors ${
                    currentState === 'ACCEPTED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept</span>
                </button>

                <button
                  onClick={() => handleDecision(rec.id, 'MODIFIED')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors ${
                    currentState === 'MODIFIED'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modify</span>
                </button>

                <button
                  onClick={() => handleDecision(rec.id, 'REJECTED')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors ${
                    currentState === 'REJECTED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
