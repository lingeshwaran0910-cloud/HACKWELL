# SafeCity AI — Real-Time Intelligent Emergency Response Network

Hackathon prototype for **Hackwell**: an adaptive emergency-response **coordination and decision-support** layer. SafeCity builds a live city situation model from whatever evidence is available, then evaluates the **city-wide consequences** of a response and re-plans as conditions change.

This repository is in **Phase 1 (architecture and contracts)**. The application is not implemented yet.

---

## Problem

Cities do not fail emergencies one at a time. Several incidents compete for scarce ambulances, engines, and hospital beds. Evidence is messy: 112/108 calls, citizen reports, telemetry, traffic, occasional CCTV, IoT, weather, and wide-area satellite hazard data. Many places have **no cameras**. Naive systems:

- assume CCTV everywhere
- send the nearest unit every time
- invent victim counts
- ignore coverage holes and hospital pressure
- treat “no report” as “no incident”

That produces brittle, overconfident dispatch.

---

## Solution

SafeCity fuses **available** evidence into incidents (with **UNKNOWN** and **conflicts** when facts disagree), scores **response debt** and priority transparently, and recommends dispatch using a **deterministic assignment cost** (travel, urgency, coverage loss, suitability, impact on other incidents). Operators **accept, modify, or reject**. What-if plans are labeled **simulated**. Missing sensors lower **observability**; they do not prove safety.

**Differentiator:** the system does not only find *a* response; it checks **coverage, shortage, mutual aid, hospital load, routes, ripple effects**, and **re-optimizes** when the world changes.

---

## Differentiators

- **City-wide consequence checking** before dispatch (coverage, shortage, mutual aid, other incidents).
- **Sensor-adaptive fusion** with explicit `UNKNOWN`, conflicts, observability, and silent anomalies.
- **Deterministic assignment cost** — LLMs explain, they do not dispatch.
- **Hospital matching** on capability, capacity, incoming load, and predicted pressure — not nearest-only.
- **What-if simulation** labeled estimated; **human accept / modify / reject**.
- **Re-optimization** when routes, units, hospitals, or new incidents change.

---

## Architecture (modular monolith)

```
DATA SOURCES (mocked adapters)
  → API / ADAPTER LAYER
  → INGEST → NORMALIZE → FUSE
  → INTELLIGENCE (confidence, conflicts, observability)
  → PRIORITY + RESPONSE DEBT
  → OPTIMIZATION (not an LLM)
  → ROUTING + HOSPITAL MATCHING
  → HUMAN APPROVAL
  → LIVE RESPONSE + SOCKET.IO MONITORING
  → RE-OPTIMIZATION
```

One Node/Express process, one PostgreSQL database (in-memory fallback allowed). No Kubernetes, Kafka, Redis, Docker, or microservice fleet for the hackathon.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Technology stack (target)

| Layer | Stack |
| --- | --- |
| Frontend | React, Vite, TypeScript, Tailwind CSS, Leaflet, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Realtime | Socket.IO |
| AI (optional) | OpenAI for text extract / similarity / explanations only |
| Routing | OSRM or **simulated fallback** (default) |

---

## Safety and realism

We **do not** claim: telemetry alone proves a crash; satellite detects every road accident; CCTV is ubiquitous; AI knows victim counts; AI makes life-critical decisions; the system creates units that do not exist; nearest hospital always wins; citizen reports are automatically true or false.

Harsh braking alone → **SUSPECTED — VERIFICATION REQUIRED**. Satellite is a **wide-area hazard** source. Stale GPS → resource **UNKNOWN**, location not trusted.

---

## Repository layout

| Path | Role |
| --- | --- |
| `docs/` | Architecture, data model, API, events, AI, optimization, demo, plan |
| `shared/` | TypeScript contracts |
| `mock-data/` | Hackwell city seed + spec |
| `frontend/` | Operator console (Phase 2+) |
| `backend/` | API + Socket.IO (Phase 2+) |
| `intelligence/` | Fusion / conflicts (Phase 3) |
| `optimization/` | Assignment cost (Phase 3) |
| `tests/` | Unit tests (Phase 3+) |

---

## Future integrations (adapters only)

112/108 CAD, CCTV **metadata**, OEM telemetry, city traffic, IoT, AVL/GPS, EO/satellite hazard layers, weather, hospital capacity, road closures. The hackathon uses [`mock-data/hackwell-city.json`](mock-data/hackwell-city.json).

---

## Development phases

1. **Architecture** (current) — docs and contracts  
2. **Skeleton + map + seed**  
3. **Intelligence + optimizer + accept/reject + what-if**  
4. **Operator UX**  
5. **Polish if time**

Exact next step: [docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md) § Phase 2.

**Do not skip to a full product in one leap.**

---

## Documentation index

- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA-MODEL.md)
- [API contract](docs/API-CONTRACT.md)
- [Event flow](docs/EVENT-FLOW.md)
- [AI logic](docs/AI-LOGIC.md)
- [Optimization](docs/OPTIMIZATION.md)
- [Demo scenarios](docs/DEMO-SCENARIOS.md)
- [Development plan](docs/DEVELOPMENT-PLAN.md)
- [Mock data spec](mock-data/SPEC.md)
