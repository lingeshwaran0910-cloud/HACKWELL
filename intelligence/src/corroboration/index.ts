/**
 * SafeCity AI — Phase 5 Corroboration Detection
 *
 * Evaluates independent corroboration across distinct evidence source classes.
 * Multiple reports from the same source class do NOT count as independent corroboration.
 */

import { Evidence, EvidenceSourceType } from "../../../shared/types";
import { CorroborationResult } from "../types";

export function detectCorroboration(evidences: Evidence[]): CorroborationResult {
  if (!evidences || evidences.length === 0) {
    return {
      independentSourceCount: 0,
      level: "NONE",
      sourceTypes: [],
      explanation: "No evidence available for corroboration.",
    };
  }

  // Count distinct non-stale independent source classes
  const activeSourcesSet = new Set<EvidenceSourceType>();
  for (const ev of evidences) {
    if (!ev.stale) {
      activeSourcesSet.add(ev.sourceType);
    }
  }

  // Fallback to all sources if all are stale
  const sourcesSet = activeSourcesSet.size > 0 ? activeSourcesSet : new Set(evidences.map((e) => e.sourceType));
  const sourceTypes = Array.from(sourcesSet);
  const independentSourceCount = sourceTypes.length;

  let level: "HIGH" | "MEDIUM" | "LOW" | "NONE" = "NONE";
  if (independentSourceCount >= 3) {
    level = "HIGH";
  } else if (independentSourceCount === 2) {
    level = "MEDIUM";
  } else if (independentSourceCount === 1) {
    level = "LOW";
  }

  const explanation =
    level === "HIGH"
      ? `High corroboration: ${independentSourceCount} independent source classes (${sourceTypes.join(", ")}) confirm incident.`
      : level === "MEDIUM"
      ? `Moderate corroboration: ${independentSourceCount} independent source classes (${sourceTypes.join(", ")}) present.`
      : level === "LOW"
      ? `Single source report (${sourceTypes[0]}); independent corroboration required.`
      : "No corroboration present.";

  return {
    independentSourceCount,
    level,
    sourceTypes,
    explanation,
  };
}
