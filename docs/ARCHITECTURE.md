# SafeCity AI — Architecture

**SafeCity AI** is an adaptive emergency-response **coordination and decision-support** layer. It builds a live city situation model from whatever evidence is available, evaluates **city-wide consequences** of a response, and continuously re-plans as conditions change.

This document is the Phase 1 logical architecture for a **4-hour hackathon prototype**. Production integrations are designed as adapters; the demo uses **controlled mock data** and **simulated feeds**.

---

## 1. What this system is (and is not)

| This system is | This system is not |
| --- | --- |
| A live situation model + operator decision-support console | A simple “report an emergency” website |
| Evidence fusion with explicit uncertainty | An oracle that invents victim counts or CCTV where none exists |
| Deterministic optimization **recommending** dispatch | Autonomous life-critical dispatch |
| Adaptive to available sensors per location | A CCTV-everywhere assumption |

**Central differentiator:** SafeCity does not only find *a* response for an incident; it scores the **city-wide impact** of that response (coverage, other incidents, hospital pressure, routes, shortage) and **re-optimizes** when the world changes.

---

## 2. Design principles

1. **Sensor-adaptive, not sensor-complete.** Ingest what exists for that place and time. Missing sources → lower **observability**, not “no incident.”
2. **Do not fabricate.** Unknown people counts stay `UNKNOWN`. Unavailable units are never invented. Stale GPS is `UNKNOWN` / stale, not a trusted location.
3. **Confidence is evidence quality**, not certainty about people or medical truth.
4. **LLMs never choose the dispatch.** OpenAI (optional) may extract text, compare report similarity, or draft explanations. Assignment cost is **deterministic**.
5. **Human-in-the-loop.** Recommendations are `PROPOSED` until an operator `ACCEPT` / `MODIFY` / `REJECT`.
6. **Modular monolith.** One Node/Express process, one PostgreSQL database, in-process modules. No Kubernetes, Kafka, Redis, Docker, or microservice fleet for the hackathon.
7. **Demo-first realism.** Fifteen scripted scenarios in `mock-data/` drive a convincing operator demo.

---

## 3. Logical pipeline

```
DATA SOURCES (real or simulated)
        ↓
API / ADAPTER LAYER
        ↓
EVENT INGESTION
        ↓
NORMALIZATION
        ↓
INCIDENT FUSION
        ↓
INTELLIGENCE (confidence, conflicts, observability, silent anomalies)
        ↓
PRIORITY + RESPONSE DEBT
        ↓
OPTIMIZATION (assignment cost, coverage, shortage, mutual aid)
        ↓
ROUTING + HOSPITAL MATCHING
        ↓
WHAT-IF SIMULATION (optional, operator-triggered)
        ↓
HUMAN APPROVAL
        ↓
LIVE RESPONSE (dispatch state machine)
        ↓
REAL-TIME MONITORING (Socket.IO)
        ↓
RE-OPTIMIZATION (on ETA/road/resource/hospital/incident change)
```

Incident lifecycle (status values are canonical):

```
NEW EVENT
  → SENSOR-ADAPTIVE INGESTION
  → NORMALIZATION
  → INCIDENT FUSION
  → DUPLICATE / CONFLICT DETECTION
  → EVIDENCE CONFIDENCE
  → INCIDENT PRIORITY
  → RESPONSE OPTIONS
  → WHAT-IF SIMULATION
  → CITY-WIDE IMPACT / COVERAGE CHECK
  → HUMAN APPROVAL
  → RESOURCE DISPATCH
  → LIVE MONITORING
  → RE-OPTIMIZATION
  → RESOLVED
```

**Incident status:** `NEW` → `SUSPECTED` → `CORROBORATED` → `VERIFIED` → `ACTIVE_RESPONSE` → `RESOLVED`

Not every incident walks every status. A single high-quality `EMERGENCY_CALL` plus telemetry may skip from `NEW` to `CORROBORATED`. Harsh braking **alone** must remain `SUSPECTED` — verification required.

---

## 4. Modular monolith (hackathon runtime)

One backend process. Folders are **modules**, not deployable services.

| Module | Responsibility | Hackathon implementation |
| --- | --- | --- |
| `frontend/` | Operator console: map, incident board, coverage, hospital pressure, recommendations, what-if | React + Vite + TS + Tailwind + Leaflet + Recharts + Socket.IO client |
| `backend/` | REST, Socket.IO, Prisma, orchestration, in-memory clock for mock time | Express + TypeScript + PostgreSQL |
| `intelligence/` | Normalization helpers, fusion rules, conflict detection, observability, silent-anomaly flags, optional LLM extract/explain | Pure TS functions called by backend |
| `optimization/` | Assignment cost, coverage, hospital matching, response debt, bottleneck detection, what-if | Pure TS functions; **no LLM in the cost function** |
| `shared/` | Types, enums, API DTO shapes, event names | TypeScript contracts imported by other packages |
| `mock-data/` | City seed, scenario scripts, simulated feed ticks | JSON + spec; adapters replay this |
| `docs/` | Architecture and contracts (this folder) | Markdown |
| `tests/` | Unit tests for fusion, cost, coverage, hospital ranking | Later phase |

**Suggested backend internal packages (same process):**

```
backend/src
  adapters/          # EmergencyCallAdapter, TelemetryAdapter, … (mock now)
  ingest/
  normalize/
  fusion/            # may re-export intelligence
  routes/            # Express
  realtime/          # Socket.IO
  clock/             # demo time + replay
```

Adapters implement `EvidenceAdapter.ingest(raw) → NormalizedEvidence`. Production 112/108, CCTV vendors, OSRM, hospital HL7, etc. swap in behind the same interface. See [API-CONTRACT.md](./API-CONTRACT.md) § Future ingestion.

---

## 5. Data sources and observability

Sources are first-class (`EvidenceSourceType`). **No source is required everywhere.**

| Context (example) | Typical available sources | Observability |
| --- | --- | --- |
| Urban core | CCTV metadata, 112/108, traffic, GPS, citizen reports | `HIGH` |
| Remote highway | Calls, vehicle telemetry, traffic, satellite (wide-area only) | `PARTIAL` |
| Forest / peri-urban | Satellite, weather, IoT/fire sensors, sparse calls | `LOW` |

**Observability** (`HIGH` | `PARTIAL` | `LOW`) is a property of the **place + currently fresh sources**, not proof of safety. Lack of evidence ≠ no incident. Silent/unreported anomalies are flagged when traffic/telemetry/satellite disagree with “no incident” in that cell.

---

## 6. Intelligence vs optimization vs AI

```
        ┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
Evidence│ intelligence │     │  optimization   │     │  optional   │
  + text│ fusion,      │────▶│  assignment     │────▶│  LLM        │
        │ conflicts,   │     │  cost, coverage,│     │  explanation│
        │ observability│     │  hospitals,     │     │  of a       │
        └──────────────┘     │  what-if        │     │  frozen plan│
                             └─────────────────┘     └─────────────┘
                                      ▲
                                      │ never writes the plan
```

Details: [AI-LOGIC.md](./AI-LOGIC.md), [OPTIMIZATION.md](./OPTIMIZATION.md).

---

## 7. Real-time and persistence

- **PostgreSQL + Prisma:** incidents, evidence, resources, hospitals, zones, recommendations, routes, simulations, system events, operator decisions.
- **Socket.IO:** live board (event names in [EVENT-FLOW.md](./EVENT-FLOW.md)).
- **Hackathon clock:** mock feeds emit timestamps; the UI can show “demo time.” No Redis pub/sub.

---

## 8. Routing

**Preferred:** OSRM HTTP API if a public/demo instance is reachable.  
**Fallback (default for hackathon reliability):** simulated routing using zone graph + road-event penalties (blockage, congestion). Both return the same `Route` shape with `routingMode: "OSRM" | "SIMULATED"` and results labeled estimated when simulated.

Road blockage / traffic updates **invalidate** routes, recompute ETA, and may enqueue **re-optimization**.

---

## 9. Safety and realism (non-negotiable)

The product copy, UI, and logs must **never** claim:

- Vehicle telemetry alone **proves** an accident
- Satellite detects every road accident or works at street level continuously
- CCTV exists everywhere
- AI perfectly knows victim count
- AI autonomously makes medical or life-critical decisions
- The system creates emergency units that do not exist
- Hospital choice is nearest-distance only
- Citizen reports are automatically true or false

Telemetry (deceleration cascade, impact, airbag, rollover, GPS stop) **raises collision evidence confidence**. Harsh braking alone → `SUSPECTED — VERIFICATION REQUIRED`. Satellite is a **wide-area hazard** source (fire, flood, disaster), not continuous crash detection.

---

## 10. What Phase 1 does **not** include

No complete frontend/backend, no Prisma migrations, no OpenAI calls, no optimizer implementation, no auth, no deployment. Those start in Phase 2 per [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md).

---

## 11. Related documents

| Doc | Content |
| --- | --- |
| [DATA-MODEL.md](./DATA-MODEL.md) | Entities, fields, relationships |
| [API-CONTRACT.md](./API-CONTRACT.md) | REST + future adapters |
| [EVENT-FLOW.md](./EVENT-FLOW.md) | Lifecycle + Socket.IO |
| [AI-LOGIC.md](./AI-LOGIC.md) | Fusion, confidence, LLM boundaries |
| [OPTIMIZATION.md](./OPTIMIZATION.md) | Cost, coverage, hospitals, debt |
| [DEMO-SCENARIOS.md](./DEMO-SCENARIOS.md) | Operator demo narrative |
| [../mock-data/SPEC.md](../mock-data/SPEC.md) | Seed data specification |
| [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md) | Timed hackathon phases |
