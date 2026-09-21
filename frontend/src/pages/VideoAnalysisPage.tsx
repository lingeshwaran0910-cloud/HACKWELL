/**
 * HACKWELL Video Evidence Analysis Page — Phase 7.
 *
 * Full workflow:
 *   1. User drops/selects a video file
 *   2. Frontend uploads to POST /api/v1/evidence/video
 *   3. Backend proxies to Python intelligence pipeline
 *   4. Results displayed: confidence, severity, supporting evidence, conflicts,
 *      response recommendation, incident created status
 *   5. Human-in-the-loop: Accept / Reject the auto-created incident
 *
 * GEMINI_API_KEY never touches the frontend — all AI calls are server-side only.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Video,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  FileVideo,
  Zap,
  Eye,
  Activity,
  MapPin,
  Flame,
  Truck,
  Users,
  Clock,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ResponseRequirement {
  requiresResponse: boolean;
  recommendedResponseTypes: string[];
  urgencyLevel: string;
  responseNotes: string[];
}

interface FusedAssessment {
  incidentDetected: 'YES' | 'NO' | 'POSSIBLE';
  incidentType: string;
  confidence: number;
  modelScore: number;
  credibility: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suspectedEventTimeSec: number | null;
  supportingEvidence: string[];
  conflictingEvidence: string[];
  uncertainties: string[];
  responseRequirement: ResponseRequirement;
  fusionMetrics: Record<string, unknown>;
}

interface VideoAnalysisResponse {
  evidence: {
    id: string;
    confidence: number;
    sourceType: string;
    timestamp: string;
  };
  fusedAssessment: FusedAssessment;
  incidentId: string | null;
  incidentCreated: boolean;
}

type UploadState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error'
  | 'service_offline';

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000/api';

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-red-950/60',
    border: 'border-red-600/60',
    text: 'text-red-400',
    badge: 'bg-red-600 text-white',
    label: 'CRITICAL',
  },
  HIGH: {
    bg: 'bg-orange-950/60',
    border: 'border-orange-600/60',
    text: 'text-orange-400',
    badge: 'bg-orange-600 text-white',
    label: 'HIGH',
  },
  MEDIUM: {
    bg: 'bg-yellow-950/40',
    border: 'border-yellow-600/60',
    text: 'text-yellow-400',
    badge: 'bg-yellow-600 text-white',
    label: 'MEDIUM',
  },
  LOW: {
    bg: 'bg-slate-900/60',
    border: 'border-slate-700',
    text: 'text-slate-400',
    badge: 'bg-slate-600 text-white',
    label: 'LOW',
  },
};

const DETECTION_CONFIG = {
  YES: {
    icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
    label: 'INCIDENT DETECTED',
    color: 'text-red-400',
    ring: 'ring-red-600/40',
  },
  POSSIBLE: {
    icon: <ShieldAlert className="w-5 h-5 text-yellow-400" />,
    label: 'POSSIBLE INCIDENT',
    color: 'text-yellow-400',
    ring: 'ring-yellow-600/40',
  },
  NO: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    label: 'NO INCIDENT',
    color: 'text-emerald-400',
    ring: 'ring-emerald-600/40',
  },
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const VideoAnalysisPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<VideoAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFusionMetrics, setShowFusionMetrics] = useState(false);
  const [humanDecision, setHumanDecision] = useState<'accepted' | 'rejected' | null>(null);

  // ── File Handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    const validExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setError(`Unsupported format: ${file.type || ext}. Please upload MP4, MOV, AVI, WebM, or MKV.`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum allowed size is 50 MB.');
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setHumanDecision(null);
    setUploadState('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── Upload & Pipeline ────────────────────────────────────────────────────────

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setUploadProgress(0);
    setError(null);
    setResult(null);
    setHumanDecision(null);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      // Simulate upload progress (real XHR would use upload.onprogress)
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 90));
      }, 300);

      setUploadState('processing');

      const token = localStorage.getItem('hackwell_token') || sessionStorage.getItem('hackwell_token') || '';
      const response = await fetch(`${API_BASE}/v1/evidence/video`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.status === 503) {
        setUploadState('service_offline');
        const body = await response.json();
        setError(body.error || 'Python intelligence service is offline.');
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(body.error || `Server error ${response.status}`);
      }

      const body = await response.json();
      if (body.success && body.data) {
        setResult(body.data as VideoAnalysisResponse);
        setUploadState('complete');
      } else {
        throw new Error('Unexpected response format from server');
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? 'Upload failed';
      if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
        setUploadState('service_offline');
        setError('Cannot connect to backend server. Is it running on port 4000?');
      } else {
        setUploadState('error');
        setError(msg);
      }
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setHumanDecision(null);
    setUploadState('idle');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#070e20] text-slate-200 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/80 border border-blue-600/40 rounded-xl">
            <Video className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans tracking-tight">
              Video Evidence Analysis
            </h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Upload dashcam or CCTV footage · Accident Model + YOLO + Gemini + Fusion Pipeline
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/50 border border-blue-700/40 rounded-full text-[11px] font-mono text-blue-300">
            <Zap className="w-3 h-3" />
            Human-in-the-Loop Required
          </div>
        </div>

        {/* ── Upload Panel ── */}
        {!result && (
          <div className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-400" />
              Upload Video for Analysis
            </h2>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-blue-500 bg-blue-950/30'
                  : selectedFile
                  ? 'border-emerald-700/60 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska,.mp4,.mov,.avi,.webm,.mkv"
                onChange={handleInputChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileVideo className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-emerald-400 font-semibold text-sm">{selectedFile.name}</p>
                  <p className="text-slate-400 text-xs">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · Click to change
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Video className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-slate-300 text-sm font-medium">Drop video file here or click to browse</p>
                  <p className="text-slate-500 text-xs">MP4, MOV, AVI, WebM, MKV · Max 50 MB</p>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-950/50 border border-red-700/50 rounded-lg text-red-300 text-xs">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Service Offline Banner */}
            {uploadState === 'service_offline' && (
              <div className="p-3 bg-amber-950/50 border border-amber-700/50 rounded-lg text-amber-300 text-xs space-y-1">
                <p className="font-semibold">Intelligence Service Offline</p>
                <p className="font-mono">Start it: <code className="bg-amber-900/60 px-1.5 py-0.5 rounded">cd intelligence && python main_service.py</code></p>
              </div>
            )}

            {/* Upload Progress */}
            {(uploadState === 'uploading' || uploadState === 'processing') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    {uploadState === 'uploading' ? 'Uploading video...' : 'Running AI pipeline — this may take 30–90s...'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadState === 'processing' && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    Accident Model → YOLO Object Detection → Gemini Vision → Evidence Fusion...
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleUploadAndAnalyze}
                disabled={!selectedFile || uploadState === 'uploading' || uploadState === 'processing'}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {uploadState === 'processing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Analyze Video</>
                )}
              </button>
              {selectedFile && uploadState !== 'uploading' && uploadState !== 'processing' && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm rounded-xl transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Analysis Results ── */}
        {result && (
          <div className="space-y-4">

            {/* Reset button */}
            <div className="flex justify-end">
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" /> Analyze Another Video
              </button>
            </div>

            {/* ── Primary Detection Card ── */}
            {(() => {
              const det = DETECTION_CONFIG[result.fusedAssessment.incidentDetected];
              const sev = SEVERITY_CONFIG[result.fusedAssessment.severity];
              return (
                <div className={`rounded-2xl border ${sev.border} ${sev.bg} p-6 ring-1 ${det.ring}`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2.5 bg-slate-900/80 rounded-xl shrink-0">{det.icon}</div>
                      <div>
                        <div className={`text-lg font-bold font-sans ${det.color}`}>{det.label}</div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {result.fusedAssessment.incidentType.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                      {/* Confidence */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white font-mono">
                          {Math.round(result.fusedAssessment.confidence * 100)}%
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</div>
                      </div>

                      {/* Severity Badge */}
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${sev.badge}`}>
                        {sev.label}
                      </span>

                      {/* Credibility */}
                      <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                        result.fusedAssessment.credibility === 'HIGH'
                          ? 'border-emerald-700/60 text-emerald-400 bg-emerald-950/40'
                          : result.fusedAssessment.credibility === 'MEDIUM'
                          ? 'border-yellow-700/60 text-yellow-400 bg-yellow-950/40'
                          : 'border-red-700/60 text-red-400 bg-red-950/40'
                      }`}>
                        {result.fusedAssessment.credibility} Credibility
                      </div>

                      {/* Evidence Quality */}
                      <div className="text-xs text-slate-400">
                        Evidence: <span className="text-slate-200 font-medium">{result.fusedAssessment.evidenceQuality}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric Bar */}
                  <div className="mt-4 h-1.5 bg-slate-900/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.fusedAssessment.severity === 'CRITICAL' ? 'bg-red-500' :
                        result.fusedAssessment.severity === 'HIGH' ? 'bg-orange-500' :
                        result.fusedAssessment.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.round(result.fusedAssessment.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  icon: <Activity className="w-4 h-4 text-blue-400" />,
                  label: 'Model Score',
                  value: `${Math.round(result.fusedAssessment.modelScore * 100)}%`,
                },
                {
                  icon: <Clock className="w-4 h-4 text-purple-400" />,
                  label: 'Event Time',
                  value: result.fusedAssessment.suspectedEventTimeSec != null
                    ? `${result.fusedAssessment.suspectedEventTimeSec.toFixed(1)}s`
                    : '—',
                },
                {
                  icon: <Eye className="w-4 h-4 text-cyan-400" />,
                  label: 'Response Required',
                  value: result.fusedAssessment.responseRequirement.requiresResponse ? 'YES' : 'NO',
                },
                {
                  icon: <MapPin className="w-4 h-4 text-emerald-400" />,
                  label: 'Incident Created',
                  value: result.incidentCreated ? result.incidentId?.slice(0, 14) + '…' : 'None',
                },
              ].map((s) => (
                <div key={s.label} className="bg-[#0b1329] border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    {s.icon}
                    {s.label}
                  </div>
                  <div className="text-sm font-bold text-white font-mono">{s.value}</div>
                </div>
              ))}
            </div>

            {/* ── Response Recommendation ── */}
            {result.fusedAssessment.responseRequirement.requiresResponse && (
              <div className="bg-[#0b1329] border border-orange-700/40 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-orange-300 flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4" />
                  Recommended Response — Human Decision Required
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {result.fusedAssessment.responseRequirement.recommendedResponseTypes.map((type) => (
                    <span key={type} className="px-3 py-1.5 bg-orange-950/60 border border-orange-700/40 rounded-lg text-orange-300 text-xs font-bold flex items-center gap-1.5">
                      {type === 'AMBULANCE' && <Users className="w-3 h-3" />}
                      {type === 'FIRE_RESCUE' && <Flame className="w-3 h-3" />}
                      {type === 'POLICE_TRAFFIC' && <ShieldAlert className="w-3 h-3" />}
                      {type}
                    </span>
                  ))}
                </div>
                {result.fusedAssessment.responseRequirement.responseNotes?.length > 0 && (
                  <ul className="space-y-1">
                    {result.fusedAssessment.responseRequirement.responseNotes.map((note, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── Evidence Details ── */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Supporting */}
              {result.fusedAssessment.supportingEvidence.length > 0 && (
                <div className="bg-[#0b1329] border border-emerald-800/40 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Supporting Evidence ({result.fusedAssessment.supportingEvidence.length})
                  </h3>
                  <ul className="space-y-2">
                    {result.fusedAssessment.supportingEvidence.map((e, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">•</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conflicting + Uncertainties */}
              <div className="space-y-4">
                {result.fusedAssessment.conflictingEvidence.length > 0 && (
                  <div className="bg-[#0b1329] border border-red-800/40 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4" />
                      Conflicting Evidence
                    </h3>
                    <ul className="space-y-2">
                      {result.fusedAssessment.conflictingEvidence.map((e, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>{e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.fusedAssessment.uncertainties.length > 0 && (
                  <div className="bg-[#0b1329] border border-yellow-800/40 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4" />
                      Uncertainties
                    </h3>
                    <ul className="space-y-2">
                      {result.fusedAssessment.uncertainties.map((u, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>{u}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ── Human Decision ── */}
            {result.incidentCreated && (
              <div className="bg-[#0b1329] border border-blue-700/40 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  Human-in-the-Loop — Operator Decision
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Incident <code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">{result.incidentId}</code> was auto-created from AI evidence.
                  Your decision is required before dispatch is authorized.
                </p>
                {humanDecision ? (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    humanDecision === 'accepted'
                      ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-300'
                      : 'bg-red-950/60 border border-red-700/50 text-red-300'
                  }`}>
                    {humanDecision === 'accepted'
                      ? <><ThumbsUp className="w-4 h-4" /> Incident accepted — proceed to resource dispatch in Incidents page.</>
                      : <><ThumbsDown className="w-4 h-4" /> Incident rejected — marked for review. No dispatch authorized.</>
                    }
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setHumanDecision('accepted')}
                      className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" /> Accept Incident
                    </button>
                    <button
                      onClick={() => setHumanDecision('rejected')}
                      className="flex-1 py-2.5 bg-red-800 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Fusion Metrics (Debug) ── */}
            <div className="bg-[#0b1329] border border-slate-800/60 rounded-2xl">
              <button
                onClick={() => setShowFusionMetrics((v) => !v)}
                className="w-full flex items-center justify-between p-4 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Fusion Metrics (Debug)
                </span>
                {showFusionMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFusionMetrics && (
                <div className="px-4 pb-4">
                  <pre className="text-[11px] text-slate-400 bg-slate-900/60 rounded-lg p-3 overflow-x-auto font-mono">
                    {JSON.stringify(result.fusedAssessment.fusionMetrics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoAnalysisPage;
