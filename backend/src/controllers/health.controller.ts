import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export const healthController = {
  getHealth(_req: Request, res: Response, _next: NextFunction): void {
    res.status(200).json({
      status: "ok",
      service: "safecity-backend",
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: "v1",
      uptimeSeconds: Math.floor(process.uptime()),
    });
  },
};
