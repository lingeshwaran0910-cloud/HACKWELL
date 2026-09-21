import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { logger } from "../config/logger";
import { env } from "../config/env";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let code = "INTERNAL_SERVER_ERROR";
  let message = "An unexpected error occurred";
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "Invalid request data";
    details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    code = "INVALID_JSON";
    message = "Malformed JSON in request body";
  } else if (err instanceof Error) {
    const fbErr = err as Error & { code?: string };
    if (err.name === "FirebaseConfigurationError" || err.message?.includes("Firestore is unavailable")) {
      statusCode = 503;
      code = "FIRESTORE_UNAVAILABLE";
      message = err.message;
    } else if (fbErr.code?.startsWith("auth/")) {
      statusCode = 401;
      code = "AUTHENTICATION_ERROR";
      // Never expose internal Firebase error details to clients
      message = "Authentication failed";
    } else {
      message =
        env.NODE_ENV === "production" ? "Internal server error" : err.message;
    }
  }

  if (statusCode >= 500) {
    logger.error(
      { err, method: req.method, url: req.originalUrl, statusCode },
      "Unhandled application error"
    );
  } else {
    logger.warn(
      { code, message, method: req.method, url: req.originalUrl, statusCode },
      "Application client error"
    );
  }

  const response: Record<string, unknown> = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(env.NODE_ENV !== "production" && statusCode >= 500 && err instanceof Error
        ? { stack: err.stack }
        : {}),
    },
  };

  res.status(statusCode).json(response);
};
