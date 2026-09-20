import { Request, Response, NextFunction } from "express";
import { z, ZodType } from "zod";
import { ValidationError } from "../utils/errors";

/**
 * Creates a middleware that validates req.body against the provided Zod schema.
 */
export const validateBody =
  (schema: ZodType<any, any, any>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(new ValidationError("Invalid request body", details));
    }
    req.body = result.data;
    next();
  };

/**
 * Creates a middleware that validates req.query against the provided Zod schema.
 */
export const validateQuery =
  (schema: ZodType<any, any, any>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(new ValidationError("Invalid query parameters", details));
    }
    req.query = result.data as any;
    next();
  };

/**
 * Creates a middleware that validates req.params against the provided Zod schema.
 */
export const validateParams =
  (schema: ZodType<any, any, any>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return next(new ValidationError("Invalid route parameters", details));
    }
    req.params = result.data as any;
    next();
  };

export { z };
