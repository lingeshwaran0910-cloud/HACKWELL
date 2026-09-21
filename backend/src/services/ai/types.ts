import { z } from 'zod';

export type AIProviderName = 'gemini' | 'openai';

export interface AIHealthResult {
  configured: boolean;
  online: boolean;
  provider: string;
  model: string;
  message: string;
  error?: string;
}

export interface AITestResponse {
  success: boolean;
  provider: string;
  model: string;
  response: string;
}

export interface IncidentOperationalSignals {
  evidenceCount: number;
  relatedIncidentCount: number;
  incidentAgeMinutes: number;
  activeResourceCount: number;
  compatibleResourceCount: number;
  hospitalAvailability: string;
  hospitalCapabilityMatch: string;
  activeIncidentsInSameZone: number;
  recentSystemEventsCount: number;
  escalationIndicators: string[];
  possibleDuplicateSignals: string[];
  missingCriticalInformation: string[];
}

export interface SafeCityIncidentContext {
  incident: {
    id: string;
    type: string;
    status: string;
    title: string;
    description: string;
    location: { lat: number; lng: number };
    locationUncertaintyMeters?: number | null;
    zoneId: string;
    observability: string;
    severity: number;
    priority: { score?: number; urgency?: number; reasons?: string[] };
    responseDebt: { value?: number; formula?: string };
    fused: { victimCount?: number | string; injuryCount?: number | string; notes?: string[] };
    conflicts: any[];
    hasConflict: boolean;
    verificationRequired: boolean;
    silentAnomaly: boolean;
    firstReportedAt: string;
  };
  evidence: Array<{
    id: string;
    sourceType: string;
    confidence: number;
    description?: string;
    timestamp: string;
  }>;
  zone?: {
    id: string;
    name: string;
    riskLevel: string;
  } | null;
  assignedResources: Array<{
    id: string;
    callSign: string;
    type: string;
    status: string;
  }>;
  availableResourcesCount: number;
  recommendedHospital?: {
    id: string;
    name: string;
    bedsAvailable: number;
    capabilities: string[];
  } | null;
  signals: IncidentOperationalSignals;
}

export const IntelligenceOutputSchema = z.object({
  incidentId: z.string(),
  classification: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priorityScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  situationSummary: z.string(),
  keyFindings: z.array(z.string()),
  riskFactors: z.array(z.string()),
  whatChanged: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
  resourceInsight: z.string(),
  hospitalInsight: z.string(),
  routeInsight: z.string(),
  missingInformation: z.array(z.string()),
  supportingEntities: z.array(z.string()),
  analysisTimestamp: z.string(),
});

export type StructuredIntelligenceOutput = z.infer<typeof IntelligenceOutputSchema>;

export interface AIProviderInterface {
  readonly providerName: AIProviderName;
  readonly modelName: string;
  isConfigured(): boolean;
  healthCheck(): Promise<AIHealthResult>;
  testConnection(promptMessage: string): Promise<AITestResponse>;
  analyzeIncidentContext(context: SafeCityIncidentContext): Promise<StructuredIntelligenceOutput>;
}
