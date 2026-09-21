/**
 * SafeCity AI — Video Evidence & Scene Analysis Page.
 *
 * Full multi-model pipeline:
 *   - Accident Classification Model (jatinmehra/Accident-Detection-using-Dashcam)
 *   - Ultralytics YOLOv8 Object Detection & Tracking
 *   - Gemini Vision Semantic Analysis (when API key is present)
 *   - Evidence Fusion Layer
 *
 * Supports both Normal Scenes (no emergency) and Emergency Events for any valid video format.
 * Fully supports Light Theme & Dark Theme with top-to-bottom layout flow.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  ChevronRight,
  FileVideo,
  Zap,
  Eye,
  Activity,
  Flame,
  Truck,
  Users,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Gauge,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FusedAssessment {
  incidentDetected: 'YES' | 'POSSIBLE' | 'NO';
  incidentType: string;
  confidence: number;
  credibility: 'HIGH' | 'MEDIUM' | 'LOW';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  supportingEvidence: string[];
  responseRequirement: {
    requiresResponse: boolean;
    recommendedResponseTypes: string[];
    priority: string;
  };
}

interface SceneInfo {
  description: string;
  objects: string[];
  activities: string[];
}

interface IncidentInfo {
  title: string;
  category: string;
  severity: string;
  priority: string;
  summary: string;
}

interface VideoAnalysisResponse {
  evidence: {
    id: string;
    confidence: number;
    sourceType: string;
    timestamp: string;
  };
  video?: {
    filename: string;
    duration_seconds: number;
    frames_analyzed: number;
  };
  fusedAssessment: FusedAssessment;
  scene?: SceneInfo;
  incident?: IncidentInfo;
  modelResults?: Record<string, unknown>;
  explanation?: string;
  incidentId: string | null;
  incidentCreated: boolean;
}

type UploadState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'complete'
  | 'error';

type PipelineStage = 'upload' | 'processing' | 'scene_analysis' | 'emergency_detection' | 'evidence_fusion' | 'result';

// ── Constants & Theme-Aware Severity Styles ───────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000/api';

const getSeverityStyle = (severity: string, isDark: boolean) => {
  switch (severity) {
    case 'CRITICAL':
      return {
        bg: isDark ? 'bg-red-950/50' : 'bg-red-50',
        border: isDark ? 'border-red-600/60' : 'border-red-300',
        text: isDark ? 'text-red-400' : 'text-red-700',
        badge: 'bg-red-600 text-white',
        label: 'CRITICAL',
      };
    case 'HIGH':
      return {
        bg: isDark ? 'bg-orange-950/50' : 'bg-orange-50',
        border: isDark ? 'border-orange-600/60' : 'border-orange-300',
        text: isDark ? 'text-orange-400' : 'text-orange-700',
        badge: 'bg-orange-600 text-white',
        label: 'HIGH',
      };
    case 'MEDIUM':
      return {
        bg: isDark ? 'bg-amber-950/40' : 'bg-amber-50',
        border: isDark ? 'border-amber-600/60' : 'border-amber-300',
        text: isDark ? 'text-amber-400' : 'text-amber-700',
        badge: 'bg-amber-600 text-white',
        label: 'MEDIUM',
      };
    case 'LOW':
      return {
        bg: isDark ? 'bg-slate-900/60' : 'bg-slate-100',
        border: isDark ? 'border-slate-700' : 'border-slate-300',
        text: isDark ? 'text-slate-400' : 'text-slate-700',
        badge: 'bg-slate-600 text-white',
        label: 'LOW',
      };
    case 'NONE':
    default:
      return {
        bg: isDark ? 'bg-emerald-950/30' : 'bg-emerald-50',
        border: isDark ? 'border-emerald-700/60' : 'border-emerald-300',
        text: isDark ? 'text-emerald-400' : 'text-emerald-700',
        badge: 'bg-emerald-700 text-white',
        label: 'NONE',
      };
  }
};

const STEPPER_STAGES: { id: PipelineStage; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'processing', label: 'Processing' },
  { id: 'scene_analysis', label: 'Scene Analysis' },
  { id: 'emergency_detection', label: 'Emergency Detection' },
  { id: 'evidence_fusion', label: 'Evidence Fusion' },
  { id: 'result', label: 'Result' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export const VideoAnalysisPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<PipelineStage>('upload');
  const [result, setResult] = useState<VideoAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFusionMetrics, setShowFusionMetrics] = useState(false);
  const [showLimitsCard, setShowLimitsCard] = useState(false);
  const [humanDecision, setHumanDecision] = useState<'accepted' | 'modified' | 'rejected' | null>(null);
  const [modifyNotes, setModifyNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [serviceHealth, setServiceHealth] = useState<{ online: boolean } | null>(null);

  // ── Health Check (Background Silently) ──────────────────────────────────────

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/evidence/video/health`);
      if (res.ok) {
        const data = await res.json();
        setServiceHealth({ online: data.online });
      } else {
        setServiceHealth({ online: false });
      }
    } catch {
      setServiceHealth({ online: false });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 10000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  // ── File Handling ────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    const validExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setError(`Unsupported video format. Allowed formats: MP4, MOV, AVI, WebM, MKV.`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds maximum allowed 50 MB limit.');
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setHumanDecision(null);
    setModifyNotes('');
    setIsEditingNotes(false);
    setUploadState('idle');
    setCurrentStage('upload');
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

  // ── Upload & Pipeline Execution ─────────────────────────────────────────────

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setCurrentStage('processing');
    setUploadProgress(10);
    setError(null);
    setResult(null);
    setHumanDecision(null);

    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => {
          if (p < 30) {
            setCurrentStage('processing');
            return p + 10;
          } else if (p < 60) {
            setCurrentStage('scene_analysis');
            return p + 10;
          } else if (p < 85) {
            setCurrentStage('emergency_detection');
            return p + 5;
          } else {
            setCurrentStage('evidence_fusion');
            return 90;
          }
        });
      }, 450);

      setUploadState('processing');

      const token = localStorage.getItem('hackwell_token') || sessionStorage.getItem('hackwell_token') || '';
      const response = await fetch(`${API_BASE}/v1/evidence/video`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(body.error || `Analysis request failed with status ${response.status}`);
      }

      const body = await response.json();
      if (body.success && body.data) {
        setResult(body.data as VideoAnalysisResponse);
        setUploadState('complete');
        setCurrentStage('result');
        // Scroll down cleanly to results
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        throw new Error('Unexpected response structure received from server');
      }
    } catch (err: unknown) {
      let msg = (err as Error).message ?? 'Video analysis failed';
      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('failed to fetch')) {
        msg = 'Unable to connect to the backend server (http://localhost:4000). Please ensure the backend process is running.';
      }
      setCurrentStage('upload');
      setUploadState('error');
      setError(msg);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setHumanDecision(null);
    setModifyNotes('');
    setIsEditingNotes(false);
    setUploadState('idle');
    setCurrentStage('upload');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Helper to determine stepper stage index ──────────────────────────────

  const getStageIndex = (stage: PipelineStage): number => {
    return STEPPER_STAGES.findIndex((s) => s.id === stage);
  };

  const activeStageIndex = getStageIndex(currentStage);

  // ── Dynamic Theme Classnames ──

  const containerBg = isDark ? 'bg-[#060c1a] text-slate-200' : 'bg-slate-50 text-slate-800';
  const cardBg = isDark ? 'bg-[#0a1226] border-slate-800/80' : 'bg-white border-slate-200 shadow-sm';
  const titleText = isDark ? 'text-white' : 'text-slate-900';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${containerBg} p-4 md:p-6 font-sans transition-colors duration-200`}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className={`${cardBg} border rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 transition-colors`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
              <Video className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${titleText}`}>
                Video Analysis
              </h1>
              <p className={`text-xs ${subText} mt-0.5`}>
                Analyze CCTV and uploaded video evidence for emergency events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono ${
              isDark ? 'bg-blue-950/50 border border-blue-800/40 text-blue-300' : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Multi-Model AI Pipeline</span>
            </div>
            {serviceHealth?.online && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono ${
                isDark ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>AI Engine Ready</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stepper Component ── */}
        <div className={`${cardBg} border rounded-2xl p-4 transition-colors`}>
          <div className="flex items-center justify-between overflow-x-auto gap-2">
            {STEPPER_STAGES.map((stage, idx) => {
              const isActive = currentStage === stage.id;
              const isCompleted = activeStageIndex > idx || currentStage === 'result';
              return (
                <React.Fragment key={stage.id}>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={`text-xs font-medium ${
                      isActive
                        ? 'text-blue-500 font-semibold'
                        : isCompleted
                        ? isDark ? 'text-slate-300' : 'text-slate-700'
                        : isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                  {idx < STEPPER_STAGES.length - 1 && (
                    <ChevronRight className={`w-4 h-4 shrink-0 ${
                      isCompleted ? 'text-emerald-500/80' : isDark ? 'text-slate-800' : 'text-slate-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── 1. Upload Card (Top Section - Always Clean) ── */}
        <div className={`${cardBg} border rounded-2xl p-6 space-y-5 transition-colors`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Upload Video Evidence</span>
            </div>
            <span className={`text-[11px] font-mono px-3 py-1 rounded-lg border ${
              isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              MP4, MOV, AVI, MKV, WEBM (Max 50 MB)
            </span>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragOver
                ? isDark ? 'border-blue-500 bg-blue-950/20 scale-[0.99]' : 'border-blue-500 bg-blue-50 scale-[0.99]'
                : selectedFile
                ? isDark ? 'border-emerald-600/60 bg-emerald-950/10' : 'border-emerald-500 bg-emerald-50/70'
                : isDark
                ? 'border-slate-800 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50'
                : 'border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/30'
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
              <div className="space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                  isDark ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                }`}>
                  <FileVideo className="w-6 h-6" />
                </div>
                <div>
                  <p className={`font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{selectedFile.name}</p>
                  <p className={`text-xs mt-0.5 font-mono ${subText}`}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change video
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); resetForm(); }}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                  }`}
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <Upload className="w-6 h-6" />
                </div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  Drop video file here or click to browse
                </p>
                <p className={`text-xs ${subText}`}>Supports CCTV & Dashcam footage in standard video formats</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-xs ${
              isDark ? 'bg-red-950/40 border-red-800/50 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <XCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload & Pipeline Progress Bar */}
          {(uploadState === 'uploading' || uploadState === 'processing') && (
            <div className="space-y-2 pt-1">
              <div className={`flex items-center justify-between text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  Executing AI Analysis ({STEPPER_STAGES.find(s => s.id === currentStage)?.label})...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleUploadAndAnalyze}
              disabled={!selectedFile || uploadState === 'uploading' || uploadState === 'processing'}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {uploadState === 'processing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing AI Pipeline...</>
              ) : (
                <><Zap className="w-4 h-4" /> Analyze Video</>
              )}
            </button>
            {selectedFile && uploadState !== 'uploading' && uploadState !== 'processing' && (
              <button
                onClick={resetForm}
                className={`px-4 py-3 font-medium text-sm rounded-xl transition-colors border ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                }`}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── 2. Results View (Flows Cleanly Downwards BELOW the Upload Section) ── */}
        {result && (
          <div ref={resultsRef} className="space-y-6 pt-2 animate-fadeIn">

            {/* Results Header Bar */}
            <div className={`${cardBg} border rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 transition-colors`}>
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <FileVideo className="w-4 h-4 text-blue-500" />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                  Analysis Result for: <strong className={titleText}>{result.video?.filename || selectedFile?.name || 'Uploaded Video'}</strong>
                </span>
              </div>
              <button
                onClick={resetForm}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors border flex items-center gap-1.5 ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Analyze Another Video
              </button>
            </div>

            {/* Primary Overview Hero Card */}
            {(() => {
              const statusKey = result.fusedAssessment.incidentDetected;
              const isEmergency = statusKey === 'YES' || statusKey === 'POSSIBLE';
              const sevKey = result.fusedAssessment.severity || 'NONE';
              const sev = getSeverityStyle(sevKey, isDark);

              return (
                <div className={`rounded-2xl border p-6 space-y-4 transition-colors ${
                  isEmergency
                    ? isDark ? 'border-red-600/50 bg-red-950/20' : 'border-red-300 bg-red-50/90 text-red-950'
                    : isDark ? 'border-emerald-600/50 bg-emerald-950/20' : 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3 rounded-2xl border ${
                        isEmergency
                          ? isDark ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-red-100 border-red-300 text-red-700'
                          : isDark ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      }`}>
                        {isEmergency ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className={`text-lg font-bold tracking-tight ${
                          isEmergency ? isDark ? 'text-red-400' : 'text-red-700' : isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}>
                          {isEmergency ? 'EMERGENCY DETECTED' : 'NORMAL SCENE'}
                        </div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {isEmergency
                            ? `Category: ${result.fusedAssessment.incidentType.replace('_', ' ').toUpperCase()}`
                            : 'No emergency detected in footage'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Confidence Gauge */}
                      <div className={`${cardBg} border px-4 py-2 rounded-xl text-center shadow-xs transition-colors`}>
                        <span className={`text-xl font-bold font-mono block ${titleText}`}>
                          {Math.round(result.fusedAssessment.confidence * 100)}%
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider block ${subText}`}>Confidence</span>
                      </div>

                      {/* Severity Badge */}
                      <span className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide shadow-xs ${sev.badge}`}>
                        {sev.label} SEVERITY
                      </span>

                      {/* Credibility */}
                      <div className={`${cardBg} border px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        Credibility: <span className={`font-bold ${titleText}`}>{result.fusedAssessment.credibility}</span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className={`h-2 rounded-full overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        !isEmergency ? 'bg-emerald-500' :
                        result.fusedAssessment.severity === 'CRITICAL' ? 'bg-red-600' :
                        result.fusedAssessment.severity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.max(10, Math.round(result.fusedAssessment.confidence * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Two-Column Results Grid */}
            <div className="grid md:grid-cols-2 gap-6">

              {/* Left Column: Scene Observations & Visual Objects */}
              <div className="space-y-6">
                {result.scene && (
                  <div className={`${cardBg} border rounded-2xl p-5 space-y-4 transition-colors`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <Eye className="w-4 h-4 text-cyan-500" />
                      Scene Observations
                    </h3>

                    <p className={`text-xs leading-relaxed p-3.5 rounded-xl border ${
                      isDark ? 'bg-slate-900/60 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {result.scene.description}
                    </p>

                    <div className="space-y-3 pt-1">
                      {/* Detected Objects */}
                      <div className="space-y-1.5">
                        <span className={`text-[11px] font-medium flex items-center gap-1.5 ${subText}`}>
                          <Users className="w-3.5 h-3.5 text-cyan-500" /> Objects Detected ({result.scene.objects.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.scene.objects.length > 0 ? (
                            result.scene.objects.map((obj, i) => (
                              <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                                isDark ? 'bg-cyan-950/40 border-cyan-800/40 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                              }`}>
                                {obj}
                              </span>
                            ))
                          ) : (
                            <span className={`text-xs italic ${subText}`}>No specific objects classified</span>
                          )}
                        </div>
                      </div>

                      {/* Movement / Activities */}
                      <div className="space-y-1.5">
                        <span className={`text-[11px] font-medium flex items-center gap-1.5 ${subText}`}>
                          <Activity className="w-3.5 h-3.5 text-purple-500" /> Activity / Movement:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.scene.activities.length > 0 ? (
                            result.scene.activities.map((act, i) => (
                              <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                                isDark ? 'bg-purple-950/40 border-purple-800/40 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-800'
                              }`}>
                                {act}
                              </span>
                            ))
                          ) : (
                            <span className={`text-xs italic ${subText}`}>Normal movement flow</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Supporting Evidence & Response */}
              <div className="space-y-6">
                <div className={`${cardBg} border rounded-2xl p-5 space-y-3 transition-colors`}>
                  <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Supporting Evidence ({result.fusedAssessment.supportingEvidence.length})
                  </h3>

                  {result.fusedAssessment.supportingEvidence.length > 0 ? (
                    <ul className="space-y-2">
                      {result.fusedAssessment.supportingEvidence.map((ev, i) => (
                        <li key={i} className={`text-xs flex items-start gap-2 p-2.5 rounded-xl border ${
                          isDark ? 'bg-slate-900/40 text-slate-300 border-slate-800/40' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          <span className="text-emerald-500 shrink-0 mt-0.5">•</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-xs italic ${subText}`}>No specific evidence points extracted</p>
                  )}
                </div>

                {/* Recommended Response */}
                {result.fusedAssessment.responseRequirement.requiresResponse && (
                  <div className={`${cardBg} border rounded-2xl p-5 space-y-3 transition-colors ${
                    isDark ? 'border-amber-800/40' : 'border-amber-300 bg-amber-50/40'
                  }`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                      isDark ? 'text-amber-300' : 'text-amber-800'
                    }`}>
                      <Truck className="w-4 h-4 text-amber-500" />
                      Recommended Emergency Response
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.fusedAssessment.responseRequirement.recommendedResponseTypes.map((type) => (
                        <span key={type} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                          isDark ? 'bg-amber-950/60 border-amber-700/40 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-900'
                        }`}>
                          {type === 'AMBULANCE' && <Users className="w-3 h-3" />}
                          {type === 'FIRE_RESCUE' && <Flame className="w-3 h-3" />}
                          {type === 'POLICE_TRAFFIC' && <ShieldAlert className="w-3 h-3" />}
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Human-in-the-Loop Decision Card */}
            <div className={`${cardBg} border rounded-2xl p-5 space-y-4 transition-colors ${
              isDark ? 'border-blue-900/40' : 'border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                  isDark ? 'text-blue-300' : 'text-blue-800'
                }`}>
                  <ShieldAlert className="w-4 h-4 text-blue-500" />
                  Operator Decision & Action
                </h3>
                <span className={`text-[11px] font-mono ${subText}`}>
                  Human Verification Control
                </span>
              </div>

              {humanDecision && !isEditingNotes ? (
                <div className={`flex items-center justify-between p-3.5 rounded-xl border ${
                  humanDecision === 'accepted'
                    ? isDark ? 'bg-emerald-950/50 border-emerald-700/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : humanDecision === 'modified'
                    ? isDark ? 'bg-amber-950/50 border-amber-700/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
                    : isDark ? 'bg-red-950/50 border-red-700/40 text-red-300' : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {humanDecision === 'accepted' && <><ThumbsUp className="w-4 h-4" /> Assessment Accepted — Dispatch authorized.</>}
                    {humanDecision === 'modified' && <><Edit3 className="w-4 h-4" /> Assessment Modified — Notes: "{modifyNotes || 'Operator override'}"</>}
                    {humanDecision === 'rejected' && <><ThumbsDown className="w-4 h-4" /> Assessment Rejected — Marked as false alarm.</>}
                  </div>
                  <button
                    onClick={() => { setHumanDecision(null); setIsEditingNotes(false); }}
                    className="text-[11px] underline font-medium hover:opacity-80"
                  >
                    Change Decision
                  </button>
                </div>
              ) : isEditingNotes ? (
                <div className={`space-y-3 p-4 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="text-xs font-semibold text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Operator Modification Notes:
                  </label>
                  <textarea
                    value={modifyNotes}
                    onChange={(e) => setModifyNotes(e.target.value)}
                    placeholder="Enter assessment changes or override notes..."
                    className={`w-full rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500 min-h-[60px] border ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditingNotes(false)}
                      className={`px-3 py-1.5 text-xs rounded-lg ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { setHumanDecision('modified'); setIsEditingNotes(false); }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-xs text-white font-semibold rounded-lg"
                    >
                      Save Modification
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setHumanDecision('accepted')}
                    className="flex-1 min-w-[140px] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ThumbsUp className="w-4 h-4" /> Accept Assessment
                  </button>
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="flex-1 min-w-[140px] py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Edit3 className="w-4 h-4" /> Modify
                  </button>
                  <button
                    onClick={() => setHumanDecision('rejected')}
                    className="flex-1 min-w-[140px] py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ThumbsDown className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>

            {/* Analysis Diagnostics Summary */}
            <div className={`${cardBg} border rounded-2xl p-5 space-y-3 transition-colors`}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Info className="w-4 h-4 text-blue-500" />
                Technical Diagnostics
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] block uppercase ${subText}`}>Video Duration</span>
                  <span className={`text-xs font-bold font-mono ${titleText}`}>
                    {result.video?.duration_seconds ? `${result.video.duration_seconds.toFixed(1)}s` : 'N/A'}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] block uppercase ${subText}`}>Frames Analyzed</span>
                  <span className={`text-xs font-bold font-mono ${titleText}`}>
                    {result.video?.frames_analyzed || 16} frames
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] block uppercase ${subText}`}>Models Used</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                    Accident + YOLOv8 + Gemini
                  </span>
                </div>

                <div className={`p-3 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[10px] block uppercase ${subText}`}>Processing Status</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    Completed
                  </span>
                </div>
              </div>
            </div>

            {/* Intermediate Fusion Metrics Accordion */}
            <div className={`${cardBg} border rounded-2xl transition-colors`}>
              <button
                onClick={() => setShowFusionMetrics((v) => !v)}
                className={`w-full flex items-center justify-between p-4 text-xs transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  View Intermediate Fusion Metrics & Raw Payload
                </span>
                {showFusionMetrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showFusionMetrics && (
                <div className="px-4 pb-4">
                  <pre className={`text-[11px] rounded-xl p-3.5 overflow-x-auto font-mono max-h-72 border ${
                    isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {JSON.stringify(
                      {
                        fusedAssessment: result.fusedAssessment,
                        modelResults: result.modelResults,
                        scene: result.scene,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── 3. System Limits Collapsible Accordion (Bottom) ── */}
        <div className={`${cardBg} border rounded-2xl transition-colors`}>
          <button
            onClick={() => setShowLimitsCard((v) => !v)}
            className={`w-full flex items-center justify-between p-4 text-xs font-semibold transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-500" />
              Usage & System Limits Information
            </span>
            {showLimitsCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLimitsCard && (
            <div className={`px-5 pb-5 space-y-3 pt-1 border-t ${
              isDark ? 'border-slate-800/60' : 'border-slate-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-semibold block ${titleText}`}>Video Analysis Limit</span>
                  <p className={`text-[11px] ${subText}`}>No application-level analysis time limit configured.</p>
                </div>
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-semibold block ${titleText}`}>Upload File Size</span>
                  <p className={`text-[11px] ${subText}`}>Max 50 MB per video upload configured in Multer middleware.</p>
                </div>
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-semibold block ${titleText}`}>Pipeline Timeout</span>
                  <p className={`text-[11px] ${subText}`}>Backend HTTP proxy timeout set to 120 seconds.</p>
                </div>
                <div className={`p-3 rounded-xl border space-y-1 ${
                  isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-semibold block ${titleText}`}>External AI (Gemini)</span>
                  <p className={`text-[11px] ${subText}`}>Subject to Google Cloud Gemini rate limits with automatic local model fallback.</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default VideoAnalysisPage;
