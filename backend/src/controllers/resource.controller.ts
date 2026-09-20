import { Request, Response, NextFunction } from 'express';
import { resourceService } from '../services/resource.service';
import { formatSingle, formatCollection } from '../utils/response';

export class ResourceController {
  async getResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await resourceService.getResources(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getResourceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await resourceService.getResourceById(req.params.id);
      res.status(200).json(formatSingle(resource));
    } catch (err) {
      next(err);
    }
  }

  async createResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await resourceService.createResource(req.body);
      res.status(201).json(formatSingle(resource));
    } catch (err) {
      next(err);
    }
  }

  async updateResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = await resourceService.updateResource(req.params.id, req.body);
      res.status(200).json(formatSingle(resource));
    } catch (err) {
      next(err);
    }
  }
}

export const resourceController = new ResourceController();
