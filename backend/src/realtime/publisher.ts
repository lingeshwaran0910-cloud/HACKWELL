import { getIo } from './socket';
import { logger } from '../config/logger';
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
import { RealtimeEventPayload, DashboardSummaryData } from './types';

export class EventPublisher {
  private emitEvent<T>(
    event: any,
    entityId: string | undefined,
    operation: 'CREATED' | 'UPDATED' | 'DELETED',
    data: T,
    targetRooms: string[] = ['command-center']
  ) {
    const io = getIo();
    if (!io) return;

    const payload: RealtimeEventPayload<T> = {
      event,
      timestamp: new Date().toISOString(),
      entityId,
      operation,
      data,
    };

    try {
      for (const room of targetRooms) {
        io.to(room).emit(event, payload as any);
      }
      logger.info(
        { event, entityId, operation, targetRooms },
        `Published realtime event: ${event}`
      );
    } catch (err) {
      logger.error({ err, event, entityId }, 'Failed to publish realtime event');
    }
  }

  // Incidents
  publishIncidentCreated(incident: Incident) {
    this.emitEvent('incident.created', incident.id, 'CREATED', incident, [
      'command-center',
      `zone:${incident.zoneId}`,
    ]);
  }

  publishIncidentUpdated(incident: Incident) {
    this.emitEvent('incident.updated', incident.id, 'UPDATED', incident, [
      'command-center',
      `zone:${incident.zoneId}`,
      `incident:${incident.id}`,
    ]);
  }

  publishIncidentDeleted(id: string, zoneId?: string) {
    const rooms = ['command-center'];
    if (zoneId) rooms.push(`zone:${zoneId}`);
    this.emitEvent('incident.deleted', id, 'DELETED', { id }, rooms);
  }

  // Evidence
  publishEvidenceCreated(evidence: Evidence) {
    const rooms = ['command-center'];
    if (evidence.incidentId) rooms.push(`incident:${evidence.incidentId}`);
    this.emitEvent('evidence.created', evidence.id, 'CREATED', evidence, rooms);
  }

  publishEvidenceUpdated(evidence: Evidence) {
    const rooms = ['command-center'];
    if (evidence.incidentId) rooms.push(`incident:${evidence.incidentId}`);
    this.emitEvent('evidence.updated', evidence.id, 'UPDATED', evidence, rooms);
  }

  // Resources
  publishResourceCreated(resource: Resource) {
    const rooms = ['command-center', `zone:${resource.homeZoneId}`];
    this.emitEvent('resource.created', resource.id, 'CREATED', resource, rooms);
  }

  publishResourceUpdated(resource: Resource) {
    const rooms = ['command-center', `zone:${resource.homeZoneId}`];
    if (resource.assignmentIncidentId) {
      rooms.push(`incident:${resource.assignmentIncidentId}`);
    }
    this.emitEvent('resource.updated', resource.id, 'UPDATED', resource, rooms);
  }

  // Hospitals
  publishHospitalCreated(hospital: Hospital) {
    const rooms = ['command-center', `zone:${hospital.zoneId}`];
    this.emitEvent('hospital.created', hospital.id, 'CREATED', hospital, rooms);
  }

  publishHospitalUpdated(hospital: Hospital) {
    const rooms = ['command-center', `zone:${hospital.zoneId}`];
    this.emitEvent('hospital.updated', hospital.id, 'UPDATED', hospital, rooms);
  }

  // Routes
  publishRouteCreated(route: Route) {
    const rooms = ['command-center'];
    if (route.incidentId) rooms.push(`incident:${route.incidentId}`);
    this.emitEvent('route.created', route.id, 'CREATED', route, rooms);
  }

  publishRouteUpdated(route: Route) {
    const rooms = ['command-center'];
    if (route.incidentId) rooms.push(`incident:${route.incidentId}`);
    this.emitEvent('route.updated', route.id, 'UPDATED', route, rooms);
  }

  // Recommendations
  publishRecommendationCreated(recommendation: Recommendation) {
    const rooms = ['command-center', `incident:${recommendation.incidentId}`];
    this.emitEvent('recommendation.created', recommendation.id, 'CREATED', recommendation, rooms);
  }

  publishRecommendationUpdated(recommendation: Recommendation) {
    const rooms = ['command-center', `incident:${recommendation.incidentId}`];
    this.emitEvent('recommendation.updated', recommendation.id, 'UPDATED', recommendation, rooms);
  }

  // System Events
  publishSystemEventCreated(event: SystemEvent) {
    this.emitEvent('system_event.created', event.id, 'CREATED', event, ['command-center']);
  }

  // Zones
  publishZoneUpdated(zone: Zone) {
    this.emitEvent('zone.updated', zone.id, 'UPDATED', zone, [
      'command-center',
      `zone:${zone.id}`,
    ]);
  }

  // Dashboard Summary
  publishDashboardUpdated(data: DashboardSummaryData) {
    this.emitEvent('dashboard.updated', undefined, 'UPDATED', data, ['command-center']);
  }
}

export const eventPublisher = new EventPublisher();
