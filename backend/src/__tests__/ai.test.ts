// ─── Mock Firebase Admin before any imports ──────────────────────────────────
jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(() => ({ options: { projectId: "safecity-test" } })),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
  deleteApp: jest.fn(),
  applicationDefault: jest.fn(),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => ({ exists: false, data: () => null })),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(function () { return this; }),
      limit: jest.fn(function () { return this; }),
      get: jest.fn(() => ({ docs: [] })),
      count: jest.fn(() => ({ get: jest.fn(() => ({ data: () => ({ count: 0 }) })) })),
    })),
    settings: jest.fn(),
    batch: jest.fn(() => ({ set: jest.fn(), commit: jest.fn() })),
  })),
}));

jest.mock("firebase-admin/auth", () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    createCustomToken: jest.fn(() => "mock-custom-token"),
  })),
}));
// ─────────────────────────────────────────────────────────────────────────────

import request from "supertest";
import { app } from "../app";

describe("SafeCity AI Intelligence API Endpoints", () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.GEMINI_API_KEY;
  });

  afterAll(() => {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  describe("GET /api/intelligence/health", () => {
    it("returns health status accurately without crashing", async () => {
      const res = await request(app).get("/api/intelligence/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status");
      expect(res.body.health).toHaveProperty("configured");
      expect(res.body.health).toHaveProperty("provider");
      expect(res.body.health).toHaveProperty("model");
    });
  });

  describe("POST /api/intelligence/test", () => {
    it("returns 400 with AI CONFIGURATION MISSING when API key is not configured", async () => {
      process.env.GEMINI_API_KEY = "";
      const res = await request(app)
        .post("/api/intelligence/test")
        .send({ message: "Respond with READY" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("AI CONFIGURATION MISSING");
      if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    });
  });

  describe("POST /api/intelligence/analyze", () => {
    it("returns 400 if incidentId is missing", async () => {
      const res = await request(app)
        .post("/api/intelligence/analyze")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 with AI CONFIGURATION MISSING when API key is missing", async () => {
      process.env.GEMINI_API_KEY = "";
      const res = await request(app)
        .post("/api/intelligence/analyze")
        .send({ incidentId: "inc-001" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("AI CONFIGURATION MISSING");
      if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
    });
  });
});
