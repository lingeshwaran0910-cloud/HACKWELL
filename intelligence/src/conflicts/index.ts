/**
 * SafeCity AI — Phase 5 Conflict Detection
 *
 * Identifies contradictions between evidence sources (e.g., CCTV inactive vs Call active,
 * Traffic normal vs Citizen blockage report, GPS vs Telemetry location mismatch).
 */

import { Evidence, EvidenceSourceType, FusedFacts } from "../../../shared/types";
import { StructuredConflict } from "../types";
import { calculateDistanceMeters } from "../utils/geo";

export function detectConflicts(
  evidences: Evidence[],
  fusedFacts?: FusedFacts
): StructuredConflict[] {
  const structuredConflicts: StructuredConflict[] = [];

  if (!evidences || evidences.length <= 1) {
    return structuredConflicts;
  }

  // 1. Status & Activity Conflicts (e.g. CCTV says inactive / normal, Call/Citizen says active incident)
  const cctvReports = evidences.filter((e) => e.sourceType === "CCTV");
  const callOrCitizenReports = evidences.filter(
    (e) => e.sourceType === "EMERGENCY_CALL" || e.sourceType === "CITIZEN_REPORT"
  );

  if (cctvReports.length > 0 && callOrCitizenReports.length > 0) {
    const cctvInactive = cctvReports.some(
      (c) => c.raw.active === false || c.raw.status === "INACTIVE" || c.raw.clear === true
    );
    const callActive = callOrCitizenReports.some(
      (c) => c.raw.active !== false && c.raw.status !== "INACTIVE"
    );

    if (cctvInactive && callActive) {
      structuredConflicts.push({
        type: "STATUS_CONFLICT",
        severity: "HIGH",
        sources: ["CCTV", callOrCitizenReports[0].sourceType],
        explanation: "CCTV feed indicates normal/inactive conditions while Emergency Call or Citizen Report asserts an active incident.",
      });
    }
  }

  // 2. Traffic Flow vs Citizen Blockage Conflict
  const trafficReports = evidences.filter((e) => e.sourceType === "TRAFFIC");
  const citizenReports = evidences.filter((e) => e.sourceType === "CITIZEN_REPORT");

  if (trafficReports.length > 0 && citizenReports.length > 0) {
    const trafficNormal = trafficReports.some(
      (t) => t.normalized.congestionIndex !== null && t.normalized.congestionIndex < 0.3 && !t.normalized.roadBlocked
    );
    const citizenBlockage = citizenReports.some(
      (c) => c.normalized.roadBlocked === true || (c.normalized.narrative && c.normalized.narrative.toLowerCase().includes("blocked"))
    );

    if (trafficNormal && citizenBlockage) {
      structuredConflicts.push({
        type: "SOURCE_CONFLICT",
        severity: "MEDIUM",
        sources: ["TRAFFIC", "CITIZEN_REPORT"],
        explanation: "Traffic sensor reports normal flow (low congestion) while Citizen Report claims major road blockage.",
      });
    }
  }

  // 3. Location Distance Mismatch (> 500m discrepancy between explicit locations)
  const locatedEvidences = evidences.filter((e) => e.location !== null);
  for (let i = 0; i < locatedEvidences.length; i++) {
    for (let j = i + 1; j < locatedEvidences.length; j++) {
      const e1 = locatedEvidences[i];
      const e2 = locatedEvidences[j];
      if (e1.sourceType !== e2.sourceType && e1.location && e2.location) {
        const distMeters = calculateDistanceMeters(e1.location, e2.location);
        if (distMeters > 500) {
          structuredConflicts.push({
            type: "LOCATION_CONFLICT",
            severity: "HIGH",
            sources: [e1.sourceType, e2.sourceType],
            explanation: `Location mismatch of ${distMeters} meters between ${e1.sourceType} and ${e2.sourceType}.`,
          });
        }
      }
    }
  }

  // 4. Numeric Conflicts from fusedFacts if provided
  if (fusedFacts) {
    if (fusedFacts.victimCount === "UNKNOWN" && countNumericSources(evidences, "victimCount") > 1) {
      structuredConflicts.push({
        type: "NUMERIC_CONFLICT",
        severity: "HIGH",
        sources: collectSources(evidences, "victimCount"),
        field: "victimCount",
        explanation: "Contradictory victim counts asserted by multiple evidence sources.",
      });
    }

    if (fusedFacts.injuryCount === "UNKNOWN" && countNumericSources(evidences, "injuryCount") > 1) {
      structuredConflicts.push({
        type: "NUMERIC_CONFLICT",
        severity: "HIGH",
        sources: collectSources(evidences, "injuryCount"),
        field: "injuryCount",
        explanation: "Contradictory injury counts asserted by multiple evidence sources.",
      });
    }
  }

  return structuredConflicts;
}

function countNumericSources(evidences: Evidence[], field: "victimCount" | "injuryCount"): number {
  return evidences.filter((e) => typeof e.normalized[field] === "number").length;
}

function collectSources(evidences: Evidence[], field: "victimCount" | "injuryCount"): EvidenceSourceType[] {
  const sources = evidences
    .filter((e) => typeof e.normalized[field] === "number")
    .map((e) => e.sourceType);
  return Array.from(new Set(sources));
}
