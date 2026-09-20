/**
 * SafeCity AI — Backend Tests
 * Tests for health endpoint, auth validation, report validation, and live input validation.
 * Uses mocked Firebase — no real database connections during tests.
 */

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
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { reportSchema } from "../validators/report.validator";
import { liveInputSchema } from "../validators/liveInput.validator";

// ─── Health Endpoint ──────────────────────────────────────────────────────────
describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("safecity-backend");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptimeSeconds");
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
describe("Unknown route", () => {
  it("returns 404 with NOT_FOUND code", async () => {
    const res = await request(app).get("/api/nonexistent-route");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

// ─── Auth Validation ─────────────────────────────────────────────────────────
describe("Login schema validation", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({ username: "lingesh", password: "lingesh1234" });
    expect(result.success).toBe(true);
  });

  it("normalizes username to lowercase", () => {
    const result = loginSchema.safeParse({ username: "LINGESH", password: "lingesh1234" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("lingesh");
    }
  });

  it("rejects missing username", () => {
    const result = loginSchema.safeParse({ password: "lingesh1234" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({ username: "lingesh" });
    expect(result.success).toBe(false);
  });

  it("rejects empty username", () => {
    const result = loginSchema.safeParse({ username: "", password: "pass" });
    expect(result.success).toBe(false);
  });
});

describe("Register schema validation", () => {
  it("accepts valid registration input", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      password: "securepass123",
      name: "Test User",
    });
    expect(result.success).toBe(true);
  });

  it("rejects username shorter than 3 chars", () => {
    const result = registerSchema.safeParse({ username: "ab", password: "pass1234", name: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects username with special characters", () => {
    const result = registerSchema.safeParse({
      username: "test-user!",
      password: "pass1234",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = registerSchema.safeParse({ username: "testuser", password: "short", name: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatching confirm password", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      password: "securepass123",
      confirmPassword: "differentpass",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });
});

// ─── POST /api/auth/login — generic error for bad input ──────────────────────
describe("POST /api/auth/login", () => {
  it("returns 401 with generic error for missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({})
      .set("Content-Type", "application/json");
    // Generic auth error — does not reveal which field is wrong
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe("Invalid username or password");
  });

  it("returns 401 for non-existent username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nonexistent", password: "wrongpass" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid username or password");
  });
});

// ─── Report Validation ────────────────────────────────────────────────────────
describe("Report schema validation", () => {
  const validReport = {
    type: "Medical Emergency",
    severity: 3,
    description: "Person collapsed on the road near the junction.",
    address: "Palpannai Junction, NH-83",
    location: { lat: 10.7905, lng: 78.7047 },
    sourceType: "Citizen Report",
    confidence: 0.85,
  };

  it("accepts valid report input", () => {
    const result = reportSchema.safeParse(validReport);
    expect(result.success).toBe(true);
  });

  it("rejects description shorter than 10 chars", () => {
    const result = reportSchema.safeParse({ ...validReport, description: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects severity outside 1-5", () => {
    const result = reportSchema.safeParse({ ...validReport, severity: 6 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid latitude", () => {
    const result = reportSchema.safeParse({ ...validReport, location: { lat: 200, lng: 78 } });
    expect(result.success).toBe(false);
  });

  it("rejects invalid longitude", () => {
    const result = reportSchema.safeParse({ ...validReport, location: { lat: 10, lng: 200 } });
    expect(result.success).toBe(false);
  });

  it("rejects missing address", () => {
    const result = reportSchema.safeParse({ ...validReport, address: "" });
    expect(result.success).toBe(false);
  });
});

// ─── POST /api/reports — validation ─────────────────────────────────────────
describe("POST /api/reports", () => {
  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/reports")
      .send({ type: "Fire" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── Live Input Validation ────────────────────────────────────────────────────
describe("Live input schema validation", () => {
  it("accepts valid live input", () => {
    const result = liveInputSchema.safeParse({
      sourceType: "EMERGENCY_CALL",
      narrative: "Vehicle crash detected",
      location: { lat: 10.7905, lng: 78.7047, accuracyMeters: 10 },
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid sourceType", () => {
    const result = liveInputSchema.safeParse({
      sourceType: "UNKNOWN_SOURCE",
      narrative: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid location latitude", () => {
    const result = liveInputSchema.safeParse({
      sourceType: "GPS",
      location: { lat: 999, lng: 78 },
    });
    expect(result.success).toBe(false);
  });
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
describe("Authentication middleware", () => {
  it("returns 401 when no Authorization header on protected route", async () => {
    const res = await request(app).get("/api/inputs");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when malformed token on protected route", async () => {
    const res = await request(app)
      .get("/api/inputs")
      .set("Authorization", "Bearer invalid-token-here");
    expect(res.status).toBe(401);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────
describe("Error handling", () => {
  it("returns structured error response on 400", async () => {
    const res = await request(app)
      .post("/api/reports")
      .send({ invalid: "data" })
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error).toHaveProperty("message");
  });
});
