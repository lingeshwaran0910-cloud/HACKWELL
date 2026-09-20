import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { closeFirebase } from "./config/firebase";
import { initSocketServer } from "./realtime/socket";

const httpServer = http.createServer(app);
initSocketServer(httpServer);

const server = httpServer.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, environment: env.NODE_ENV, nodeVersion: process.version },
    `SafeCity AI Backend & Socket.IO server listening on port ${env.PORT}`
  );
});

export { server, httpServer };

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info({ signal }, `Received ${signal}, initiating graceful shutdown...`);
  server.close(async () => {
    logger.info("HTTP server closed successfully.");
    await closeFirebase();
    process.exit(0);
  });
  setTimeout(() => {
    logger.error("Forced shutdown timeout. Exiting.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught Exception! Shutting down...");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Promise Rejection! Shutting down...");
  process.exit(1);
});
