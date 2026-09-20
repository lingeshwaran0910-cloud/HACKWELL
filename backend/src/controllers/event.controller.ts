import { Request, Response, NextFunction } from 'express';
import { systemEventService } from '../services/event.service';
import { formatSingle, formatCollection } from '../utils/response';

export class SystemEventController {
  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await systemEventService.getEvents(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getEventById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await systemEventService.getEventById(req.params.id);
      res.status(200).json(formatSingle(event));
    } catch (err) {
      next(err);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await systemEventService.createEvent(req.body);
      res.status(201).json(formatSingle(event));
    } catch (err) {
      next(err);
    }
  }
}

export const systemEventController = new SystemEventController();
