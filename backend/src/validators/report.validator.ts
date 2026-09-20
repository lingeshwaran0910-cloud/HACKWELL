import { z } from "zod";

export const reportSchema = z.object({
  type: z
    .enum(["Medical Emergency", "Road Accident", "Fire", "Crime", "Public Safety", "Other"])
    .default("Other"),
  severity: z.coerce
    .number()
    .int()
    .min(1, "Severity must be 1-5")
    .max(5, "Severity must be 1-5"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description too long")
    .trim(),
  address: z
    .string()
    .min(3, "Address is required")
    .max(500, "Address too long")
    .trim(),
  location: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),
  sourceType: z
    .enum([
      "112 Emergency Call",
      "Citizen Report",
      "CCTV / Video AI",
      "IoT Sensor",
      "Traffic Feed",
      "Police Dispatch",
      "Other",
    ])
    .default("Citizen Report"),
  confidence: z.coerce.number().min(0).max(1).default(0.85),
  evidenceFiles: z
    .array(
      z.object({
        name: z.string(),
        size: z.number().optional(),
        type: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export type ReportInput = z.infer<typeof reportSchema>;
