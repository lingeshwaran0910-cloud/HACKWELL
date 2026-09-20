import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';

export const systemEventSeverityEnum = z.enum(['INFO', 'WARNING', 'CRITICAL']);

export const systemEventQuerySchema = paginationQuerySchema.extend({
  severity: systemEventSeverityEnum.optional(),
  type: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const createSystemEventSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  severity: systemEventSeverityEnum.default('INFO'),
  timestamp: z.string().optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  payload: z.record(z.unknown()).default({}),
  message: z.string().min(1, 'Message is required'),
});

export type SystemEventQueryInput = z.infer<typeof systemEventQuerySchema>;
export type CreateSystemEventInput = z.infer<typeof createSystemEventSchema>;
