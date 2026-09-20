/**
 * SafeCity AI — Phase 5 Evidence Normalization
 *
 * Converts raw or partial incoming payloads from any supported source type into
 * a standardized, validated Evidence object conforming to `shared/types.ts`.
 */

import {
  Evidence,
  EvidenceSourceType,
  NormalizedPayload,
  GeoPoint,
  IncidentType,
} from "../../../shared/types";
import { SOURCE_RELIABILITY_SCORES, SOURCE_STALE_TTL_SECONDS } from "../config/reliability";
import { calculateAgeSeconds, isValidIsoTimestamp } from "../utils/time";

export function normalizeEvidence(
  rawInput: Record<string, unknown> | Partial<Evidence>,
  referenceTime?: string
): Evidence {
  const nowIso = referenceTime ?? new Date().toISOString();

  // Extract ID
  const id = typeof rawInput.id === "string" && rawInput.id.trim()
    ? rawInput.id.trim()
    : `evd-${Math.random().toString(36).substring(2, 9)}`;

  // Extract sourceType
  const sourceType = parseSourceType(rawInput.sourceType);

  // Extract timestamps
  const timestamp = typeof rawInput.timestamp === "string" && isValidIsoTimestamp(rawInput.timestamp)
    ? rawInput.timestamp
    : nowIso;

  const ingestedAt = typeof rawInput.ingestedAt === "string" && isValidIsoTimestamp(rawInput.ingestedAt)
    ? rawInput.ingestedAt
    : nowIso;

  // Calculate freshness
  const freshnessSeconds = calculateAgeSeconds(timestamp, nowIso);
  const ttl = SOURCE_STALE_TTL_SECONDS[sourceType] ?? 300;
  const stale = typeof rawInput.stale === "boolean" ? rawInput.stale : freshnessSeconds > ttl;

  // Extract location
  const location = parseGeoPoint(rawInput.location ?? rawInput.raw);

  // Extract incidentId
  const incidentId = typeof rawInput.incidentId === "string" && rawInput.incidentId.trim()
    ? rawInput.incidentId.trim()
    : null;

  // Raw & metadata
  const raw = isRecord(rawInput.raw) ? rawInput.raw : (isRecord(rawInput) ? rawInput : {});
  const metadata = isRecord(rawInput.metadata) ? rawInput.metadata : {};

  // Extract base confidence
  const defaultConfidence = SOURCE_RELIABILITY_SCORES[sourceType] ?? 0.50;
  const providedConfidence = typeof rawInput.confidence === "number" ? rawInput.confidence : null;
  const confidence = providedConfidence !== null
    ? Math.max(0, Math.min(1, providedConfidence))
    : defaultConfidence;

  // Normalize Payload
  const normalized = parseNormalizedPayload(sourceType, rawInput.normalized, raw);

  return {
    id,
    sourceType,
    timestamp,
    ingestedAt,
    location,
    incidentId,
    raw,
    normalized,
    confidence,
    freshnessSeconds,
    stale,
    metadata,
  };
}

function parseSourceType(val: unknown): EvidenceSourceType {
  const allowed: EvidenceSourceType[] = [
    "EMERGENCY_CALL",
    "CCTV",
    "VEHICLE_TELEMETRY",
    "TRAFFIC",
    "IOT_SENSOR",
    "GPS",
    "SATELLITE",
    "CITIZEN_REPORT",
    "WEATHER",
    "HOSPITAL_FEED",
    "RESOURCE_FEED",
    "ROAD_EVENT",
  ];
  if (typeof val === "string" && allowed.includes(val as EvidenceSourceType)) {
    return val as EvidenceSourceType;
  }
  return "CITIZEN_REPORT";
}

function parseGeoPoint(val: unknown): GeoPoint | null {
  if (!isRecord(val)) return null;
  const lat = typeof val.lat === "number" ? val.lat : (typeof val.latitude === "number" ? val.latitude : null);
  const lng = typeof val.lng === "number" ? val.lng : (typeof val.longitude === "number" ? val.longitude : null);
  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const accuracyMeters = typeof val.accuracyMeters === "number" ? val.accuracyMeters : null;
  return { lat, lng, accuracyMeters };
}

function parseNormalizedPayload(
  sourceType: EvidenceSourceType,
  existingNormalized: unknown,
  raw: Record<string, unknown>
): NormalizedPayload {
  const base: Partial<NormalizedPayload> = isRecord(existingNormalized)
    ? (existingNormalized as Partial<NormalizedPayload>)
    : {};

  const narrative = typeof base.narrative === "string"
    ? base.narrative
    : (typeof raw.narrative === "string" ? raw.narrative : (typeof raw.description === "string" ? raw.description : null));

  const incidentTypeHint = parseIncidentTypeHint(base.incidentTypeHint ?? raw.incidentTypeHint ?? raw.type);

  // Victim and Injury Counts
  const victimCount = parseCount(base.victimCount ?? raw.victimCount ?? raw.victims);
  const injuryCount = parseCount(base.injuryCount ?? raw.injuryCount ?? raw.injuries);

  // Telemetry attributes
  const speedKmh = typeof base.speedKmh === "number" ? base.speedKmh : (typeof raw.speedKmh === "number" ? raw.speedKmh : null);
  const speedSeriesKmh = Array.isArray(base.speedSeriesKmh) ? base.speedSeriesKmh : (Array.isArray(raw.speedSeriesKmh) ? raw.speedSeriesKmh : null);
  const impactSignal = typeof base.impactSignal === "boolean" ? base.impactSignal : (typeof raw.impactSignal === "boolean" ? raw.impactSignal : null);
  const airbagDeployed = typeof base.airbagDeployed === "boolean" ? base.airbagDeployed : (typeof raw.airbagDeployed === "boolean" ? raw.airbagDeployed : null);
  const rollover = typeof base.rollover === "boolean" ? base.rollover : (typeof raw.rollover === "boolean" ? raw.rollover : null);
  const gpsStopped = typeof base.gpsStopped === "boolean" ? base.gpsStopped : (typeof raw.gpsStopped === "boolean" ? raw.gpsStopped : null);

  // Road & Traffic
  const hazardClass = typeof base.hazardClass === "string" ? base.hazardClass : (typeof raw.hazardClass === "string" ? raw.hazardClass : null);
  const roadBlocked = typeof base.roadBlocked === "boolean" ? base.roadBlocked : (typeof raw.roadBlocked === "boolean" ? raw.roadBlocked : null);
  const congestionIndex = typeof base.congestionIndex === "number" ? base.congestionIndex : (typeof raw.congestionIndex === "number" ? raw.congestionIndex : null);

  // Bounding box
  const bbox = parseBbox(base.bbox) ?? parseBbox(raw.bbox);

  // cannotDeterminePeople rule (CCTV / Satellite without count analytics)
  let cannotDeterminePeople = Boolean(base.cannotDeterminePeople || raw.cannotDeterminePeople);
  if (sourceType === "CCTV" || sourceType === "SATELLITE" || sourceType === "WEATHER") {
    if (victimCount === "UNKNOWN" && injuryCount === "UNKNOWN") {
      cannotDeterminePeople = true;
    }
  }

  return {
    incidentTypeHint,
    narrative,
    victimCount,
    injuryCount,
    speedKmh,
    speedSeriesKmh,
    impactSignal,
    airbagDeployed,
    rollover,
    gpsStopped,
    hazardClass,
    roadBlocked,
    congestionIndex,
    bbox,
    cannotDeterminePeople,
  };
}

function parseIncidentTypeHint(val: unknown): IncidentType | null {
  const types: IncidentType[] = ["ROAD_ACCIDENT", "FIRE", "MEDICAL", "TRAFFIC", "HAZMAT", "FLOOD", "OTHER"];
  if (typeof val === "string" && types.includes(val as IncidentType)) {
    return val as IncidentType;
  }
  return null;
}

function parseCount(val: unknown): number | "UNKNOWN" {
  if (val === "UNKNOWN" || val === null || val === undefined) return "UNKNOWN";
  if (typeof val === "number" && !isNaN(val) && val >= 0) return Math.floor(val);
  return "UNKNOWN";
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function parseBbox(val: unknown): { south: number; west: number; north: number; east: number } | null {
  if (!isRecord(val)) return null;
  const { south, west, north, east } = val;
  if (
    typeof south === "number" &&
    typeof west === "number" &&
    typeof north === "number" &&
    typeof east === "number"
  ) {
    return { south, west, north, east };
  }
  return null;
}
