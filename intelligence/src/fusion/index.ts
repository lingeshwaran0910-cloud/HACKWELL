/**
 * SafeCity AI — Phase 5 Evidence Fusion
 *
 * Combines multiple evidence payloads into unified FusedFacts.
 * Resolves numeric counts deterministically — if sources disagree, fused values stay UNKNOWN.
 */

import { Evidence, FusedFacts, Conflict, EvidenceSourceType } from "../../../shared/types";
import { FusionResult, StructuredConflict } from "../types";

export function fuseEvidence(evidences: Evidence[]): FusionResult {
  const supportingSourcesSet = new Set<EvidenceSourceType>();
  const conflictingSourcesSet = new Set<EvidenceSourceType>();

  const victimCounts: { source: EvidenceSourceType; value: number }[] = [];
  const injuryCounts: { source: EvidenceSourceType; value: number }[] = [];
  let roadBlockedFlag: boolean | null = null;
  let firePresentFlag: boolean | null = null;
  const notesSet = new Set<string>();

  let latestTimestamp = "";

  for (const ev of evidences) {
    supportingSourcesSet.add(ev.sourceType);

    if (!latestTimestamp || new Date(ev.timestamp).getTime() > new Date(latestTimestamp).getTime()) {
      latestTimestamp = ev.timestamp;
    }

    const { normalized } = ev;

    // Collect victim counts
    if (typeof normalized.victimCount === "number") {
      victimCounts.push({ source: ev.sourceType, value: normalized.victimCount });
    }

    // Collect injury counts
    if (typeof normalized.injuryCount === "number") {
      injuryCounts.push({ source: ev.sourceType, value: normalized.injuryCount });
    }

    // Road blocked
    if (normalized.roadBlocked !== null) {
      if (roadBlockedFlag === null) {
        roadBlockedFlag = normalized.roadBlocked;
      } else if (roadBlockedFlag !== normalized.roadBlocked) {
        conflictingSourcesSet.add(ev.sourceType);
      }
    }

    // Fire present
    if (normalized.incidentTypeHint === "FIRE" || (ev.raw && (ev.raw as Record<string, unknown>).firePresent === true)) {
      firePresentFlag = true;
    }

    // Collect narrative notes
    if (normalized.narrative && normalized.narrative.trim()) {
      notesSet.add(`[${ev.sourceType}] ${normalized.narrative.trim()}`);
    }
  }

  const conflicts: Conflict[] = [];
  const structuredConflicts: StructuredConflict[] = [];

  // Evaluate Victim Count Conflicts
  const uniqueVictimCounts = Array.from(new Set(victimCounts.map((v) => v.value)));
  let fusedVictimCount: number | "UNKNOWN" = "UNKNOWN";
  if (uniqueVictimCounts.length === 1) {
    fusedVictimCount = uniqueVictimCounts[0];
  } else if (uniqueVictimCounts.length > 1) {
    victimCounts.forEach((v) => conflictingSourcesSet.add(v.source));
    conflicts.push({
      field: "victimCount",
      values: victimCounts.map((v) => ({ sourceType: v.source, evidenceId: "", value: v.value })),
      resolution: "UNKNOWN_DUE_TO_CONFLICT",
    });
    structuredConflicts.push({
      type: "NUMERIC_CONFLICT",
      severity: "HIGH",
      sources: Array.from(new Set(victimCounts.map((v) => v.source))),
      field: "victimCount",
      explanation: `Sources disagree on victim count: ${victimCounts.map((v) => `${v.source}=${v.value}`).join(", ")}`,
    });
  }

  // Evaluate Injury Count Conflicts
  const uniqueInjuryCounts = Array.from(new Set(injuryCounts.map((i) => i.value)));
  let fusedInjuryCount: number | "UNKNOWN" = "UNKNOWN";
  if (uniqueInjuryCounts.length === 1) {
    fusedInjuryCount = uniqueInjuryCounts[0];
  } else if (uniqueInjuryCounts.length > 1) {
    injuryCounts.forEach((i) => conflictingSourcesSet.add(i.source));
    conflicts.push({
      field: "injuryCount",
      values: injuryCounts.map((i) => ({ sourceType: i.source, evidenceId: "", value: i.value })),
      resolution: "UNKNOWN_DUE_TO_CONFLICT",
    });
    structuredConflicts.push({
      type: "NUMERIC_CONFLICT",
      severity: "HIGH",
      sources: Array.from(new Set(injuryCounts.map((i) => i.source))),
      field: "injuryCount",
      explanation: `Sources disagree on injury count: ${injuryCounts.map((i) => `${i.source}=${i.value}`).join(", ")}`,
    });
  }

  const fusedFacts: FusedFacts = {
    victimCount: fusedVictimCount,
    injuryCount: fusedInjuryCount,
    roadBlocked: roadBlockedFlag !== null ? roadBlockedFlag : "UNKNOWN",
    firePresent: firePresentFlag !== null ? firePresentFlag : "UNKNOWN",
    notes: Array.from(notesSet),
  };

  return {
    fusedFacts,
    conflicts,
    structuredConflicts,
    supportingSources: Array.from(supportingSourcesSet),
    conflictingSources: Array.from(conflictingSourcesSet),
    latestTimestamp,
  };
}
