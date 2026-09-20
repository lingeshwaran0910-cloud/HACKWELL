import { prisma } from '../db/prisma';
import { Incident } from '../types/shared';
import { CreateIncidentInput, UpdateIncidentInput, IncidentQueryInput } from '../validators/incident.validator';
import { NotFoundError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapIncidentFromDb(record: any): Incident {
  return {
    id: record.id,
    type: record.type,
    status: record.status,
    title: record.title,
    description: record.description,
    location: JSON.parse(record.location || '{}'),
    locationUncertaintyMeters: record.locationUncertaintyMeters,
    zoneId: record.zoneId,
    observability: record.observability,
    evidenceIds: JSON.parse(record.evidenceIds || '[]'),
    fused: JSON.parse(record.fused || '{}'),
    conflicts: JSON.parse(record.conflicts || '[]'),
    hasConflict: record.hasConflict,
    severity: record.severity,
    priority: JSON.parse(record.priority || '{}'),
    responseDebt: JSON.parse(record.responseDebt || '{}'),
    secondaryRisks: JSON.parse(record.secondaryRisks || '[]'),
    rippleEffects: JSON.parse(record.rippleEffects || '[]'),
    assignedResourceIds: JSON.parse(record.assignedResourceIds || '[]'),
    recommendedHospitalId: record.recommendedHospitalId,
    activeRouteIds: JSON.parse(record.activeRouteIds || '[]'),
    shortageFlags: JSON.parse(record.shortageFlags || '[]'),
    verificationRequired: record.verificationRequired,
    silentAnomaly: record.silentAnomaly,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    firstReportedAt: record.firstReportedAt,
    resolvedAt: record.resolvedAt,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'type', 'status', 'severity', 'createdAt', 'updatedAt', 'zoneId'];

export class IncidentService {
  async getIncidents(query: IncidentQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.zoneId) {
      where.zoneId = query.zoneId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.severity !== undefined) {
      where.severity = query.severity;
    }
    if (query.open !== undefined) {
      if (query.open) {
        where.status = { not: 'RESOLVED' };
      } else {
        where.status = 'RESOLVED';
      }
    }
    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
      ];
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [records, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.incident.count({ where }),
    ]);

    return {
      data: records.map(mapIncidentFromDb),
      total,
      page,
      limit,
    };
  }

  async getIncidentById(id: string): Promise<Incident> {
    const record = await prisma.incident.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Incident with ID '${id}' not found`);
    }
    return mapIncidentFromDb(record);
  }

  async createIncident(input: CreateIncidentInput): Promise<Incident> {
    const id = input.id || `inc-${Date.now()}`;
    const now = new Date().toISOString();

    const record = await prisma.incident.create({
      data: {
        id,
        type: input.type,
        status: input.status,
        title: input.title,
        description: input.description,
        location: JSON.stringify(input.location),
        locationUncertaintyMeters: input.locationUncertaintyMeters ?? null,
        zoneId: input.zoneId,
        observability: input.observability,
        evidenceIds: JSON.stringify(input.evidenceIds),
        fused: JSON.stringify(input.fused),
        conflicts: JSON.stringify(input.conflicts),
        hasConflict: input.hasConflict,
        severity: input.severity,
        priority: JSON.stringify(input.priority),
        responseDebt: JSON.stringify(input.responseDebt),
        secondaryRisks: JSON.stringify(input.secondaryRisks),
        rippleEffects: JSON.stringify(input.rippleEffects),
        assignedResourceIds: JSON.stringify(input.assignedResourceIds),
        recommendedHospitalId: input.recommendedHospitalId ?? null,
        activeRouteIds: JSON.stringify(input.activeRouteIds),
        shortageFlags: JSON.stringify(input.shortageFlags),
        verificationRequired: input.verificationRequired,
        silentAnomaly: input.silentAnomaly,
        createdAt: now,
        updatedAt: now,
        firstReportedAt: now,
        resolvedAt: null,
      },
    });

    const incident = mapIncidentFromDb(record);
    eventPublisher.publishIncidentCreated(incident);
    return incident;
  }

  async updateIncident(id: string, input: UpdateIncidentInput): Promise<Incident> {
    const existing = await prisma.incident.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Incident with ID '${id}' not found`);
    }

    const data: any = {
      updatedAt: new Date().toISOString(),
    };

    if (input.type !== undefined) data.type = input.type;
    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'RESOLVED' && !existing.resolvedAt) {
        data.resolvedAt = new Date().toISOString();
      }
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.location !== undefined) data.location = JSON.stringify(input.location);
    if (input.locationUncertaintyMeters !== undefined) data.locationUncertaintyMeters = input.locationUncertaintyMeters;
    if (input.zoneId !== undefined) data.zoneId = input.zoneId;
    if (input.observability !== undefined) data.observability = input.observability;
    if (input.severity !== undefined) data.severity = input.severity;
    if (input.recommendedHospitalId !== undefined) data.recommendedHospitalId = input.recommendedHospitalId;
    if (input.assignedResourceIds !== undefined) data.assignedResourceIds = JSON.stringify(input.assignedResourceIds);
    if (input.activeRouteIds !== undefined) data.activeRouteIds = JSON.stringify(input.activeRouteIds);
    if (input.shortageFlags !== undefined) data.shortageFlags = JSON.stringify(input.shortageFlags);
    if (input.verificationRequired !== undefined) data.verificationRequired = input.verificationRequired;
    if (input.silentAnomaly !== undefined) data.silentAnomaly = input.silentAnomaly;
    if (input.resolvedAt !== undefined) data.resolvedAt = input.resolvedAt;

    const updated = await prisma.incident.update({
      where: { id },
      data,
    });

    const incident = mapIncidentFromDb(updated);
    eventPublisher.publishIncidentUpdated(incident);
    return incident;
  }
}

export const incidentService = new IncidentService();
