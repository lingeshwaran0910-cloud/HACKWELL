import { prisma } from '../db/prisma';
import { Recommendation } from '../types/shared';
import {
  RecommendationQueryInput,
  AcceptRecommendationInput,
  RejectRecommendationInput,
  ModifyRecommendationInput,
} from '../validators/recommendation.validator';
import { NotFoundError, ConflictError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapRecommendationFromDb(record: any): Recommendation {
  return {
    id: record.id,
    incidentId: record.incidentId,
    relatedIncidentIds: JSON.parse(record.relatedIncidentIds || '[]'),
    state: record.state,
    createdAt: record.createdAt,
    plan: JSON.parse(record.plan || '{}'),
    cost: JSON.parse(record.cost || '{}'),
    reasons: JSON.parse(record.reasons || '[]'),
    coverageImpact: JSON.parse(record.coverageImpact || '[]'),
    shortage: record.shortage ? JSON.parse(record.shortage) : null,
    simulationId: record.simulationId,
    decision: record.decision ? JSON.parse(record.decision) : null,
    updatedAt: record.updatedAt,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'incidentId', 'state', 'createdAt', 'updatedAt'];

export class RecommendationService {
  async getRecommendations(query: RecommendationQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.incidentId) {
      where.incidentId = query.incidentId;
    }
    if (query.state) {
      where.state = query.state;
    }
    if (query.q) {
      where.OR = [
        { incidentId: { contains: query.q } },
        { reasons: { contains: query.q } },
      ];
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const [records, total] = await Promise.all([
      prisma.recommendation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.recommendation.count({ where }),
    ]);

    return {
      data: records.map(mapRecommendationFromDb),
      total,
      page,
      limit,
    };
  }

  async getRecommendationById(id: string): Promise<Recommendation> {
    const record = await prisma.recommendation.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Recommendation with ID '${id}' not found`);
    }
    return mapRecommendationFromDb(record);
  }

  async acceptRecommendation(id: string, input: AcceptRecommendationInput): Promise<Recommendation> {
    const existing = await prisma.recommendation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Recommendation with ID '${id}' not found`);
    }

    if (existing.state === 'REJECTED') {
      throw new ConflictError(`Cannot accept a recommendation that has already been REJECTED.`);
    }

    const now = new Date().toISOString();
    const decision = {
      action: 'ACCEPT',
      at: now,
      operatorNote: input.operatorNote ?? null,
      modifiedPlan: null,
    };

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        state: 'ACCEPTED',
        decision: JSON.stringify(decision),
        updatedAt: now,
      },
    });

    const rec = mapRecommendationFromDb(updated);
    eventPublisher.publishRecommendationUpdated(rec);
    return rec;
  }

  async rejectRecommendation(id: string, input: RejectRecommendationInput): Promise<Recommendation> {
    const existing = await prisma.recommendation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Recommendation with ID '${id}' not found`);
    }

    const now = new Date().toISOString();
    const decision = {
      action: 'REJECT',
      at: now,
      operatorNote: input.operatorNote ?? null,
      modifiedPlan: null,
    };

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        state: 'REJECTED',
        decision: JSON.stringify(decision),
        updatedAt: now,
      },
    });

    const rec = mapRecommendationFromDb(updated);
    eventPublisher.publishRecommendationUpdated(rec);
    return rec;
  }

  async modifyRecommendation(id: string, input: ModifyRecommendationInput): Promise<Recommendation> {
    const existing = await prisma.recommendation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Recommendation with ID '${id}' not found`);
    }

    if (existing.state === 'REJECTED') {
      throw new ConflictError(`Cannot modify a recommendation that has already been REJECTED.`);
    }

    const now = new Date().toISOString();
    const decision = {
      action: 'MODIFY',
      at: now,
      operatorNote: input.operatorNote ?? null,
      modifiedPlan: input.modifiedPlan,
    };

    const updated = await prisma.recommendation.update({
      where: { id },
      data: {
        state: 'MODIFIED',
        decision: JSON.stringify(decision),
        updatedAt: now,
      },
    });

    const rec = mapRecommendationFromDb(updated);
    eventPublisher.publishRecommendationUpdated(rec);
    return rec;
  }
}

export const recommendationService = new RecommendationService();
