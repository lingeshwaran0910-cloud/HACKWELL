import { Request, Response, NextFunction } from 'express';
import { evidenceService } from '../services/evidence.service';
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
}

export const evidenceController = new EvidenceController();
