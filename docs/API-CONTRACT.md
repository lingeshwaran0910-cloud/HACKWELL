# SafeCity AI — REST API Contract

Base path: `/api`  
JSON only. Errors: `{ "error": { "code": string, "message": string } }`  
No authentication in the hackathon prototype.

All list endpoints may accept `?zoneId=` and `?status=` where it makes sense.

**Do not fabricate entities.** If a resource does not exist, it is not returned.

---

## 1. Incidents

### `GET /api/incidents`

Returns all incidents (demo: including resolved unless `?open=true`).

**Response 200**

```json
{
  "incidents": [ { "...Incident": true } ]
}
```

### `GET /api/incidents/:id`

**Response 200** — full incident including fused facts, conflicts, evidence summaries, assigned resources, active routes, recommendations (ids).

**404** if unknown.

### `POST /api/incidents`

Operator or adapter-created incident (citizen/web style). Does **not** skip fusion: backend may merge into an existing incident and return that id.

**Request**

```json
{
  "type": "ROAD_ACCIDENT",
  "title": "Citizen report — collision",
  "description": "Multiple vehicles, injuries unknown",
  "location": { "lat": 12.9716, "lng": 77.5946 },
  "zoneId": "zone-central",
  "sourceType": "CITIZEN_REPORT",
  "victimCount": "UNKNOWN",
  "injuryCount": "UNKNOWN"
}
```

**Response 201**

```json
{
  "incident": { },
  "fusedIntoExisting": false,
  "evidenceId": "ev-..."
}
```

If fused: `fusedIntoExisting: true` and `incident` is the **canonical** incident.

---

## 2. Resources

### `GET /api/resources`

Optional `?type=AMBULANCE&status=AVAILABLE&zoneId=zone-central`

**Response 200** `{ "resources": [ ] }`

Stale units included with `stale: true`, `status: "UNKNOWN"` as applicable.

### `GET /api/resources/:id`

**200** / **404**

---

## 3. Hospitals

### `GET /api/hospitals`

**200** `{ "hospitals": [ ] }` — includes `currentLoad`, `incomingLoad`, `predictedPressure`.

### `GET /api/hospitals/:id`

**200** / **404**

---

## 4. Recommendations

### `GET /api/recommendations`

Optional `?incidentId=` `&state=PROPOSED`

**200** `{ "recommendations": [ ] }`

### `POST /api/recommendations/:id/accept`

**Request** (optional note)

```json
{ "operatorNote": "Approved as proposed" }
```

**200** `{ "recommendation": { "state": "ACCEPTED", "decision": { "action": "ACCEPT", "at": "...", "operatorNote": "..." } } }`

Triggers dispatch state updates + Socket.IO `recommendation.created` is **not** re-fired; emit `incident.updated`, `resource.updated`, `coverage.updated`.

### `POST /api/recommendations/:id/reject`

```json
{ "operatorNote": "Hold for mutual aid" }
```

**200** `state: REJECTED`

### Modify (same resource, explicit)

`POST /api/recommendations/:id/reject` does not mutate the plan. For modify, use:

### `POST /api/recommendations/:id/modify`

```json
{
  "operatorNote": "Swap A12 for A07",
  "modifiedPlan": { "assignments": [], "hospitalId": "h-3", "routeIds": [], "mutualAidFromZoneIds": [], "uncoveredDemand": [] }
}
```

**200** `state: MODIFIED`  
(Listed here as required human-in-the-loop; implement in Phase 2 with accept/reject.)

---

## 5. Coverage

### `GET /api/coverage`

**200**

```json
{
  "zones": [
    {
      "zoneId": "zone-central",
      "name": "Central",
      "minCoverage": { "ambulance": 2, "police": 2, "fire": 1, "rescue": 0 },
      "currentCoverage": { "ambulance": 2, "police": 3, "fire": 1, "rescue": 0 },
      "coverageStatus": "ADEQUATE",
      "nearbyResourceIds": ["res-a12"]
    }
  ],
  "cityStatus": "STRAINED"
}
```

`cityStatus`: `STABLE` | `STRAINED` | `CRITICAL` (derived from any `COVERAGE_RISK` / `BELOW_MINIMUM` plus open critical incidents).

---

## 6. Simulations (what-if)

### `POST /api/simulations`

All results **must** set `"simulated": true`.

**Request**

```json
{
  "label": "PLAN A vs PLAN B — accident on NH corridor",
  "incidentId": "inc-acc-01",
  "plans": [
    { "name": "PLAN A", "resourceIds": ["res-a12"], "hospitalId": "h-2" },
    { "name": "PLAN B", "resourceIds": ["res-a07"], "hospitalId": "h-1" }
  ],
  "assumptions": {
    "ambulanceFailureId": null,
    "roadBlockageEventId": null,
    "hospitalOverloadId": null,
    "extraIncidentId": null
  }
}
```

**Response 201** `{ "simulation": { } }`

### `GET /api/simulations/:id`

**200** / **404**

---

## 7. Supporting reads (hackathon, recommended)

Not in the original minimum list but needed by the UI. Implement in Phase 2 unless time-boxed out.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/zones` | Map polygons + observability baseline |
| GET | `/api/evidence?incidentId=` | Evidence list |
| GET | `/api/routes?incidentId=` | Active routes |
| GET | `/api/system-events?limit=50` | Alert ticker |
| POST | `/api/demo/tick` | Advance mock feed (optional) |
| POST | `/api/demo/scenario/:id/play` | Replay a named scenario |

---

## 8. Future ingestion endpoints (adapters — **do not implement external systems now**)

These are **contracts for later**. Hackathon may expose a single internal `POST /api/ingest/evidence` used by mock replay only.

| Future path | Adapter | Notes |
| --- | --- | --- |
| `POST /api/ingest/emergency-call` | 112 / 108 operator feed | CAD-like payload; never treat as ground truth alone |
| `POST /api/ingest/cctv` | Video analytics **metadata** | No video pipeline required; people counts often `UNKNOWN` |
| `POST /api/ingest/telemetry` | Vehicle OEM / fleet | Decel series, impact, airbag, tilt — evidence only |
| `POST /api/ingest/traffic` | City traffic system | Speeds, congestion index |
| `POST /api/ingest/iot` | Sensors | Smoke, flood, air quality |
| `POST /api/ingest/gps` | Resource AVL | Marks stale if heartbeat missing |
| `POST /api/ingest/satellite` | EO hazard layers | Wide-area fire/flood; **not** street crash detection |
| `POST /api/ingest/citizen` | Mobile/web | Untrusted until fused |
| `POST /api/ingest/weather` | IMD / OpenWeather | |
| `POST /api/ingest/hospital` | Hospital capacity | Freshness required |
| `POST /api/ingest/resource` | Fleet status | |
| `POST /api/ingest/road-event` | Blockages, closures | Triggers reroute |

**Internal mock ingest (Phase 2):**

`POST /api/ingest/evidence` — body is `Evidence` without `id` (server assigns). Runs normalize → fusion → maybe re-optimize.

---

## 9. Webhook / Socket.IO

REST is request/response. Live updates use Socket.IO (see [EVENT-FLOW.md](./EVENT-FLOW.md)). Clients should GET snapshot then subscribe.

---

## 10. Error codes

| code | HTTP | Meaning |
| --- | --- | --- |
| `NOT_FOUND` | 404 | |
| `VALIDATION` | 400 | |
| `CONFLICT_STATE` | 409 | e.g. accept already-rejected recommendation |
| `NO_RESOURCES` | 422 | Optimizer ran; uncovered demand (still 200 on GET recommendations with shortage object — do not hide shortage) |
