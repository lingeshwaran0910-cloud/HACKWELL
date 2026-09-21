import { prisma } from '../../db/prisma';
import { NotFoundError } from '../../utils/errors';
import { mapIncidentFromDb } from '../incident.service';
import { SafeCityIncidentContext, IncidentOperationalSignals } from './types';

export async function buildIncidentContext(incidentId: string): Promise<SafeCityIncidentContext> {
  const incidentRecord = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incidentRecord) {
    throw new NotFoundError(`Incident '${incidentId}' not found`);
  }

  const incident = mapIncidentFromDb(incidentRecord);

  // Retrieve evidence records
  const evidenceRecords = await prisma.evidence.findMany({
    where: {
      OR: [
        { incidentId: incidentId },
        { id: { in: incident.evidenceIds || [] } },
      ],
    },
  });

  const evidence = evidenceRecords.map((e) => {
    let desc: string | undefined = undefined;
    try {
      const parsedRaw = JSON.parse(e.raw || '{}');
      desc = parsedRaw.description || parsedRaw.text || parsedRaw.notes;
    } catch {
      desc = undefined;
    }
    return {
      id: e.id,
      sourceType: e.sourceType,
      confidence: e.confidence,
      description: desc,
      timestamp: e.timestamp,
    };
  });

  // Retrieve zone metadata
  let zone: { id: string; name: string; riskLevel: string } | null = null;
  if (incident.zoneId) {
    const zoneRecord = await prisma.zone.findUnique({ where: { id: incident.zoneId } });
    if (zoneRecord) {
      zone = {
        id: zoneRecord.id,
        name: zoneRecord.name,
        riskLevel: zoneRecord.coverageStatus,
      };
    }
  }

  // Retrieve assigned resources
  const assignedResourceIds = incident.assignedResourceIds || [];
  const resourceRecords = assignedResourceIds.length > 0
    ? await prisma.resource.findMany({ where: { id: { in: assignedResourceIds } } })
    : [];

  const assignedResources = resourceRecords.map((r) => ({
    id: r.id,
    callSign: r.callSign,
    type: r.type,
    status: r.status,
  }));

  // Count available resources in zone
  const availableResourcesCount = await prisma.resource.count({
    where: {
      status: 'AVAILABLE',
      ...(incident.zoneId ? { homeZoneId: incident.zoneId } : {}),
    },
  });

  // Retrieve recommended hospital
  let recommendedHospital: { id: string; name: string; bedsAvailable: number; capabilities: string[] } | null = null;
  if (incident.recommendedHospitalId) {
    const hospitalRecord = await prisma.hospital.findUnique({ where: { id: incident.recommendedHospitalId } });
    if (hospitalRecord) {
      let beds = 0;
      try {
        const p = JSON.parse(hospitalRecord.bedsAvailable);
        beds = typeof p === 'number' ? p : 0;
      } catch {
        beds = Number(hospitalRecord.bedsAvailable) || 0;
      }
      recommendedHospital = {
        id: hospitalRecord.id,
        name: hospitalRecord.name,
        bedsAvailable: beds,
        capabilities: JSON.parse(hospitalRecord.capabilities || '[]'),
      };
    }
  }

  // Count active incidents in same zone
  const activeIncidentsInSameZone = incident.zoneId
    ? await prisma.incident.count({
        where: {
          zoneId: incident.zoneId,
          status: { not: 'RESOLVED' },
          id: { not: incidentId },
        },
      })
    : 0;

  // Count recent system events
  const recentSystemEventsCount = await prisma.systemEvent.count({
    where: {
      OR: [
        { entityId: incidentId },
        { payload: { contains: incidentId } },
      ],
    },
  });

  // Calculate incident age in minutes
  const firstReportedTime = new Date(incident.firstReportedAt || incident.createdAt).getTime();
  const nowTime = Date.now();
  const incidentAgeMinutes = Math.max(0, Math.round((nowTime - firstReportedTime) / (1000 * 60)));

  // Derive escalation indicators from real facts
  const escalationIndicators: string[] = [];
  if (incident.severity >= 4) {
    escalationIndicators.push('HIGH_SEVERITY_LEVEL');
  }
  if ((incident.priority?.score || 0) > 70) {
    escalationIndicators.push('HIGH_PRIORITY_SCORE');
  }
  if ((incident.responseDebt?.value || 0) > 40) {
    escalationIndicators.push('RESPONSE_DEBT_ACCUMULATED');
  }
  if (incident.hasConflict) {
    escalationIndicators.push('EVIDENCE_CONFLICT_DETECTED');
  }
  if (incident.observability === 'LOW') {
    escalationIndicators.push('LOW_OBSERVABILITY_ZONE');
  }

  // Derive missing critical information
  const missingCriticalInformation: string[] = [];
  if (typeof incident.fused?.victimCount !== 'number') {
    missingCriticalInformation.push('Casualty/victim count unverified');
  }
  if (typeof incident.fused?.injuryCount !== 'number') {
    missingCriticalInformation.push('Injury count unverified');
  }
  if ((incident.locationUncertaintyMeters || 0) > 50) {
    missingCriticalInformation.push(`High GPS uncertainty (±${incident.locationUncertaintyMeters}m)`);
  }
  if (assignedResources.length === 0) {
    missingCriticalInformation.push('No emergency units currently dispatched');
  }

  // Possible duplicate / corroboration signals
  const possibleDuplicateSignals: string[] = [];
  if (evidence.length >= 2) {
    possibleDuplicateSignals.push(`Corroborated by ${evidence.length} evidence sources`);
  }
  if (activeIncidentsInSameZone > 0) {
    possibleDuplicateSignals.push(`${activeIncidentsInSameZone} other open incidents reported in zone ${incident.zoneId}`);
  }

  const signals: IncidentOperationalSignals = {
    evidenceCount: evidence.length,
    relatedIncidentCount: activeIncidentsInSameZone,
    incidentAgeMinutes,
    activeResourceCount: assignedResources.length,
    compatibleResourceCount: availableResourcesCount,
    hospitalAvailability: recommendedHospital
      ? `${recommendedHospital.bedsAvailable} beds available at ${recommendedHospital.name}`
      : 'NOT AVAILABLE',
    hospitalCapabilityMatch: recommendedHospital
      ? (recommendedHospital.capabilities.length > 0 ? 'CAPABLE' : 'LIMITED')
      : 'NOT AVAILABLE',
    activeIncidentsInSameZone,
    recentSystemEventsCount,
    escalationIndicators,
    possibleDuplicateSignals,
    missingCriticalInformation,
  };

  return {
    incident: {
      id: incident.id,
      type: incident.type,
      status: incident.status,
      title: incident.title,
      description: incident.description,
      location: incident.location,
      locationUncertaintyMeters: incident.locationUncertaintyMeters,
      zoneId: incident.zoneId,
      observability: incident.observability,
      severity: incident.severity,
      priority: incident.priority,
      responseDebt: incident.responseDebt,
      fused: incident.fused,
      conflicts: incident.conflicts,
      hasConflict: incident.hasConflict,
      verificationRequired: incident.verificationRequired,
      silentAnomaly: incident.silentAnomaly,
      firstReportedAt: incident.firstReportedAt,
    },
    evidence,
    zone,
    assignedResources,
    availableResourcesCount,
    recommendedHospital,
    signals,
  };
}
