/**
 * SafeCity AI — Backend API Service
 *
 * Centralized service for all HTTP requests to the backend.
 * Handles Firebase ID token attachment for authenticated requests.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// ─── Token Storage ────────────────────────────────────────────────────────────
let _idToken: string | null = null;

export const apiService = {
  setToken(token: string | null) {
    _idToken = token;
  },
  clearToken() {
    _idToken = null;
  },
  getToken(): string | null {
    return _idToken;
  },
};

// ─── Base Fetch Helper ────────────────────────────────────────────────────────
interface FetchOptions extends RequestInit {
  auth?: boolean; // attach Authorization header if true (default true)
}

async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, ...fetchInit } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchInit.headers as Record<string, string> | undefined),
  };

  if (auth && _idToken) {
    headers["Authorization"] = `Bearer ${_idToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchInit,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errMsg =
      data?.error?.message || `Request failed with status ${res.status}`;
    throw new ApiError(errMsg, res.status, data?.error?.code);
  }

  return data as T;
}

// ─── API Error class ──────────────────────────────────────────────────────────
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code = "API_ERROR") {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  async check(): Promise<{ status: string; service: string; timestamp: string }> {
    return apiFetch("/health", { auth: false });
  },
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface BackendUserProfile {
  uid: string;
  username: string;
  name: string;
  role: string;
  department: string;
  operatorId?: string;
  avatar?: string;
  permissions: string[];
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  async login(
    username: string,
    password: string
  ): Promise<{ customToken: string; user: BackendUserProfile }> {
    return apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      auth: false,
    });
  },

  async register(data: {
    username: string;
    password: string;
    confirmPassword?: string;
    name: string;
    role?: string;
    department?: string;
  }): Promise<{ user: BackendUserProfile }> {
    return apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      auth: false,
    });
  },

  async me(): Promise<{ user: BackendUserProfile }> {
    return apiFetch("/auth/me");
  },
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface ReportPayload {
  type: string;
  severity: number;
  description: string;
  address: string;
  location: { lat: number; lng: number };
  sourceType: string;
  confidence: number;
  evidenceFiles?: Array<{ name: string; size?: number; type?: string }>;
}

export interface ReportDocument extends ReportPayload {
  id: string;
  status: string;
  reportedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const reportsApi = {
  async create(
    payload: ReportPayload
  ): Promise<{ report: ReportDocument; message: string }> {
    return apiFetch("/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async list(limit = 50): Promise<{ reports: ReportDocument[] }> {
    return apiFetch(`/reports?limit=${limit}`);
  },
};

// ─── Live Inputs ──────────────────────────────────────────────────────────────
export interface LiveInputPayload {
  sourceType: string;
  narrative?: string;
  location?: { lat: number; lng: number; accuracyMeters?: number | null } | null;
  incidentId?: string | null;
  confidence?: number;
  raw?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LiveInputDocument extends LiveInputPayload {
  id: string;
  stale: boolean;
  freshnessSeconds: number;
  timestamp: string;
  ingestedAt: string;
}

export const liveInputsApi = {
  async ingest(payload: LiveInputPayload): Promise<{ input: LiveInputDocument }> {
    return apiFetch("/inputs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async list(limit = 100): Promise<{ inputs: LiveInputDocument[] }> {
    return apiFetch(`/inputs?limit=${limit}`);
  },
};
