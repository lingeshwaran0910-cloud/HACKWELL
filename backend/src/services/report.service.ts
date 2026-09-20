import { firestoreService } from "../db/firestore";
import { COLLECTIONS } from "../db/collections";
import { logger } from "../config/logger";
import type { ReportInput } from "../validators/report.validator";

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
  createdAt: string;
  updatedAt: string;
}

export const reportService = {
  async createReport(
    input: ReportInput,
    reporterUid?: string,
    reporterUsername?: string
  ): Promise<ReportDocument> {
    const id = `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const doc: ReportDocument = {
      id,
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
      createdAt: now,
      updatedAt: now,
    };

    await firestoreService.setDocument(COLLECTIONS.REPORTS, id, doc as unknown as Record<string, unknown>);

    logger.info({ id, type: input.type, severity: input.severity }, "Emergency report created");

    return doc;
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
