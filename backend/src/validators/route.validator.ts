import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';
import { geoPointSchema } from './zone.validator';

export const routeQuerySchema = paginationQuerySchema.extend({
  resourceId: z.string().optional(),
  incidentId: z.string().optional(),
  hospitalId: z.string().optional(),
  blocked: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export const createRouteSchema = z.object({
  id: z.string().optional(),
  resourceId: z.string().min(1, 'Resource ID is required'),
  incidentId: z.string().nullable().optional(),
  hospitalId: z.string().nullable().optional(),
  origin: geoPointSchema,
  destination: geoPointSchema,
  waypoints: z.array(geoPointSchema).default([]),
  distanceKm: z.number().nullable().optional(),
  etaMinutes: z.number().nullable().optional(),
  routingMode: z.enum(['OSRM', 'SIMULATED']).default('SIMULATED'),
  blocked: z.boolean().default(false),
  trafficFactor: z.number().default(1.0),
  roadEventIds: z.array(z.string()).default([]),
  estimated: z.boolean().default(true),
  routingStatus: z.enum(['SUCCESS', 'FALLBACK', 'UNAVAILABLE']).nullable().optional(),
  isSimulated: z.boolean().nullable().optional(),
  callSign: z.string().nullable().optional(),
  targetTitle: z.string().nullable().optional(),
});

export const updateRouteSchema = createRouteSchema.partial();

export type RouteQueryInput = z.infer<typeof routeQuerySchema>;
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
