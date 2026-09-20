import { z } from "zod";

// Maps to EvidenceSourceType from shared/types.ts
const SOURCE_TYPE_VALUES = [
  "EMERGENCY_CALL",
  "CCTV",
  "VEHICLE_TELEMETRY",
  "TRAFFIC",
  "IOT_SENSOR",
  "GPS",
  "SATELLITE",
  "CITIZEN_REPORT",
  "WEATHER",
  "HOSPITAL_FEED",
  "RESOURCE_FEED",
  "ROAD_EVENT",
] as const;

export const liveInputSchema = z.object({
  sourceType: z.enum(SOURCE_TYPE_VALUES),
  narrative: z.string().min(3, "Narrative is required").max(1000).trim().optional(),
  location: z
    .object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      accuracyMeters: z.number().nullable().optional().default(null),
    })
    .optional()
    .nullable(),
  incidentId: z.string().nullable().optional().default(null),
  confidence: z.coerce.number().min(0).max(1).default(0.8),
  raw: z.record(z.unknown()).optional().default({}),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type LiveInputData = z.infer<typeof liveInputSchema>;
