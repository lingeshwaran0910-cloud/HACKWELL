import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function seedTestData() {
  const dataPath = path.resolve(__dirname, '../../../mock-data/hackwell-city.json');
  if (!fs.existsSync(dataPath)) return;
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const cityData = JSON.parse(raw);

  await prisma.simulation.deleteMany();
  await prisma.systemEvent.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.route.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.zone.deleteMany();

  for (const item of cityData.zones || []) {
    await prisma.zone.create({
      data: {
        id: item.id,
        name: item.name,
        polygon: JSON.stringify(item.polygon),
        center: JSON.stringify(item.center),
        observabilityBaseline: item.observabilityBaseline,
        typicalSourceTypes: JSON.stringify(item.typicalSourceTypes),
        neighboringZoneIds: JSON.stringify(item.neighboringZoneIds),
        minCoverage: JSON.stringify(item.minCoverage),
        currentCoverage: JSON.stringify(item.currentCoverage),
        coverageStatus: item.coverageStatus,
        nearbyResourceIds: JSON.stringify(item.nearbyResourceIds),
        updatedAt: item.updatedAt || new Date().toISOString(),
      },
    });
  }

  for (const item of cityData.hospitals || []) {
    await prisma.hospital.create({
      data: {
        id: item.id,
        name: item.name,
        location: JSON.stringify(item.location),
        zoneId: item.zoneId,
        capabilities: JSON.stringify(item.capabilities),
        bedsTotal: item.bedsTotal,
        bedsAvailable: JSON.stringify(item.bedsAvailable),
        currentLoad: JSON.stringify(item.currentLoad),
        incomingLoad: item.incomingLoad,
        predictedPressure: JSON.stringify(item.predictedPressure),
        lastUpdateAt: item.lastUpdateAt || new Date().toISOString(),
        stale: Boolean(item.stale),
        updatedAt: item.updatedAt || new Date().toISOString(),
      },
    });
  }

  for (const item of cityData.resources || []) {
    await prisma.resource.create({
      data: {
        id: item.id,
        callSign: item.callSign,
        type: item.type,
        capabilities: JSON.stringify(item.capabilities),
        homeZoneId: item.homeZoneId,
        location: item.location ? JSON.stringify(item.location) : null,
        status: item.status,
        etaMinutes: item.etaMinutes ?? null,
        assignmentIncidentId: item.assignmentIncidentId ?? null,
        destinationHospitalId: item.destinationHospitalId ?? null,
        lastUpdateAt: item.lastUpdateAt || new Date().toISOString(),
        freshnessSeconds: item.freshnessSeconds ?? 0,
        stale: Boolean(item.stale),
        staleReason: item.staleReason ?? null,
        unavailableReason: item.unavailableReason ?? null,
        isReserve: Boolean(item.isReserve),
        updatedAt: item.updatedAt || new Date().toISOString(),
      },
    });
  }

  for (const item of cityData.incidents || []) {
    await prisma.incident.create({
      data: {
        id: item.id,
        type: item.type,
        status: item.status,
        title: item.title,
        description: item.description,
        location: JSON.stringify(item.location),
        locationUncertaintyMeters: item.locationUncertaintyMeters ?? null,
        zoneId: item.zoneId,
        observability: item.observability,
        evidenceIds: JSON.stringify(item.evidenceIds || []),
        fused: JSON.stringify(item.fused || {}),
        conflicts: JSON.stringify(item.conflicts || []),
        hasConflict: Boolean(item.hasConflict),
        severity: item.severity,
        priority: JSON.stringify(item.priority || {}),
        responseDebt: JSON.stringify(item.responseDebt || {}),
        secondaryRisks: JSON.stringify(item.secondaryRisks || []),
        rippleEffects: JSON.stringify(item.rippleEffects || []),
        assignedResourceIds: JSON.stringify(item.assignedResourceIds || []),
        recommendedHospitalId: item.recommendedHospitalId ?? null,
        activeRouteIds: JSON.stringify(item.activeRouteIds || []),
        shortageFlags: JSON.stringify(item.shortageFlags || []),
        verificationRequired: Boolean(item.verificationRequired),
        silentAnomaly: Boolean(item.silentAnomaly),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        firstReportedAt: item.firstReportedAt || new Date().toISOString(),
        resolvedAt: item.resolvedAt ?? null,
      },
    });
  }

  for (const item of cityData.evidence || []) {
    await prisma.evidence.create({
      data: {
        id: item.id,
        sourceType: item.sourceType,
        timestamp: item.timestamp || new Date().toISOString(),
        ingestedAt: item.ingestedAt || new Date().toISOString(),
        location: item.location ? JSON.stringify(item.location) : null,
        incidentId: item.incidentId ?? null,
        raw: JSON.stringify(item.raw || {}),
        normalized: JSON.stringify(item.normalized || {}),
        confidence: item.confidence ?? 1.0,
        freshnessSeconds: item.freshnessSeconds ?? 0,
        stale: Boolean(item.stale),
        metadata: JSON.stringify(item.metadata || {}),
      },
    });
  }

  for (const item of cityData.routes || []) {
    await prisma.route.create({
      data: {
        id: item.id,
        resourceId: item.resourceId,
        incidentId: item.incidentId ?? null,
        hospitalId: item.hospitalId ?? null,
        origin: JSON.stringify(item.origin),
        destination: JSON.stringify(item.destination),
        waypoints: JSON.stringify(item.waypoints || []),
        distanceKm: item.distanceKm ?? null,
        etaMinutes: item.etaMinutes ?? null,
        routingMode: item.routingMode || 'SIMULATED',
        blocked: Boolean(item.blocked),
        trafficFactor: item.trafficFactor ?? 1.0,
        roadEventIds: JSON.stringify(item.roadEventIds || []),
        lastCalculatedAt: item.lastCalculatedAt || new Date().toISOString(),
        estimated: Boolean(item.estimated),
        routingStatus: item.routingStatus ?? null,
        isSimulated: item.isSimulated !== undefined ? Boolean(item.isSimulated) : null,
        callSign: item.callSign ?? null,
        targetTitle: item.targetTitle ?? null,
      },
    });
  }

  for (const item of cityData.recommendations || []) {
    await prisma.recommendation.create({
      data: {
        id: item.id,
        incidentId: item.incidentId,
        relatedIncidentIds: JSON.stringify(item.relatedIncidentIds || []),
        state: item.state,
        createdAt: item.createdAt || new Date().toISOString(),
        plan: JSON.stringify(item.plan || {}),
        cost: JSON.stringify(item.cost || {}),
        reasons: JSON.stringify(item.reasons || []),
        coverageImpact: JSON.stringify(item.coverageImpact || []),
        shortage: item.shortage ? JSON.stringify(item.shortage) : null,
        simulationId: item.simulationId ?? null,
        decision: item.decision ? JSON.stringify(item.decision) : null,
        updatedAt: item.updatedAt || new Date().toISOString(),
      },
    });
  }

  for (const item of cityData.systemEvents || []) {
    await prisma.systemEvent.create({
      data: {
        id: item.id,
        type: item.type,
        severity: item.severity,
        timestamp: item.timestamp || new Date().toISOString(),
        entityType: item.entityType ?? null,
        entityId: item.entityId ?? null,
        payload: JSON.stringify(item.payload || {}),
        message: item.message,
      },
    });
  }
}

describe('SafeCity AI REST API v1 Suite', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await seedTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Health Endpoint
  describe('GET /api/health', () => {
    it('returns status ok with 200', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // 2. Zone API
  describe('Zone API (/api/v1/zones)', () => {
    it('GET /api/v1/zones returns collections with pagination meta', async () => {
      const res = await request(app).get('/api/v1/zones?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });

    it('GET /api/v1/zones/:id returns zone details', async () => {
      const res = await request(app).get('/api/v1/zones/zone-central');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('zone-central');
      expect(res.body.data.name).toBeDefined();
    });

    it('GET /api/v1/zones/:id returns 404 for nonexistent ID', async () => {
      const res = await request(app).get('/api/v1/zones/nonexistent-zone-999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('POST /api/v1/zones creates a new zone', async () => {
      const newZone = {
        id: 'zone-test-01',
        name: 'Test Zone',
        polygon: [
          { lat: 10.0, lng: 78.0 },
          { lat: 10.1, lng: 78.0 },
          { lat: 10.1, lng: 78.1 },
        ],
        center: { lat: 10.05, lng: 78.05 },
        observabilityBaseline: 'HIGH',
        minCoverage: { ambulance: 1, police: 1, fire: 0, rescue: 0 },
        currentCoverage: { ambulance: 1, police: 1, fire: 0, rescue: 0 },
      };
      const res = await request(app).post('/api/v1/zones').send(newZone);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('zone-test-01');
    });

    it('PATCH /api/v1/zones/:id updates zone details', async () => {
      const res = await request(app)
        .patch('/api/v1/zones/zone-test-01')
        .send({ name: 'Updated Test Zone' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Test Zone');
    });
  });

  // 3. Incident API
  describe('Incident API (/api/v1/incidents)', () => {
    it('GET /api/v1/incidents returns incidents with filtering', async () => {
      const res = await request(app).get('/api/v1/incidents?status=CORROBORATED');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].status).toBe('CORROBORATED');
      }
    });

    it('GET /api/v1/incidents/:id returns specific incident', async () => {
      const res = await request(app).get('/api/v1/incidents/inc-001');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('inc-001');
    });

    it('POST /api/v1/incidents creates a new incident', async () => {
      const payload = {
        type: 'ROAD_ACCIDENT',
        title: 'Test Incident',
        description: 'Multi-vehicle collision on test highway',
        location: { lat: 10.86, lng: 78.69 },
        zoneId: 'zone-highway',
        severity: 4,
      };
      const res = await request(app).post('/api/v1/incidents').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Incident');
    });

    it('PATCH /api/v1/incidents/:id updates incident status', async () => {
      const res = await request(app)
        .patch('/api/v1/incidents/inc-001')
        .send({ status: 'ACTIVE_RESPONSE' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE_RESPONSE');
    });
  });

  // 4. Evidence API
  describe('Evidence API (/api/v1/evidence)', () => {
    it('GET /api/v1/evidence lists evidence items', async () => {
      const res = await request(app).get('/api/v1/evidence');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/v1/evidence stores new telemetry evidence', async () => {
      const payload = {
        sourceType: 'VEHICLE_TELEMETRY',
        raw: { speed: 85, brake: true },
        confidence: 0.95,
      };
      const res = await request(app).post('/api/v1/evidence').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.sourceType).toBe('VEHICLE_TELEMETRY');
    });
  });

  // 5. Resource API
  describe('Resource API (/api/v1/resources)', () => {
    it('GET /api/v1/resources filters by status and type', async () => {
      const res = await request(app).get('/api/v1/resources?type=AMBULANCE&status=AVAILABLE');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/resources/:id returns resource details', async () => {
      const res = await request(app).get('/api/v1/resources/res-a12');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('res-a12');
      expect(res.body.data.callSign).toBe('AMB-022');
    });

    it('PATCH /api/v1/resources/:id updates resource location/status', async () => {
      const res = await request(app)
        .patch('/api/v1/resources/res-a12')
        .send({ status: 'EN_ROUTE', etaMinutes: 4.5 });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('EN_ROUTE');
      expect(res.body.data.etaMinutes).toBe(4.5);
    });
  });

  // 6. Hospital API
  describe('Hospital API (/api/v1/hospitals)', () => {
    it('GET /api/v1/hospitals returns hospital list', async () => {
      const res = await request(app).get('/api/v1/hospitals');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/v1/hospitals/:id returns specific hospital', async () => {
      const res = await request(app).get('/api/v1/hospitals/hosp-001');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('hosp-001');
    });

    it('PATCH /api/v1/hospitals/:id updates capacity data', async () => {
      const res = await request(app)
        .patch('/api/v1/hospitals/hosp-001')
        .send({ incomingLoad: 3 });
      expect(res.status).toBe(200);
      expect(res.body.data.incomingLoad).toBe(3);
    });
  });

  // 7. Route API
  describe('Route API (/api/v1/routes)', () => {
    it('GET /api/v1/routes lists routes', async () => {
      const res = await request(app).get('/api/v1/routes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/routes creates route record', async () => {
      const payload = {
        resourceId: 'res-a12',
        incidentId: 'inc-001',
        origin: { lat: 10.86, lng: 78.69 },
        destination: { lat: 10.81, lng: 78.68 },
        routingMode: 'SIMULATED',
      };
      const res = await request(app).post('/api/v1/routes').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.resourceId).toBe('res-a12');
    });
  });

  // 8. Recommendation API
  describe('Recommendation API (/api/v1/recommendations)', () => {
    it('GET /api/v1/recommendations lists recommendations', async () => {
      const res = await request(app).get('/api/v1/recommendations');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/recommendations/:id/modify updates state to MODIFIED', async () => {
      const modifiedPlan = {
        assignments: [{ resourceId: 'res-a07', role: 'ALS', etaMinutes: 6, fromZoneId: 'zone-central' }],
        hospitalId: 'hosp-001',
        routeIds: [],
        mutualAidFromZoneIds: [],
        uncoveredDemand: [],
      };
      const res = await request(app)
        .post('/api/v1/recommendations/rec-001/modify')
        .send({ operatorNote: 'Substituted A07 for A12', modifiedPlan });
      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('MODIFIED');
      expect(res.body.data.decision.action).toBe('MODIFY');
    });

    it('POST /api/v1/recommendations/:id/accept updates state to ACCEPTED', async () => {
      const res = await request(app)
        .post('/api/v1/recommendations/rec-001/accept')
        .send({ operatorNote: 'Dispatch approved by Shift Supervisor' });
      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('ACCEPTED');
      expect(res.body.data.decision.action).toBe('ACCEPT');
    });

    it('POST /api/v1/recommendations/:id/reject updates state to REJECTED', async () => {
      const res = await request(app)
        .post('/api/v1/recommendations/rec-001/reject')
        .send({ operatorNote: 'Holding unit for higher severity' });
      expect(res.status).toBe(200);
      expect(res.body.data.state).toBe('REJECTED');
      expect(res.body.data.decision.action).toBe('REJECT');
    });
  });

  // 9. System Event API
  describe('System Event API (/api/v1/events)', () => {
    it('GET /api/v1/events lists events', async () => {
      const res = await request(app).get('/api/v1/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/events logs a system event', async () => {
      const payload = {
        type: 'SYSTEM_ALERT',
        severity: 'WARNING',
        message: 'High traffic congestion detected near East Corridor',
      };
      const res = await request(app).post('/api/v1/events').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.data.severity).toBe('WARNING');
    });
  });

  // 10. Validation & Edge Cases
  describe('Validation & Edge Cases', () => {
    it('returns 400 for invalid page number', async () => {
      const res = await request(app).get('/api/v1/incidents?page=invalid');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for limit exceeding 100', async () => {
      const res = await request(app).get('/api/v1/incidents?limit=500');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid enum value on creation', async () => {
      const res = await request(app).post('/api/v1/incidents').send({
        type: 'INVALID_TYPE_ENUM',
        title: 'Crash',
        description: 'Invalid enum test',
        location: { lat: 10, lng: 78 },
        zoneId: 'zone-central',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
