import { Request, Response, NextFunction } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { formatSingle, formatCollection } from '../utils/response';

export class RecommendationController {
  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await recommendationService.getRecommendations(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getRecommendationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendation = await recommendationService.getRecommendationById(req.params.id);
      res.status(200).json(formatSingle(recommendation));
    } catch (err) {
      next(err);
    }
  }

  async acceptRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendation = await recommendationService.acceptRecommendation(req.params.id, req.body);
      res.status(200).json(formatSingle(recommendation));
    } catch (err) {
      next(err);
    }
  }

  async rejectRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendation = await recommendationService.rejectRecommendation(req.params.id, req.body);
      res.status(200).json(formatSingle(recommendation));
    } catch (err) {
      next(err);
    }
  }

  async modifyRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendation = await recommendationService.modifyRecommendation(req.params.id, req.body);
      res.status(200).json(formatSingle(recommendation));
    } catch (err) {
      next(err);
    }
  }
}

export const recommendationController = new RecommendationController();
