import {
  CityWorld,
  Incident,
  Evidence,
} from '@shared/types';
import cityDataRaw from '@mock-data/hackwell-city.json';

export interface AlertNotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  timestamp: string;
  unread: boolean;
  type: 'critical' | 'warning' | 'info';
  relatedEntityId?: string;
  relatedEntityType?: 'incident' | 'resource' | 'hospital';
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'INCIDENT' | 'RESOURCE' | 'HOSPITAL' | 'EVIDENCE' | 'ROUTE' | 'SYSTEM';
  title: string;
  details: string;
  relatedEntityId?: string;
  relatedEntityType?: 'incident' | 'resource' | 'hospital';
}

// Deep clone initial city snapshot
const createInitialState = (): CityWorld => {
  return JSON.parse(JSON.stringify(cityDataRaw)) as CityWorld;
};

class RealtimeSimulationEngine {
  private cityWorld: CityWorld = createInitialState();
  private alerts: AlertNotificationItem[] = [];
  private activityLogs: ActivityLogEntry[] = [];
  private isLiveSimRunning: boolean = true;
  private lastUpdatedTimestamp: string = new Date().toISOString();
  private stepIndex: number = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeBaselineEvents();
    this.startEngine();
  }

  /** Pre-populate baseline activity and alerts from seed data */
  private initializeBaselineEvents() {
    const now = new Date();

    this.alerts = [
      {
        id: 'notif-1',
        title: 'Critical Incident Verified',
        desc: 'Multi-Vehicle Collision INC-001 in Zone 2 verified by CCTV telemetry.',
        time: '2m ago',
        timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
        unread: true,
        type: 'critical',
        relatedEntityId: 'inc-001',
        relatedEntityType: 'incident',
      },
      {
        id: 'notif-2',
        title: 'Hospital Capacity Alert',
        desc: 'Kauvery KMC Hospital approaching 80% bed utilization.',
        time: '12m ago',
        timestamp: new Date(now.getTime() - 12 * 60000).toISOString(),
        unread: true,
        type: 'warning',
        relatedEntityId: 'hosp-001',
        relatedEntityType: 'hospital',
      },
      {
        id: 'notif-3',
        title: 'Telemetry GPS Warning',
        desc: 'Ambulance AMB-014 telemetry feed updated.',
        time: '25m ago',
        timestamp: new Date(now.getTime() - 25 * 60000).toISOString(),
        unread: false,
        type: 'info',
        relatedEntityId: 'res-a07',
        relatedEntityType: 'resource',
      },
    ];

    // Initialize activity logs from systemEvents and incidents
    const baselineLogs: ActivityLogEntry[] = [];

    (this.cityWorld.systemEvents || []).forEach((se) => {
      baselineLogs.push({
        id: se.id,
        timestamp: se.timestamp,
        severity: se.severity,
        category: 'SYSTEM',
        title: se.message,
        details: `${se.entityType || 'SYSTEM'} (${se.entityId || 'SYS-00'})`,
        relatedEntityId: se.entityId || undefined,
      });
    });

    (this.cityWorld.incidents || []).forEach((inc) => {
      baselineLogs.push({
        id: `LOG-INC-${inc.id}`,
        timestamp: inc.firstReportedAt,
        severity: inc.severity >= 4 ? 'CRITICAL' : 'WARNING',
        category: 'INCIDENT',
        title: `${inc.title} (${inc.id})`,
        details: `Zone ${inc.zoneId} • Priority ${inc.priority.score}/100`,
        relatedEntityId: inc.id,
        relatedEntityType: 'incident',
      });
    });

    this.activityLogs = baselineLogs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /** Start simulation timer */
  public startEngine() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.isLiveSimRunning) {
        this.executeControlledEventStep();
      }
    }, 4500);
  }

  /** Pause simulation timer */
  public stopEngine() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Toggle live simulation ON / OFF */
  public toggleLiveSim() {
    this.isLiveSimRunning = !this.isLiveSimRunning;
    this.notifyListeners();
  }

  public getIsLiveSimRunning(): boolean {
    return this.isLiveSimRunning;
  }

  public getLastUpdatedTimestamp(): string {
    return this.lastUpdatedTimestamp;
  }

  /** Execute a controlled, realistic operational event sequence */
  private executeControlledEventStep() {
    const nowIso = new Date().toISOString();
    this.lastUpdatedTimestamp = nowIso;

    switch (this.stepIndex % 11) {
      case 0: {
        // Step 0: New Incident Created on NH 83 Palpannai Junction
        const newIncident: Incident = {
          id: 'inc-005',
          type: 'ROAD_ACCIDENT',
          status: 'SUSPECTED',
          title: 'NH 83 Palpannai Junction Transit Collision',
          description: 'Multi-vehicle collision reported at NH 83 Palpannai Junction intersection.',
          location: { lat: 10.7980, lng: 78.7150, accuracyMeters: 10 },
          locationUncertaintyMeters: 10,
          zoneId: 'zone-forest',
          observability: 'PARTIAL',
          evidenceIds: ['ev-005-call'],
          fused: {
            victimCount: 3,
            injuryCount: 2,
            roadBlocked: true,
            firePresent: false,
            notes: ['Emergency 112 caller reports 2 damaged cars'],
          },
          conflicts: [],
          hasConflict: false,
          severity: 4,
          priority: {
            score: 78,
            urgency: 4,
            waitingSeconds: 30,
            observabilityPenalty: 5,
            reasons: ['NH 83 high-density corridor traffic obstruction'],
          },
          responseDebt: {
            value: 45.0,
            urgency: 4,
            waitingSeconds: 30,
            affectedPeopleFactor: 1.5,
            formula: '4 * 30 * 1.5',
            reasons: ['Primary arterial blocked'],
          },
          secondaryRisks: [],
          rippleEffects: [],
          assignedResourceIds: [],
          recommendedHospitalId: 'hosp-001',
          activeRouteIds: [],
          shortageFlags: [],
          verificationRequired: true,
          silentAnomaly: false,
          createdAt: nowIso,
          updatedAt: nowIso,
          firstReportedAt: nowIso,
          resolvedAt: null,
        };

        // Avoid duplicate insertion
        if (!this.cityWorld.incidents.find((i) => i.id === 'inc-005')) {
          this.cityWorld.incidents.unshift(newIncident);
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'New Incident Reported',
          desc: 'NH 83 Palpannai Junction Collision (INC-005) reported in Golden Rock Zone.',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'critical',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'CRITICAL',
          category: 'INCIDENT',
          title: 'INC-005 Reported on NH 83 Palpannai Junction',
          details: 'Golden Rock Zone • Priority 78/100',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });
        break;
      }

      case 1: {
        // Step 1: Evidence Ingested
        const newEvidence: Evidence = {
          id: 'ev-005-cctv',
          sourceType: 'CCTV',
          timestamp: nowIso,
          ingestedAt: nowIso,
          location: { lat: 10.7980, lng: 78.7150, accuracyMeters: 5 },
          incidentId: 'inc-005',
          raw: { camId: 'CCTV-NH83-04', vehicleCount: 2 },
          normalized: {
            incidentTypeHint: 'ROAD_ACCIDENT',
            narrative: 'CCTV feed confirms 2 vehicle cabin impact',
            victimCount: 3,
            injuryCount: 2,
            speedKmh: 0,
            speedSeriesKmh: null,
            impactSignal: true,
            airbagDeployed: true,
            rollover: false,
            gpsStopped: true,
            hazardClass: null,
            roadBlocked: true,
            congestionIndex: 0.75,
            bbox: null,
            cannotDeterminePeople: false,
          },
          confidence: 0.88,
          freshnessSeconds: 10,
          stale: false,
          metadata: {},
        };

        if (!this.cityWorld.evidence.find((e) => e.id === 'ev-005-cctv')) {
          this.cityWorld.evidence.unshift(newEvidence);
        }

        const inc = this.cityWorld.incidents.find((i) => i.id === 'inc-005');
        if (inc && !inc.evidenceIds.includes('ev-005-cctv')) {
          inc.evidenceIds.push('ev-005-cctv');
        }

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'EVIDENCE',
          title: 'CCTV Feed Ingested for INC-005',
          details: 'Camera CCTV-NH83-04 • Confidence 88%',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });
        break;
      }

      case 2: {
        // Step 2: Incident Verified
        const inc = this.cityWorld.incidents.find((i) => i.id === 'inc-005');
        if (inc) {
          inc.status = 'VERIFIED';
          inc.priority.score = 88;
          inc.updatedAt = nowIso;
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Incident Verified',
          desc: 'INC-005 status updated to VERIFIED (CCTV Telemetry Corroboration).',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'info',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'INCIDENT',
          title: 'INC-005 Verified by CCTV Telemetry',
          details: 'Status: VERIFIED • Priority Score 88/100',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });
        break;
      }

      case 3: {
        // Step 3: Resource Dispatched (AMB-014)
        const res = this.cityWorld.resources.find((r) => r.id === 'res-a07'); // AMB-014
        const inc = this.cityWorld.incidents.find((i) => i.id === 'inc-005');

        if (res) {
          res.status = 'EN_ROUTE';
          res.etaMinutes = 3.8;
          res.assignmentIncidentId = 'inc-005';
          res.updatedAt = nowIso;
        }

        if (inc && !inc.assignedResourceIds.includes('res-a07')) {
          inc.assignedResourceIds.push('res-a07');
          inc.status = 'ACTIVE_RESPONSE';
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Resource Dispatched',
          desc: 'AMB-014 dispatched to INC-005 NH 83 Palpannai Junction (ETA 3.8 min).',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'info',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'RESOURCE',
          title: 'AMB-014 Dispatched to INC-005',
          details: 'Status: EN_ROUTE • ETA 3.8 min',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });
        break;
      }

      case 4: {
        // Step 4: Resource Position Movement & ETA Update
        const res = this.cityWorld.resources.find((r) => r.id === 'res-a07');
        if (res) {
          res.location = { lat: 10.7970, lng: 78.7050, accuracyMeters: 5 }; // Movement along Trichy route
          res.etaMinutes = 1.8;
          res.updatedAt = nowIso;
        }

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'RESOURCE',
          title: 'AMB-014 Position Update',
          details: 'En route Palpannai Flyover • ETA 1.8 min',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });
        break;
      }

      case 5: {
        // Step 5: Resource Arrived at Scene
        const res = this.cityWorld.resources.find((r) => r.id === 'res-a07');
        if (res) {
          res.location = { lat: 10.7980, lng: 78.7150, accuracyMeters: 5 };
          res.status = 'AT_INCIDENT';
          res.etaMinutes = 0;
          res.updatedAt = nowIso;
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Unit Arrived at Scene',
          desc: 'AMB-014 arrived at INC-005 Palpannai Junction crash site.',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'info',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'RESOURCE',
          title: 'AMB-014 Arrived at Scene INC-005',
          details: 'Status: AT_INCIDENT • On-site triage active',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });
        break;
      }

      case 6: {
        // Step 6: Hospital Pressure & Capacity Change
        const hosp = this.cityWorld.hospitals.find((h) => h.id === 'hosp-001'); // Kauvery KMC
        if (hosp) {
          hosp.incomingLoad = 4;
          if (typeof hosp.bedsAvailable === 'number') {
            hosp.bedsAvailable = Math.max(2, hosp.bedsAvailable - 2);
          }
          hosp.predictedPressure.level = 'HIGH';
          hosp.updatedAt = nowIso;
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Hospital Capacity Warning',
          desc: 'Kauvery KMC Hospital incoming load increased (+2 casualties). Pressure level: HIGH.',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'warning',
          relatedEntityId: 'hosp-001',
          relatedEntityType: 'hospital',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'WARNING',
          category: 'HOSPITAL',
          title: 'Kauvery KMC Hospital Load Elevated',
          details: 'Incoming Load: 4 units • Pressure: HIGH',
          relatedEntityId: 'hosp-001',
          relatedEntityType: 'hospital',
        });
        break;
      }

      case 7: {
        // Step 7: Incident Escalation (Woraiyur Market Fire INC-002)
        const inc = this.cityWorld.incidents.find((i) => i.id === 'inc-002');
        if (inc) {
          inc.severity = 5;
          inc.priority.score = 96;
          inc.updatedAt = nowIso;
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Incident Escalated',
          desc: 'INC-002 (Woraiyur Textile Fire) escalated to Severity 5 Critical Hazard.',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'critical',
          relatedEntityId: 'inc-002',
          relatedEntityType: 'incident',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'CRITICAL',
          category: 'INCIDENT',
          title: 'INC-002 Escalated to Severity 5',
          details: 'Woraiyur Commercial Zone • Structural Collapse Risk',
          relatedEntityId: 'inc-002',
          relatedEntityType: 'incident',
        });
        break;
      }

      case 8: {
        // Step 8: Resource Transporting Patient
        const res = this.cityWorld.resources.find((r) => r.id === 'res-a07');
        if (res) {
          res.status = 'TRANSPORTING';
          res.destinationHospitalId = 'hosp-001';
          res.updatedAt = nowIso;
        }

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'RESOURCE',
          title: 'AMB-014 Transporting Casualty to Hospital',
          details: 'Destination: Kauvery KMC Hospital Trauma Bay',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });
        break;
      }

      case 9: {
        // Step 9: Incident Resolved
        const inc = this.cityWorld.incidents.find((i) => i.id === 'inc-005');
        if (inc) {
          inc.status = 'RESOLVED';
          inc.resolvedAt = nowIso;
          inc.updatedAt = nowIso;
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Incident Resolved',
          desc: 'INC-005 site cleared by Traffic Police & Paramedics.',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'info',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'INCIDENT',
          title: 'INC-005 Site Cleared & Resolved',
          details: 'NH 83 Palpannai Junction corridor reopened',
          relatedEntityId: 'inc-005',
          relatedEntityType: 'incident',
        });
        break;
      }

      case 10: {
        // Step 10: Resource Released & Available
        const res = this.cityWorld.resources.find((r) => r.id === 'res-a07');
        if (res) {
          res.status = 'AVAILABLE';
          res.assignmentIncidentId = null;
          res.destinationHospitalId = null;
          res.location = { lat: 10.8012, lng: 78.6875, accuracyMeters: 5 }; // Back at Cantonment Central Base
          res.updatedAt = nowIso;
        }

        this.addAlert({
          id: `alert-${Date.now()}`,
          title: 'Unit Available',
          desc: 'AMB-014 returned to Cantonment Central Station (AVAILABLE).',
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'info',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });

        this.addActivity({
          id: `act-${Date.now()}`,
          timestamp: nowIso,
          severity: 'INFO',
          category: 'RESOURCE',
          title: 'AMB-014 Paramedic Unit Available',
          details: 'Status: AVAILABLE • Cantonment Base',
          relatedEntityId: 'res-a07',
          relatedEntityType: 'resource',
        });
        break;
      }
    }

    this.stepIndex++;
    this.notifyListeners();
  }

  /** Add notification alert */
  private addAlert(alert: AlertNotificationItem) {
    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();
  }

  /** Add activity log entry */
  private addActivity(log: ActivityLogEntry) {
    this.activityLogs.unshift(log);
    if (this.activityLogs.length > 150) this.activityLogs.pop();
  }

  /** Public getters */
  public getCityWorld(): CityWorld {
    return this.cityWorld;
  }

  public getAlerts(): AlertNotificationItem[] {
    return this.alerts;
  }

  public getActivityLogs(): ActivityLogEntry[] {
    return this.activityLogs;
  }

  public markAlertRead(id: string) {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) alert.unread = false;
    this.notifyListeners();
  }

  public markAllAlertsRead() {
    this.alerts.forEach((a) => (a.unread = false));
    this.notifyListeners();
  }

  /** Apply simulation scenario side effects to live state */
  public applySimulationEffect(scenarioId: string, entityId: string) {
    const nowIso = new Date().toISOString();

    if (scenarioId === 'HOSPITAL_OVERLOAD') {
      const hosp = this.cityWorld.hospitals.find((h) => h.id === entityId) || this.cityWorld.hospitals[0];
      if (hosp) {
        hosp.bedsAvailable = 7;
        hosp.predictedPressure = {
          level: 'HIGH',
          horizonMinutes: 30,
          basis: 'Simulated Mass Emergency Admission Surge (35 trauma admissions)',
          estimated: true,
        };
        hosp.incomingLoad = 12;

        this.addAlert({
          id: `alert-sim-${Date.now()}`,
          title: 'Simulation: Hospital Surge Applied',
          desc: `${hosp.name} pressure elevated to HIGH (97% load, 7 beds available).`,
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'critical',
          relatedEntityId: hosp.id,
          relatedEntityType: 'hospital',
        });

        this.addActivity({
          id: `act-sim-${Date.now()}`,
          timestamp: nowIso,
          severity: 'CRITICAL',
          category: 'HOSPITAL',
          title: `Simulated Mass Surge at ${hosp.name}`,
          details: 'Available beds reduced to 7. Diversion protocol initiated.',
          relatedEntityId: hosp.id,
          relatedEntityType: 'hospital',
        });
      }
    } else if (scenarioId === 'RESOURCE_FAILURE') {
      const res = this.cityWorld.resources.find((r) => r.id === entityId) || this.cityWorld.resources[0];
      if (res) {
        res.status = 'UNAVAILABLE';
        res.updatedAt = nowIso;

        this.addAlert({
          id: `alert-sim-${Date.now()}`,
          title: 'Simulation: Unit Failure Applied',
          desc: `${res.callSign} marked UNAVAILABLE due to mechanical failure simulation.`,
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'warning',
          relatedEntityId: res.id,
          relatedEntityType: 'resource',
        });

        this.addActivity({
          id: `act-sim-${Date.now()}`,
          timestamp: nowIso,
          severity: 'WARNING',
          category: 'RESOURCE',
          title: `Simulated Breakdown: ${res.callSign}`,
          details: 'Unit taken offline. Secondary unit reroute requested.',
          relatedEntityId: res.id,
          relatedEntityType: 'resource',
        });
      }
    } else if (scenarioId === 'INCIDENT_ESCALATION') {
      const inc = this.cityWorld.incidents.find((i) => i.id === entityId) || this.cityWorld.incidents[0];
      if (inc) {
        inc.severity = 5;
        inc.priority = {
          score: 96,
          urgency: 96,
          waitingSeconds: 0,
          observabilityPenalty: 0,
          reasons: ['Simulated Critical Hazard Escalation'],
        };
        inc.updatedAt = nowIso;

        this.addAlert({
          id: `alert-sim-${Date.now()}`,
          title: 'Simulation: Incident Escalated',
          desc: `${inc.title} escalated to Severity 5 (Critical Hazard).`,
          time: 'Just now',
          timestamp: nowIso,
          unread: true,
          type: 'critical',
          relatedEntityId: inc.id,
          relatedEntityType: 'incident',
        });
      }
    }

    this.notifyListeners();
  }

  /** Reset state from initial snapshot after simulation reset */
  public resetSimulationEffects() {
    const freshState = createInitialState();
    this.cityWorld.hospitals = freshState.hospitals;
    this.cityWorld.resources = freshState.resources;
    this.cityWorld.incidents = freshState.incidents;
    this.notifyListeners();
  }

  /** Listener subscription */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const realtimeEngine = new RealtimeSimulationEngine();
