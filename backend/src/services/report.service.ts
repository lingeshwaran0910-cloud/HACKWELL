import { firestoreService } from "../db/firestore";
import { COLLECTIONS } from "../db/collections";
import { logger } from "../config/logger";
import { incidentService } from "./incident.service";
import { eventPublisher } from "../realtime/publisher";
import type { ReportInput } from "../validators/report.validator";
import type { Incident } from "../types/shared";

export interface ReportDocument {
  id: string;
  type: string;
  severity: number;
  description: string;
  address: string;
  location: { lat: number; lng: number };
  sourceType: string;
  confidence: number;
  evidenceFiles: Array<{ name: string; size?: number; type?: string }>;
  status: string;
  reportedBy: string | null;
  reporterUid: string | null;
  incidentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportResult {
  report: ReportDocument;
  incident: Incident;
}

function mapReportTypeToIncidentType(type: string): "TRAFFIC" | "ROAD_ACCIDENT" | "FIRE" | "MEDICAL" | "HAZMAT" | "FLOOD" | "OTHER" {
  const normalized = type.toLowerCase();
  if (normalized.includes("medical")) return "MEDICAL";
  if (normalized.includes("accident") || normalized.includes("road")) return "ROAD_ACCIDENT";
  if (normalized.includes("fire")) return "FIRE";
  if (normalized.includes("crime") || normalized.includes("security")) return "HAZMAT";
  if (normalized.includes("hazard") || normalized.includes("safety")) return "HAZMAT";
  return "OTHER";
}

export const reportService = {
  async createReport(
    input: ReportInput,
    reporterUid?: string,
    reporterUsername?: string
  ): Promise<CreateReportResult> {
    const reportId = `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const incidentId = `inc-${Date.now()}`;
    const now = new Date().toISOString();

    const reportDoc: ReportDocument = {
      id: reportId,
      type: input.type,
      severity: input.severity,
      description: input.description,
      address: input.address,
      location: { lat: input.location.lat, lng: input.location.lng },
      sourceType: input.sourceType,
      confidence: input.confidence,
      evidenceFiles: input.evidenceFiles ?? [],
      status: "NEW",
      reportedBy: reporterUsername ?? null,
      reporterUid: reporterUid ?? null,
      incidentId,
      createdAt: now,
      updatedAt: now,
    };

    // Step 1: Write to Firestore collection 'reports'
    await firestoreService.setDocument(
      COLLECTIONS.REPORTS,
      reportId,
      reportDoc as unknown as Record<string, unknown>
    );

    // Step 2: Map Report → Incident using standard shared domain model
    const incidentType = mapReportTypeToIncidentType(input.type);
    const incidentInput = {
      id: incidentId,
      type: incidentType,
      status: "NEW" as const,
      title: `${input.type} — ${input.address}`,
      description: input.description,
      location: { lat: input.location.lat, lng: input.location.lng },
      locationUncertaintyMeters: 10,
      zoneId: "zone-central",
      observability: "PARTIAL" as const,
      evidenceIds: [],
      fused: {
        victimCount: input.severity >= 4 ? 2 : 0,
        injuryCount: input.severity >= 3 ? 1 : 0,
        roadBlocked: "UNKNOWN" as const,
        firePresent: input.type.toLowerCase().includes("fire") ? true : ("UNKNOWN" as const),
        notes: [`Emergency Report via ${input.sourceType}`],
      },
      conflicts: [],
      hasConflict: false,
      severity: input.severity,
      priority: {
        score: Math.min(98, input.severity * 18 + 12),
        urgency: input.severity,
        waitingSeconds: 0,
        observabilityPenalty: 0,
        reasons: [`Reported via ${input.sourceType}`],
      },
      responseDebt: {
        value: input.severity * 15.0,
        urgency: input.severity,
        waitingSeconds: 0,
        affectedPeopleFactor: 1.2,
        formula: `${input.severity} * 15`,
        reasons: [`Severity ${input.severity} emergency report`],
      },
      secondaryRisks: [],
      rippleEffects: [],
      assignedResourceIds: [],
      recommendedHospitalId: "hosp-001",
      activeRouteIds: [],
      shortageFlags: [],
      verificationRequired: false,
      silentAnomaly: false,
    };

    // Step 3: Persist Incident to Prisma database & Firestore collection 'incidents'
    const incident = await incidentService.createIncident(incidentInput);
    try {
      await firestoreService.setDocument(
        COLLECTIONS.INCIDENTS,
        incidentId,
        incident as unknown as Record<string, unknown>
      );
    } catch (fsErr) {
      logger.warn({ fsErr, incidentId }, "Failed to mirror incident write to Firestore 'incidents' collection");
    }

    // Step 4: Broadcast real-time Socket.IO event to all connected clients
    eventPublisher.publishIncidentCreated(incident);

    logger.info({ reportId, incidentId, type: input.type, severity: input.severity }, "Emergency report & Incident created successfully");

    return {
      report: reportDoc,
      incident,
    };
  },

  async getReports(limit = 50): Promise<ReportDocument[]> {
    const docs = await firestoreService.queryDocuments<ReportDocument>(
      COLLECTIONS.REPORTS,
      [],
      limit
    );
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
};
