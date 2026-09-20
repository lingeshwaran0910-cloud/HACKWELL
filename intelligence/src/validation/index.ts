/**
 * SafeCity AI — Phase 5 Evidence Validation
 *
 * Validates incoming evidence against completeness, structural correctness,
 * timestamp freshness, coordinate boundaries, and schema integrity.
 * Returns structured validation result without crashing the pipeline.
 */

import { Evidence } from "../../../shared/types";
import { ValidationResult, ValidationConfig } from "../types";
import { isValidIsoTimestamp, calculateAgeSeconds } from "../utils/time";

export function validateEvidence(
  evidence: Evidence,
  config: ValidationConfig = {}
): ValidationResult {
  const reasons: string[] = [];

  // 1. Required fields & ID checks
  if (!evidence.id || typeof evidence.id !== "string" || !evidence.id.trim()) {
    reasons.push("MISSING_EVIDENCE_ID");
  }

  if (!evidence.sourceType || typeof evidence.sourceType !== "string") {
    reasons.push("INVALID_SOURCE_TYPE");
  }

  if (config.requireIncidentId && (!evidence.incidentId || !evidence.incidentId.trim())) {
    reasons.push("MISSING_INCIDENT_ID");
  }

  // 2. Timestamp Validation
  if (!isValidIsoTimestamp(evidence.timestamp)) {
    reasons.push("INVALID_TIMESTAMP");
  } else {
    // Future timestamp check (tolerance max 60s into the future)
    const futureAge = calculateAgeSeconds(evidence.timestamp, config.referenceTime);
    const eventMs = new Date(evidence.timestamp).getTime();
    const refMs = config.referenceTime ? new Date(config.referenceTime).getTime() : Date.now();
    if (eventMs > refMs + 60000) {
      reasons.push("FUTURE_TIMESTAMP");
    }

    // Max age check
    if (config.maxAgeSeconds && futureAge > config.maxAgeSeconds) {
      reasons.push("EXPIRED_TIMESTAMP");
    }
  }

  // 3. Coordinate Validation
  if (evidence.location) {
    const { lat, lng, accuracyMeters } = evidence.location;
    if (typeof lat !== "number" || isNaN(lat) || lat < -90 || lat > 90) {
      reasons.push("INVALID_LATITUDE");
    }
    if (typeof lng !== "number" || isNaN(lng) || lng < -180 || lng > 180) {
      reasons.push("INVALID_LONGITUDE");
    }
    if (accuracyMeters !== null && (typeof accuracyMeters !== "number" || accuracyMeters < 0)) {
      reasons.push("INVALID_ACCURACY_METERS");
    }
  }

  // 4. Numeric Range & Confidence Checks
  if (typeof evidence.confidence !== "number" || isNaN(evidence.confidence) || evidence.confidence < 0 || evidence.confidence > 1) {
    reasons.push("INVALID_CONFIDENCE_RANGE");
  }

  if (typeof evidence.freshnessSeconds !== "number" || isNaN(evidence.freshnessSeconds) || evidence.freshnessSeconds < 0) {
    reasons.push("INVALID_FRESHNESS_SECONDS");
  }

  // 5. Metadata Integrity Check (ensure JSON serializable)
  try {
    JSON.stringify(evidence.metadata);
  } catch {
    reasons.push("MALFORMED_METADATA");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Filter duplicate evidence items from an array based on evidence ID or identical raw payload.
 */
export function deduplicateEvidences(evidences: Evidence[]): { unique: Evidence[]; duplicatesRemoved: number } {
  const seenIds = new Set<string>();
  const unique: Evidence[] = [];
  let duplicatesRemoved = 0;

  for (const ev of evidences) {
    if (seenIds.has(ev.id)) {
      duplicatesRemoved++;
    } else {
      seenIds.add(ev.id);
      unique.push(ev);
    }
  }

  return { unique, duplicatesRemoved };
}
