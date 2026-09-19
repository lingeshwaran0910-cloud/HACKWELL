# SafeCity AI — Development Plan

**Constraint:** ~4 hours. Modular monolith. Mock data. No Kubernetes/Kafka/Redis/Docker/multi-DB.

Phase 1 (this folder) is **complete when docs + contracts + mock spec exist**. Do **not** start Phase 2 in the same step as architecture.

---

## Phase 1 — Architecture and contracts (STOP here)

**Done when:**

- `docs/*` as listed in README
- `shared/types.ts` enums and DTOs
- `mock-data/SPEC.md` + seed JSON
- Root README filled; module READMEs not deleted

**Out of scope:** app code, Prisma migrate, UI, OpenAI, optimizer implementation.

**Exact next step after Phase 1:** see § Phase 2 first task.

---

## Phase 2 — Runnable skeleton + seed (≈60–75 min)

**Goal:** `npm` scripts start API + Vite; map shows zones and mock markers.

1. **Monorepo-lite wiring:** `shared` types; backend Express+TS; frontend Vite React TS Tailwind; Prisma schema **matching** DATA-MODEL (one Postgres).
2. **Load `mock-data/hackwell-city.json`** into DB or in-memory store if Postgres isn’t ready — prefer Prisma seed, fallback in-memory **documented**.
3. REST reads: incidents, resources, hospitals, coverage, recommendations (static seed recs OK).
4. Socket.IO server + client “hello” + `incident.updated` on a demo tick.
5. Leaflet map: zones polygons, incident/resource icons, status color.

**Exit:** judge can open UI and see Hackwell city situation.

---

## Phase 3 — Intelligence + optimizer (≈60–75 min)

1. Implement `intelligence` fusion/conflict/observability **functions** + unit tests for conflict → UNKNOWN and harsh-brake → SUSPECTED.
2. Implement `optimization` cost, coverage, hospital rank, response debt, shortage.
3. `POST /api/recommendations/:id/accept|reject` (+ modify if time).
4. `POST /api/simulations` comparing PLAN A/B for `inc-acc-01`.
5. Ingest hook `POST /api/ingest/evidence` used by mock replay (blockage, failure, stale).

**Exit:** simultaneous shortage produces explained recs; accept moves resource states.

---

## Phase 4 — Operator UX polish (≈45–60 min)

1. Incident drawer: evidence timeline, conflicts, UNKNOWN, observability.
2. Recommendation panel with reasons + coverage banner **COVERAGE RISK**.
3. Emergency chain visualization (5 nodes).
4. Ripple links (simple list or map polylines).
5. What-if comparison table; label Simulated.
6. Hospital panel: current / incoming / predicted pressure.
7. Recharts: coverage by zone, debt vs wait.

**Exit:** 10-minute demo script from DEMO-SCENARIOS.md works.

---

## Phase 5 — Hardening only if time (≤30 min)

- OSRM optional; keep simulated routing default
- Optional OpenAI explain with template fallback
- Historical resolved strip
- Tests for assignment not stealing last coverage unit for traffic incident

**Do not start:** auth, mobile app, real 112 integration, video ML, Kubernetes.

---

## Work split (if multiple agents)

| Agent | Owns | Must not |
| --- | --- | --- |
| Frontend | `frontend/` | Invent API fields |
| Backend | `backend/` + Prisma | Call OpenAI for dispatch |
| Intelligence | `intelligence/` | Assign resources |
| Optimization | `optimization/` | Use LLM in cost |

**Shared contract freeze:** `shared/types.ts` and `docs/API-CONTRACT.md`. Change types first, then both sides.

---

## Phase 2 — EXACT first development step

1. Add `shared/package.json` (or tsconfig path aliases) so types import cleanly.
2. Create `backend` Express app with `GET /api/health` and `GET /api/incidents` returning **seed JSON mapped to `Incident[]`** (in-memory is acceptable for the first green run).
3. Create `frontend` Vite app with Leaflet map rendering `zones` from the same seed.
4. Do **not** implement fusion/optimizer until those two reads render.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Postgres unavailable on a laptop | In-memory store behind same repo functions |
| OSRM down | Simulated routing default |
| OpenAI down / no key | Template explanations |
| Scope creep (auth, microservices) | Refuse; this plan wins |
| Agents diverging types | `shared/types.ts` is source of truth |
