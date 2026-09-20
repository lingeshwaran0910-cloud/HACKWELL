import { firestoreService } from "../db/firestore";
import { COLLECTIONS } from "../db/collections";
import { logger } from "../config/logger";
import type { LiveInputData } from "../validators/liveInput.validator";

export interface LiveInputDocument {
  id: string;
  sourceType: string;
  narrative: string | null;
  location: { lat: number; lng: number; accuracyMeters: number | null } | null;
  incidentId: string | null;
  confidence: number;
  raw: Record<string, unknown>;
  metadata: Record<string, unknown>;
  freshnessSeconds: number;
  stale: boolean;
  submittedBy: string | null;
  submitterUid: string | null;
  timestamp: string;
  ingestedAt: string;
}

export const liveInputService = {
  async ingestInput(
    input: LiveInputData,
    submitterUid?: string,
    submitterUsername?: string
  ): Promise<LiveInputDocument> {
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const doc: LiveInputDocument = {
      id,
      sourceType: input.sourceType,
      narrative: input.narrative ?? null,
      location: input.location
        ? {
            lat: input.location.lat,
            lng: input.location.lng,
            accuracyMeters: input.location.accuracyMeters ?? null,
          }
        : null,
      incidentId: input.incidentId ?? null,
      confidence: input.confidence,
      raw: input.raw ?? {},
      metadata: input.metadata ?? {},
      freshnessSeconds: 0,
      stale: false,
      submittedBy: submitterUsername ?? null,
      submitterUid: submitterUid ?? null,
      timestamp: now,
      ingestedAt: now,
    };

    await firestoreService.setDocument(
      COLLECTIONS.LIVE_INPUTS,
      id,
      doc as unknown as Record<string, unknown>
    );

    logger.info({ id, sourceType: input.sourceType }, "Live input ingested");

    return doc;
  },

  async getLiveInputs(limit = 100): Promise<LiveInputDocument[]> {
    const docs = await firestoreService.queryDocuments<LiveInputDocument>(
      COLLECTIONS.LIVE_INPUTS,
      [],
      limit
    );
    return docs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
};
