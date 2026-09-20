/**
 * SafeCity AI — Phase 5 Evidence Quality Assessment
 *
 * Deterministically computes quality metrics for an individual evidence item.
 * Evaluates source reliability, freshness decay, spatial precision, and payload completeness.
 */

import { Evidence } from "../../../shared/types";
import { EvidenceQuality } from "../types";
import { SOURCE_RELIABILITY_SCORES, SOURCE_STALE_TTL_SECONDS } from "../config/reliability";
import { calculateAgeSeconds } from "../utils/time";

export function assessEvidenceQuality(
  evidence: Evidence,
  referenceTime?: string
): EvidenceQuality {
  const reasons: string[] = [];

  // 1. Reliability Score
  const reliabilityScore = SOURCE_RELIABILITY_SCORES[evidence.sourceType] ?? 0.50;

  // 2. Freshness Decay Score (exponential decay based on stale TTL)
  const ageSeconds = calculateAgeSeconds(evidence.timestamp, referenceTime);
  const ttl = SOURCE_STALE_TTL_SECONDS[evidence.sourceType] ?? 300;
  const freshnessRatio = Math.max(0, 1 - ageSeconds / (ttl * 2));
  const freshnessScore = Math.round(Math.max(0.1, freshnessRatio) * 100) / 100;

  if (evidence.stale || ageSeconds > ttl) {
    reasons.push("STALE_EVIDENCE_PENALTY");
  }

  // 3. Location Accuracy Score
  let locationScore = 0.5; // Default when location is null
  if (evidence.location) {
    const accuracy = evidence.location.accuracyMeters;
    if (accuracy === null) {
      locationScore = 0.8;
    } else if (accuracy <= 10) {
      locationScore = 1.0;
    } else if (accuracy <= 50) {
      locationScore = 0.85;
    } else if (accuracy <= 200) {
      locationScore = 0.65;
    } else {
      locationScore = 0.40;
    }
  } else {
    reasons.push("NO_EXPLICIT_LOCATION");
  }

  // 4. Completeness Score
  let completenessScore = 0.4;
  if (evidence.normalized.narrative) completenessScore += 0.2;
  if (evidence.normalized.incidentTypeHint) completenessScore += 0.15;
  if (evidence.normalized.victimCount !== "UNKNOWN") completenessScore += 0.125;
  if (evidence.normalized.injuryCount !== "UNKNOWN") completenessScore += 0.125;
  completenessScore = Math.min(1.0, completenessScore);

  // 5. Final Composite Quality Score
  const qualityScore = Math.round(
    (reliabilityScore * 0.35 +
      freshnessScore * 0.25 +
      locationScore * 0.25 +
      completenessScore * 0.15) *
      100
  ) / 100;

  return {
    evidenceId: evidence.id,
    qualityScore,
    freshnessScore,
    reliabilityScore,
    completenessScore,
    locationScore,
    reasons,
  };
}
