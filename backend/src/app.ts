import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { initFirebase } from "./config/firebase";

import { healthRoutes } from "./routes/health.routes";
import { authRoutes } from "./routes/auth.routes";
import { reportRoutes } from "./routes/report.routes";
import { liveInputRoutes } from "./routes/liveInput.routes";

// REST API v1 Routes
import zoneRoutes from "./routes/zone.routes";
import incidentRoutes from "./routes/incident.routes";
import evidenceRoutes from "./routes/evidence.routes";
import resourceRoutes from "./routes/resource.routes";
import hospitalRoutes from "./routes/hospital.routes";
import routeRoutes from "./routes/route.routes";
import recommendationRoutes from "./routes/recommendation.routes";
import eventRoutes from "./routes/event.routes";

import { notFoundHandler } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();

  // Initialize Firebase Admin SDK
  initFirebase();

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // JSON body parsing with reasonable size limit
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Request logging
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      logger.info(
        { method: req.method, url: req.originalUrl, statusCode: res.statusCode, durationMs },
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`
      );
    });
    next();
  });

  // Health endpoint: GET /api/health
  app.use("/api", healthRoutes);

  // Legacy / Phase 1 auth & input endpoints
  app.use("/api/auth", authRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/inputs", liveInputRoutes);

  // SafeCity REST API v1 Domain Endpoints
  app.use("/api/v1/zones", zoneRoutes);
  app.use("/api/v1/incidents", incidentRoutes);
  app.use("/api/v1/evidence", evidenceRoutes);
  app.use("/api/v1/resources", resourceRoutes);
  app.use("/api/v1/hospitals", hospitalRoutes);
  app.use("/api/v1/routes", routeRoutes);
  app.use("/api/v1/recommendations", recommendationRoutes);
  app.use("/api/v1/events", eventRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
