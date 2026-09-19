# SafeCity AI — Event Flow

This document defines the **incident lifecycle**, **re-optimization triggers**, and **Socket.IO** contract.

---

## 1. Core lifecycle

```
NEW EVENT
    → SENSOR-ADAPTIVE INGESTION     (only adapters that exist for this zone)
    → NORMALIZATION                 (sparse NormalizedPayload; no invented fields)
    → INCIDENT FUSION               (proximity + time + type + text + telemetry/traffic)
    → DUPLICATE / CONFLICT DETECTION
    → EVIDENCE CONFIDENCE           (quality of sources, not casualty certainty)
    → INCIDENT PRIORITY             (explainable breakdown + response debt)
    → RESPONSE OPTIONS              (deterministic optimizer)
    → WHAT-IF SIMULATION            (optional; labeled simulated)
    → CITY-WIDE IMPACT / COVERAGE CHECK
    → HUMAN APPROVAL                (PROPOSED → ACCEPT | MODIFY | REJECT)
    → RESOURCE DISPATCH             (status machine on resources)
    → LIVE MONITORING
    → RE-OPTIMIZATION               (event-driven, not a timer cult)
    → RESOLVED
```

### Status mapping (typical)

| Status | Meaning |
| --- | --- |
| `NEW` | Ingested, not yet classified / fused |
| `SUSPECTED` | Weak or single ambiguous signal (e.g. harsh brake only). **Verification required.** |
| `CORROBORATED` | Independent sources agree something happened; facts may still be `UNKNOWN` |
| `VERIFIED` | Operator or high-grade call/dispatch confirmation |
| `ACTIVE_RESPONSE` | Accepted plan; resources assigned / moving |
| `RESOLVED` | Closed; retained for historical analysis |

---

## 2. Sensor-adaptive ingestion

For each evidence item:

1. Resolve zone from point or bbox.
2. Look up `typicalSourceTypes` + live adapter health.
3. If this source is **unavailable**, skip silently (do not fake CCTV).
4. Attach `observability` to the incident from **currently fresh** sources:

| Fresh independent source classes | Observability |
| --- | --- |
| Call/CAD + CCTV + traffic/GPS | `HIGH` |
| Call + telemetry or traffic, no CCTV | `PARTIAL` |
| Satellite/weather/IoT only, or single citizen ping | `LOW` |

**Never** interpret empty ingest as “all clear.”

---

## 3. Fusion and duplicates

Two evidence records fuse into one incident when **most** of these hold:

- Distance below type-specific radius (accident ~150 m urban, ~400 m highway)
- Time within window (default 15 minutes)
- Compatible `incidentTypeHint`
- Optional text similarity (LLM or token overlap) — **advisory**
- Compatible telemetry/traffic (same stop cluster)

**Conflicts:** if numeric people fields disagree, fused value = `UNKNOWN`, `conflicts[]` populated, `conflict` implied true. CCTV `cannotDeterminePeople` does not break ties by inventing a number.

---

## 4. Dispatch and resource states

After `ACCEPT` / `MODIFY`:

```
AVAILABLE → ASSIGNED → EN_ROUTE → AT_INCIDENT
    → (ambulance) TRANSPORTING → AT_HOSPITAL → RETURNING → AVAILABLE
```

`UNAVAILABLE` = mechanical/crew failure (scenario 9).  
`UNKNOWN` = stale heartbeat (scenario 10). Stale location **must not** be used as live position.

---

## 5. Re-optimization triggers

Enqueue a deterministic re-plan (new `PROPOSED` recommendation, do not auto-accept) when:

- New incident or fused evidence changes severity/priority
- Resource failure / stale / status change
- Road blockage or traffic factor change on an active route
- Hospital capacity or incoming load change
- Coverage drops to `COVERAGE_RISK` or `BELOW_MINIMUM`
- ETA slip beyond threshold (e.g. +3 minutes)
- Operator reject (search alternatives)
- Demo `tick` advances scripted world state

Active `ACCEPTED` plans are **not** silently rewritten. UI shows `system.alert`: “Conditions changed — new recommendation proposed.”

---

## 6. Emergency chain and bottlenecks

Chain object (also shown in UI):

```
INCIDENT → RESPONSE RESOURCE → ROUTE → HOSPITAL → HOSPITAL CAPACITY
```

Bottleneck codes (on incident `shortageFlags` / system alerts):

| Code | Meaning |
| --- | --- |
| `NO_SUITABLE_AMBULANCE` | Capability mismatch or none available |
| `ROAD_BLOCKED` | Route invalid |
| `HOSPITAL_CAPABILITY_UNAVAILABLE` | No matching specialty with capacity |
| `HOSPITAL_PRESSURE` | Predicted HIGH pressure |
| `COVERAGE_LOSS` | Dispatch would breach minimum |
| `STALE_RESOURCE_DATA` | Candidate excluded or flagged |
| `RESOURCE_FAILURE` | Assigned unit dropped |

---

## 7. Ripple effect

Directed estimated links, e.g.:

```
ACCIDENT → ROAD_BLOCKAGE → TRAFFIC_CONGESTION
        → AMBULANCE_DELAY → OTHER_INCIDENT_RESPONSE_RISK
```

Always `estimated: true`. Secondary emergency risk is a **risk object**, not a confirmed second incident, unless fused evidence creates one.

---

## 8. Socket.IO events

Server namespace: default `/`  
Client: connect after REST snapshot.

| Event | Payload (minimum) | When |
| --- | --- | --- |
| `incident.created` | `{ incident }` | New canonical incident |
| `incident.updated` | `{ incident }` | Fusion, status, assignment, debt |
| `resource.updated` | `{ resource }` | Position, status, stale |
| `hospital.updated` | `{ hospital }` | Load, pressure, freshness |
| `recommendation.created` | `{ recommendation }` | New PROPOSED (or modified copy) |
| `coverage.updated` | `{ zones, cityStatus }` | After coverage recompute |
| `simulation.updated` | `{ simulation }` | What-if complete / revised |
| `system.alert` | `{ event: SystemEvent }` | Bottleneck, coverage risk, stale GPS, conflict, silent anomaly |

**Recommendation accept/reject:** emit `incident.updated` + `resource.updated` + `coverage.updated`. Optionally `system.alert` with `operator.decision`. Do not require a separate socket event for decisions.

Payloads should be full current entities (hackathon size is small). Mark simulated fields clearly.

---

## 9. Human-in-the-loop

| Actor | Emits / writes |
| --- | --- |
| Optimizer | `Recommendation.state = PROPOSED` + `recommendation.created` |
| Operator ACCEPT | decision record, resource ASSIGNED, incident `ACTIVE_RESPONSE` |
| Operator MODIFY | `MODIFIED` + decision.modifiedPlan |
| Operator REJECT | `REJECTED`; incident stays waiting; debt keeps accruing |

AI/LLM **must not** call accept.

---

## 10. Historical analysis (later)

Resolved incidents remain queryable. Phase 1 does not specify a separate warehouse. `GET /api/incidents?status=RESOLVED` is enough for a “past response” panel if time remains.
