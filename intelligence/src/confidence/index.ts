/**
 * SafeCity AI — Phase 5 Confidence Engine
 *
 * Deterministic formula computing incident confidence score (0 to 100) and mapping to bands.
 *
 * Formula:
 * Confidence = clamp(0, 100,
 *   (Average Evidence Quality * 35) +
 *   (Corroboration Level Bonus * 30) +
 *   (Source Diversity Bonus * 20) -
 *   (Stale Evidence Penalty * 15) -
 *   (Conflict Penalty * 20)
 * )
 */

import { Evidence } from "../../../shared/types";
import { ConfidenceResult, CorroborationResult, StructuredConflict, ConfidenceBand } from "../types";
import { assessEvidenceQuality } from "../quality";
import { clamp } from "../utils/geo";

export function calculateConfidence(
  evidences: Evidence[],
  corroboration: CorroborationResult,
  conflicts: StructuredConflict[],
  referenceTime?: string
): ConfidenceResult {
  if (!evidences || evidences.length === 0) {
    return {
      score: 0,
      band: "VERY_LOW",
      breakdown: {
        baseQuality: 0,
        corroborationBonus: 0,
        diversityBonus: 0,
        freshnessPenalty: 0,
        conflictPenalty: 0,
      },
      explanation: "Zero evidence present. Confidence is 0 (VERY_LOW).",
    };
  }

  // 1. Average Evidence Quality (scale 0..35)
  const qualities = evidences.map((e) => assessEvidenceQuality(e, referenceTime));
  const avgQuality = qualities.reduce((sum, q) => sum + q.qualityScore, 0) / qualities.length;
  const baseQuality = Math.round(avgQuality * 35);

  // 2. Corroboration Bonus (scale 0..30)
  let corroborationBonus = 0;
  if (corroboration.level === "HIGH") corroborationBonus = 30;
  else if (corroboration.level === "MEDIUM") corroborationBonus = 20;
  else if (corroboration.level === "LOW") corroborationBonus = 10;

  // 3. Source Diversity Bonus (scale 0..20)
  const diversityRatio = Math.min(1.0, corroboration.independentSourceCount / 4);
  const diversityBonus = Math.round(diversityRatio * 20);

  // 4. Freshness Penalty (scale 0..15)
  const staleCount = evidences.filter((e) => e.stale).length;
  const freshnessPenalty = Math.min(15, Math.round((staleCount / evidences.length) * 15));

  // 5. Conflict Penalty (scale 0..20)
  const highConflicts = conflicts.filter((c) => c.severity === "HIGH" || c.severity === "CRITICAL").length;
  const medConflicts = conflicts.filter((c) => c.severity === "MEDIUM").length;
  const conflictPenalty = Math.min(25, highConflicts * 15 + medConflicts * 8);

  // Raw combined score
  const rawScore = baseQuality + corroborationBonus + diversityBonus - freshnessPenalty - conflictPenalty;
  const score = clamp(Math.round(rawScore), 0, 100);

  const band = getConfidenceBand(score);

  const explanation =
    `Confidence score is ${score}/100 (${band}). ` +
    `Base quality: +${baseQuality}, Corroboration: +${corroborationBonus}, Diversity: +${diversityBonus}. ` +
    (freshnessPenalty > 0 ? `Stale penalty: -${freshnessPenalty}. ` : "") +
    (conflictPenalty > 0 ? `Conflict penalty: -${conflictPenalty}.` : "");

  return {
    score,
    band,
    breakdown: {
      baseQuality,
      corroborationBonus,
      diversityBonus,
      freshnessPenalty,
      conflictPenalty,
    },
    explanation,
  };
}

export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= 81) return "VERY_HIGH";
  if (score >= 61) return "HIGH";
  if (score >= 41) return "MEDIUM";
  if (score >= 21) return "LOW";
  return "VERY_LOW";
}
