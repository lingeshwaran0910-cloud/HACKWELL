import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';

export const recommendationStateEnum = z.enum(['PROPOSED', 'ACCEPTED', 'MODIFIED', 'REJECTED']);

export const recommendationQuerySchema = paginationQuerySchema.extend({
  incidentId: z.string().optional(),
  state: recommendationStateEnum.optional(),
});

export const dispatchAssignmentSchema = z.object({
  resourceId: z.string().min(1, 'resourceId is required'),
  role: z.string().min(1, 'role is required'),
  etaMinutes: z.number().nullable().optional(),
  fromZoneId: z.string().min(1, 'fromZoneId is required'),
});

export const dispatchPlanSchema = z.object({
  assignments: z.array(dispatchAssignmentSchema).default([]),
  hospitalId: z.string().nullable().optional(),
  routeIds: z.array(z.string()).default([]),
  mutualAidFromZoneIds: z.array(z.string()).default([]),
  uncoveredDemand: z.array(z.string()).default([]),
});

export const acceptRecommendationSchema = z.object({
  operatorNote: z.string().nullable().optional(),
});

export const rejectRecommendationSchema = z.object({
  operatorNote: z.string().nullable().optional(),
});

export const modifyRecommendationSchema = z.object({
  operatorNote: z.string().nullable().optional(),
  modifiedPlan: dispatchPlanSchema,
});

export type RecommendationQueryInput = z.infer<typeof recommendationQuerySchema>;
export type AcceptRecommendationInput = z.infer<typeof acceptRecommendationSchema>;
export type RejectRecommendationInput = z.infer<typeof rejectRecommendationSchema>;
export type ModifyRecommendationInput = z.infer<typeof modifyRecommendationSchema>;
