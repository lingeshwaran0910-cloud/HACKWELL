import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Demo Users ───────────────────────────────────────────────────────────────
// SECURITY: passwords are bcrypt-hashed before storage. Plaintext only exists
// in this array during seed script execution and is never persisted anywhere.
const DEMO_USERS = [
  {
    username: 'lingesh',
    password: 'lingesh1234',
    name: 'Lingeshwaran',
    role: 'EOC Shift Lead',
    department: 'Emergency Operations Center',
    operatorId: 'EOC-001',
    avatar: 'L',
    permissions: JSON.stringify(['ALL']),
    email: 'lingesh@safecity.local',
  },
  {
    username: 'sivakumar',
    password: 'sivakumar1234',
    name: 'Siva Kumar',
    role: 'Medical Operations Officer',
    department: 'Emergency Medical Services',
    operatorId: 'MED-002',
    avatar: 'SK',
    permissions: JSON.stringify(['INCIDENTS', 'HOSPITALS', 'AMBULANCES', 'MAP']),
    email: 'sivakumar@safecity.local',
  },
  {
    username: 'abishek',
    password: 'abishek1234',
    name: 'Abishek',
    role: 'Fire Operations Officer',
    department: 'Fire & Rescue Service',
    operatorId: 'FIR-003',
    avatar: 'A',
    permissions: JSON.stringify(['INCIDENTS', 'FIRE_RESOURCES', 'MAP', 'ACTIVITY']),
    email: 'abishek@safecity.local',
  },
  {
    username: 'balamurugan',
    password: 'balamurugan1234',
    name: 'Bala Murugan',
    role: 'City Intelligence Lead',
    department: 'Urban Intelligence & GIS',
    operatorId: 'INT-004',
    avatar: 'BM',
    permissions: JSON.stringify(['ALL']),
    email: 'balamurugan@safecity.local',
  },
];

async function seedUsers() {
  console.log('Seeding demo users...');
  for (const userData of DEMO_USERS) {
    const { password, ...rest } = userData;
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    await prisma.user.upsert({
      where: { username: rest.username },
      update: {
        // Update name, role, operatorId — but preserve existing password hash
        // unless explicitly re-seeding (use update: {} to skip password reset)
        name: rest.name,
        role: rest.role,
        department: rest.department,
        operatorId: rest.operatorId,
        avatar: rest.avatar,
        permissions: rest.permissions,
        email: rest.email,
        updatedAt: now,
        active: true,
      },
      create: {
        ...rest,
        passwordHash,
        createdAt: now,
        updatedAt: now,
        active: true,
      },
    });
    console.log(`  ✓ User: ${rest.username} (${rest.name}, ${rest.operatorId})`);
  }
  console.log(`Seeded ${DEMO_USERS.length} demo users.`);
}

async function main() {
  console.log('Seeding SafeCity AI data from hackwell-city.json...');

  // Seed demo users first (idempotent — uses upsert, never deletes users)
  await seedUsers();

  const dataPath = path.resolve(__dirname, '../../mock-data/hackwell-city.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Seed data file not found at:', dataPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const cityData = JSON.parse(raw);

  // Clear existing records in reverse dependency order
  await prisma.simulation.deleteMany();
  await prisma.systemEvent.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.route.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.zone.deleteMany();

  // 1. Zones
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
  console.log(`Seeded ${cityData.zones?.length || 0} zones.`);

  // 2. Hospitals
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
  console.log(`Seeded ${cityData.hospitals?.length || 0} hospitals.`);

  // 3. Resources
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
  console.log(`Seeded ${cityData.resources?.length || 0} resources.`);

  // 4. Incidents
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
  console.log(`Seeded ${cityData.incidents?.length || 0} incidents.`);

  // 5. Evidence
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
  console.log(`Seeded ${cityData.evidence?.length || 0} evidence records.`);

  // 6. Routes
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
  console.log(`Seeded ${cityData.routes?.length || 0} routes.`);

  // 7. Recommendations
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
  console.log(`Seeded ${cityData.recommendations?.length || 0} recommendations.`);

  // 8. System Events
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
  console.log(`Seeded ${cityData.systemEvents?.length || 0} system events.`);

  // 9. Simulations
  for (const item of cityData.simulations || []) {
    await prisma.simulation.create({
      data: {
        id: item.id,
        label: item.label,
        createdAt: item.createdAt || new Date().toISOString(),
        assumptions: JSON.stringify(item.assumptions || {}),
        plans: JSON.stringify(item.plans || []),
        comparison: JSON.stringify(item.comparison || []),
        simulated: item.simulated !== undefined ? Boolean(item.simulated) : true,
        disclaimer: item.disclaimer || 'Simulated scenario comparison',
      },
    });
  }
  console.log(`Seeded ${cityData.simulations?.length || 0} simulations.`);

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
