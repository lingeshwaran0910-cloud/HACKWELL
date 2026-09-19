/**
 * SafeCity AI — shared contracts (Phase 1).
 * Backend, frontend, intelligence, and optimization must import these types.
 * Do not invent parallel enums.
 */

export type EvidenceSourceType =
  | "EMERGENCY_CALL"
  | "CCTV"
  | "VEHICLE_TELEMETRY"
  | "TRAFFIC"
  | "IOT_SENSOR"
  | "GPS"
  | "SATELLITE"
  | "CITIZEN_REPORT"
  | "WEATHER"
  | "HOSPITAL_FEED"
  | "RESOURCE_FEED"
  | "ROAD_EVENT";

export type IncidentStatus =
  | "NEW"
  | "SUSPECTED"
  | "CORROBORATED"
  | "VERIFIED"
  | "ACTIVE_RESPONSE"
  | "RESOLVED";

export type ObservabilityLevel = "HIGH" | "PARTIAL" | "LOW";

export type ResourceType =
  | "AMBULANCE"
  | "POLICE_UNIT"
  | "FIRE_UNIT"
  | "RESCUE_UNIT"
  | "TRAFFIC_UNIT"
  | "OTHER_EMERGENCY_UNIT";

export type ResourceStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "EN_ROUTE"
  | "AT_INCIDENT"
  | "TRANSPORTING"
  | "AT_HOSPITAL"
  | "RETURNING"
  | "UNAVAILABLE"
  | "UNKNOWN";

export type RecommendationState = "PROPOSED" | "ACCEPTED" | "MODIFIED" | "REJECTED";

export type CoverageStatus = "ADEQUATE" | "MARGINAL" | "COVERAGE_RISK" | "BELOW_MINIMUM";

export type IncidentType =
  | "ROAD_ACCIDENT"
  | "FIRE"
  | "MEDICAL"
  | "TRAFFIC"
  | "HAZMAT"
  | "FLOOD"
  | "OTHER";

export type UnknownCount = "UNKNOWN";

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracyMeters: number | null;
}

export interface CoverageCounts {
  ambulance: number;
  police: number;
  fire: number;
  rescue: number;
}

export interface Zone {
  id: string;
  name: string;
  polygon: GeoPoint[];
  center: GeoPoint;
  observabilityBaseline: ObservabilityLevel;
  typicalSourceTypes: EvidenceSourceType[];
  neighboringZoneIds: string[];
  minCoverage: CoverageCounts;
  currentCoverage: CoverageCounts;
  coverageStatus: CoverageStatus;
  nearbyResourceIds: string[];
  updatedAt: string;
}

export interface NormalizedPayload {
  incidentTypeHint: IncidentType | null;
  narrative: string | null;
  victimCount: number | UnknownCount;
  injuryCount: number | UnknownCount;
  speedKmh: number | null;
  speedSeriesKmh: number[] | null;
  impactSignal: boolean | null;
  airbagDeployed: boolean | null;
  rollover: boolean | null;
  gpsStopped: boolean | null;
  hazardClass: string | null;
  roadBlocked: boolean | null;
  congestionIndex: number | null;
  bbox: { south: number; west: number; north: number; east: number } | null;
  cannotDeterminePeople: boolean;
}

export interface Evidence {
  id: string;
  sourceType: EvidenceSourceType;
  timestamp: string;
  ingestedAt: string;
  location: GeoPoint | null;
  incidentId: string | null;
  raw: Record<string, unknown>;
  normalized: NormalizedPayload;
  confidence: number;
  freshnessSeconds: number;
  stale: boolean;
  metadata: Record<string, unknown>;
}

export interface ConflictValue {
  sourceType: EvidenceSourceType;
  evidenceId: string;
  value: unknown;
}

export interface Conflict {
  field: string;
  values: ConflictValue[];
  resolution: "UNKNOWN_DUE_TO_CONFLICT";
}

export interface FusedFacts {
  victimCount: number | UnknownCount;
  injuryCount: number | UnknownCount;
  roadBlocked: boolean | UnknownCount;
  firePresent: boolean | UnknownCount;
  notes: string[];
}

export interface PriorityBreakdown {
  score: number;
  urgency: number;
  waitingSeconds: number;
  observabilityPenalty: number;
  reasons: string[];
}

export interface ResponseDebtBreakdown {
  value: number;
  urgency: number;
  waitingSeconds: number;
  affectedPeopleFactor: number;
  formula: string;
  reasons: string[];
}

export interface SecondaryRisk {
  kind: string;
  fromId: string;
  toId: string;
  estimated: true;
  note: string;
}

export type RippleLink = SecondaryRisk;

export interface Incident {
  id: string;
  type: IncidentType;
  status: IncidentStatus;
  title: string;
  description: string;
  location: GeoPoint;
  locationUncertaintyMeters: number | null;
  zoneId: string;
  observability: ObservabilityLevel;
  evidenceIds: string[];
  fused: FusedFacts;
  conflicts: Conflict[];
  severity: 1 | 2 | 3 | 4 | 5;
  priority: PriorityBreakdown;
  responseDebt: ResponseDebtBreakdown;
  secondaryRisks: SecondaryRisk[];
  rippleEffects: RippleLink[];
  assignedResourceIds: string[];
  recommendedHospitalId: string | null;
  activeRouteIds: string[];
  shortageFlags: string[];
  verificationRequired: boolean;
  silentAnomaly: boolean;
  createdAt: string;
  updatedAt: string;
  firstReportedAt: string;
  resolvedAt: string | null;
}

export interface Resource {
  id: string;
  callSign: string;
  type: ResourceType;
  capabilities: string[];
  homeZoneId: string;
  location: GeoPoint | null;
  status: ResourceStatus;
  etaMinutes: number | null;
  assignmentIncidentId: string | null;
  destinationHospitalId: string | null;
  lastUpdateAt: string;
  freshnessSeconds: number;
  stale: boolean;
  staleReason: string | null;
  unavailableReason: string | null;
  isReserve: boolean;
  updatedAt: string;
}

export interface PredictedPressure {
  level: "LOW" | "MODERATE" | "HIGH" | "UNKNOWN";
  horizonMinutes: number;
  basis: string;
  estimated: true;
}

export interface Hospital {
  id: string;
  name: string;
  location: GeoPoint;
  zoneId: string;
  capabilities: string[];
  bedsTotal: number;
  bedsAvailable: number | UnknownCount;
  currentLoad: number | UnknownCount;
  incomingLoad: number;
  predictedPressure: PredictedPressure;
  lastUpdateAt: string;
  stale: boolean;
  updatedAt: string;
}

export interface DispatchAssignment {
  resourceId: string;
  role: string;
  etaMinutes: number | null;
  fromZoneId: string;
}

export interface DispatchPlan {
  assignments: DispatchAssignment[];
  hospitalId: string | null;
  routeIds: string[];
  mutualAidFromZoneIds: string[];
  uncoveredDemand: string[];
}

export interface AssignmentCostBreakdown {
  travelTime: number;
  urgencyPenalty: number;
  coverageLoss: number;
  resourceSuitabilityPenalty: number;
  otherIncidentImpact: number;
  total: number;
  weights: Record<string, number>;
}

export interface CoverageImpact {
  zoneId: string;
  before: CoverageCounts;
  after: CoverageCounts;
  statusAfter: CoverageStatus;
  coverageRisk: boolean;
}

export interface ShortageReport {
  missing: { type: ResourceType; capability: string | null; incidentId: string }[];
  uncoveredDemand: string[];
  notes: string[];
}

export interface OperatorDecision {
  action: "ACCEPT" | "MODIFY" | "REJECT";
  at: string;
  operatorNote: string | null;
  modifiedPlan: DispatchPlan | null;
}

export interface Recommendation {
  id: string;
  incidentId: string;
  relatedIncidentIds: string[];
  state: RecommendationState;
  createdAt: string;
  plan: DispatchPlan;
  cost: AssignmentCostBreakdown;
  reasons: string[];
  coverageImpact: CoverageImpact[];
  shortage: ShortageReport | null;
  simulationId: string | null;
  decision: OperatorDecision | null;
  updatedAt: string;
}

export interface Route {
  id: string;
  resourceId: string;
  incidentId: string | null;
  hospitalId: string | null;
  origin: GeoPoint;
  destination: GeoPoint;
  waypoints: GeoPoint[];
  distanceKm: number;
  etaMinutes: number;
  routingMode: "OSRM" | "SIMULATED";
  blocked: boolean;
  trafficFactor: number;
  roadEventIds: string[];
  lastCalculatedAt: string;
  estimated: boolean;
}

export interface SimulationPlanResult {
  name: string;
  plan: DispatchPlan;
  cost: AssignmentCostBreakdown;
  reasons: string[];
}

export interface Simulation {
  id: string;
  label: string;
  createdAt: string;
  assumptions: Record<string, unknown>;
  plans: SimulationPlanResult[];
  comparison: string[];
  simulated: true;
  disclaimer: string;
}

export interface SystemEvent {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  timestamp: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  message: string;
}

export const SOCKET_EVENTS = [
  "incident.created",
  "incident.updated",
  "resource.updated",
  "hospital.updated",
  "recommendation.created",
  "coverage.updated",
  "simulation.updated",
  "system.alert",
] as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[number];
