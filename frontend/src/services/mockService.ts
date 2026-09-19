import { CityWorld, Incident, Resource, Hospital, Zone, Route, Evidence, Recommendation, Simulation, SystemEvent } from '@shared/types';
import { realtimeEngine } from './realtimeEngine';

/**
 * SafeCity Mock Service Layer
 * Centralized read access delegating to real-time engine for live state updates.
 */
export const mockService = {
  /** Retrieve complete city snapshot */
  getCityWorld: (): CityWorld => realtimeEngine.getCityWorld(),

  /** Get all 5 Hackwell zones */
  getZones: (): Zone[] => realtimeEngine.getCityWorld().zones || [],

  /** Get incidents */
  getIncidents: (): Incident[] => realtimeEngine.getCityWorld().incidents || [],

  /** Get single incident by ID */
  getIncidentById: (incidentId: string | null): Incident | undefined => {
    if (!incidentId) return undefined;
    return (realtimeEngine.getCityWorld().incidents || []).find((i) => i.id === incidentId);
  },

  /** Get emergency resources */
  getResources: (): Resource[] => realtimeEngine.getCityWorld().resources || [],

  /** Get hospitals */
  getHospitals: (): Hospital[] => realtimeEngine.getCityWorld().hospitals || [],

  /** Get active routes */
  getRoutes: (): Route[] => realtimeEngine.getCityWorld().routes || [],

  /** Get evidence items */
  getEvidence: (): Evidence[] => realtimeEngine.getCityWorld().evidence || [],

  /** Get recommendations */
  getRecommendations: (): Recommendation[] => realtimeEngine.getCityWorld().recommendations || [],

  /** Get simulations */
  getSimulations: (): Simulation[] => realtimeEngine.getCityWorld().simulations || [],

  /** Get system activity log events */
  getSystemEvents: (): SystemEvent[] => realtimeEngine.getCityWorld().systemEvents || [],

  /** Get evidence items associated with an incident */
  getEvidenceForIncident: (incidentId: string): Evidence[] => {
    return (realtimeEngine.getCityWorld().evidence || []).filter((e) => e.incidentId === incidentId);
  },

  /** Get summary metrics dynamically calculated from seed data */
  getSummaryStats: () => {
    const cityWorld = realtimeEngine.getCityWorld();
    const zones = cityWorld.zones || [];
    const incidents = cityWorld.incidents || [];
    const resources = cityWorld.resources || [];
    const hospitals = cityWorld.hospitals || [];

    const adequateZones = zones.filter((z) => z.coverageStatus === 'ADEQUATE').length;
    const marginalZones = zones.filter((z) => z.coverageStatus === 'MARGINAL').length;
    const riskZones = zones.filter((z) => z.coverageStatus === 'COVERAGE_RISK' || z.coverageStatus === 'BELOW_MINIMUM').length;

    const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;
    const availableResources = resources.filter((r) => r.status === 'AVAILABLE').length;

    return {
      cityName: cityWorld.city?.name || 'Tiruchirappalli (Trichy)',
      center: cityWorld.city?.center || { lat: 10.7905, lng: 78.7047 },
      totalIncidents: incidents.length,
      activeIncidents,
      totalResources: resources.length,
      availableResources,
      totalHospitals: hospitals.length,
      totalZones: zones.length,
      adequateZones,
      marginalZones,
      riskZones,
      totalRecommendations: cityWorld.recommendations?.length || 0,
      totalRoutes: cityWorld.routes?.length || 0,
    };
  },

  /** Helper to find hospital by ID */
  getHospitalById: (hospitalId: string | null): Hospital | undefined => {
    if (!hospitalId) return undefined;
    return (realtimeEngine.getCityWorld().hospitals || []).find((h) => h.id === hospitalId);
  },

  /** Helper to find resource by ID */
  getResourceById: (resourceId: string): Resource | undefined => {
    return (realtimeEngine.getCityWorld().resources || []).find((r) => r.id === resourceId);
  },
};
