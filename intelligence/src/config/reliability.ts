/**
 * SafeCity AI — Source Reliability & System Thresholds
 *
 * Deterministic configuration for evidence source reliability scores,
 * stale thresholds, and default expected source types.
 */

import { EvidenceSourceType } from "../../../shared/types";

/**
 * Deterministic source reliability mapping (scale 0.0 to 1.0).
 * Highly verified feeds (CCTV, Emergency Call, Telemetry, Hospital, Resource) have higher reliability.
 * Crowdsourced reports (Citizen) start lower until corroborated.
 */
export const SOURCE_RELIABILITY_SCORES: Record<EvidenceSourceType, number> = {
  CCTV: 0.90,
  EMERGENCY_CALL: 0.85,
  HOSPITAL_FEED: 0.85,
  RESOURCE_FEED: 0.85,
  VEHICLE_TELEMETRY: 0.80,
  IOT_SENSOR: 0.75,
  GPS: 0.75,
  ROAD_EVENT: 0.75,
  TRAFFIC: 0.70,
  WEATHER: 0.70,
  SATELLITE: 0.60,
  CITIZEN_REPORT: 0.45,
};

/** Default expected source classes for high observability in a zone */
export const DEFAULT_EXPECTED_SOURCES: EvidenceSourceType[] = [
  "EMERGENCY_CALL",
  "CCTV",
  "VEHICLE_TELEMETRY",
  "TRAFFIC",
  "IOT_SENSOR",
];

/** TTL threshold in seconds after which evidence is considered stale */
export const SOURCE_STALE_TTL_SECONDS: Record<EvidenceSourceType, number> = {
  CCTV: 60,
  VEHICLE_TELEMETRY: 90,
  GPS: 120,
  TRAFFIC: 180,
  IOT_SENSOR: 180,
  ROAD_EVENT: 180,
  HOSPITAL_FEED: 300,
  RESOURCE_FEED: 300,
  WEATHER: 600,
  EMERGENCY_CALL: 1200,
  CITIZEN_REPORT: 1200,
  SATELLITE: 3600,
};
