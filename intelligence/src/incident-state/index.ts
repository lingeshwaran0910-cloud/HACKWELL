/**
 * SafeCity AI — Phase 5 Incident Lifecycle & State Machine Engine
 *
 * Evaluates valid state transitions based on evidence, confidence, corroboration,
 * and conflict status without illegal state jumps.
 */

import { IncidentStatus, Evidence } from "../../../shared/types";
import {
  StateTransitionDetail,
  ConfidenceResult,
  ObservabilityResult,
  CorroborationResult,
  StructuredConflict,
} from "../types";

export function determineIncidentState(
  currentStatus: IncidentStatus = "NEW",
  evidences: Evidence[],
  confidence: ConfidenceResult,
  observability: ObservabilityResult,
  corroboration: CorroborationResult,
  conflicts: StructuredConflict[]
): StateTransitionDetail {
  const triggeringIds = evidences.map((e) => e.id);
  const conflictCount = conflicts.length;

  let targetState: IncidentStatus = currentStatus;
  let reason = "";
  let validTransition = true;

  // 1. RESOLVED status remains RESOLVED unless brand new evidence arrives
  if (currentStatus === "RESOLVED") {
    const hasFresh = evidences.some((e) => !e.stale);
    if (hasFresh && confidence.score >= 50) {
      targetState = "CORROBORATED";
      reason = "Incident reopened: new fresh corroborating evidence ingested post-resolution.";
    } else {
      return {
        previousState: "RESOLVED",
        newState: "RESOLVED",
        reason: "Incident remains resolved.",
        confidence: confidence.score,
        observability: observability.score,
        triggeringEvidenceIds: triggeringIds,
        validTransition: true,
      };
    }
  }

  // 2. ACTIVE_RESPONSE remains active unless resolved
  if (currentStatus === "ACTIVE_RESPONSE") {
    const isResolved = evidences.some((e) => e.raw && e.raw.resolved === true);
    if (isResolved) {
      targetState = "RESOLVED";
      reason = "Incident marked resolved by response team.";
    } else {
      return {
        previousState: "ACTIVE_RESPONSE",
        newState: "ACTIVE_RESPONSE",
        reason: "Active response team dispatched and engaged on-scene.",
        confidence: confidence.score,
        observability: observability.score,
        triggeringEvidenceIds: triggeringIds,
        validTransition: true,
      };
    }
  }

  // 3. Lifecycle state determination based on evidence metrics
  if (currentStatus === "NEW" || currentStatus === "SUSPECTED" || currentStatus === "CORROBORATED" || currentStatus === "VERIFIED") {
    if (evidences.length === 0) {
      targetState = "NEW";
      reason = "No evidence available.";
    } else if (corroboration.level === "HIGH" && confidence.score >= 70 && conflictCount === 0) {
      targetState = "VERIFIED";
      reason = `Multi-source high corroboration (${corroboration.independentSourceCount} sources) and confidence (${confidence.score}/100) with zero conflicts.`;
    } else if (corroboration.independentSourceCount >= 2 && confidence.score >= 50) {
      targetState = "CORROBORATED";
      reason = `${corroboration.independentSourceCount} independent source classes confirm incident with moderate confidence (${confidence.score}/100).`;
    } else if (evidences.length >= 1) {
      targetState = "SUSPECTED";
      reason = `Initial evidence ingested (${evidences[0].sourceType}); awaiting independent corroboration.`;
    }
  }

  // Validate state transitions against rules
  const transitionCheck = isValidStateTransition(currentStatus, targetState);
  if (!transitionCheck.allowed) {
    validTransition = false;
    targetState = transitionCheck.fallbackState;
    reason = transitionCheck.reason;
  }

  return {
    previousState: currentStatus,
    newState: targetState,
    reason,
    confidence: confidence.score,
    observability: observability.score,
    triggeringEvidenceIds: triggeringIds,
    validTransition,
  };
}

interface TransitionRuleResult {
  allowed: boolean;
  fallbackState: IncidentStatus;
  reason: string;
}

export function isValidStateTransition(
  fromState: IncidentStatus,
  toState: IncidentStatus
): TransitionRuleResult {
  if (fromState === toState) {
    return { allowed: true, fallbackState: toState, reason: `State remains ${toState}` };
  }

  // Direct promotion from NEW directly to VERIFIED is forbidden
  if (fromState === "NEW" && toState === "VERIFIED") {
    return {
      allowed: false,
      fallbackState: "CORROBORATED",
      reason: "Direct transition from NEW to VERIFIED is blocked; incident promoted to CORROBORATED first.",
    };
  }

  // Allowed transitions table
  const allowedMap: Record<IncidentStatus, IncidentStatus[]> = {
    NEW: ["SUSPECTED", "CORROBORATED"],
    SUSPECTED: ["CORROBORATED", "VERIFIED", "RESOLVED"],
    CORROBORATED: ["VERIFIED", "ACTIVE_RESPONSE", "RESOLVED"],
    VERIFIED: ["ACTIVE_RESPONSE", "RESOLVED"],
    ACTIVE_RESPONSE: ["RESOLVED"],
    RESOLVED: ["CORROBORATED", "SUSPECTED"],
  };

  const allowed = allowedMap[fromState]?.includes(toState) ?? false;
  if (!allowed) {
    return {
      allowed: false,
      fallbackState: fromState,
      reason: `Illegal state transition from ${fromState} to ${toState} blocked.`,
    };
  }

  return {
    allowed: true,
    fallbackState: toState,
    reason: `Transition from ${fromState} to ${toState} is valid.`,
  };
}
