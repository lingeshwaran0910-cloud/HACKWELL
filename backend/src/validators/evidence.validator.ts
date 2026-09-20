import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';
import { geoPointSchema } from './zone.validator';

export const evidenceSourceTypeEnum = z.enum([
  'EMERGENCY_CALL',
  'CCTV',
  'VEHICLE_TELEMETRY',
  'TRAFFIC',
  'IOT_SENSOR',
  'GPS',
  'SATELLITE',
  'CITIZEN_REPORT',
  'WEATHER',
  'HOSPITAL_FEED',
  'RESOURCE_FEED',
  'ROAD_EVENT',
]);

export const evidenceQuerySchema = paginationQuerySchema.extend({
  incidentId: z.string().optional(),
  sourceType: evidenceSourceTypeEnum.optional(),
  stale: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export const createEvidenceSchema = z.object({
  id: z.string().optional(),
  sourceType: evidenceSourceTypeEnum,
  timestamp: z.string().optional(),
  location: geoPointSchema.nullable().optional(),
  incidentId: z.string().nullable().optional(),
  raw: z.record(z.unknown()).default({}),
  normalized: z
    .object({
      incidentTypeHint: z.string().nullable().optional(),
      narrative: z.string().nullable().optional(),
      victimCount: z.union([z.number(), z.literal('UNKNOWN')]).default('UNKNOWN'),
      injuryCount: z.union([z.number(), z.literal('UNKNOWN')]).default('UNKNOWN'),
      speedKmh: z.number().nullable().optional(),
      speedSeriesKmh: z.array(z.number()).nullable().optional(),
      impactSignal: z.boolean().nullable().optional(),
      airbagDeployed: z.boolean().nullable().optional(),
      rollover: z.boolean().nullable().optional(),
      gpsStopped: z.boolean().nullable().optional(),
      hazardClass: z.string().nullable().optional(),
      roadBlocked: z.boolean().nullable().optional(),
      congestionIndex: z.number().nullable().optional(),
      bbox: z
        .object({
          south: z.number(),
          west: z.number(),
          north: z.number(),
          east: z.number(),
        })
        .nullable()
        .optional(),
      cannotDeterminePeople: z.boolean().default(false),
    })
    .default({ cannotDeterminePeople: false, victimCount: 'UNKNOWN', injuryCount: 'UNKNOWN' }),
  confidence: z.number().min(0).max(1).default(1.0),
  freshnessSeconds: z.number().min(0).default(0),
  stale: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export const updateEvidenceSchema = createEvidenceSchema.partial();

export type EvidenceQueryInput = z.infer<typeof evidenceQuerySchema>;
export type CreateEvidenceInput = z.infer<typeof createEvidenceSchema>;
export type UpdateEvidenceInput = z.infer<typeof updateEvidenceSchema>;
