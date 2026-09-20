import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';

export const geoPointSchema = z.object({
  lat: z.number({ required_error: 'Latitude is required' }),
  lng: z.number({ required_error: 'Longitude is required' }),
  accuracyMeters: z.number().nullable().optional(),
});

export const coverageCountsSchema = z.object({
  ambulance: z.number().min(0),
  police: z.number().min(0),
  fire: z.number().min(0),
  rescue: z.number().min(0),
});

export const zoneQuerySchema = paginationQuerySchema.extend({
  observabilityBaseline: z.enum(['HIGH', 'PARTIAL', 'LOW']).optional(),
  coverageStatus: z.enum(['ADEQUATE', 'MARGINAL', 'COVERAGE_RISK', 'BELOW_MINIMUM']).optional(),
});

export const createZoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  polygon: z.array(geoPointSchema).min(3, 'Polygon must have at least 3 points'),
  center: geoPointSchema,
  observabilityBaseline: z.enum(['HIGH', 'PARTIAL', 'LOW']),
  typicalSourceTypes: z.array(z.string()).default([]),
  neighboringZoneIds: z.array(z.string()).default([]),
  minCoverage: coverageCountsSchema,
  currentCoverage: coverageCountsSchema,
  coverageStatus: z.enum(['ADEQUATE', 'MARGINAL', 'COVERAGE_RISK', 'BELOW_MINIMUM']).default('ADEQUATE'),
  nearbyResourceIds: z.array(z.string()).default([]),
});

export const updateZoneSchema = createZoneSchema.partial();

export type ZoneQueryInput = z.infer<typeof zoneQuerySchema>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
