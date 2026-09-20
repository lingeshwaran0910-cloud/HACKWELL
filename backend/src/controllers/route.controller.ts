import { Request, Response, NextFunction } from 'express';
import { routeService } from '../services/route.service';
import { formatSingle, formatCollection } from '../utils/response';

export class RouteController {
  async getRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await routeService.getRoutes(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getRouteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await routeService.getRouteById(req.params.id);
      res.status(200).json(formatSingle(route));
    } catch (err) {
      next(err);
    }
  }

  async createRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await routeService.createRoute(req.body);
      res.status(201).json(formatSingle(route));
    } catch (err) {
      next(err);
    }
  }

  async updateRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const route = await routeService.updateRoute(req.params.id, req.body);
      res.status(200).json(formatSingle(route));
    } catch (err) {
      next(err);
    }
  }
}

export const routeController = new RouteController();
