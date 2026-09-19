# SafeCity AI — Optimization Specification

The optimizer produces **recommendations**, not commands. It is **deterministic** given the same snapshot. LLMs must not compute assignment cost or pick units.

All ETAs, pressure, and coverage deltas shown to operators are **estimates** unless routingMode is OSRM and data is fresh.

---

## 1. Goal

For each open incident (or jointly for a set), propose assignments that:

1. Respect **resource suitability** (type + capabilities)
2. Respect **current state** (only `AVAILABLE` or `RETURNING` with known fresh location by default)
3. Minimize **city-wide harm**, not only nearest-unit greed
4. Protect **minimum zone coverage**
5. Surface **shortage** and **uncovered demand** honestly
6. Match **hospitals** on capability, capacity, incoming load, predicted pressure, travel time, freshness
7. Attach **reasons** and a **cost breakdown**

**Do not** assign every free unit to the single highest-priority incident.

---

## 2. Joint vs sequential (hackathon)

**Preferred joint heuristic (no MIP solver required):**

1. Snapshot: incidents (open), resources (fresh), hospitals, zones, road events, routes.
2. Rank incidents by `priority.score` then `responseDebt.value` (explainable).
3. For each incident in order, generate candidate resources (suitable, fresh, not already tentatively taken).
4. Score each candidate with **Assignment Cost** (below) including **lookahead**: tentative removal from home zone + effect on remaining unmatched incidents (greedy residual).
5. If best candidate causes `COVERAGE_RISK` / `BELOW_MINIMUM`, try: neighbor mutual aid, next-best unit, reserve (`OTHER` only if flagged reserve in mock), or **leave uncovered** + shortage flag. **Never spawn a fake unit.**
6. After greedy pass, one improvement loop: swaps that reduce total cost without breaching coverage more than current.
7. Emit one `Recommendation` per incident (or one bundle rec for the simultaneous-shortage scenario).

This is **not** globally optimal. UI copy: “Heuristic decision-support estimate.”

---

## 3. Assignment cost

```
AssignmentCost =
    TravelTime
  + UrgencyPenalty
  + CoverageLoss
  + ResourceSuitabilityPenalty
  + OtherIncidentImpact
```

| Term | Hackathon definition | Units |
| --- | --- | --- |
| `TravelTime` | ETA minutes (simulated or OSRM) | minutes |
| `UrgencyPenalty` | `(6 - severity) * 0` wait — actually **higher severity should reduce effective cost of using a farther unit if debt is high**: `urgencyPenalty = -k1 * severity * (1 + waitMinutes/10)` so urgent incidents prefer *some* capable unit quickly | weighted minutes |
| `CoverageLoss` | `k2 * max(0, minRequired - remainingAfterDispatch)` per type in home zone; extra `k3` if neighbor also thin | weighted minutes |
| `ResourceSuitabilityPenalty` | 0 if capability match; `+15` if type ok but missing trauma/ALS/etc; `+999` if type mismatch (exclude) | |
| `OtherIncidentImpact` | `k4 * sum(residualDebtIncrease)` estimated if this unit was the only nearby candidate for another open incident | |

Constants `k1..k4` live in `optimization/src/weights.ts` (single file). Document values in UI “why this plan.”

**Exclude:** `UNAVAILABLE`, `UNKNOWN`/stale location, already `EN_ROUTE` unless reassignment is an explicit what-if.

---

## 4. Response debt (explainable)

```
ResponseDebt = Urgency × WaitingTime × AffectedPeopleFactor
```

| Factor | Definition |
| --- | --- |
| `Urgency` | `severity` (1–5) |
| `WaitingTime` | minutes since `firstReportedAt` (or since `VERIFIED` if you need a second metric — demo uses firstReportedAt) |
| `AffectedPeopleFactor` | If `injuryCount` or `victimCount` is a number, `1 + log1p(n)`; if `UNKNOWN`, **1.0** (do not assume casualties) |

Store `formula` string on the incident. UI shows the product. **Not** a black-box AI score. Debt **informs ranking**; it does not override suitability (a police unit still cannot replace a burn-capable ambulance).

---

## 5. City coverage

Before committing a tentative dispatch:

1. Compute `currentCoverage` = count of **fresh** `AVAILABLE` (and optionally `RETURNING`) units by type with `homeZoneId` (or current zone if that’s the demo rule — **use homeZoneId** for stability).
2. Simulate minus the candidate.
3. If remaining < `minCoverage` for that type → `coverageStatus = COVERAGE_RISK` or `BELOW_MINIMUM`.
4. Operator-facing banner: **COVERAGE RISK**.
5. Alternatives to try in order: farther unit in-zone, neighbor-zone **mutual aid** (if neighbor stays ≥ its minimum or the deficit is smaller), reserve resource tagged in mock, **escalation alert** (system.alert) with uncovered demand.

Mutual aid: assignment lists `mutualAidFromZoneIds`. Neighbor must exist in the graph; do not teleport units from non-neighbors without labeling long ETA.

---

## 6. Simultaneous emergencies & shortage

When incidents A, B, C are open and units are insufficient:

1. Prioritize by priority then debt
2. Assign suitable resources
3. Protect minima (may leave a lower-priority incident waiting)
4. `shortage` object: `{ missing: [{ type, capability, incidentId }], uncoveredDemand: [] }`
5. Request mutual aid if neighbors have surplus
6. Explain trade-offs in `reasons[]` (“A14 not sent to traffic incident to preserve ALS for accident”)
7. Re-evaluate on every trigger in EVENT-FLOW

---

## 7. Hospital matching

Score each hospital (lower better):

```
HospitalCost =
    TravelTime
  + CapabilityMismatchPenalty      # 999 exclude if required cap missing
  + CapacityPenalty                # 0 if bedsAvailable > 0; large if 0 or UNKNOWN+stale
  + IncomingLoadPenalty            # + m * incomingLoad
  + PredictedPressurePenalty       # HIGH adds large penalty
  + FreshnessPenalty               # stale hospital data adds penalty and warning, does not invent beds
```

**Predicted pressure (estimated):**

- `incomingLoad` ambulances with ETA < `horizonMinutes` (default 8)
- `level = HIGH` if `bedsAvailable` numeric and `incomingLoad >= bedsAvailable`
- Example copy: “H3 currently has capacity, but two incoming ambulances may create high pressure in approximately 8 minutes.”

Never select on distance alone. Never pick a hospital that lacks required capability if another fresh capable hospital exists; if none exist, flag `HOSPITAL_CAPABILITY_UNAVAILABLE` and still recommend closest **capable** even if pressure HIGH, with warning.

---

## 8. Routing interaction

Optimizer consumes `etaMinutes` from routing module. If road blocked, that route’s ETA = infinity / excluded → next route or `ROAD_BLOCKED` bottleneck → re-optimize.

---

## 9. What-if simulation

Compare named plans on the **same snapshot**:

- ETA
- coverage impact
- other incident impact (residual debt / uncovered)
- hospital pressure
- remaining availability

Also support assumption flags:

- ambulance failure (mark unit UNAVAILABLE)
- road blockage
- hospital overload (bedsAvailable = 0)
- new simultaneous incident (clone extra demand)

Output `simulated: true`, disclaimer string. **Does not** dispatch.

---

## 10. Resource failure and stale data

- Failure: unit `UNAVAILABLE`; if it was assigned, incident goes back to needing a rec; coverage recomputed.
- Stale: treat as `UNKNOWN`; **do not** use last GPS; may appear in UI as “last seen” greyed, not as a candidate.

---

## 11. Emergency chain bottleneck detection

After a plan (or shortage) is computed, walk:

`incident → selected resource? → route feasible? → hospital feasible? → capacity ok?`

Emit codes from EVENT-FLOW §6. Visualize as a 5-node chain with red nodes.

---

## 12. Historical analysis (lightweight)

Log `Recommendation` + `OperatorDecision` + outcome timestamps. A later `GET` can show “operator rejected nearest unit due to coverage.” No ML retraining in hackathon.
