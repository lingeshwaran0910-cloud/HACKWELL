import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prisma';
import { eventPublisher } from '../realtime/publisher';
import { mapEvidenceFromDb } from './evidence.service';
import { Evidence } from '../types/shared';
import { logger } from '../config/logger';

/**
 * Python intelligence microservice base URL.
 * Defaults to localhost:8001 (the unified main_service.py).
 * Set PYTHON_INTELLIGENCE_URL in .env to override.
 */
const PYTHON_SERVICE_URL = process.env.PYTHON_INTELLIGENCE_URL || 'http://127.0.0.1:8001';
const PIPELINE_TIMEOUT_MS = 120_000; // 2 minutes — allow for large video processing

export interface VideoAnalysisResult {
  evidence: Evidence;
  fusedAssessment: Record<string, unknown>;
  scene?: Record<string, unknown>;
  incident?: Record<string, unknown>;
  modelResults?: Record<string, unknown>;
  explanation?: string;
  incidentId: string | null;
}

export class VideoEvidenceService {
  /**
   * Main entry point: receives a video file path from multer,
   * calls the Python intelligence pipeline, persists results as Evidence,
   * and optionally creates an Incident if confidence exceeds threshold.
   */
  async analyzeVideo(
    filePath: string,
    originalFilename: string,
    uploadedByUserId?: string,
  ): Promise<VideoAnalysisResult> {
    logger.info({ filePath, originalFilename }, 'Starting video intelligence pipeline');

    // ── Step 1: Proxy file to Python full-pipeline ────────────────────────
    let pipelineResponse: Record<string, any>;
    try {
      pipelineResponse = await this.callPythonPipeline(filePath, originalFilename);
    } finally {
      // Always clean up temp file
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }

    const fused = pipelineResponse.fusedAssessment as Record<string, any>;
    const accidentDetection = pipelineResponse.accidentDetection as Record<string, any>;
    const yoloEvidence = pipelineResponse.yoloEvidence as Record<string, any>;
    const geminiAnalysis = pipelineResponse.geminiAnalysis as Record<string, any>;

    // ── Step 2: Persist Evidence record ──────────────────────────────────
    const evidenceId = `ev-vid-${Date.now()}`;
    const now = new Date().toISOString();

    // Confidence from fusion engine (0.0–1.0), clamped
    const confidence = Math.max(0, Math.min(1, Number(fused.confidence ?? 0)));

    const evidenceRaw = {
      filename: originalFilename,
      fusedAssessment: fused,
      accidentDetection,
      yoloEvidence,
      geminiAnalysis,
    };

    const evidenceNormalized = {
      incidentDetected: fused.incidentDetected,
      confidence,
      severity: fused.severity,
      credibility: fused.credibility,
      evidenceQuality: fused.evidenceQuality,
      suspectedEventTimeSec: fused.suspectedEventTimeSec,
      responseRequirement: fused.responseRequirement,
      supportingEvidence: fused.supportingEvidence ?? [],
      conflictingEvidence: fused.conflictingEvidence ?? [],
      uncertainties: fused.uncertainties ?? [],
    };

    const evidenceMetadata = {
      sourceType: 'VIDEO_CCTV',
      originalFilename,
      uploadedByUserId: uploadedByUserId ?? null,
      processingStatus: 'completed',
      modelName: accidentDetection?.model?.name ?? 'unknown',
      videoDurationSec: accidentDetection?.videoDurationSec ?? null,
      frameCount: accidentDetection?.frameCount ?? null,
      sampledFrameCount: accidentDetection?.sampledFrameCount ?? null,
    };

    const dbRecord = await prisma.evidence.create({
      data: {
        id: evidenceId,
        sourceType: 'CCTV',  // closest valid EvidenceSourceType for camera video footage
        timestamp: now,
        ingestedAt: now,
        location: null,
        incidentId: null,  // will update if incident created below
        raw: JSON.stringify(evidenceRaw),
        normalized: JSON.stringify(evidenceNormalized),
        confidence,
        freshnessSeconds: 0,
        stale: false,
        metadata: JSON.stringify(evidenceMetadata),
      },
    });

    const evidence = mapEvidenceFromDb(dbRecord);
    eventPublisher.publishEvidenceCreated(evidence);
    logger.info({ evidenceId, confidence, incidentDetected: fused.incidentDetected }, 'Evidence record created');

    // ── Step 3: Create Incident if YES or POSSIBLE with medium+ confidence ──
    let incidentId: string | null = null;
    if (fused.incidentDetected === 'YES' || (fused.incidentDetected === 'POSSIBLE' && confidence >= 0.45)) {
      incidentId = await this.createIncidentFromFusion(fused, evidenceId, originalFilename);

      // Update evidence with incidentId FK
      await prisma.evidence.update({
        where: { id: evidenceId },
        data: { incidentId },
      });
      const updated = mapEvidenceFromDb(await prisma.evidence.findUniqueOrThrow({ where: { id: evidenceId } }));
      eventPublisher.publishEvidenceUpdated(updated);

      logger.info({ incidentId, evidenceId }, 'Incident created from video evidence');
    }

    return {
      evidence: mapEvidenceFromDb(await prisma.evidence.findUniqueOrThrow({ where: { id: evidenceId } })),
      fusedAssessment: fused,
      scene: pipelineResponse.scene as Record<string, unknown> | undefined,
      incident: pipelineResponse.incident as Record<string, unknown> | undefined,
      modelResults: pipelineResponse.model_results as Record<string, unknown> | undefined,
      explanation: pipelineResponse.explanation as string | undefined,
      incidentId,
    };
  }

  private async callPythonPipeline(
    filePath: string,
    originalFilename: string,
  ): Promise<Record<string, any>> {
    const form = new FormData();
    form.append('video', fs.createReadStream(filePath), {
      filename: originalFilename,
      contentType: 'video/mp4',
    });

    logger.info({ url: `${PYTHON_SERVICE_URL}/analyze/full` }, 'Calling Python intelligence pipeline');

    try {
      const response = await axios.post(
        `${PYTHON_SERVICE_URL}/analyze/full`,
        form,
        {
          headers: form.getHeaders(),
          timeout: PIPELINE_TIMEOUT_MS,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(({ maxContentLength: Infinity, maxBodyLength: Infinity }) as any),
        } as any,
      );
      return response.data as Record<string, any>;
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      const detail: string = err?.response?.data?.detail ?? err?.message ?? 'unknown error';

      logger.error({ status, detail }, 'Python intelligence service error');

      if (status === 400) {
        throw new Error(`Video rejected by intelligence service: ${detail}`);
      }
      if (status === 422) {
        throw new Error(`Video processing failed: ${detail}`);
      }
      if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
        throw new Error(
          'Python intelligence service is not running. Start it with: cd intelligence && python main_service.py'
        );
      }
      throw new Error(`Intelligence pipeline failed (${status ?? 'timeout'}): ${detail}`);
    }
  }

  /**
   * Creates an Incident in the DB from the fused evidence assessment.
   * Maps fusion results to the existing Prisma Incident schema fields.
   */
  private async createIncidentFromFusion(
    fused: Record<string, any>,
    evidenceId: string,
    filename: string,
  ): Promise<string> {
    const incidentId = `inc-vid-${Date.now()}`;
    const now = new Date().toISOString();

    // Map HACKWELL severity string to existing numeric severity (1=lowest, 5=highest)
    const severityMap: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 4,
      CRITICAL: 5,
    };
    const severityNum = severityMap[fused.severity ?? 'MEDIUM'] ?? 2;

    const priority = {
      score: Math.round((fused.confidence ?? 0) * 100),
      urgency: severityNum,
      waitingSeconds: 0,
      observabilityPenalty: 0,
      reasons: fused.supportingEvidence ?? [],
    };

    const responseDebt = {
      value: severityNum,
      urgency: severityNum,
      waitingSeconds: 0,
      affectedPeopleFactor: 1,
      formula: 'video_evidence_fusion',
      reasons: [`Video evidence analysis — ${fused.incidentDetected}`],
    };

    const fusedFacts = {
      victimCount: 'UNKNOWN',
      injuryCount: 'UNKNOWN',
      roadBlocked: fused.fusionMetrics?.has_contradiction ? 'UNKNOWN' : false,
      firePresent: false,
      notes: fused.supportingEvidence ?? [],
    };

    await prisma.incident.create({
      data: {
        id: incidentId,
        type: 'ROAD_ACCIDENT',
        severity: severityNum,
        status: 'SUSPECTED',
        title: `Video Accident Detection — ${fused.severity ?? 'MEDIUM'} Severity`,
        description: `AI video analysis of '${filename}'. Confidence: ${Math.round((fused.confidence ?? 0) * 100)}%. Detection: ${fused.incidentDetected}.`,
        zoneId: 'default',
        location: JSON.stringify({ lat: 0, lng: 0, accuracyMeters: null }),
        locationUncertaintyMeters: null,
        observability: 'PARTIAL',
        evidenceIds: JSON.stringify([evidenceId]),
        fused: JSON.stringify(fusedFacts),
        conflicts: JSON.stringify(fused.conflictingEvidence ?? []),
        hasConflict: (fused.conflictingEvidence ?? []).length > 0,
        priority: JSON.stringify(priority),
        responseDebt: JSON.stringify(responseDebt),
        secondaryRisks: JSON.stringify([]),
        rippleEffects: JSON.stringify([]),
        assignedResourceIds: JSON.stringify([]),
        recommendedHospitalId: null,
        activeRouteIds: JSON.stringify([]),
        shortageFlags: JSON.stringify([]),
        verificationRequired: true,
        silentAnomaly: false,
        createdAt: now,
        updatedAt: now,
        firstReportedAt: now,
        resolvedAt: null,
      },
    });

    // Publish incident created event with full typed shape
    eventPublisher.publishIncidentCreated({
      id: incidentId,
      type: 'ROAD_ACCIDENT',
      status: 'SUSPECTED',
      title: `Video Accident Detection — ${fused.severity ?? 'MEDIUM'} Severity`,
      description: `AI video analysis of '${filename}'`,
      location: { lat: 0, lng: 0, accuracyMeters: null },
      locationUncertaintyMeters: null,
      zoneId: 'default',
      observability: 'PARTIAL',
      evidenceIds: [evidenceId],
      fused: fusedFacts as any,
      conflicts: [],
      hasConflict: false,
      severity: severityNum as any,
      priority: priority as any,
      responseDebt: responseDebt as any,
      secondaryRisks: [],
      rippleEffects: [],
      assignedResourceIds: [],
      recommendedHospitalId: null,
      activeRouteIds: [],
      shortageFlags: [],
      verificationRequired: true,
      silentAnomaly: false,
      createdAt: now,
      updatedAt: now,
      firstReportedAt: now,
      resolvedAt: null,
    });

    return incidentId;
  }


  /**
   * Fetches health status of the Python intelligence service.
   */
  async checkPythonServiceHealth(): Promise<Record<string, any>> {
    try {
      const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 5000 });
      return { online: true, ...(response.data as Record<string, any>) };
    } catch {
      return {
        online: false,
        status: 'OFFLINE',
        service: 'hackwell-intelligence',
        message: 'Python intelligence service is not reachable',
        url: PYTHON_SERVICE_URL,
      };
    }
  }
}

export const videoEvidenceService = new VideoEvidenceService();
