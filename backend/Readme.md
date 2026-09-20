# SafeCity AI — Backend Service & REST API Layer

Production-ready modular backend for **SafeCity AI** providing structured database persistence, Zod validation, and complete REST APIs for all domain entities.

---

## 🛠 Tech Stack

- **Runtime:** Node.js, Express, TypeScript (Strict)
- **Database Layer:** Prisma ORM, SQLite (`dev.db` - zero dependency local storage)
- **Validation:** Zod (params, query parameters, request bodies)
- **Logging:** Pino (structured logger)
- **Testing:** Jest, Supertest

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client & Push Schema
```bash
npm run prisma:generate
npm run prisma:db:push
```

### 3. Seed Database with Hackwell City Data
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
# Server listening on http://localhost:4000
```

### 5. Run Type Check & Test Suite
```bash
npm run typecheck
npm test
```

### 6. Build Production Bundle
```bash
npm run build
npm start
```

---

## 📜 API Architecture & Response Format

All v1 endpoints follow the standard response envelope:

### Single Resource Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... }
}
```

### Collection Response (`200 OK`)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "totalPages": 1
  }
}
```

### Error Response (`400`, `404`, `409`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "path": "severity", "message": "Number must be less than or equal to 5" }
    ]
  }
}
```

---

## 📡 REST API Endpoint Documentation

### Health Endpoint
- `GET /api/health` — Public health check and service status

### 1. Zone Resource (`/api/v1/zones`)
- `GET /api/v1/zones` — Query zones (`?page=1&limit=20&observabilityBaseline=HIGH&coverageStatus=ADEQUATE&q=central`)
- `GET /api/v1/zones/:id` — Retrieve zone by ID
- `POST /api/v1/zones` — Create zone
- `PATCH /api/v1/zones/:id` — Update zone properties
- `DELETE /api/v1/zones/:id` — Safely delete zone (checks active entity dependencies)

### 2. Incident Resource (`/api/v1/incidents`)
- `GET /api/v1/incidents` — Query incidents (`?status=CORROBORATED&zoneId=zone-highway&type=ROAD_ACCIDENT&severity=4&open=true`)
- `GET /api/v1/incidents/:id` — Retrieve incident by ID
- `POST /api/v1/incidents` — Report/Create new incident
- `PATCH /api/v1/incidents/:id` — Update incident status, severity, assigned resources, or location

### 3. Evidence Resource (`/api/v1/evidence`)
- `GET /api/v1/evidence` — Query evidence (`?incidentId=inc-001&sourceType=VEHICLE_TELEMETRY&stale=false`)
- `GET /api/v1/evidence/:id` — Retrieve evidence details
- `POST /api/v1/evidence` — Ingest raw/normalized evidence telemetry
- `PATCH /api/v1/evidence/:id` — Update evidence confidence or stale flag

### 4. Resource / Fleet API (`/api/v1/resources`)
- `GET /api/v1/resources` — Query unit status (`?type=AMBULANCE&status=AVAILABLE&zoneId=zone-central&capability=ALS`)
- `GET /api/v1/resources/:id` — Retrieve resource by call sign / ID
- `POST /api/v1/resources` — Register new emergency unit
- `PATCH /api/v1/resources/:id` — Update unit status, ETA, location, or assignment

### 5. Hospital Resource (`/api/v1/hospitals`)
- `GET /api/v1/hospitals` — Query hospital capacity (`?zoneId=zone-hospital&stale=false`)
- `GET /api/v1/hospitals/:id` — Retrieve hospital details
- `POST /api/v1/hospitals` — Register medical facility
- `PATCH /api/v1/hospitals/:id` — Update hospital beds, incoming load, or predicted pressure

### 6. Route Resource (`/api/v1/routes`)
- `GET /api/v1/routes` — Query active routes (`?resourceId=res-a12&incidentId=inc-001&blocked=false`)
- `GET /api/v1/routes/:id` — Retrieve route details
- `POST /api/v1/routes` — Save route geometry / calculation
- `PATCH /api/v1/routes/:id` — Update route status or mark blocked

### 7. Recommendation Lifecycle API (`/api/v1/recommendations`)
- `GET /api/v1/recommendations` — Query dispatch recommendations (`?incidentId=inc-001&state=PROPOSED`)
- `GET /api/v1/recommendations/:id` — Retrieve recommendation by ID
- `POST /api/v1/recommendations/:id/accept` — Operator accepts dispatch recommendation (`{ "operatorNote": "..." }`)
- `POST /api/v1/recommendations/:id/reject` — Operator rejects dispatch recommendation (`{ "operatorNote": "..." }`)
- `POST /api/v1/recommendations/:id/modify` — Operator modifies recommendation plan (`{ "operatorNote": "...", "modifiedPlan": { ... } }`)

### 8. System Events API (`/api/v1/events`)
- `GET /api/v1/events` — Query system alert feed (`?severity=WARNING&type=SYSTEM_ALERT`)
- `GET /api/v1/events/:id` — Retrieve system event by ID
- `POST /api/v1/events` — Create system alert event

---

## 🔒 Security & Data Safety

1. **Mass Assignment Prevention:** `PATCH` handlers explicitly update whitelisted domain fields.
2. **Strict Zod Parsing:** Request route parameters, query strings, and JSON bodies are validated before touching services or Prisma.
3. **Internal Error Shielding:** Database connection strings, stack traces, and internal Prisma exceptions are never leaked in client responses.
