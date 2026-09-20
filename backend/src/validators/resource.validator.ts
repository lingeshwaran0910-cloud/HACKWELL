import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';
import { geoPointSchema } from './zone.validator';

export const resourceTypeEnum = z.enum([
  'AMBULANCE',
  'POLICE_UNIT',
  'FIRE_UNIT',
  'RESCUE_UNIT',
  'TRAFFIC_UNIT',
  'OTHER_EMERGENCY_UNIT',
]);

export const resourceStatusEnum = z.enum([
  'AVAILABLE',
  'ASSIGNED',
  'EN_ROUTE',
  'AT_INCIDENT',
  'TRANSPORTING',
  'AT_HOSPITAL',
  'RETURNING',
  'UNAVAILABLE',
  'UNKNOWN',
]);

export const resourceQuerySchema = paginationQuerySchema.extend({
  status: resourceStatusEnum.optional(),
  type: resourceTypeEnum.optional(),
  zoneId: z.string().optional(),
  homeZoneId: z.string().optional(),
  capability: z.string().optional(),
  stale: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export const createResourceSchema = z.object({
  id: z.string().optional(),
  callSign: z.string().min(1, 'Call sign is required'),
  type: resourceTypeEnum,
  capabilities: z.array(z.string()).default([]),
  homeZoneId: z.string().min(1, 'Home zone ID is required'),
  location: geoPointSchema.nullable().optional(),
  status: resourceStatusEnum.default('AVAILABLE'),
  etaMinutes: z.number().nullable().optional(),
  assignmentIncidentId: z.string().nullable().optional(),
  destinationHospitalId: z.string().nullable().optional(),
  freshnessSeconds: z.number().min(0).default(0),
  stale: z.boolean().default(false),
  staleReason: z.string().nullable().optional(),
  unavailableReason: z.string().nullable().optional(),
  isReserve: z.boolean().default(false),
});

export const updateResourceSchema = z.object({
  callSign: z.string().optional(),
  type: resourceTypeEnum.optional(),
  capabilities: z.array(z.string()).optional(),
  homeZoneId: z.string().optional(),
  location: geoPointSchema.nullable().optional(),
  status: resourceStatusEnum.optional(),
  etaMinutes: z.number().nullable().optional(),
  assignmentIncidentId: z.string().nullable().optional(),
  destinationHospitalId: z.string().nullable().optional(),
  freshnessSeconds: z.number().optional(),
  stale: z.boolean().optional(),
  staleReason: z.string().nullable().optional(),
  unavailableReason: z.string().nullable().optional(),
  isReserve: z.boolean().optional(),
});

export type ResourceQueryInput = z.infer<typeof resourceQuerySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
