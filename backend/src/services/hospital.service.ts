import { prisma } from '../db/prisma';
import { Hospital } from '../types/shared';
import { CreateHospitalInput, UpdateHospitalInput, HospitalQueryInput } from '../validators/hospital.validator';
import { NotFoundError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapHospitalFromDb(record: any): Hospital {
  return {
    id: record.id,
    name: record.name,
    location: JSON.parse(record.location || '{}'),
    zoneId: record.zoneId,
    capabilities: JSON.parse(record.capabilities || '[]'),
    bedsTotal: record.bedsTotal,
    bedsAvailable: JSON.parse(record.bedsAvailable || '"UNKNOWN"'),
    currentLoad: JSON.parse(record.currentLoad || '"UNKNOWN"'),
    incomingLoad: record.incomingLoad,
    predictedPressure: JSON.parse(record.predictedPressure || '{}'),
    lastUpdateAt: record.lastUpdateAt,
    stale: record.stale,
    updatedAt: record.updatedAt,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'name', 'bedsTotal', 'incomingLoad', 'zoneId', 'updatedAt'];

export class HospitalService {
  async getHospitals(query: HospitalQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.zoneId) {
      where.zoneId = query.zoneId;
    }
    if (query.stale !== undefined) {
      where.stale = query.stale;
    }
    if (query.capability) {
      where.capabilities = { contains: query.capability };
    }
    if (query.q) {
      where.name = { contains: query.q };
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'name';
    const sortOrder = query.sortOrder || 'asc';

    const [records, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.hospital.count({ where }),
    ]);

    return {
      data: records.map(mapHospitalFromDb),
      total,
      page,
      limit,
    };
  }

  async getHospitalById(id: string): Promise<Hospital> {
    const record = await prisma.hospital.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Hospital with ID '${id}' not found`);
    }
    return mapHospitalFromDb(record);
  }

  async createHospital(input: CreateHospitalInput): Promise<Hospital> {
    const id = input.id || `h-${Date.now()}`;
    const now = new Date().toISOString();

    const record = await prisma.hospital.create({
      data: {
        id,
        name: input.name,
        location: JSON.stringify(input.location),
        zoneId: input.zoneId,
        capabilities: JSON.stringify(input.capabilities),
        bedsTotal: input.bedsTotal,
        bedsAvailable: JSON.stringify(input.bedsAvailable),
        currentLoad: JSON.stringify(input.currentLoad),
        incomingLoad: input.incomingLoad,
        predictedPressure: JSON.stringify(input.predictedPressure),
        lastUpdateAt: now,
        stale: input.stale,
        updatedAt: now,
      },
    });

    const hospital = mapHospitalFromDb(record);
    eventPublisher.publishHospitalCreated(hospital);
    return hospital;
  }

  async updateHospital(id: string, input: UpdateHospitalInput): Promise<Hospital> {
    const existing = await prisma.hospital.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Hospital with ID '${id}' not found`);
    }

    const now = new Date().toISOString();
    const data: any = {
      updatedAt: now,
      lastUpdateAt: now,
    };

    if (input.name !== undefined) data.name = input.name;
    if (input.location !== undefined) data.location = JSON.stringify(input.location);
    if (input.zoneId !== undefined) data.zoneId = input.zoneId;
    if (input.capabilities !== undefined) data.capabilities = JSON.stringify(input.capabilities);
    if (input.bedsTotal !== undefined) data.bedsTotal = input.bedsTotal;
    if (input.bedsAvailable !== undefined) data.bedsAvailable = JSON.stringify(input.bedsAvailable);
    if (input.currentLoad !== undefined) data.currentLoad = JSON.stringify(input.currentLoad);
    if (input.incomingLoad !== undefined) data.incomingLoad = input.incomingLoad;
    if (input.predictedPressure !== undefined) data.predictedPressure = JSON.stringify(input.predictedPressure);
    if (input.stale !== undefined) data.stale = input.stale;

    const updated = await prisma.hospital.update({
      where: { id },
      data,
    });

    const hospital = mapHospitalFromDb(updated);
    eventPublisher.publishHospitalUpdated(hospital);
    return hospital;
  }
}

export const hospitalService = new HospitalService();
