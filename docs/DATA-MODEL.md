# SafeCity AI — Data Model

Canonical TypeScript shapes live in `shared/types.ts`. This document is the human-readable contract for Prisma (Phase 2) and APIs.

**Rules:** nullable people counts use `"UNKNOWN"` (string sentinel) or `null` with `unknown: true` — never invent a number. Timestamps are ISO-8601 UTC. Confidence is **evidence quality** (0–1), not probability that N people are injured.

---

## 1. Shared value types

### GeoPoint

| Field | Type | Notes |
| --- | --- | --- |
| `lat` | number | WGS84 |
| `lng` | number | WGS84 |
| `accuracyMeters` | number \| null | Null if unknown |

### EvidenceSourceType

`EMERGENCY_CALL` | `CCTV` | `VEHICLE_TELEMETRY` | `TRAFFIC` | `IOT_SENSOR` | `GPS` | `SATELLITE` | `CITIZEN_REPORT` | `WEATHER` | `HOSPITAL_FEED` | `RESOURCE_FEED` | `ROAD_EVENT`

### IncidentStatus

`NEW` | `SUSPECTED` | `CORROBORATED` | `VERIFIED` | `ACTIVE_RESPONSE` | `RESOLVED`

### ObservabilityLevel

`HIGH` | `PARTIAL` | `LOW`

### ResourceType

`AMBULANCE` | `POLICE_UNIT` | `FIRE_UNIT` | `RESCUE_UNIT` | `TRAFFIC_UNIT` | `OTHER_EMERGENCY_UNIT`

### ResourceStatus

`AVAILABLE` | `ASSIGNED` | `EN_ROUTE` | `AT_INCIDENT` | `TRANSPORTING` | `AT_HOSPITAL` | `RETURNING` | `UNAVAILABLE` | `UNKNOWN`

`UNKNOWN` is used when GPS/status is **stale** or the last payload is unusable. Do not treat last known coordinates as current.

### RecommendationState

`PROPOSED` | `ACCEPTED` | `MODIFIED` | `REJECTED`

### CoverageStatus

`ADEQUATE` | `MARGINAL` | `COVERAGE_RISK` | `BELOW_MINIMUM`

### IncidentType (demo vocabulary)

`ROAD_ACCIDENT` | `FIRE` | `MEDICAL` | `TRAFFIC` | `HAZMAT` | `FLOOD` | `OTHER`

---

## 2. Zone

City is partitioned into named zones (polygons). Coverage is computed **per zone** before dispatch.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | e.g. `zone-central` |
| `name` | string | |
| `polygon` | GeoPoint[] | Closed ring |
| `center` | GeoPoint | Map label |
| `observabilityBaseline` | ObservabilityLevel | Typical, not live |
| `typicalSourceTypes` | EvidenceSourceType[] | Adaptive profile |
| `neighboringZoneIds` | string[] | Mutual aid graph |
| `minCoverage` | `{ ambulance, police, fire, rescue }` | Desired **available** count |
| `currentCoverage` | same shape | Live available (fresh) units whose home/current zone is this zone |
| `coverageStatus` | CoverageStatus | Derived |
| `nearbyResourceIds` | string[] | Cached hint; live query preferred |
| `updatedAt` | string | |

**Live observability** on an incident may be lower than zone baseline if cameras/feeds are down.

---

## 3. Evidence

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `sourceType` | EvidenceSourceType | |
| `timestamp` | string | Event time, not ingest time |
| `ingestedAt` | string | |
| `location` | GeoPoint \| null | Satellite scenes may be a bbox in `metadata` |
| `incidentId` | string \| null | Set after fusion |
| `raw` | object | Original adapter payload |
| `normalized` | NormalizedPayload | See below |
| `confidence` | number | 0–1 **quality of this sensor/report**, not casualty certainty |
| `freshnessSeconds` | number | `now - timestamp` at last eval |
| `stale` | boolean | Past source-specific TTL |
| `metadata` | object | Unit id, camera id, call id, satellite pass id, etc. |

### NormalizedPayload (sparse)

Only fields the source can honestly support:

| Field | Type |
| --- | --- |
| `incidentTypeHint` | IncidentType \| null |
| `narrative` | string \| null |
| `victimCount` | number \| `"UNKNOWN"` |
| `injuryCount` | number \| `"UNKNOWN"` |
| `speedKmh` | number \| null |
| `speedSeriesKmh` | number[] \| null |
| `impactSignal` | boolean \| null |
| `airbagDeployed` | boolean \| null |
| `rollover` | boolean \| null |
| `gpsStopped` | boolean \| null |
| `hazardClass` | string \| null |
| `roadBlocked` | boolean \| null |
| `congestionIndex` | number \| null |
| `bbox` | `{ south, west, north, east }` \| null |
| `cannotDeterminePeople` | boolean | CCTV/analytics often true |

---

## 4. Incident

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `type` | IncidentType | Fused; may be `OTHER` if disagree |
| `status` | IncidentStatus | |
| `title` | string | Operator-facing |
| `description` | string | |
| `location` | GeoPoint | Centroid / best estimate |
| `locationUncertaintyMeters` | number \| null | |
| `zoneId` | string | |
| `observability` | ObservabilityLevel | Live |
| `evidenceIds` | string[] | All fused sources |
| `fused` | FusedFacts | See below |
| `conflicts` | Conflict[] | `conflict = true` if non-empty |
| `severity` | 1–5 | Dynamic; explainable inputs |
| `priority` | PriorityBreakdown | Not a black box |
| `responseDebt` | ResponseDebtBreakdown | |
| `secondaryRisks` | SecondaryRisk[] | |
| `rippleEffects` | RippleLink[] | Emergency ripple graph |
| `assignedResourceIds` | string[] | After accept |
| `recommendedHospitalId` | string \| null | Proposed or accepted |
| `activeRouteIds` | string[] | |
| `shortageFlags` | string[] | e.g. `NO_SUITABLE_AMBULANCE` |
| `verificationRequired` | boolean | |
| `silentAnomaly` | boolean | Unreported / low-call mismatch |
| `createdAt` | string | |
| `updatedAt` | string | |
| `firstReportedAt` | string | |
| `resolvedAt` | string \| null | |

### FusedFacts

| Field | Type | Rule |
| --- | --- | --- |
| `victimCount` | number \| `"UNKNOWN"` | If sources disagree on a number → `UNKNOWN` + conflict |
| `injuryCount` | number \| `"UNKNOWN"` | Same |
| `roadBlocked` | boolean \| `"UNKNOWN"` | |
| `firePresent` | boolean \| `"UNKNOWN"` | |
| `notes` | string[] | Human-readable fusion notes |

### Conflict

| Field | Type |
| --- | --- |
| `field` | string | e.g. `injuryCount` |
| `values` | `{ sourceType, evidenceId, value }[]` |
| `resolution` | `"UNKNOWN_DUE_TO_CONFLICT"` |

### PriorityBreakdown

| Field | Type |
| --- | --- |
| `score` | number | Weighted sum, documented weights |
| `urgency` | number | From type + severity + life-safety flags |
| `waitingSeconds` | number | |
| `observabilityPenalty` | number | Low observability **raises** need to verify, does not invent facts |
| `reasons` | string[] | |

### ResponseDebtBreakdown

Conceptual: **ResponseDebt = Urgency × WaitingTime × AffectedPeopleFactor**

| Field | Type |
| --- | --- |
| `value` | number | |
| `urgency` | number | |
| `waitingSeconds` | number | |
| `affectedPeopleFactor` | number | `1` if people count `UNKNOWN` (do not invent N) |
| `formula` | string | Literal formula shown in UI |
| `reasons` | string[] | |

### SecondaryRisk / RippleLink

| Field | Type | Example |
| --- | --- | --- |
| `kind` | string | `ROAD_BLOCKAGE`, `TRAFFIC_CONGESTION`, `AMBULANCE_DELAY`, `OTHER_INCIDENT_RESPONSE_RISK` |
| `fromId` | string | Incident or road event |
| `toId` | string | |
| `estimated` | true | Always labeled estimated |
| `note` | string | |

---

## 5. Resource

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `callSign` | string | e.g. `A12` |
| `type` | ResourceType | |
| `capabilities` | string[] | `trauma`, `als`, `bls`, `pump`, `hazmat`, `extrication` |
| `homeZoneId` | string | Coverage accounting |
| `location` | GeoPoint \| null | Null if stale/unknown |
| `status` | ResourceStatus | |
| `etaMinutes` | number \| null | To current assignment target |
| `assignmentIncidentId` | string \| null | |
| `destinationHospitalId` | string \| null | If transporting |
| `lastUpdateAt` | string | |
| `freshnessSeconds` | number | |
| `stale` | boolean | Past TTL (default 120s for GPS; configurable) |
| `staleReason` | string \| null | |
| `unavailableReason` | string \| null | Failure, maintenance |
| `updatedAt` | string | |

If `stale`: `status` becomes `UNKNOWN` (unless already `UNAVAILABLE`), `location` must not be used as current for dispatch cost (treat as unknown position → high uncertainty penalty or exclude from auto-recommend).

---

## 6. Hospital

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `name` | string | |
| `location` | GeoPoint | |
| `zoneId` | string | |
| `capabilities` | string[] | `trauma`, `burn`, `icu`, `pediatric`, `stroke`, `cath` |
| `bedsTotal` | number | |
| `bedsAvailable` | number \| `"UNKNOWN"` | |
| `currentLoad` | number \| `"UNKNOWN"` | Occupied stretchers / ED census |
| `incomingLoad` | number | Count of ambulances `TRANSPORTING` / `EN_ROUTE` to this hospital |
| `predictedPressure` | PredictedPressure | |
| `lastUpdateAt` | string | |
| `stale` | boolean | |
| `updatedAt` | string | |

### PredictedPressure

| Field | Type |
| --- | --- |
| `level` | `LOW` \| `MODERATE` \| `HIGH` \| `UNKNOWN` |
| `horizonMinutes` | number | e.g. 8 |
| `basis` | string | e.g. “2 incoming ALS units” |
| `estimated` | true | Always |

Hospital ranking **must** use travel time, capability, capacity, incoming load, predicted pressure, and freshness — **not** nearest only.

---

## 7. Recommendation

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `incidentId` | string | Primary incident; may list related ids |
| `state` | RecommendationState | |
| `createdAt` | string | |
| `plan` | DispatchPlan | |
| `cost` | AssignmentCostBreakdown | |
| `reasons` | string[] | Operator-facing, explainable |
| `coverageImpact` | CoverageImpact | |
| `shortage` | ShortageReport \| null | |
| `simulationId` | string \| null | If compared in what-if |
| `decision` | OperatorDecision \| null | |
| `updatedAt` | string | |

### DispatchPlan

| Field | Type |
| --- | --- |
| `assignments` | `{ resourceId, role, etaMinutes, fromZoneId }[]` |
| `hospitalId` | string \| null |
| `routeIds` | string[] |
| `mutualAidFromZoneIds` | string[] |
| `uncoveredDemand` | string[] | Honest gaps |

### OperatorDecision

| Field | Type |
| --- | --- |
| `action` | `ACCEPT` \| `MODIFY` \| `REJECT` |
| `at` | string |
| `operatorNote` | string \| null |
| `modifiedPlan` | DispatchPlan \| null |

---

## 8. Route

| Field | Type |
| --- | --- |
| `id` | string | |
| `resourceId` | string | |
| `incidentId` | string \| null | |
| `hospitalId` | string \| null | |
| `origin` | GeoPoint | |
| `destination` | GeoPoint | |
| `waypoints` | GeoPoint[] | |
| `distanceKm` | number | |
| `etaMinutes` | number | |
| `routingMode` | `OSRM` \| `SIMULATED` | |
| `blocked` | boolean | |
| `trafficFactor` | number | 1 = free flow |
| `roadEventIds` | string[] | |
| `lastCalculatedAt` | string | |
| `estimated` | boolean | True if simulated or degraded |

---

## 9. Simulation

| Field | Type |
| --- | --- |
| `id` | string | |
| `label` | string | e.g. `PLAN A vs PLAN B` |
| `createdAt` | string | |
| `assumptions` | object | Failure, blockage, new incident, overload |
| `plans` | `{ name, plan: DispatchPlan, cost, reasons }[]` | |
| `comparison` | string[] | ETA, coverage, other incidents, hospital pressure, availability |
| `simulated` | true | **Always** |
| `disclaimer` | string | “Simulated / estimated — not a live dispatch” |

---

## 10. SystemEvent

Audit and live alerts.

| Field | Type |
| --- | --- |
| `id` | string | |
| `type` | string | Mirror Socket.IO names plus `operator.decision`, `fusion.conflict`, `resource.stale` |
| `severity` | `INFO` \| `WARNING` \| `CRITICAL` | |
| `timestamp` | string | |
| `entityType` | string \| null | |
| `entityId` | string \| null | |
| `payload` | object | |
| `message` | string | |

---

## 11. Relationships (ER)

```
Zone 1──* Incident
Zone 1──* Resource (homeZone)
Zone 1──* Hospital

Incident 1──* Evidence
Incident 1──* Recommendation
Incident 1──* Route
Incident *──* Resource (assignment)
Incident 0──1 Hospital (accepted destination)
Incident 1──* SystemEvent (optional link)

Recommendation 0──1 Simulation
Recommendation 0──1 OperatorDecision (embedded or table)

Resource 0──* Route
Hospital 1──* Resource (transport destination)
Road events are Evidence (ROAD_EVENT) and/or SystemEvent
```

All mutating tables carry `createdAt` / `updatedAt` as applicable.

---

## 12. Freshness TTLs (hackathon defaults)

| Source / entity | Stale after |
| --- | --- |
| Resource GPS / status | 120 seconds |
| Hospital feed | 5 minutes |
| CCTV event metadata | 60 seconds |
| Traffic / road event | 3 minutes |
| Vehicle telemetry burst | 90 seconds |
| Satellite scene | hours (scene-specific; never “live street”) |
| Citizen report | not auto-stale; low confidence until corroborated |
| Emergency call | not auto-stale as a historical fact |

---

## 13. IDs

Use stable prefixed ids in mock data (`inc-acc-01`, `res-a12`, `h-3`, `zone-highway`). Production may use UUIDs; APIs accept string ids.
