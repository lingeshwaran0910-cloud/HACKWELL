import { Request, Response, NextFunction } from "express";
import { liveInputSchema } from "../validators/liveInput.validator";
import { liveInputService } from "../services/liveInput.service";

export const liveInputController = {
  /**
   * POST /api/inputs
   * Ingest a new live evidence signal. Requires authentication.
   */
  async ingestInput(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = liveInputSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        }));
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid live input data", details },
        });
        return;
      }

      const input = await liveInputService.ingestInput(
        parsed.data,
        req.user?.uid,
        req.user?.username
      );

      res.status(201).json({
        success: true,
        input,
        message: "Live input ingested successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/inputs
   * Returns recent live inputs (evidence stream). Requires authentication.
   */
  async getInputs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 500);
      const inputs = await liveInputService.getLiveInputs(limit);
      res.status(200).json({ success: true, inputs });
    } catch (err) {
      next(err);
    }
  },
};
