import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .default("file:./dev.db"),
  PORT: z.coerce.number().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  // JWT Authentication
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters")
    .default("safecity-dev-jwt-secret-change-in-production-2024"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  // Firebase — optional, only needed if using Firestore features
  FIREBASE_PROJECT_ID: z.string().optional().default("safecity-ai-dev"),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  // AI Configuration
  AI_PROVIDER: z.string().optional().default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional().default("gemini-2.5-flash"),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.error(`Invalid environment configuration:\n${errorDetails}`);
    process.exit(1);
  }
  return result.data;
};

export const env = parseEnv();
