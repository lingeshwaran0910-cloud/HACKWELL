import { Request, Response, NextFunction } from 'express';
import { hospitalService } from '../services/hospital.service';
import { formatSingle, formatCollection } from '../utils/response';

export class HospitalController {
  async getHospitals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hospitalService.getHospitals(req.query as any);
      res.status(200).json(formatCollection(result.data, result.page, result.limit, result.total));
    } catch (err) {
      next(err);
    }
  }

  async getHospitalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await hospitalService.getHospitalById(req.params.id);
      res.status(200).json(formatSingle(hospital));
    } catch (err) {
      next(err);
    }
  }

  async createHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await hospitalService.createHospital(req.body);
      res.status(201).json(formatSingle(hospital));
    } catch (err) {
      next(err);
    }
  }

  async updateHospital(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hospital = await hospitalService.updateHospital(req.params.id, req.body);
      res.status(200).json(formatSingle(hospital));
    } catch (err) {
      next(err);
    }
  }
}

export const hospitalController = new HospitalController();
