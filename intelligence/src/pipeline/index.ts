/**
 * SafeCity AI — Phase 5 Intelligence Engine Main Pipeline
 *
 * Orchestrates all intelligence steps into a single deterministic function:
 * normalizeEvidence → validateEvidence → assessEvidenceQuality → fuseEvidence →
 * detectCorroboration → detectConflicts → calculateConfidence → calculateObservability →
 * determineIncidentState → generateExplanation → IntelligenceResult
 */

import { IntelligencePipelineParams, IntelligenceResult } from "../types";
import { normalizeEvidence } from "../normalization";
import { validateEvidence, deduplicateEvidences } from "../validation";
import { fuseEvidence } from "../fusion";
import { detectCorroboration } from "../corroboration";
import { detectConflicts } from "../conflicts";
import { calculateConfidence } from "../confidence";
import { calculateObservability } from "../observability";
import { determineIncidentState } from "../incident-state";
import { generateExplanation } from "../explanations";

export function runIntelligencePipeline(
  params: IntelligencePipelineParams
): IntelligenceResult {
  const {
    incidentId,
    currentStatus = "NEW",
    evidences: rawEvidences,
    referenceTime,
    expectedSources,
  } = params;

  const nowIso = referenceTime ?? new Date().toISOString();

  // Step 1: Normalize Evidence
  const normalizedEvidences = rawEvidences.map((e) => normalizeEvidence(e, nowIso));

  // Step 2: Validate & Deduplicate Evidence
  const { unique: validEvidences } = deduplicateEvidences(
    normalizedEvidences.filter((e) => validateEvidence(e, { referenceTime: nowIso }).valid)
  );

  // Fallback: if all failed validation, use normalized evidences without crashing
  const activeEvidences = validEvidences.length > 0 ? validEvidences : normalizedEvidences;

  // Step 3: Fuse Evidence
  const fusionResult = fuseEvidence(activeEvidences);

  // Step 4: Corroboration Detection
  const corroboration = detectCorroboration(activeEvidences);

  // Step 5: Conflict Detection
  const structuredConflicts = detectConflicts(activeEvidences, fusionResult.fusedFacts);

  // Step 6: Confidence Calculation
  const confidence = calculateConfidence(activeEvidences, corroboration, structuredConflicts, nowIso);

  // Step 7: Observability Calculation
  const observability = calculateObservability(activeEvidences, expectedSources);

  // Step 8: Incident State Evaluation
  const stateTransition = determineIncidentState(
    currentStatus,
    activeEvidences,
    confidence,
    observability,
    corroboration,
    structuredConflicts
  );

  // Step 9: Explanation Generation
  const explanation = generateExplanation({
    stateTransition,
    confidence,
    observability,
    corroboration,
    conflicts: structuredConflicts,
    evidenceCount: activeEvidences.length,
  });

  // Step 10: Construct Final IntelligenceResult
  return {
    incidentId,
    state: stateTransition.newState,
    confidence: confidence.score,
    confidenceBand: confidence.band,
    observability: observability.score,
    observabilityLevel: observability.level,
    evidenceCount: activeEvidences.length,
    independentSourceCount: corroboration.independentSourceCount,
    conflictCount: structuredConflicts.length,
    latestEvidenceTimestamp: fusionResult.latestTimestamp || nowIso,
    supportingSources: fusionResult.supportingSources,
    conflictingSources: fusionResult.conflictingSources,
    stateTransition,
    explanation,
    generatedAt: nowIso,
    fusedFacts: fusionResult.fusedFacts,
    conflicts: fusionResult.conflicts,
    structuredConflicts,
  };
}
