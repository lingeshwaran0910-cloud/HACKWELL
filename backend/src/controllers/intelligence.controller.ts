import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai/aiService';

export class IntelligenceController {
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await aiService.checkHealth();
      const statusCode = health.online ? 200 : (health.configured ? 503 : 200);
      res.status(statusCode).json({
        status: health.message,
        health,
      });
    } catch (err) {
      next(err);
    }
  }

  async testAI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message = 'Respond with the word READY.' } = req.body;
      const result = await aiService.testConnection(message);
      res.status(200).json(result);
    } catch (err: any) {
      if (err.message && err.message.includes('AI CONFIGURATION MISSING')) {
        res.status(400).json({
          success: false,
          error: err.message,
        });
        return;
      }
      next(err);
    }
  }

  async analyzeIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { incidentId } = req.body;
      if (!incidentId || typeof incidentId !== 'string') {
        res.status(400).json({
          success: false,
          error: "Field 'incidentId' string is required",
        });
        return;
      }

      const intelligence = await aiService.analyzeIncident(incidentId);
      res.status(200).json({
        success: true,
        data: intelligence,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('AI CONFIGURATION MISSING')) {
        res.status(400).json({
          success: false,
          error: err.message,
        });
        return;
      }
      next(err);
    }
  }
}

export const intelligenceController = new IntelligenceController();
