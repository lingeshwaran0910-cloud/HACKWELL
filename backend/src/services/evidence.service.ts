import { prisma } from '../db/prisma';
import { Evidence } from '../types/shared';
import { CreateEvidenceInput, UpdateEvidenceInput, EvidenceQueryInput } from '../validators/evidence.validator';
import { NotFoundError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapEvidenceFromDb(record: any): Evidence {
  return {
    id: record.id,
    sourceType: record.sourceType,
    timestamp: record.timestamp,
    ingestedAt: record.ingestedAt,
    location: record.location ? JSON.parse(record.location) : null,
    incidentId: record.incidentId,
    raw: JSON.parse(record.raw || '{}'),
    normalized: JSON.parse(record.normalized || '{}'),
    confidence: record.confidence,
    freshnessSeconds: record.freshnessSeconds,
    stale: record.stale,
    metadata: JSON.parse(record.metadata || '{}'),
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'sourceType', 'timestamp', 'confidence', 'stale', 'ingestedAt'];

export class EvidenceService {
  async getEvidence(query: EvidenceQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.incidentId) {
      where.incidentId = query.incidentId;
    }
    if (query.sourceType) {
      where.sourceType = query.sourceType;
    }
    if (query.stale !== undefined) {
      where.stale = query.stale;
    }
    if (query.q) {
      where.OR = [
        { sourceType: { contains: query.q } },
        { normalized: { contains: query.q } },
      ];
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    const [records, total] = await Promise.all([
      prisma.evidence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.evidence.count({ where }),
    ]);

    return {
      data: records.map(mapEvidenceFromDb),
      total,
      page,
      limit,
    };
  }

  async getEvidenceById(id: string): Promise<Evidence> {
    const record = await prisma.evidence.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Evidence with ID '${id}' not found`);
    }
    return mapEvidenceFromDb(record);
  }

  async createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
    const id = input.id || `ev-${Date.now()}`;
    const now = new Date().toISOString();

    const record = await prisma.evidence.create({
      data: {
        id,
        sourceType: input.sourceType,
        timestamp: input.timestamp || now,
        ingestedAt: now,
        location: input.location ? JSON.stringify(input.location) : null,
        incidentId: input.incidentId ?? null,
        raw: JSON.stringify(input.raw),
        normalized: JSON.stringify(input.normalized),
        confidence: input.confidence,
        freshnessSeconds: input.freshnessSeconds,
        stale: input.stale,
        metadata: JSON.stringify(input.metadata),
      },
    });

    const evidence = mapEvidenceFromDb(record);
    eventPublisher.publishEvidenceCreated(evidence);
    return evidence;
  }

  async updateEvidence(id: string, input: UpdateEvidenceInput): Promise<Evidence> {
    const existing = await prisma.evidence.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Evidence with ID '${id}' not found`);
    }

    const data: any = {};
    if (input.sourceType !== undefined) data.sourceType = input.sourceType;
    if (input.timestamp !== undefined) data.timestamp = input.timestamp;
    if (input.location !== undefined) data.location = input.location ? JSON.stringify(input.location) : null;
    if (input.incidentId !== undefined) data.incidentId = input.incidentId;
    if (input.raw !== undefined) data.raw = JSON.stringify(input.raw);
    if (input.normalized !== undefined) data.normalized = JSON.stringify(input.normalized);
    if (input.confidence !== undefined) data.confidence = input.confidence;
    if (input.freshnessSeconds !== undefined) data.freshnessSeconds = input.freshnessSeconds;
    if (input.stale !== undefined) data.stale = input.stale;
    if (input.metadata !== undefined) data.metadata = JSON.stringify(input.metadata);

    const updated = await prisma.evidence.update({
      where: { id },
      data,
    });

    const evidence = mapEvidenceFromDb(updated);
    eventPublisher.publishEvidenceUpdated(evidence);
    return evidence;
  }
}

export const evidenceService = new EvidenceService();
