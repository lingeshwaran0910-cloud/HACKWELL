import { prisma } from '../db/prisma';
import { Zone } from '../types/shared';
import { CreateZoneInput, UpdateZoneInput, ZoneQueryInput } from '../validators/zone.validator';
import { NotFoundError, ConflictError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

// Helper to deserialize Prisma Zone DB record to shared Zone interface
export function mapZoneFromDb(record: any): Zone {
  return {
    id: record.id,
    name: record.name,
    polygon: JSON.parse(record.polygon || '[]'),
    center: JSON.parse(record.center || '{}'),
    observabilityBaseline: record.observabilityBaseline,
    typicalSourceTypes: JSON.parse(record.typicalSourceTypes || '[]'),
    neighboringZoneIds: JSON.parse(record.neighboringZoneIds || '[]'),
    minCoverage: JSON.parse(record.minCoverage || '{}'),
    currentCoverage: JSON.parse(record.currentCoverage || '{}'),
    coverageStatus: record.coverageStatus,
    nearbyResourceIds: JSON.parse(record.nearbyResourceIds || '[]'),
    updatedAt: record.updatedAt,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'name', 'observabilityBaseline', 'coverageStatus', 'updatedAt'];

export class ZoneService {
  async getZones(query: ZoneQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.observabilityBaseline) {
      where.observabilityBaseline = query.observabilityBaseline;
    }
    if (query.coverageStatus) {
      where.coverageStatus = query.coverageStatus;
    }
    if (query.q) {
      where.name = { contains: query.q };
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'name';
    const sortOrder = query.sortOrder || 'asc';

    const [records, total] = await Promise.all([
      prisma.zone.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.zone.count({ where }),
    ]);

    return {
      data: records.map(mapZoneFromDb),
      total,
      page,
      limit,
    };
  }

  async getZoneById(id: string): Promise<Zone> {
    const record = await prisma.zone.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Zone with ID '${id}' not found`);
    }
    return mapZoneFromDb(record);
  }

  async createZone(input: CreateZoneInput): Promise<Zone> {
    const id = input.id || `zone-${Date.now()}`;
    const record = await prisma.zone.create({
      data: {
        id,
        name: input.name,
        polygon: JSON.stringify(input.polygon),
        center: JSON.stringify(input.center),
        observabilityBaseline: input.observabilityBaseline,
        typicalSourceTypes: JSON.stringify(input.typicalSourceTypes),
        neighboringZoneIds: JSON.stringify(input.neighboringZoneIds),
        minCoverage: JSON.stringify(input.minCoverage),
        currentCoverage: JSON.stringify(input.currentCoverage),
        coverageStatus: input.coverageStatus,
        nearbyResourceIds: JSON.stringify(input.nearbyResourceIds),
        updatedAt: new Date().toISOString(),
      },
    });
    const zone = mapZoneFromDb(record);
    eventPublisher.publishZoneUpdated(zone);
    return zone;
  }

  async updateZone(id: string, input: UpdateZoneInput): Promise<Zone> {
    const existing = await prisma.zone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Zone with ID '${id}' not found`);
    }

    const data: any = {
      updatedAt: new Date().toISOString(),
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.polygon !== undefined) data.polygon = JSON.stringify(input.polygon);
    if (input.center !== undefined) data.center = JSON.stringify(input.center);
    if (input.observabilityBaseline !== undefined) data.observabilityBaseline = input.observabilityBaseline;
    if (input.typicalSourceTypes !== undefined) data.typicalSourceTypes = JSON.stringify(input.typicalSourceTypes);
    if (input.neighboringZoneIds !== undefined) data.neighboringZoneIds = JSON.stringify(input.neighboringZoneIds);
    if (input.minCoverage !== undefined) data.minCoverage = JSON.stringify(input.minCoverage);
    if (input.currentCoverage !== undefined) data.currentCoverage = JSON.stringify(input.currentCoverage);
    if (input.coverageStatus !== undefined) data.coverageStatus = input.coverageStatus;
    if (input.nearbyResourceIds !== undefined) data.nearbyResourceIds = JSON.stringify(input.nearbyResourceIds);

    const updated = await prisma.zone.update({
      where: { id },
      data,
    });
    const zone = mapZoneFromDb(updated);
    eventPublisher.publishZoneUpdated(zone);
    return zone;
  }

  async deleteZone(id: string): Promise<void> {
    const existing = await prisma.zone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Zone with ID '${id}' not found`);
    }

    // Safety check: check if any incidents, resources, or hospitals reference this zone
    const [incidentCount, resourceCount, hospitalCount] = await Promise.all([
      prisma.incident.count({ where: { zoneId: id } }),
      prisma.resource.count({ where: { homeZoneId: id } }),
      prisma.hospital.count({ where: { zoneId: id } }),
    ]);

    if (incidentCount > 0 || resourceCount > 0 || hospitalCount > 0) {
      throw new ConflictError(
        `Cannot delete Zone '${id}' as it is currently referenced by existing entities (${incidentCount} incidents, ${resourceCount} resources, ${hospitalCount} hospitals)`
      );
    }

    await prisma.zone.delete({ where: { id } });
  }
}

export const zoneService = new ZoneService();
