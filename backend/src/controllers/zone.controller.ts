import { Request, Response, NextFunction } from 'express';
import { zoneService } from '../services/zone.service';
import { formatSingle, formatCollection } from '../utils/response';

export class ZoneController {
  async getZones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await zoneService.getZones(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getZoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zoneService.getZoneById(req.params.id);
      res.status(200).json(formatSingle(zone));
    } catch (err) {
      next(err);
    }
  }

  async createZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zoneService.createZone(req.body);
      res.status(201).json(formatSingle(zone));
    } catch (err) {
      next(err);
    }
  }

  async updateZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const zone = await zoneService.updateZone(req.params.id, req.body);
      res.status(200).json(formatSingle(zone));
    } catch (err) {
      next(err);
    }
  }

  async deleteZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await zoneService.deleteZone(req.params.id);
      res.status(200).json({
        success: true,
        data: { message: `Zone '${req.params.id}' successfully deleted` },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const zoneController = new ZoneController();
