import { Request, Response, NextFunction } from "express";
import { reportSchema } from "../validators/report.validator";
import { reportService } from "../services/report.service";

export const reportController = {
  /**
   * POST /api/reports
   * Body: ReportInput — creates a new emergency report in Firestore.
   * Auth optional: authenticated users get their uid stored, public reports are allowed.
   */
  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = reportSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid report data", details },
        });
        return;
      }

      const result = await reportService.createReport(
        parsed.data,
        req.user?.uid,
        req.user?.username
      );

      res.status(201).json({
        success: true,
        report: result.report,
        incident: result.incident,
        message: "Emergency report submitted successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/reports
   * Returns list of submitted reports.
   */
  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const reports = await reportService.getReports(limit);
      res.status(200).json({ success: true, reports });
    } catch (err) {
      next(err);
    }
  },
};
