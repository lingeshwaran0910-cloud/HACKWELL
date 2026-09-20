import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi, ReportDocument as BackendReport } from '../services/apiService';
import {
  AlertTriangle,
  MapPin,
  Upload,
  Radio,
  FileText,
  CheckCircle2,
  X,
  Compass,
  FileCode,
  Shield,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface FileItem {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  type: string;
}

const INCIDENT_TYPES = [
  { value: 'Medical Emergency', label: 'Medical Emergency', icon: '🚑' },
  { value: 'Road Accident', label: 'Road Accident', icon: '🚗' },
  { value: 'Fire', label: 'Fire Incident', icon: '🔥' },
  { value: 'Crime', label: 'Crime / Security', icon: '👮' },
  { value: 'Public Safety', label: 'Public Safety / Hazard', icon: '⚠️' },
  { value: 'Other', label: 'Other Emergency', icon: '📍' },
];

const SEVERITY_LEVELS = [
  { level: 1, label: 'Low', desc: 'Minor issue', color: 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60' },
  { level: 2, label: 'Moderate', desc: 'Standard response', color: 'border-blue-300 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40' },
  { level: 3, label: 'High', desc: 'Priority dispatch', color: 'border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40' },
  { level: 4, label: 'Critical', desc: 'Urgent life risk', color: 'border-orange-400 dark:border-orange-700 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40' },
  { level: 5, label: 'Extreme', desc: 'Mass catastrophe', color: 'border-rose-500 dark:border-rose-700 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40' },
];

const SOURCE_TYPES = [
  '112 Emergency Call',
  'Citizen Report',
  'CCTV / Video AI',
  'IoT Sensor',
  'Traffic Feed',
  'Police Dispatch',
  'Other',
];

export const ReportEmergencyPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Form State
  const [incidentType, setIncidentType] = useState<string>('Medical Emergency');
  const [severity, setSeverity] = useState<number>(3);
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('Palpannai Junction, NH-83, Trichy');
  const [latitude, setLatitude] = useState<string>('10.7905');
  const [longitude, setLongitude] = useState<string>('78.7047');
  const [sourceType, setSourceType] = useState<string>('112 Emergency Call');
  const [confidence, setConfidence] = useState<number>(85);
  const [evidenceFiles, setEvidenceFiles] = useState<FileItem[]>([]);

  // Validation & Submission State
  const [errors, setErrors] = useState<{ description?: string; address?: string; lat?: string; lng?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [createdIncident, setCreatedIncident] = useState<BackendReport | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Helper to format file sizes cleanly
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Geolocation Handler
  const handleUseCurrentLocation = () => {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser. Using current default coordinates.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setLatitude(pos.coords.latitude.toFixed(4));
        setLongitude(pos.coords.longitude.toFixed(4));
        setLocationMessage(`Updated position (${pos.coords.latitude.toFixed(4)}°, ${pos.coords.longitude.toFixed(4)}°)`);
      },
      (err) => {
        setIsLocating(false);
        setLocationMessage(`Location access unavailable (${err.message}). Retaining coordinates.`);
      },
      { timeout: 8000 }
    );
  };

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const newItems: FileItem[] = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      name: file.name,
      sizeFormatted: formatFileSize(file.size),
      type: file.type || 'application/octet-stream',
    }));
    setEvidenceFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id: string) => {
    setEvidenceFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Form Validation & Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { description?: string; address?: string; lat?: string; lng?: string } = {};

    if (!description.trim()) {
      newErrors.description = '⚠ Description is required to evaluate response priority.';
    }

    if (!address.trim()) {
      newErrors.address = '⚠ Location / Address is required.';
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      newErrors.lat = '⚠ Valid latitude (-90 to 90) is required.';
    }

    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      newErrors.lng = '⚠ Valid longitude (-180 to 180) is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await reportsApi.create({
        type: incidentType,
        severity,
        description: description.trim(),
        address: address.trim(),
        location: { lat: latNum, lng: lngNum },
        sourceType,
        confidence: confidence / 100,
        evidenceFiles: evidenceFiles.map((f) => ({
          name: f.name,
          size: f.file.size,
          type: f.type,
        })),
      });
      setCreatedIncident(result.report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCreatedIncident(null);
    setDescription('');
    setEvidenceFiles([]);
  };

  return (
    <div className="flex-1 overflow-y-auto font-sans select-none p-2 sm:p-4 bg-slate-50/50 dark:bg-slate-950/30 min-h-0">
      <div className="max-w-6xl mx-auto space-y-4 pb-8">

        {/* PAGE HEADER */}
        <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Report Emergency
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit incident information for real-time response coordination.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SafeCity Operational Ingestion</span>
              <span className="sm:hidden">Ingestion</span>
            </span>
          </div>
        </div>

        {/* SUCCESS STATE BANNER */}
        {createdIncident ? (
          <div className="bg-white dark:bg-[#0b1329] border border-emerald-500/40 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">
                  Success Confirmation
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  ✓ Emergency report created successfully
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Incident <strong className="font-mono text-blue-600 dark:text-blue-400">{createdIncident.id}</strong> has been ingested and dispatched to the live emergency network.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Public Reference ID</span>
                <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                  PUB-{createdIncident.id.replace(/[^0-9]/g, '') || '001'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Incident Type</span>
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">{createdIncident.type}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Severity & Status</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Severity {createdIncident.severity} • {createdIncident.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target Coordinates</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {createdIncident.location.lat.toFixed(4)}° N, {createdIncident.location.lng.toFixed(4)}° E
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={handleResetForm}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Submit Another Emergency Report
              </button>

              {!isAuthenticated && (
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Officer Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* FORM FORMULATION */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Submit Error Banner */}
            {submitError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                ⚠ {submitError}
              </div>
            )}
            
            {/* MAIN TWO COLUMN DESKTOP GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              {/* LEFT COLUMN: INCIDENT DETAILS, DESCRIPTION & LOCATION */}
              <div className="lg:col-span-7 space-y-4">

                {/* SECTION 1 — INCIDENT DETAILS CARD */}
                <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Incident Details</span>
                    </h3>
                  </div>

                  {/* Incident Type Select */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Incident Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    >
                      {INCIDENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description Textarea */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                      }}
                      placeholder="Describe what is happening, including important details..."
                      className={`w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs rounded-xl border px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans leading-relaxed ${
                        errors.description ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    />
                    {errors.description && (
                      <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 mt-1">
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* SECTION 2 — LOCATION SECTION CARD */}
                <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <span>LOCATION</span>
                    </h3>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <span>📍 Use Current Location</span>
                        </>
                      )}
                    </button>
                  </div>

                  {locationMessage && (
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 font-mono">
                      {locationMessage}
                    </div>
                  )}

                  {/* Address Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Location / Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }));
                      }}
                      placeholder="Street name, landmark or junction address..."
                      className={`w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans ${
                        errors.address ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    />
                    {errors.address && (
                      <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* Lat & Lng Inputs Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="10.7905"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                      {errors.lat && <p className="text-[10px] text-rose-500">{errors.lat}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="78.7047"
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                      {errors.lng && <p className="text-[10px] text-rose-500">{errors.lng}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: SEVERITY, EVIDENCE & SOURCE */}
              <div className="lg:col-span-5 space-y-4">

                {/* SEVERITY SEGMENTED SELECTOR CARD */}
                <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2 flex items-center justify-between">
                    <label className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-500" />
                      <span>Severity Rating</span>
                    </label>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Level {severity}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {SEVERITY_LEVELS.map((sev) => {
                      const isSelected = severity === sev.level;
                      return (
                        <button
                          key={sev.level}
                          type="button"
                          onClick={() => setSeverity(sev.level)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer card-no-scale ${
                            isSelected
                              ? `${sev.color} ring-2 ring-blue-500/30 font-bold shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="font-mono text-sm font-bold">{sev.level}</div>
                          <div className="text-[10px] truncate leading-tight font-medium mt-0.5">{sev.label}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] text-slate-500 dark:text-slate-400">
                    Selected: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{SEVERITY_LEVELS.find((s) => s.level === severity)?.label}</strong> — {SEVERITY_LEVELS.find((s) => s.level === severity)?.desc}
                  </div>
                </div>

                {/* SECTION 3 — EVIDENCE / MEDIA SECTION CARD */}
                <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-purple-500" />
                      <span>Evidence</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add photos, video, or audio if available.
                    </p>
                  </div>

                  {/* Drag and Drop Box */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`p-5 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer relative ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40'
                        : 'border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-slate-100/60 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="space-y-1.5 pointer-events-none">
                      <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Upload className="w-5 h-5" />
                      </div>
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        + Add Photo / Video
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Supported: JPG, PNG, MP4, MP3
                      </p>
                    </div>
                  </div>

                  {/* Selected File Previews */}
                  {evidenceFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Attached Files ({evidenceFiles.length})
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {evidenceFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block text-[11px]">
                                  {file.name}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400">
                                  {file.sizeFormatted}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 4 — REPORTER / SOURCE INFORMATION CARD */}
                <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                  <div className="border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-indigo-500" />
                      <span>SOURCE</span>
                    </h3>
                  </div>

                  {/* Source Type Select */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Source Type
                    </label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                      {SOURCE_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Confidence Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Confidence Rating
                      </label>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {confidence}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 5 — SUBMIT AREA */}
            <div className="bg-white dark:bg-[#0b1329] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs text-center space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Emergency Report</span>
                )}
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your report will be evaluated and added to the live response network.
              </p>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default ReportEmergencyPage;
