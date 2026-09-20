# 🧠 SafeCity AI — Intelligence Engine (Phase 5)

## Overview
The **SafeCity AI Intelligence Engine** is a deterministic, domain-focused TypeScript engine responsible for processing raw multi-modal evidence into fused facts, conflict analysis, confidence scores, observability metrics, incident state lifecycle transitions, and grounded explanations.

---

## 🏗️ Architecture & Pipeline

```
RAW EVIDENCE
    ↓
normalizeEvidence()          [Standardizes evidence payloads & telemetry signals]
    ↓
validateEvidence()           [Validates coordinates, timestamps, confidence ranges]
    ↓
assessEvidenceQuality()      [Calculates source reliability & freshness decay]
    ↓
fuseEvidence()               [Combines facts; numeric conflicts -> UNKNOWN]
    ↓
detectCorroboration()        [Counts independent source classes]
    ↓
detectConflicts()            [Identifies source, status, location, & numeric conflicts]
    ↓
calculateConfidence()        [Deterministic confidence formula 0–100]
    ↓
calculateObservability()     [Evaluates sensor coverage health]
    ↓
determineIncidentState()     [Evaluates valid state machine transitions]
    ↓
generateExplanation()        [Grounded factual explanations]
    ↓
IntelligenceResult           [Single structured output]
```

---

## 📊 Formulations & Mathematics

### 1. Confidence Formula (0 to 100)
Confidence is computed strictly using a deterministic formula combining evidence quality, corroboration level, source diversity, freshness decay, and penalty factors:

$$\text{Confidence} = \text{clamp}\Big(0, 100, (Q \times 35) + (C \times 30) + (D \times 20) - (F \times 15) - (P \times 20)\Big)$$

Where:
- **$Q$ (Average Quality)**: Mean quality score of active evidence ($0.0 \dots 1.0$).
- **$C$ (Corroboration Level Bonus)**: `HIGH` (1.0), `MEDIUM` (0.66), `LOW` (0.33), `NONE` (0.0).
- **$D$ (Source Diversity Ratio)**: Ratio of independent source classes to target benchmark ($\min(1.0, \text{sources}/4)$).
- **$F$ (Freshness Penalty Ratio)**: Ratio of stale evidence items to total evidence.
- **$P$ (Conflict Penalty)**: Penalty based on presence of high/critical conflicts.

#### Confidence Bands:
- **`VERY_HIGH`**: $81 \dots 100$
- **`HIGH`**: $61 \dots 80$
- **`MEDIUM`**: $41 \dots 60$
- **`LOW`**: $21 \dots 40$
- **`VERY_LOW`**: $0 \dots 20$

---

### 2. Observability Engine
Distinguishes **LOW OBSERVABILITY** (incomplete/stale sensor coverage) from **LOW CONFIDENCE** (weak evidence for incident existence).

#### Observability Levels:
- **`HIGH`**: $75 \dots 100$
- **`PARTIAL`**: $45 \dots 74$
- **`LOW`**: $0 \dots 44$

---

### 3. Incident Lifecycle State Machine
Safe transitions strictly enforced without illegal state skips:

```
NEW ──→ SUSPECTED ──→ CORROBORATED ──→ VERIFIED ──→ ACTIVE_RESPONSE ──→ RESOLVED
```

- Direct promotion from `NEW` to `VERIFIED` on a single report is blocked.
- Presence of high-severity conflicts blocks promotion to `VERIFIED`.

---

## 🔌 Exported API (`/intelligence/src/index.ts`)

- `normalizeEvidence(rawInput, referenceTime?)`
- `validateEvidence(evidence, config?)`
- `assessEvidenceQuality(evidence, referenceTime?)`
- `fuseEvidence(evidences)`
- `detectCorroboration(evidences)`
- `detectConflicts(evidences, fusedFacts?)`
- `calculateConfidence(evidences, corroboration, conflicts, referenceTime?)`
- `calculateObservability(evidences, expectedSources?)`
- `determineIncidentState(currentStatus, evidences, confidence, observability, corroboration, conflicts)`
- `generateExplanation(input)`
- `runIntelligencePipeline(params)`

---

## 🧪 Testing Strategy

Run tests via:
```bash
npx ts-node tests/run-tests.ts
```

Tests cover:
- **Normalization**: Telemetry decel cascades, CCTV bounds, citizen reports.
- **Validation**: ISO timestamps, coordinate limits, deduplication.
- **Fusion & Conflicts**: 5 vs 2 numeric conflicts, CCTV inactive vs Call active.
- **Confidence & Observability**: Scores, bands, missing feed explanations.
- **State Machine**: Safe transitions, illegal jump prevention.
- **Sample Scenarios 1–5**: Single report, multi-source corroboration, conflict handling, low observability, and **100x determinism test**.
