# SafeCity AI — Demo Scenarios

City: **Hackwell** (map centered near 12.97°N, 77.59°E — demo geography, not an official CAD feed).  
Emergency numbers in copy: **112 / 108**.  
All hospital pressure, ETAs, and ripples are **estimated**.

Seed IDs are defined in [mock-data/SPEC.md](../mock-data/SPEC.md) and `mock-data/hackwell-city.json`.

Operator demo order (≈8–10 minutes): open map → three simultaneous reds → coverage banner → recommendation reasons → what-if A vs B → accept → road blockage reroute → stale unit greyed out → conflict UNKNOWN injuries → forest low observability → silent anomaly.

---

## Scenario index

| # | Name | Primary incident / entity |
| --- | --- | --- |
| 1 | Critical road accident | `inc-acc-01` |
| 2 | Fire | `inc-fire-01` |
| 3 | Medical emergency | `inc-med-01` |
| 4 | Traffic incident | `inc-traf-01` |
| 5 | Suspected / unverified | `inc-sus-01` |
| 6 | Simultaneous shortage | A+B+C with thin fleet |
| 7 | Hospital capacity pressure | `h-3` + incoming |
| 8 | Road blockage → route change | `ev-road-01` vs route of A12 |
| 9 | Resource failure | `res-a21` |
| 10 | Stale GPS | `res-p04` |
| 11 | Conflicting evidence | `inc-acc-01` injuries |
| 12 | Low-observability area | `inc-fire-01` / `zone-forest` |
| 13 | Silent / unreported anomaly | `inc-sil-01` |
| 14 | Mutual aid | Zone highway ← zone central |
| 15 | Secondary / ripple | accident → blockage → delay |

---

## 1. Critical road accident

**Where:** NH-style corridor, `zone-highway`.  
**Evidence:** 108 call + vehicle telemetry (82→76→38→5→0 km/h, impact, airbag, GPS stop) + traffic slowdown. **No CCTV** on this stretch.  
**Status:** `CORROBORATED` (not “proven by telemetry alone”).  
**People:** injuries `UNKNOWN` until scenario 11 overlay.  
**Show:** trauma-capable ambulance, coverage check, hospital not merely nearest.

---

## 2. Fire

**Where:** peri-urban / forest edge, `zone-forest`.  
**Evidence:** satellite thermal anomaly (wide bbox) + weather (wind) + IoT smoke sensor. No CCTV.  
**Status:** `CORROBORATED` for **fire/hazard**, not a vehicle crash.  
**Resources:** fire + rescue; ambulance staging. Observability `LOW`.

---

## 3. Medical emergency

**Where:** `zone-central`.  
**Evidence:** 108 call only (HIGH urban but this incident is call-grade).  
**Need:** ALS ambulance; hospital with ICU. Victim count 1 (from caller) — still not AI-verified medically.

---

## 4. Traffic incident

**Where:** `zone-central` arterial.  
**Evidence:** traffic system + citizen report of stalled bus, no injuries claimed (`injuryCount` 0 from caller — still could be wrong).  
**Priority:** lower than 1–3. Optimizer should **not** strip last ALS from the zone for this.

---

## 5. Suspected / unverified

**Where:** `zone-highway` km-marker cluster.  
**Evidence:** **harsh braking only** (82→40), no impact/airbag.  
**Status:** `SUSPECTED`. Banner: **VERIFICATION REQUIRED**. Do not dispatch as confirmed MCI.

---

## 6. Simultaneous emergency resource shortage

**Open together:** `inc-acc-01` (critical), `inc-fire-01`, `inc-med-01`.  
**Fleet:** fewer ALS/fire units than demand.  
**Must show:** priority order, partial assignment, **COVERAGE RISK**, shortage list, uncovered demand, trade-off reasons, mutual aid attempt (scenario 14).

---

## 7. Hospital capacity pressure

**Hospital `h-3`:** `bedsAvailable` 1, `incomingLoad` 2, horizon 8 minutes, `predictedPressure.level = HIGH`.  
**Copy:** currently has capacity, two incoming ambulances may create high pressure in ~8 minutes (estimated).  
Accident destination should prefer `h-2` trauma if ETA acceptable.

---

## 8. Road blockage causing route change

**Event `ev-road-01`:** closure on the first-choice corridor.  
**Effect:** active or proposed route for `res-a12` invalidated; ETA jump; `recommendation` refresh; ripple toward scenario 15.

---

## 9. Resource failure

**Unit `res-a21`:** mechanical `UNAVAILABLE` while `EN_ROUTE` to medical incident.  
**Effect:** incident drops assignment; new PROPOSED rec; do not replace with a fictional ambulance.

---

## 10. Stale GPS / resource data

**Unit `res-p04`:** last update > 120s. `stale: true`, `status: UNKNOWN`, `location` not used for cost.  
**UI:** last-seen ghost marker, not a dispatch candidate.

---

## 11. Conflicting evidence

On `inc-acc-01`:

| Source | Injuries |
| --- | --- |
| Citizen | 5 |
| 108 operator | 2 |
| CCTV | N/A (no camera) — if a low-quality video report exists, `cannotDetermine` |

**Fused:** `UNKNOWN`, `conflict = true`. UI shows both claims, no average.

---

## 12. Low-observability area

`zone-forest` baseline `LOW`. Fire incident lists sources actually present (satellite, weather, IoT). Banner: limited sensing, uncertainty high, **not** “no other incidents exist.”

---

## 13. Silent / unreported anomaly

**`inc-sil-01`:** traffic speed collapse + telemetry cluster stop on a spur road; **no** 112 call.  
**Status:** `SUSPECTED`, `silentAnomaly: true`, people `UNKNOWN`. Adaptive sensing: suggest patrol verify — only using resources that exist.

---

## 14. Mutual aid requirement

Highway `minCoverage.ambulance = 1` and the only highway ALS is the best ETA for `inc-acc-01`. Dispatching it trips **COVERAGE RISK**. Neighbor `zone-central` has surplus `res-a07` that can **reposition** (longer ETA) **or** send mutual aid police/ambulance per seed. Recommendation must name the trade-off.

---

## 15. Secondary emergency / ripple effect

```
inc-acc-01 → ROAD_BLOCKAGE (ev-road-01)
           → TRAFFIC_CONGESTION
           → AMBULANCE_DELAY (inc-med-01 ETA slip)
           → OTHER_INCIDENT_RESPONSE_RISK
```

All links `estimated: true`. May raise secondary risk on `inc-med-01` without inventing a new crash.

---

## Demo talking points (judges)

- Multi-source fusion without CCTV-everywhere
- UNKNOWN + conflicts
- Coverage-aware dispatch, shortage honesty
- Hospital pressure ≠ nearest hospital
- Human accept/reject
- What-if labeled simulated
- Re-optimize on blockage and unit failure
