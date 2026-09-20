import { Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incident.service';
import { formatSingle, formatCollection } from '../utils/response';

export class IncidentController {
  async getIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await incidentService.getIncidents(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getIncidentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incident = await incidentService.getIncidentById(req.params.id);
      res.status(200).json(formatSingle(incident));
    } catch (err) {
      next(err);
    }
  }

  async createIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incident = await incidentService.createIncident(req.body);
      res.status(201).json(formatSingle(incident));
    } catch (err) {
      next(err);
    }
  }

  async updateIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incident = await incidentService.updateIncident(req.params.id, req.body);
      res.status(200).json(formatSingle(incident));
    } catch (err) {
      next(err);
    }
  }
}

export const incidentController = new IncidentController();
