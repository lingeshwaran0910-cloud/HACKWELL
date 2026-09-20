/**
 * SafeCity AI — Phase 5 Observability Engine
 *
 * Evaluates how complete and healthy evidence coverage is in a zone.
 * Crucially distinguishes LOW OBSERVABILITY from LOW CONFIDENCE.
 */

import { Evidence, EvidenceSourceType, ObservabilityLevel } from "../../../shared/types";
import { ObservabilityResult } from "../types";
import { DEFAULT_EXPECTED_SOURCES } from "../config/reliability";

export function calculateObservability(
  evidences: Evidence[],
  expectedSources: EvidenceSourceType[] = DEFAULT_EXPECTED_SOURCES
): ObservabilityResult {
  const missingSources: EvidenceSourceType[] = [];
  const staleSources: EvidenceSourceType[] = [];
  const freshPresentSources: EvidenceSourceType[] = [];

  for (const expected of expectedSources) {
    const matchingEvidences = evidences.filter((e) => e.sourceType === expected);
    if (matchingEvidences.length === 0) {
      missingSources.push(expected);
    } else {
      const hasFresh = matchingEvidences.some((e) => !e.stale);
      if (hasFresh) {
        freshPresentSources.push(expected);
      } else {
        staleSources.push(expected);
      }
    }
  }

  // Score calculation: 100 * (freshPresent / expected.length) - stale penalty
  const freshCount = freshPresentSources.length;
  const staleCount = staleSources.length;
  const totalExpected = expectedSources.length;

  let rawScore = Math.round((freshCount / totalExpected) * 100 + (staleCount / totalExpected) * 40);
  if (evidences.length === 0) rawScore = 0;

  const score = Math.max(0, Math.min(100, rawScore));

  let level: ObservabilityLevel = "LOW";
  if (score >= 75) level = "HIGH";
  else if (score >= 45) level = "PARTIAL";

  let explanation = `Observability score is ${score}/100 (${level}). `;
  if (missingSources.length > 0) {
    explanation += `Missing source feeds: ${missingSources.join(", ")}. `;
  }
  if (staleSources.length > 0) {
    explanation += `Stale source feeds: ${staleSources.join(", ")}. `;
  }
  if (level === "LOW") {
    explanation += "Low observability indicates incomplete sensor coverage; assessment is based on limited data.";
  } else if (level === "PARTIAL") {
    explanation += "Partial observability indicates moderate sensor coverage.";
  } else {
    explanation += "High observability: all key sensor feeds are active and fresh.";
  }

  return {
    score,
    level,
    missingSources,
    staleSources,
    explanation,
  };
}
