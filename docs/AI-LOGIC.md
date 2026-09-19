# SafeCity AI — AI / Intelligence Logic

Intelligence **interprets evidence and explains**. It does **not** dispatch units or choose hospitals as a final authority.

OpenAI is **optional**. If the API key is missing, heuristic fallbacks run. The demo must work offline of OpenAI.

---

## 1. Allowed vs forbidden uses of LLMs

| Allowed | Forbidden |
| --- | --- |
| Extract type/location/narrative from a 112/108 or citizen text | Final ambulance/fire/police assignment |
| Token/embedding similarity as **one fusion feature** | Breaking numeric conflicts by “picking 5 or 2” |
| Draft operator-facing **explanation** of an already computed plan | Medical diagnosis, victim count invention |
| Summarize conflicts and unknowns | Claiming CCTV/satellite saw what they did not |
| Classify “verification required” language | Auto-ACCEPT recommendations |

If an LLM output contradicts structured telemetry, **structured data wins**.

---

## 2. Normalization

Each adapter maps vendor payloads → `NormalizedPayload` (sparse).

**Vehicle telemetry (example, evidence only):**

```
speedKmh series: 82 → 76 → 38 → 5 → 0
impactSignal: true
airbagDeployed: true
gpsStopped: true
```

Interpretation rules (deterministic):

| Pattern | Incident status hint | Note |
| --- | --- | --- |
| Harsh brake only (e.g. 82 → 40) no impact/airbag | `SUSPECTED` | “VERIFICATION REQUIRED” |
| Decel cascade + impact and/or airbag + GPS stop | Raises **collision evidence confidence**; still not proof | Fuse with calls/CCTV/traffic |
| Airbag without location | Low quality; do not geo-invent | |

**CCTV metadata:** if analytics cannot count people → `cannotDeterminePeople: true`, counts `UNKNOWN`.

**Satellite:** `hazardClass` fire/flood/smoke plume + `bbox`. Never emit a street-level `ROAD_ACCIDENT` from satellite alone.

**Citizen report:** default `confidence` 0.35–0.5 until corroborated. Not auto-true or auto-false.

**Emergency call:** higher quality (e.g. 0.75–0.9) still not ground truth for injury counts.

---

## 3. Duplicate detection and fusion

Deterministic score (weights hackathon-tunable):

```
fusionScore =
  0.35 * geoProximity          # 1 if within radius, else decay
+ 0.25 * timeProximity
+ 0.20 * typeCompatibility
+ 0.10 * textSimilarity        # Jaccard or optional embeddings
+ 0.10 * telemetryOrTrafficLink
```

If `fusionScore >= 0.72` (tunable), attach evidence to existing incident; else create new.

**Text similarity:** optional `text-embedding-3-small` cosine; fallback word Jaccard on normalized tokens. Similarity **cannot** override incompatible types (FIRE vs MEDICAL) unless geo+time extremely tight **and** operator later merges (out of scope auto).

---

## 4. Conflicts

For fields in `{ victimCount, injuryCount }`:

- Collect numeric values from evidence that actually asserted a number.
- If unique number and no contradicting `UNKNOWN` from a **higher-grade** source that said “cannot determine” — still: if **any two sources assert different numbers**, fused = `UNKNOWN`, conflict = true.
- Do not average 5 and 2.

Example:

| Source | Injury count |
| --- | --- |
| Citizen | 5 |
| Operator | 2 |
| CCTV | cannot determine |

**System:** `injuryCount = UNKNOWN`, `conflicts = [{ field: "injuryCount", resolution: "UNKNOWN_DUE_TO_CONFLICT" }]`.

---

## 5. Evidence confidence vs incident confidence

Keep two ideas separate in code and UI:

1. **Evidence.confidence** — quality/freshness of that sensor or report.
2. **Incident corroboration** — count of independent source *classes* (call, telemetry, CCTV, traffic, IoT, satellite, citizen).

Do not show a single “AI is 94% sure there are 4 victims.”

---

## 6. Observability and silent anomalies

**Observability** from currently fresh source classes (see EVENT-FLOW).

**Silent / unreported anomaly (heuristic):**

- Traffic speed collapse or telemetry cluster stop **and**
- No citizen/call incident in radius/time **and**
- Zone observability not `HIGH` (or cameras offline)

Then create or update an incident with `silentAnomaly: true`, status `SUSPECTED`, people counts `UNKNOWN`. Label: “Unreported anomaly — verification required.” Not a confirmed crash.

---

## 7. Dynamic severity (not LLM)

Inputs: type baseline, life-safety keywords from **structured** flags (firePresent, roadBlocked), response debt, observability (low observability increases **uncertainty banner**, not fake severity precision).

Severity 1–5 integer with `reasons[]`.

---

## 8. Explanation generation

After optimizer returns a plan, optional LLM prompt:

- Inputs: frozen `DispatchPlan`, `AssignmentCostBreakdown`, `reasons[]` already computed
- Output: 3–6 bullet sentences
- Constraint: may only restate provided numbers; if it adds a resource or hospital not in the plan, **discard** and use template explanation:

```
Ambulance {callSign} recommended because:
- {eta} min ETA ({routingMode})
- capabilities: {caps}
- {zone} coverage after dispatch: {status}
- Hospital {name}: capability match; predicted pressure {level} in {h} min (estimated)
```

---

## 9. Adaptive sensing (product behavior)

When observability is `LOW` or status is `SUSPECTED`, intelligence emits `system.alert` suggesting **sensing actions** (request nearby patrol, ask operator to call back, check traffic camera **if listed as existing**). Never suggest a camera id that is not in mock/zone metadata.

---

## 10. Implementation notes (Phase 2+)

- `intelligence/src/normalize.ts`
- `intelligence/src/fusion.ts`
- `intelligence/src/conflicts.ts`
- `intelligence/src/observability.ts`
- `intelligence/src/explain.ts` (template + optional OpenAI)

No network in unit tests; mock LLM client.
