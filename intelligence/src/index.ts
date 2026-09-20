/**
 * SafeCity AI — Phase 5 Intelligence Engine Public API
 *
 * Exposes all reusable intelligence engine modules, functions, and types.
 */

export * from "./types";
export * from "./config/reliability";
export * from "./utils/geo";
export * from "./utils/time";

export { normalizeEvidence } from "./normalization";
export { validateEvidence, deduplicateEvidences } from "./validation";
export { assessEvidenceQuality } from "./quality";
export { fuseEvidence } from "./fusion";
export { detectCorroboration } from "./corroboration";
export { detectConflicts } from "./conflicts";
export { calculateConfidence, getConfidenceBand } from "./confidence";
export { calculateObservability } from "./observability";
export { determineIncidentState, isValidStateTransition } from "./incident-state";
export { generateExplanation } from "./explanations";
export { runIntelligencePipeline } from "./pipeline";
