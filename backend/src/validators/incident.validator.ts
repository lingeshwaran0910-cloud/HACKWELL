import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';
import { geoPointSchema } from './zone.validator';

export const incidentTypeEnum = z.enum([
  'ROAD_ACCIDENT',
  'FIRE',
  'MEDICAL',
  'TRAFFIC',
  'HAZMAT',
  'FLOOD',
  'OTHER',
]);

export const incidentStatusEnum = z.enum([
  'NEW',
  'SUSPECTED',
  'CORROBORATED',
  'VERIFIED',
  'ACTIVE_RESPONSE',
  'RESOLVED',
]);

export const observabilityLevelEnum = z.enum(['HIGH', 'PARTIAL', 'LOW']);

export const incidentQuerySchema = paginationQuerySchema.extend({
  status: incidentStatusEnum.optional(),
  zoneId: z.string().optional(),
  type: incidentTypeEnum.optional(),
  severity: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1).max(5).optional()),
  open: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export const createIncidentSchema = z.object({
  id: z.string().optional(),
  type: incidentTypeEnum,
  status: incidentStatusEnum.default('NEW'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: geoPointSchema,
  locationUncertaintyMeters: z.number().nullable().optional(),
  zoneId: z.string().min(1, 'Zone ID is required'),
  observability: observabilityLevelEnum.default('HIGH'),
  evidenceIds: z.array(z.string()).default([]),
  fused: z
    .object({
      victimCount: z.union([z.number(), z.literal('UNKNOWN')]).default('UNKNOWN'),
      injuryCount: z.union([z.number(), z.literal('UNKNOWN')]).default('UNKNOWN'),
      roadBlocked: z.union([z.boolean(), z.literal('UNKNOWN')]).default('UNKNOWN'),
      firePresent: z.union([z.boolean(), z.literal('UNKNOWN')]).default('UNKNOWN'),
      notes: z.array(z.string()).default([]),
    })
    .default({
      victimCount: 'UNKNOWN',
      injuryCount: 'UNKNOWN',
      roadBlocked: 'UNKNOWN',
      firePresent: 'UNKNOWN',
      notes: [],
    }),
  conflicts: z.array(z.any()).default([]),
  hasConflict: z.boolean().default(false),
  severity: z.number().int().min(1).max(5).default(3),
  priority: z
    .object({
      score: z.number().default(50),
      urgency: z.number().default(5),
      waitingSeconds: z.number().default(0),
      observabilityPenalty: z.number().default(0),
      reasons: z.array(z.string()).default([]),
    })
    .default({
      score: 50,
      urgency: 5,
      waitingSeconds: 0,
      observabilityPenalty: 0,
      reasons: ['Initial report'],
    }),
  responseDebt: z
    .object({
      value: z.number().default(0),
      urgency: z.number().default(5),
      waitingSeconds: z.number().default(0),
      affectedPeopleFactor: z.number().default(1),
      formula: z.string().default('base'),
      reasons: z.array(z.string()).default([]),
    })
    .default({
      value: 0,
      urgency: 5,
      waitingSeconds: 0,
      affectedPeopleFactor: 1,
      formula: 'base',
      reasons: [],
    }),
  secondaryRisks: z.array(z.any()).default([]),
  rippleEffects: z.array(z.any()).default([]),
  assignedResourceIds: z.array(z.string()).default([]),
  recommendedHospitalId: z.string().nullable().optional(),
  activeRouteIds: z.array(z.string()).default([]),
  shortageFlags: z.array(z.string()).default([]),
  verificationRequired: z.boolean().default(false),
  silentAnomaly: z.boolean().default(false),
});

export const updateIncidentSchema = z.object({
  type: incidentTypeEnum.optional(),
  status: incidentStatusEnum.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  location: geoPointSchema.optional(),
  locationUncertaintyMeters: z.number().nullable().optional(),
  zoneId: z.string().optional(),
  observability: observabilityLevelEnum.optional(),
  severity: z.number().int().min(1).max(5).optional(),
  recommendedHospitalId: z.string().nullable().optional(),
  assignedResourceIds: z.array(z.string()).optional(),
  activeRouteIds: z.array(z.string()).optional(),
  shortageFlags: z.array(z.string()).optional(),
  verificationRequired: z.boolean().optional(),
  silentAnomaly: z.boolean().optional(),
  resolvedAt: z.string().nullable().optional(),
});

export type IncidentQueryInput = z.infer<typeof incidentQuerySchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
