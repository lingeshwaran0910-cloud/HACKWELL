import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';
import { geoPointSchema } from './zone.validator';

export const hospitalQuerySchema = paginationQuerySchema.extend({
  zoneId: z.string().optional(),
  capability: z.string().optional(),
  stale: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export const predictedPressureSchema = z.object({
  level: z.enum(['LOW', 'MODERATE', 'HIGH', 'UNKNOWN']).default('LOW'),
  horizonMinutes: z.number().default(30),
  basis: z.string().default('Current load'),
  estimated: z.literal(true).default(true),
});

export const createHospitalSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Hospital name is required'),
  location: geoPointSchema,
  zoneId: z.string().min(1, 'Zone ID is required'),
  capabilities: z.array(z.string()).default([]),
  bedsTotal: z.number().int().min(0),
  bedsAvailable: z.union([z.number(), z.literal('UNKNOWN')]).default('UNKNOWN'),
  currentLoad: z.union([z.number(), z.literal('UNKNOWN')]).default('UNKNOWN'),
  incomingLoad: z.number().int().min(0).default(0),
  predictedPressure: predictedPressureSchema.default({
    level: 'LOW',
    horizonMinutes: 30,
    basis: 'Baseline',
    estimated: true,
  }),
  stale: z.boolean().default(false),
});

export const updateHospitalSchema = z.object({
  name: z.string().optional(),
  location: geoPointSchema.optional(),
  zoneId: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  bedsTotal: z.number().int().min(0).optional(),
  bedsAvailable: z.union([z.number(), z.literal('UNKNOWN')]).optional(),
  currentLoad: z.union([z.number(), z.literal('UNKNOWN')]).optional(),
  incomingLoad: z.number().int().min(0).optional(),
  predictedPressure: predictedPressureSchema.optional(),
  stale: z.boolean().optional(),
});

export type HospitalQueryInput = z.infer<typeof hospitalQuerySchema>;
export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>;
