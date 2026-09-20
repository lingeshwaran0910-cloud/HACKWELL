import { prisma } from '../db/prisma';
import { Resource } from '../types/shared';
import { CreateResourceInput, UpdateResourceInput, ResourceQueryInput } from '../validators/resource.validator';
import { NotFoundError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapResourceFromDb(record: any): Resource {
  return {
    id: record.id,
    callSign: record.callSign,
    type: record.type,
    capabilities: JSON.parse(record.capabilities || '[]'),
    homeZoneId: record.homeZoneId,
    location: record.location ? JSON.parse(record.location) : null,
    status: record.status,
    etaMinutes: record.etaMinutes,
    assignmentIncidentId: record.assignmentIncidentId,
    destinationHospitalId: record.destinationHospitalId,
    lastUpdateAt: record.lastUpdateAt,
    freshnessSeconds: record.freshnessSeconds,
    stale: record.stale,
    staleReason: record.staleReason,
    unavailableReason: record.unavailableReason,
    isReserve: record.isReserve,
    updatedAt: record.updatedAt,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'callSign', 'type', 'status', 'homeZoneId', 'updatedAt', 'lastUpdateAt'];

export class ResourceService {
  async getResources(query: ResourceQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    const targetZoneId = query.zoneId || query.homeZoneId;
    if (targetZoneId) {
      where.homeZoneId = targetZoneId;
    }
    if (query.stale !== undefined) {
      where.stale = query.stale;
    }
    if (query.capability) {
      where.capabilities = { contains: query.capability };
    }
    if (query.q) {
      where.OR = [
        { callSign: { contains: query.q } },
        { type: { contains: query.q } },
      ];
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'callSign';
    const sortOrder = query.sortOrder || 'asc';

    const [records, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.resource.count({ where }),
    ]);

    return {
      data: records.map(mapResourceFromDb),
      total,
      page,
      limit,
    };
  }

  async getResourceById(id: string): Promise<Resource> {
    const record = await prisma.resource.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Resource with ID '${id}' not found`);
    }
    return mapResourceFromDb(record);
  }

  async createResource(input: CreateResourceInput): Promise<Resource> {
    const id = input.id || `res-${Date.now()}`;
    const now = new Date().toISOString();

    const record = await prisma.resource.create({
      data: {
        id,
        callSign: input.callSign,
        type: input.type,
        capabilities: JSON.stringify(input.capabilities),
        homeZoneId: input.homeZoneId,
        location: input.location ? JSON.stringify(input.location) : null,
        status: input.status,
        etaMinutes: input.etaMinutes ?? null,
        assignmentIncidentId: input.assignmentIncidentId ?? null,
        destinationHospitalId: input.destinationHospitalId ?? null,
        lastUpdateAt: now,
        freshnessSeconds: input.freshnessSeconds,
        stale: input.stale,
        staleReason: input.staleReason ?? null,
        unavailableReason: input.unavailableReason ?? null,
        isReserve: input.isReserve,
        updatedAt: now,
      },
    });

    const resource = mapResourceFromDb(record);
    eventPublisher.publishResourceCreated(resource);
    return resource;
  }

  async updateResource(id: string, input: UpdateResourceInput): Promise<Resource> {
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Resource with ID '${id}' not found`);
    }

    const now = new Date().toISOString();
    const data: any = {
      updatedAt: now,
      lastUpdateAt: now,
    };

    if (input.callSign !== undefined) data.callSign = input.callSign;
    if (input.type !== undefined) data.type = input.type;
    if (input.capabilities !== undefined) data.capabilities = JSON.stringify(input.capabilities);
    if (input.homeZoneId !== undefined) data.homeZoneId = input.homeZoneId;
    if (input.location !== undefined) data.location = input.location ? JSON.stringify(input.location) : null;
    if (input.status !== undefined) data.status = input.status;
    if (input.etaMinutes !== undefined) data.etaMinutes = input.etaMinutes;
    if (input.assignmentIncidentId !== undefined) data.assignmentIncidentId = input.assignmentIncidentId;
    if (input.destinationHospitalId !== undefined) data.destinationHospitalId = input.destinationHospitalId;
    if (input.freshnessSeconds !== undefined) data.freshnessSeconds = input.freshnessSeconds;
    if (input.stale !== undefined) data.stale = input.stale;
    if (input.staleReason !== undefined) data.staleReason = input.staleReason;
    if (input.unavailableReason !== undefined) data.unavailableReason = input.unavailableReason;
    if (input.isReserve !== undefined) data.isReserve = input.isReserve;

    const updated = await prisma.resource.update({
      where: { id },
      data,
    });

    const resource = mapResourceFromDb(updated);
    eventPublisher.publishResourceUpdated(resource);
    return resource;
  }
}

export const resourceService = new ResourceService();
