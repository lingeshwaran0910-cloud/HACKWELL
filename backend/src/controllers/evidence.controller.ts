import { Request, Response, NextFunction } from 'express';
import { evidenceService } from '../services/evidence.service';
import { videoEvidenceService } from '../services/videoEvidence.service';
import { formatSingle, formatCollection } from '../utils/response';

export class EvidenceController {
  async getEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await evidenceService.getEvidence(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getEvidenceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const evidence = await evidenceService.getEvidenceById(req.params.id);
      res.status(200).json(formatSingle(evidence));
    } catch (err) {
      next(err);
    }
  }

  async createEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const evidence = await evidenceService.createEvidence(req.body);
      res.status(201).json(formatSingle(evidence));
    } catch (err) {
      next(err);
    }
  }

  async updateEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const evidence = await evidenceService.updateEvidence(req.params.id, req.body);
      res.status(200).json(formatSingle(evidence));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/evidence/video
   * Accepts a multipart/form-data video upload, runs the full AI pipeline,
   * persists Evidence + (optionally) creates an Incident.
   * Requires multer middleware (videoUpload.single('video')) to run before this handler.
   */
  async analyzeVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "No video file provided. Send file in field 'video' as multipart/form-data.",
        });
        return;
      }

      const { path: filePath, originalname } = req.file;
      const uploadedByUserId = (req as any).user?.id as string | undefined;

      const result = await videoEvidenceService.analyzeVideo(filePath, originalname, uploadedByUserId);

      res.status(201).json({
        success: true,
        data: {
          evidence: result.evidence,
          fusedAssessment: result.fusedAssessment,
          incidentId: result.incidentId,
          incidentCreated: result.incidentId !== null,
        },
      });
    } catch (err: any) {
      // User-friendly errors for service-offline and rejected video
      if (err.message?.includes('not running')) {
        res.status(503).json({
          success: false,
          error: err.message,
          hint: 'Start the intelligence service: cd intelligence && python main_service.py',
        });
        return;
      }
      if (err.message?.includes('Video rejected') || err.message?.includes('Video processing failed')) {
        res.status(422).json({ success: false, error: err.message });
        return;
      }
      next(err);
    }
  }

  /**
   * GET /api/v1/evidence/video/health
   * Returns health status of the Python intelligence service.
   */
  async getVideoServiceHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await videoEvidenceService.checkPythonServiceHealth();
      res.status(health.online ? 200 : 503).json(health);
    } catch (err) {
      next(err);
    }
  }
}

export const evidenceController = new EvidenceController();
