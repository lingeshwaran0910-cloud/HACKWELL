import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Ambulance,
  Building2,
  FileText,
  TrendingUp,
  BrainCircuit,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Incident, Resource, Hospital } from '@shared/types';
import { IncidentStatusBadge } from './IncidentStatusBadge';
import { IncidentSeverityBadge } from './IncidentSeverityBadge';
import { EvidenceList } from './EvidenceList';
import { mockService } from '../../services/mockService';
import { intelligenceApi, StructuredIntelligenceData, AIHealthStatus } from '../../services/apiService';

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

  // AI State Management
  const [aiState, setAiState] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [aiData, setAiData] = useState<StructuredIntelligenceData | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    intelligenceApi
      .getHealth()
      .then((health) => {
        if (isMounted) setHealthStatus(health);
      })
      .catch(() => {
        if (isMounted) {
          setHealthStatus({
            status: 'AI OFFLINE',
            health: {
              configured: false,
              online: false,
              provider: 'gemini',
              model: 'gemini-2.5-flash',
              message: 'AI CONFIGURATION MISSING',
            },
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAnalyzeWithAI = async () => {
    setAiState('LOADING');
    setAiError(null);
    try {
      const res = await intelligenceApi.analyze(incident.id);
      if (res.success && res.data) {
        setAiData(res.data);
        setAiState('SUCCESS');
      } else {
        setAiError('Failed to generate intelligence from backend');
        setAiState('ERROR');
      }
    } catch (err: any) {
      setAiError(err.message || 'AI analysis request failed');
      setAiState('ERROR');
    }
  };

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

        {/* Real AI Operational Intelligence Section */}
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-lg p-3 space-y-2.5 shadow-md">
          {/* AI Header & Provider Status */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-100 text-xs">
              <BrainCircuit className="w-4 h-4 text-amber-400" />
              <span>SafeCity AI Intelligence</span>
            </div>

            {healthStatus?.health?.online ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                SAFE CITY AI ● ONLINE
              </span>
            ) : healthStatus?.health?.configured ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                SAFE CITY AI ● OFFLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                AI CONFIGURATION REQUIRED
              </span>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleAnalyzeWithAI}
              disabled={aiState === 'LOADING'}
              className={`w-full py-1.5 px-3 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                aiState === 'LOADING'
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
              }`}
            >
              {aiState === 'LOADING' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI ANALYZING {incident.id}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>ANALYZE WITH AI</span>
                </>
              )}
            </button>
          </div>

          {/* Error / Configuration Alert */}
          {aiState === 'ERROR' && aiError && (
            <div className="p-2 bg-rose-950/50 border border-rose-800/80 rounded text-[11px] text-rose-300 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Analysis Error</span>
                <span>{aiError}</span>
              </div>
            </div>
          )}

          {/* AI Intelligence Output */}
          {aiState === 'SUCCESS' && aiData && (
            <div className="space-y-2.5 text-[11px] pt-1">
              <div className="text-[10px] text-emerald-400 font-mono flex items-center justify-between border-b border-slate-800/80 pb-1">
                <span>AI ANALYSIS COMPLETE</span>
                <span>{new Date(aiData.analysisTimestamp).toLocaleTimeString()}</span>
              </div>

              {/* Metrics Strip */}
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">SEVERITY</span>
                  <span className="font-bold text-amber-400 text-xs">{aiData.severity}</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">PRIORITY</span>
                  <span className="font-bold text-blue-400 text-xs">{aiData.priorityScore}/100</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="text-[9px] text-slate-400 block font-sans">CONFIDENCE</span>
                  <span className="font-bold text-emerald-400 text-xs">{aiData.confidence}%</span>
                </div>
              </div>

              {/* Situation Summary */}
              <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 text-[10px] uppercase block">Situation Summary</span>
                <p className="text-slate-200 leading-snug font-sans">{aiData.situationSummary}</p>
              </div>

              {/* Key Findings */}
              {aiData.keyFindings && aiData.keyFindings.length > 0 && (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-300 text-[10px] uppercase block">Key Findings</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 font-sans">
                    {aiData.keyFindings.map((finding, idx) => (
                      <li key={idx}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What Changed */}
              {aiData.whatChanged && aiData.whatChanged.length > 0 && (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-300 text-[10px] uppercase block">What Changed</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 font-sans">
                    {aiData.whatChanged.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {aiData.recommendedNextSteps && aiData.recommendedNextSteps.length > 0 && (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 text-[10px] uppercase block">Recommended Next Steps</span>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-200 font-sans font-semibold">
                    {aiData.recommendedNextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Missing Information */}
              {aiData.missingInformation && aiData.missingInformation.length > 0 && (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1">
                  <span className="font-bold text-rose-400 text-[10px] uppercase block">Missing Information</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 font-sans">
                    {aiData.missingInformation.map((missing, idx) => (
                      <li key={idx}>{missing}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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
            <div className="text-[10px] text-slate-400 font-bold uppercase">Reported Time</div>
            <div className="text-slate-200 font-mono">
              {new Date(incident.firstReportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Reported {waitingMinutes} min ago</span>
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
