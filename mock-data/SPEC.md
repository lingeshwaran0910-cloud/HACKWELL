# Mock data specification — Hackwell City

This folder is the **controlled world** for the hackathon demo. Adapters replay this data; they do not call real 112, CCTV vendors, or satellites.

Canonical seed: [`hackwell-city.json`](./hackwell-city.json)

Types: `shared/types.ts`

Narrative: [`docs/DEMO-SCENARIOS.md`](../docs/DEMO-SCENARIOS.md)

---

## City

| Key | Value |
| --- | --- |
| Name | Hackwell |
| Map center | 12.9716, 77.5946 |
| Demo clock | `2026-09-19T06:15:00.000Z` (T+0 of the scenario pack) |
| Language | English labels; emergency numbers 112 / 108 |

Coordinates are **plausible Bengaluru-adjacent demo points**, not a claim of real CAD incidents.

---

## Zones

| id | Name | Observability | Typical sources | Neighbors |
| --- | --- | --- | --- | --- |
| `zone-central` | Central | HIGH | call, CCTV, traffic, GPS, citizen | hospital, industrial, highway |
| `zone-industrial` | Industrial | PARTIAL | call, traffic, IoT, GPS | central, highway |
| `zone-highway` | East Highway | PARTIAL | call, telemetry, traffic, satellite (wide-area) | central, industrial, forest |
| `zone-forest` | Forest Belt | LOW | satellite, weather, IoT, sparse call | highway |
| `zone-hospital` | Hospital District | HIGH | call, GPS, hospital feed, CCTV | central |

Minimum coverage (available units): see JSON `minCoverage`. Highway ambulance minimum is **1** so dispatching the local ALS creates **COVERAGE RISK** (scenario 14).

---

## Hospitals

| id | Name | Capabilities | Demo load |
| --- | --- | --- | --- |
| `h-1` | Hackwell General | trauma, icu, stroke | moderate, incoming 0 |
| `h-2` | East Trauma Center | trauma, icu, extrication receive | closer to highway accident |
| `h-3` | Ridge Community | icu (limited), **no burn/trauma bay** | bedsAvailable 1, incoming 2 → HIGH pressure in 8 min |
| `h-4` | Hospital District Specialty | pediatric, cath, icu | not first choice for MCI trauma |

`h-3` exists to **punish naive nearest-hospital** if a closer community hospital is wrong for trauma or overloaded.

---

## Resources (fleet is intentionally thin)

| id | Call sign | Type | Home zone | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `res-a12` | A12 | AMBULANCE | highway | AVAILABLE | trauma/ALS; best ETA to accident |
| `res-a07` | A07 | AMBULANCE | central | AVAILABLE | ALS; mutual aid candidate |
| `res-a21` | A21 | AMBULANCE | central | EN_ROUTE | to medical; **fails** in scenario 9 |
| `res-a03` | A03 | AMBULANCE | hospital | TRANSPORTING | incoming to h-3 |
| `res-a05` | A05 | AMBULANCE | industrial | TRANSPORTING | incoming to h-3 |
| `res-f01` | F01 | FIRE_UNIT | forest | AVAILABLE | pump; only forest engine |
| `res-f02` | F02 | FIRE_UNIT | industrial | AVAILABLE | |
| `res-r01` | R01 | RESCUE_UNIT | highway | AVAILABLE | extrication |
| `res-p01` | P01 | POLICE_UNIT | highway | AVAILABLE | |
| `res-p02` | P02 | POLICE_UNIT | central | AVAILABLE | |
| `res-p04` | P04 | POLICE_UNIT | central | UNKNOWN | **stale GPS** > 120s |
| `res-t01` | T01 | TRAFFIC_UNIT | central | AVAILABLE | |
| `res-e01` | E01 | OTHER | hospital | AVAILABLE | reserve coordinator vehicle; not an ambulance |

No other ambulances. Shortage in scenario 6 is real.

---

## Incidents (T+0 snapshot)

| id | Type | Status | Zone | Scenarios |
| --- | --- | --- | --- | --- |
| `inc-acc-01` | ROAD_ACCIDENT | CORROBORATED | highway | 1, 6, 11, 14, 15 |
| `inc-fire-01` | FIRE | CORROBORATED | forest | 2, 6, 12 |
| `inc-med-01` | MEDICAL | VERIFIED | central | 3, 6, 9, 15 |
| `inc-traf-01` | TRAFFIC | CORROBORATED | central | 4, 6 |
| `inc-sus-01` | ROAD_ACCIDENT | SUSPECTED | highway | 5 |
| `inc-sil-01` | OTHER | SUSPECTED | highway | 13 |

People counts: accident fused injuries **UNKNOWN** (conflict). Silent and suspected: **UNKNOWN**. Medical: 1 from caller (not AI-verified). Traffic: 0 claimed. Fire: UNKNOWN occupants.

---

## Evidence IDs (non-exhaustive; JSON is source of truth)

- `ev-call-acc` EMERGENCY_CALL — operator said 2 injured
- `ev-cit-acc` CITIZEN_REPORT — 5 injured
- `ev-tel-acc` VEHICLE_TELEMETRY — 82,76,38,5,0 + impact + airbag + stop
- `ev-traf-acc` TRAFFIC — slowdown / blockage forming
- `ev-sat-fire` SATELLITE — thermal bbox, not street accident
- `ev-iot-fire` IOT_SENSOR — smoke
- `ev-wx-fire` WEATHER — wind toward highway
- `ev-call-med` EMERGENCY_CALL — chest pain
- `ev-traf-bus` TRAFFIC + `ev-cit-bus` citizen stalled bus
- `ev-tel-brake` telemetry harsh brake only
- `ev-traf-silent` + `ev-tel-silent` unreported cluster
- `ev-road-01` ROAD_EVENT blockage (scenario 8; may start inactive then tick)

---

## Recommendations at T+0

`rec-bundle-01` — PROPOSED joint plan for shortage (scenario 6):

- A12 + R01 + P01 → accident; hospital **h-2** (not h-3)
- Coverage risk on highway ALS → note mutual aid A07 reposition
- F01 → fire; F02 mutual aid from industrial
- A21 already on medical (will fail later)
- Traffic incident: T01 + P02 only; **no ALS**
- Uncovered: second ambulance for accident MCI if injuries exist (UNKNOWN — do not staff phantom extra units)

Reasons must be stored as strings in JSON for the UI before optimizer is implemented.

---

## Timed ticks (mock replay)

| Demo time | Event |
| --- | --- |
| T+0 | Snapshot as JSON |
| T+2 min | `ev-road-01` blocks A12 primary route; ETA recalculated (scenario 8, 15) |
| T+4 min | `res-a21` UNAVAILABLE mechanical (scenario 9) |
| T+5 min | `res-p04` already stale (scenario 10) — no change needed |
| T+6 min | Operator still has rec PROPOSED unless they accepted |

---

## What-if preset

`sim-acc-ab` (may be computed live in Phase 3; spec for UI):

- PLAN A: nearest A12 to accident
- PLAN B: A07 from central (preserve highway coverage)

Compare ETA, coverage, medical incident residual risk, h-2 vs h-3 pressure. `simulated: true`.

---

## Honesty constraints in seed

- No CCTV evidence on highway accident or forest fire
- Satellite evidence is fire bbox only
- P04 has `location` in JSON as **lastSeen** but `stale: true` and `location` may be null in API mapping — seed uses `location` + stale flag; optimizer must ignore
- Do not add extra ambulances “from nearby city” unless labeled mutual aid **and** a real unit id
