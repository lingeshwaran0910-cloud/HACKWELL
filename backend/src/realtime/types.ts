import {
  Incident,
  Evidence,
  Resource,
  Hospital,
  Route,
  Recommendation,
  SystemEvent,
  Zone,
} from '../types/shared';

export type RealtimeEventName =
  | 'incident.created'
  | 'incident.updated'
  | 'incident.deleted'
  | 'evidence.created'
  | 'evidence.updated'
  | 'resource.created'
  | 'resource.updated'
  | 'hospital.created'
  | 'hospital.updated'
  | 'route.created'
  | 'route.updated'
  | 'recommendation.created'
  | 'recommendation.updated'
  | 'system_event.created'
  | 'zone.updated'
  | 'dashboard.updated';

export type RealtimeOperation = 'CREATED' | 'UPDATED' | 'DELETED';

export interface RealtimeEventPayload<T = unknown> {
  event: RealtimeEventName;
  timestamp: string;
  entityId?: string;
  operation?: RealtimeOperation;
  data: T;
}

export interface DashboardSummaryData {
  activeIncidents: number;
  unresolvedIncidents: number;
  availableResources: number;
  deployedResources: number;
  hospitalsUnderPressure: number;
  totalHospitals: number;
  cityStatus: 'STABLE' | 'STRAINED' | 'CRITICAL';
  updatedAt: string;
}

export interface ServerToClientEvents {
  'incident.created': (payload: RealtimeEventPayload<Incident>) => void;
  'incident.updated': (payload: RealtimeEventPayload<Incident>) => void;
  'incident.deleted': (payload: RealtimeEventPayload<{ id: string }>) => void;

  'evidence.created': (payload: RealtimeEventPayload<Evidence>) => void;
  'evidence.updated': (payload: RealtimeEventPayload<Evidence>) => void;

  'resource.created': (payload: RealtimeEventPayload<Resource>) => void;
  'resource.updated': (payload: RealtimeEventPayload<Resource>) => void;

  'hospital.created': (payload: RealtimeEventPayload<Hospital>) => void;
  'hospital.updated': (payload: RealtimeEventPayload<Hospital>) => void;

  'route.created': (payload: RealtimeEventPayload<Route>) => void;
  'route.updated': (payload: RealtimeEventPayload<Route>) => void;

  'recommendation.created': (payload: RealtimeEventPayload<Recommendation>) => void;
  'recommendation.updated': (payload: RealtimeEventPayload<Recommendation>) => void;

  'system_event.created': (payload: RealtimeEventPayload<SystemEvent>) => void;

  'zone.updated': (payload: RealtimeEventPayload<Zone>) => void;

  'dashboard.updated': (payload: RealtimeEventPayload<DashboardSummaryData>) => void;
}

export interface ClientToServerEvents {
  'join_room': (room: string) => void;
  'leave_room': (room: string) => void;
  'ping': () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  clientId: string;
  joinedRooms: string[];
}
