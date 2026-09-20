import { prisma } from '../db/prisma';
import { SystemEvent } from '../types/shared';
import { CreateSystemEventInput, SystemEventQueryInput } from '../validators/event.validator';
import { NotFoundError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapSystemEventFromDb(record: any): SystemEvent {
  return {
    id: record.id,
    type: record.type,
    severity: record.severity,
    timestamp: record.timestamp,
    entityType: record.entityType,
    entityId: record.entityId,
    payload: JSON.parse(record.payload || '{}'),
    message: record.message,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'type', 'severity', 'timestamp', 'entityType', 'entityId'];

export class SystemEventService {
  async getEvents(query: SystemEventQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.severity) {
      where.severity = query.severity;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.q) {
      where.OR = [
        { message: { contains: query.q } },
        { type: { contains: query.q } },
      ];
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'timestamp';
    const sortOrder = query.sortOrder || 'desc';

    const [records, total] = await Promise.all([
      prisma.systemEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.systemEvent.count({ where }),
    ]);

    return {
      data: records.map(mapSystemEventFromDb),
      total,
      page,
      limit,
    };
  }

  async getEventById(id: string): Promise<SystemEvent> {
    const record = await prisma.systemEvent.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`System event with ID '${id}' not found`);
    }
    return mapSystemEventFromDb(record);
  }

  async createEvent(input: CreateSystemEventInput): Promise<SystemEvent> {
    const id = input.id || `evt-${Date.now()}`;
    const now = new Date().toISOString();

    const record = await prisma.systemEvent.create({
      data: {
        id,
        type: input.type,
        severity: input.severity,
        timestamp: input.timestamp || now,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        payload: JSON.stringify(input.payload),
        message: input.message,
      },
    });

    const sysEvent = mapSystemEventFromDb(record);
    eventPublisher.publishSystemEventCreated(sysEvent);
    return sysEvent;
  }
}

export const systemEventService = new SystemEventService();
