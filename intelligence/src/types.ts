/**
 * SafeCity AI — Phase 5 Intelligence Engine Types
 *
 * All types used in the intelligence engine pipeline.
 * Re-exports existing shared types to guarantee zero duplication/conflicts.
 */

import {
  EvidenceSourceType,
  IncidentStatus,
  ObservabilityLevel,
  Evidence,
  GeoPoint,
  FusedFacts,
  Conflict,
  NormalizedPayload,
  IncidentType,
} from "../../shared/types";

// Re-export shared domain types for convenience
export {
  EvidenceSourceType,
  IncidentStatus,
  ObservabilityLevel,
  Evidence,
  GeoPoint,
  FusedFacts,
  Conflict,
  NormalizedPayload,
  IncidentType,
};

export type ConfidenceBand = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export interface ValidationConfig {
  maxAgeSeconds?: number;
  requireIncidentId?: boolean;
  referenceTime?: string;
}

export interface EvidenceQuality {
  evidenceId: string;
  qualityScore: number; // 0 to 1
  freshnessScore: number; // 0 to 1
  reliabilityScore: number; // 0 to 1
  completenessScore: number; // 0 to 1
  locationScore: number; // 0 to 1
  reasons: string[];
}

export interface CorroborationResult {
  independentSourceCount: number;
  level: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  sourceTypes: EvidenceSourceType[];
  explanation: string;
}

export interface StructuredConflict {
  type: "SOURCE_CONFLICT" | "NUMERIC_CONFLICT" | "LOCATION_CONFLICT" | "STATUS_CONFLICT";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sources: EvidenceSourceType[];
  field?: string;
  explanation: string;
}

export interface StateTransitionDetail {
  previousState: IncidentStatus;
  newState: IncidentStatus;
  reason: string;
  confidence: number;
  observability: number;
  triggeringEvidenceIds: string[];
  validTransition: boolean;
}

export interface ObservabilityResult {
  score: number; // 0 to 100
  level: ObservabilityLevel;
  missingSources: EvidenceSourceType[];
  staleSources: EvidenceSourceType[];
  explanation: string;
}

export interface ConfidenceBreakdown {
  baseQuality: number;
  corroborationBonus: number;
  diversityBonus: number;
  freshnessPenalty: number;
  conflictPenalty: number;
}

export interface ConfidenceResult {
  score: number; // 0 to 100
  band: ConfidenceBand;
  breakdown: ConfidenceBreakdown;
  explanation: string;
}

export interface FusionResult {
  fusedFacts: FusedFacts;
  conflicts: Conflict[];
  structuredConflicts: StructuredConflict[];
  supportingSources: EvidenceSourceType[];
  conflictingSources: EvidenceSourceType[];
  latestTimestamp: string;
}

export interface IntelligencePipelineParams {
  incidentId: string;
  currentStatus?: IncidentStatus;
  evidences: Evidence[];
  referenceTime?: string;
  expectedSources?: EvidenceSourceType[];
  zoneBaselineObservability?: ObservabilityLevel;
}

export interface IntelligenceResult {
  incidentId: string;
  state: IncidentStatus;
  confidence: number;
  confidenceBand: ConfidenceBand;
  observability: number;
  observabilityLevel: ObservabilityLevel;
  evidenceCount: number;
  independentSourceCount: number;
  conflictCount: number;
  latestEvidenceTimestamp: string;
  supportingSources: EvidenceSourceType[];
  conflictingSources: EvidenceSourceType[];
  stateTransition: StateTransitionDetail;
  explanation: string;
  generatedAt: string;
  fusedFacts: FusedFacts;
  conflicts: Conflict[];
  structuredConflicts: StructuredConflict[];
}
