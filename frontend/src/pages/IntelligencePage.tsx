import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { intelligenceApi, AIHealthStatus, StructuredIntelligenceData } from '../services/apiService';
import { mockService } from '../services/mockService';
import { Recommendation, RecommendationState, Incident } from '@shared/types';
import { StatusBadge } from '../components/common/StatusBadge';

export const IntelligencePage: React.FC = () => {
  const { incidents } = useApp();
  const recommendations = mockService.getRecommendations();

  // AI Health State
  const [healthStatus, setHealthStatus] = useState<AIHealthStatus | null>(null);

  // Analysis State
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(incidents[0]?.id || 'INC-001');
  const [analyzeState, setAnalyzeState] = useState<'READY' | 'ANALYZING' | 'REAL MODEL REQUEST' | 'COMPLETE' | 'ERROR'>('READY');
  const [analysisResult, setAnalysisResult] = useState<StructuredIntelligenceData | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Legacy recommendations state
  const [decisions, setDecisions] = useState<Record<string, RecommendationState>>({});
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    intelligenceApi
      .getHealth()
      .then(setHealthStatus)
      .catch(() => {
        setHealthStatus({
          status: 'AI CONFIGURATION MISSING',
          health: {
            configured: false,
            online: false,
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            message: 'AI CONFIGURATION MISSING',
          },
        });
      });
  }, []);

  const handleAnalyze = async () => {
    setAnalysisError(null);
    setAnalyzeState('ANALYZING');

    setTimeout(async () => {
      setAnalyzeState('REAL MODEL REQUEST');
      try {
        const res = await intelligenceApi.analyze(selectedIncidentId);
        if (res.success && res.data) {
          setAnalysisResult(res.data);
          setAnalyzeState('COMPLETE');
        } else {
          throw new Error('Analysis failed to return structured data');
        }
      } catch (err: any) {
        setAnalyzeState('ERROR');
        setAnalysisError(err.message || 'AI request failed');
      }
    }, 400);
  };

  const handleDecision = (recId: string, state: RecommendationState) => {
    setDecisions((prev) => ({ ...prev, [recId]: state }));
  };

  const toggleWhy = (recId: string) => {
    setExpandedWhy((prev) => ({ ...prev, [recId]: !prev[recId] }));
  };

  // Status Badge Helper
  const renderAiStatusBadge = () => {
    if (healthStatus?.health.online) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SAFE CITY AI ● ONLINE</span>
        </span>
      );
    }
    if (healthStatus?.health.configured && !healthStatus.health.online) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>SAFE CITY AI ● OFFLINE</span>
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <span>AI CONFIGURATION REQUIRED</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 font-sans select-none">

      {/* HEADER BANNER */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-600 dark:text-amber-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">Response Intelligence</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Operational ground synthesis & AI-powered incident intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {renderAiStatusBadge()}
        </div>
      </div>

      {/* AI INCIDENT ANALYZER CARD */}
      <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 flex flex-col space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Incident Ground Intelligence
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {incidents.map((inc: Incident) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.title.slice(0, 32)}
                </option>
              ))}
            </select>

            <button
              onClick={handleAnalyze}
              disabled={analyzeState === 'ANALYZING' || analyzeState === 'REAL MODEL REQUEST'}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {analyzeState === 'ANALYZING' || analyzeState === 'REAL MODEL REQUEST' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{analyzeState}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>[ANALYZE WITH AI]</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ANALYSIS ERROR / CONFIG MISSING BANNER */}
        {analysisError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{analysisError}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Configure <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">GEMINI_API_KEY</code> or <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">OPENAI_API_KEY</code> in backend <code className="font-mono">.env</code> to activate live model synthesis.
            </p>
          </div>
        )}

        {/* STRUCTURED INTELLIGENCE OUTPUT PANEL */}
        {analysisResult && (
          <div className="space-y-3 pt-1 font-sans text-xs">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Severity</span>
                <span className={`font-mono font-bold text-xs ${
                  analysisResult.severity === 'CRITICAL' ? 'text-rose-500' :
                  analysisResult.severity === 'HIGH' ? 'text-orange-500' :
                  analysisResult.severity === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {analysisResult.severity}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Priority Score</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                  {analysisResult.priorityScore} / 100
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Model Confidence</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                  {analysisResult.confidence}%
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Classification</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate block">
                  {analysisResult.classification}
                </span>
              </div>
            </div>

            {/* Situation Summary */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide block">
                SITUATION SUMMARY
              </span>
              <p className="text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
                {analysisResult.situationSummary}
              </p>
            </div>

            {/* Key Findings & What Changed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Key Findings */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  KEY FINDINGS
                </span>
                <div className="space-y-1">
                  {analysisResult.keyFindings.map((kf, i) => (
                    <div key={i} className="text-slate-800 dark:text-slate-200 flex items-start gap-1.5 text-[11px]">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{kf}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What Changed */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  WHAT CHANGED
                </span>
                <div className="space-y-1">
                  {analysisResult.whatChanged.map((wc, i) => (
                    <div key={i} className="text-slate-800 dark:text-slate-200 flex items-start gap-1.5 text-[11px]">
                      <span className="text-blue-500 font-bold">•</span>
                      <span>{wc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Actions & Missing Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Recommended Next Actions */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  NEXT ACTIONS
                </span>
                <div className="space-y-1">
                  {analysisResult.recommendedNextSteps.map((ns, i) => (
                    <div key={i} className="text-emerald-950 dark:text-emerald-200 flex items-start gap-1.5 text-[11px] font-medium">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{i + 1}.</span>
                      <span>{ns}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Information */}
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg space-y-1.5">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  MISSING INFORMATION
                </span>
                <div className="space-y-1">
                  {analysisResult.missingInformation.map((mi, i) => (
                    <div key={i} className="text-amber-950 dark:text-amber-200 flex items-start gap-1.5 text-[11px]">
                      <span className="text-amber-500">•</span>
                      <span>{mi}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tactical Insights Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Resource Insight</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{analysisResult.resourceInsight}</span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Hospital Insight</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{analysisResult.hospitalInsight}</span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Route Insight</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{analysisResult.routeInsight}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RECOMMENDATIONS FEED */}
      <div className="space-y-3">
        {recommendations.map((rec: Recommendation) => {
          const currentState = decisions[rec.id] || rec.state;
          const showWhy = expandedWhy[rec.id] || false;

          return (
            <div
              key={rec.id}
              className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 flex flex-col space-y-3 shadow-xs card-no-scale"
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
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors btn-interactive ${
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
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors btn-interactive ${
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
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors btn-interactive ${
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

