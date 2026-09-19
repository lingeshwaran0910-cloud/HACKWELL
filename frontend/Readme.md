# SafeCity AI — Frontend (Phase 2B Interactive Map)

Operator command-center frontend for **SafeCity AI — Real-Time Intelligent Emergency Response Network**.

> **Phase 2B Notice:** Includes a fully functional **2D Interactive City Operations Map** powered by Leaflet and React-Leaflet, rendering canonical Hackwell seed data (`mock-data/hackwell-city.json`).

---

## 🛠️ Technology Stack

- **Framework:** React 18
- **Build Tool:** Vite 5
- **Language:** TypeScript 5 (Strict type checking)
- **Map Engine:** Leaflet 1.9 & React-Leaflet 4.2
- **Styling:** Tailwind CSS (Dark command-center aesthetic)
- **Icons:** Lucide React & Custom Leaflet SVG DivIcons
- **Domain Contracts:** Reused directly from canonical `@shared/types` (`shared/types.ts`)

---

## 🚀 Getting Started

### 1. Installation

From the `frontend/` directory:

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The application will launch locally at `http://localhost:3000`.

### 3. Build & Typecheck

```bash
npm run build
```

Runs TypeScript checking (`tsc --noEmit`) followed by Vite production bundle compilation.

---

## 🗺️ Map Capabilities (Phase 2B)

1. **5 Hackwell City Zone Polygons:** Visual boundaries colored by baseline observability (`HIGH`: Blue, `PARTIAL`: Amber, `LOW`: Purple) and coverage status (`ADEQUATE`, `MARGINAL`, `COVERAGE_RISK`).
2. **Active Incident Markers:** Severity-scaled divIcons (`ROAD_ACCIDENT`, `FIRE`, `MEDICAL`, `TRAFFIC`, `SUSPECTED`). Interactive click popups and detail panel displaying fused victim/injury counts, conflict warnings, priority score, and evidence sources.
3. **Emergency Fleet Resource Markers:** Call-sign badges (`A12`, `A07`, `F01`, `P01`, `R01`, `T01`) with real-time status dots (`AVAILABLE`, `ASSIGNED`, `EN_ROUTE`, `UNAVAILABLE`, `STALE`).
4. **Hospitals:** Capacity badges displaying available beds, incoming patient load, trauma capability, and predicted pressure.
5. **Simulated Route Corridors:** Dashed vector polylines connecting resource origins to incident destinations.
6. **Layer Controls & Legend:** Interactive checkboxes for toggling Zones, Incidents, Resources, Hospitals, and Routes, plus a compact symbology legend.
7. **Reset View / Fit City:** Resets map bounds to fit the full extent of Hackwell city.
8. **Item Detail Drawer (`MapDetailPanel`):** Side panel displaying comprehensive metadata for selected incidents, resources, hospitals, or zones.

---

## 📂 Project Structure

```
frontend/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── Readme.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    │   ├── common/
    │   │   ├── SectionHeader.tsx
    │   │   └── StatusBadge.tsx
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── Header.tsx
    │   │   └── MainContent.tsx
    │   └── map/
    │       ├── CityOperationsMap.tsx
    │       ├── HospitalLayer.tsx
    │       ├── IncidentLayer.tsx
    │       ├── MapDetailPanel.tsx
    │       ├── MapLegend.tsx
    │       ├── ResourceLayer.tsx
    │       ├── RouteLayer.tsx
    │       ├── ZoneLayer.tsx
    │       └── mapIcons.ts
    ├── pages/
    │   └── CommandCenter.tsx
    └── services/
        └── mockService.ts
```

---

## 🎯 Next Planned Phase

**Phase 2C / Phase 3 Backend & Intelligence Wiring:**
- Express REST API endpoints (`/api/incidents`, `/api/resources`, `/api/hospitals`, `/api/coverage`).
- Socket.IO realtime tick events for mock scenario replay.
- Deterministic Optimizer & Fusion logic.
