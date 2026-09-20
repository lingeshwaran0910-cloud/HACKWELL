/**
 * SafeCity AI — Phase 5 Explainability Generator
 *
 * Generates grounded, transparent explanations for confidence, state transitions,
 * observability coverage, corroboration, and source conflicts strictly from calculated facts.
 */

import {
  StateTransitionDetail,
  ConfidenceResult,
  ObservabilityResult,
  CorroborationResult,
  StructuredConflict,
} from "../types";

export interface ExplanationInput {
  stateTransition: StateTransitionDetail;
  confidence: ConfidenceResult;
  observability: ObservabilityResult;
  corroboration: CorroborationResult;
  conflicts: StructuredConflict[];
  evidenceCount: number;
}

export function generateExplanation(input: ExplanationInput): string {
  const { stateTransition, confidence, observability, corroboration, conflicts, evidenceCount } = input;
  const lines: string[] = [];

  // 1. State Transition Explanation
  lines.push(`State: ${stateTransition.newState} (${stateTransition.reason})`);

  // 2. Corroboration & Evidence Count
  lines.push(`Corroboration: ${corroboration.level} level from ${corroboration.independentSourceCount} independent source classes across ${evidenceCount} total records.`);

  // 3. Confidence Explanation
  lines.push(`Confidence: ${confidence.score}/100 (${confidence.band}). ${confidence.explanation}`);

  // 4. Observability Explanation
  lines.push(`Observability: ${observability.score}/100 (${observability.level}). ${observability.explanation}`);

  // 5. Conflicts Explanation
  if (conflicts.length > 0) {
    const conflictSummaries = conflicts.map((c) => `[${c.type}] ${c.explanation}`).join("; ");
    lines.push(`Conflicts detected (${conflicts.length}): ${conflictSummaries}`);
  } else {
    lines.push("Conflicts: Zero source conflicts detected across ingested evidence.");
  }

  return lines.join("\n");
}
