/**
 * SafeCity AI — Phase 5 Intelligence Engine Test Suite
 *
 * Comprehensive automated unit, integration, and scenario tests.
 * Validates determinism, normalization, quality, fusion, conflicts, confidence,
 * observability, state transitions, and explainability.
 */

import {
  normalizeEvidence,
  validateEvidence,
  deduplicateEvidences,
  assessEvidenceQuality,
  fuseEvidence,
  detectCorroboration,
  detectConflicts,
  calculateConfidence,
  calculateObservability,
  determineIncidentState,
  isValidStateTransition,
  generateExplanation,
  runIntelligencePipeline,
  Evidence,
  GeoPoint,
} from "../src";

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    totalPassed++;
    console.log(`  ✓ PASSED: ${testName}`);
  } else {
    totalFailed++;
    console.error(`  ✗ FAILED: ${testName}${detail ? ` (${detail})` : ""}`);
  }
}

const refTime = "2026-09-20T22:00:00.000Z";
const locA: GeoPoint = { lat: 12.9716, lng: 77.5946, accuracyMeters: 5 };
const locB: GeoPoint = { lat: 12.9800, lng: 77.6100, accuracyMeters: 10 }; // ~1.9 km away

function runNormalizationTests() {
  console.log("\n🧪 1. Normalization Tests");
  const rawCall = {
    id: "evd-001",
    sourceType: "EMERGENCY_CALL",
    timestamp: "2026-09-20T21:58:00.000Z",
    location: locA,
    incidentId: "INC-001",
    normalized: {
      narrative: "Two vehicles crashed near intersection",
      victimCount: 2,
      injuryCount: 1,
    },
  };

  const norm = normalizeEvidence(rawCall, refTime);
  assert(norm.id === "evd-001", "Preserves evidence ID");
  assert(norm.sourceType === "EMERGENCY_CALL", "Normalizes source type");
  assert(norm.confidence === 0.85, "Assigns default source reliability confidence");
  assert(norm.normalized.victimCount === 2, "Normalizes victim count");
  assert(norm.stale === false, "Freshness correctly calculated");
}

function runValidationTests() {
  console.log("\n🧪 2. Validation & Deduplication Tests");
  const validEv: Evidence = normalizeEvidence({ id: "ev-1", sourceType: "CCTV", timestamp: refTime, location: locA });
  const val1 = validateEvidence(validEv, { referenceTime: refTime });
  assert(val1.valid === true, "Valid evidence passes validation");

  const invalidEv: Evidence = {
    id: "",
    sourceType: "CITIZEN_REPORT",
    timestamp: "bad-time",
    ingestedAt: refTime,
    location: null,
    incidentId: null,
    raw: {},
    normalized: {
      incidentTypeHint: null,
      narrative: null,
      victimCount: "UNKNOWN",
      injuryCount: "UNKNOWN",
      speedKmh: null,
      speedSeriesKmh: null,
      impactSignal: null,
      airbagDeployed: null,
      rollover: null,
      gpsStopped: null,
      hazardClass: null,
      roadBlocked: null,
      congestionIndex: null,
      bbox: null,
      cannotDeterminePeople: false,
    },
    confidence: 1.5,
    freshnessSeconds: -10,
    stale: false,
    metadata: {},
  };

  const val2 = validateEvidence(invalidEv, { referenceTime: refTime });
  assert(val2.valid === false, "Invalid evidence fails validation");

  const dups = [validEv, validEv, normalizeEvidence({ id: "ev-2", sourceType: "GPS", timestamp: refTime })];
  const { unique, duplicatesRemoved } = deduplicateEvidences(dups);
  assert(unique.length === 2 && duplicatesRemoved === 1, "Deduplicates evidence correctly");
}

function runQualityTests() {
  console.log("\n🧪 3. Quality Assessment Tests");
  const ev = normalizeEvidence({
    id: "q-1",
    sourceType: "CCTV",
    timestamp: refTime,
    location: locA,
    normalized: { narrative: "Clear CCTV view", incidentTypeHint: "ROAD_ACCIDENT", victimCount: 0, injuryCount: 0 },
  }, refTime);

  const q = assessEvidenceQuality(ev, refTime);
  assert(q.reliabilityScore === 0.9, "Quality score respects source reliability");
  assert(q.qualityScore > 0.7, "High quality score for complete fresh CCTV");
}

function runFusionAndCorroborationTests() {
  console.log("\n🧪 4. Fusion & Corroboration Tests");
  const e1 = normalizeEvidence({ id: "e1", sourceType: "CITIZEN_REPORT", timestamp: refTime, normalized: { victimCount: 3 } }, refTime);
  const e2 = normalizeEvidence({ id: "e2", sourceType: "EMERGENCY_CALL", timestamp: refTime, normalized: { victimCount: 3 } }, refTime);
  const e3 = normalizeEvidence({ id: "e3", sourceType: "CCTV", timestamp: refTime, normalized: { victimCount: 3 } }, refTime);

  const fusion = fuseEvidence([e1, e2, e3]);
  assert(fusion.fusedFacts.victimCount === 3, "Fused victim count matches when sources agree");

  const corr = detectCorroboration([e1, e2, e3]);
  assert(corr.independentSourceCount === 3 && corr.level === "HIGH", "High corroboration from 3 independent sources");
}

function runConflictDetectionTests() {
  console.log("\n🧪 5. Conflict Detection Tests");

  // Numeric Conflict (5 vs 2)
  const eCall = normalizeEvidence({ id: "c1", sourceType: "EMERGENCY_CALL", timestamp: refTime, normalized: { victimCount: 5 } }, refTime);
  const eCctv = normalizeEvidence({ id: "c2", sourceType: "CCTV", timestamp: refTime, normalized: { victimCount: 2 } }, refTime);

  const fusion = fuseEvidence([eCall, eCctv]);
  assert(fusion.fusedFacts.victimCount === "UNKNOWN", "Numeric conflict sets fused count to UNKNOWN");
  assert(fusion.conflicts.length > 0, "Conflict record added");

  // Status & Location Conflict
  const eCallActive = normalizeEvidence({ id: "c3", sourceType: "EMERGENCY_CALL", timestamp: refTime, location: locA, raw: { active: true } }, refTime);
  const eCctvInactive = normalizeEvidence({ id: "c4", sourceType: "CCTV", timestamp: refTime, location: locB, raw: { active: false } }, refTime);

  const structured = detectConflicts([eCallActive, eCctvInactive], fusion.fusedFacts);
  assert(structured.some((c) => c.type === "STATUS_CONFLICT"), "Detects CCTV inactive vs Call active conflict");
  assert(structured.some((c) => c.type === "LOCATION_CONFLICT"), "Detects location mismatch distance > 500m");
}

function runConfidenceTests() {
  console.log("\n🧪 6. Confidence Engine Tests");
  const e1 = normalizeEvidence({ id: "c1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime);
  const e2 = normalizeEvidence({ id: "c2", sourceType: "CCTV", timestamp: refTime }, refTime);
  const e3 = normalizeEvidence({ id: "c3", sourceType: "VEHICLE_TELEMETRY", timestamp: refTime }, refTime);

  const corr = detectCorroboration([e1, e2, e3]);
  const conf = calculateConfidence([e1, e2, e3], corr, [], refTime);
  assert(conf.score >= 70 && conf.band === "HIGH", "High confidence score for multi-source corroboration");
}

function runObservabilityTests() {
  console.log("\n🧪 7. Observability Engine Tests");
  const e1 = normalizeEvidence({ id: "o1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime);
  const obs = calculateObservability([e1]);

  assert(obs.level === "LOW" || obs.level === "PARTIAL", "Observability level is PARTIAL or LOW when sources are missing");
  assert(obs.missingSources.includes("CCTV"), "Identifies missing CCTV feed");
  assert(obs.explanation.includes("missing") || obs.explanation.includes("incomplete"), "Grounded observability explanation generated");
}

function runStateTransitionTests() {
  console.log("\n🧪 8. Incident State Machine & Transitions");
  const t1 = isValidStateTransition("NEW", "VERIFIED");
  assert(t1.allowed === false && t1.fallbackState === "CORROBORATED", "Blocks direct transition from NEW to VERIFIED");

  const t2 = isValidStateTransition("SUSPECTED", "CORROBORATED");
  assert(t2.allowed === true, "Allows transition from SUSPECTED to CORROBORATED");

  const e1 = normalizeEvidence({ id: "s1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime);
  const e2 = normalizeEvidence({ id: "s2", sourceType: "CCTV", timestamp: refTime }, refTime);
  const e3 = normalizeEvidence({ id: "s3", sourceType: "VEHICLE_TELEMETRY", timestamp: refTime }, refTime);
  const corr = detectCorroboration([e1, e2, e3]);
  const conf = calculateConfidence([e1, e2, e3], corr, [], refTime);
  const obs = calculateObservability([e1, e2, e3]);

  const stateRes = determineIncidentState("SUSPECTED", [e1, e2, e3], conf, obs, corr, []);
  assert(stateRes.newState === "VERIFIED" || stateRes.newState === "CORROBORATED", "Evaluates state transition correctly");

  const expl = generateExplanation({
    stateTransition: stateRes,
    confidence: conf,
    observability: obs,
    corroboration: corr,
    conflicts: [],
    evidenceCount: 3,
  });
  assert(expl.includes("State:"), "Generates grounded structured explanation");
}

function runSampleScenarios() {
  console.log("\n🧪 9. Sample Scenarios (1–5)");

  // SCENARIO 1 — SINGLE REPORT
  const res1 = runIntelligencePipeline({
    incidentId: "INC-SC1",
    currentStatus: "NEW",
    evidences: [normalizeEvidence({ id: "sc1", sourceType: "CITIZEN_REPORT", timestamp: refTime }, refTime)],
    referenceTime: refTime,
  });
  assert(res1.independentSourceCount === 1, "Scenario 1: Single source count is 1");
  assert(res1.state === "SUSPECTED", "Scenario 1: State remains SUSPECTED for single report");

  // SCENARIO 2 — MULTI-SOURCE CORROBORATION
  const res2 = runIntelligencePipeline({
    incidentId: "INC-SC2",
    currentStatus: "SUSPECTED",
    evidences: [
      normalizeEvidence({ id: "sc2-1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime),
      normalizeEvidence({ id: "sc2-2", sourceType: "CCTV", timestamp: refTime }, refTime),
      normalizeEvidence({ id: "sc2-3", sourceType: "IOT_SENSOR", timestamp: refTime }, refTime),
    ],
    referenceTime: refTime,
  });
  assert(res2.independentSourceCount === 3, "Scenario 2: Multi-source count is 3");
  assert(res2.state === "VERIFIED" || res2.state === "CORROBORATED", "Scenario 2: Advances to VERIFIED or CORROBORATED");

  // SCENARIO 3 — CONFLICT
  const res3 = runIntelligencePipeline({
    incidentId: "INC-SC3",
    currentStatus: "SUSPECTED",
    evidences: [
      normalizeEvidence({ id: "sc3-1", sourceType: "CCTV", timestamp: refTime, raw: { active: false } }, refTime),
      normalizeEvidence({ id: "sc3-2", sourceType: "EMERGENCY_CALL", timestamp: refTime, raw: { active: true } }, refTime),
    ],
    referenceTime: refTime,
  });
  assert(res3.conflictCount > 0, "Scenario 3: Conflict detected between CCTV and Call");

  // SCENARIO 4 — LOW OBSERVABILITY
  const res4 = runIntelligencePipeline({
    incidentId: "INC-SC4",
    currentStatus: "NEW",
    evidences: [normalizeEvidence({ id: "sc4-1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime)],
    referenceTime: refTime,
    expectedSources: ["EMERGENCY_CALL", "CCTV", "VEHICLE_TELEMETRY", "TRAFFIC", "IOT_SENSOR"],
  });
  assert(res4.observabilityLevel === "LOW" || res4.observabilityLevel === "PARTIAL", "Scenario 4: Low/partial observability reported");
  assert(res4.explanation.includes("incomplete") || res4.explanation.includes("missing"), "Scenario 4: Explanation notes incomplete coverage rather than incident false");

  // SCENARIO 5 — 100x DETERMINISM TEST
  let identical = true;
  const firstJson = JSON.stringify(runIntelligencePipeline({
    incidentId: "INC-SC5",
    currentStatus: "NEW",
    evidences: [
      normalizeEvidence({ id: "sc5-1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime),
      normalizeEvidence({ id: "sc5-2", sourceType: "CCTV", timestamp: refTime }, refTime),
    ],
    referenceTime: refTime,
  }));

  for (let i = 0; i < 100; i++) {
    const currentJson = JSON.stringify(runIntelligencePipeline({
      incidentId: "INC-SC5",
      currentStatus: "NEW",
      evidences: [
        normalizeEvidence({ id: "sc5-1", sourceType: "EMERGENCY_CALL", timestamp: refTime }, refTime),
        normalizeEvidence({ id: "sc5-2", sourceType: "CCTV", timestamp: refTime }, refTime),
      ],
      referenceTime: refTime,
    }));
    if (currentJson !== firstJson) {
      identical = false;
      break;
    }
  }
  assert(identical, "Scenario 5: 100x repeated runs produce identical outputs");
}

function runAll() {
  console.log("==================================================");
  console.log("🚀 SafeCity AI — Phase 5 Intelligence Engine Test Suite");
  console.log("==================================================");

  runNormalizationTests();
  runValidationTests();
  runQualityTests();
  runFusionAndCorroborationTests();
  runConflictDetectionTests();
  runConfidenceTests();
  runObservabilityTests();
  runStateTransitionTests();
  runSampleScenarios();

  console.log("\n==================================================");
  console.log(`📊 Test Results: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log("==================================================");

  if (totalFailed > 0) {
    (globalThis as unknown as { process?: { exit: (code: number) => void } }).process?.exit(1);
  } else {
    (globalThis as unknown as { process?: { exit: (code: number) => void } }).process?.exit(0);
  }
}

runAll();
