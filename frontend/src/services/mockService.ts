import { CityWorld, Incident, Resource, Hospital, Zone, Route, Evidence, Recommendation, Simulation, SystemEvent } from '@shared/types';
import cityDataRaw from '@mock-data/hackwell-city.json';

// Cast raw JSON to canonical shared CityWorld contract
const hackwellCityWorld = cityDataRaw as unknown as CityWorld;

/**
 * SafeCity Mock Service Layer
 * Centralized read access to Hackwell city data for Phase 2C Incident & Evidence UI.
 */
export const mockService = {
  /** Retrieve complete city snapshot */
  getCityWorld: (): CityWorld => hackwellCityWorld,

  /** Get all 5 Hackwell zones */
  getZones: (): Zone[] => hackwellCityWorld.zones || [],

  /** Get incidents */
  getIncidents: (): Incident[] => hackwellCityWorld.incidents || [],

  /** Get single incident by ID */
  getIncidentById: (incidentId: string | null): Incident | undefined => {
    if (!incidentId) return undefined;
    return (hackwellCityWorld.incidents || []).find((i) => i.id === incidentId);
  },

  /** Get emergency resources */
  getResources: (): Resource[] => hackwellCityWorld.resources || [],

  /** Get hospitals */
  getHospitals: (): Hospital[] => hackwellCityWorld.hospitals || [],

  /** Get active routes */
  getRoutes: (): Route[] => hackwellCityWorld.routes || [],

  /** Get evidence items */
  getEvidence: (): Evidence[] => hackwellCityWorld.evidence || [],

  /** Get recommendations */
  getRecommendations: (): Recommendation[] => hackwellCityWorld.recommendations || [],

  /** Get simulations */
  getSimulations: (): Simulation[] => hackwellCityWorld.simulations || [],

  /** Get system activity log events */
  getSystemEvents: (): SystemEvent[] => hackwellCityWorld.systemEvents || [],

  /** Get evidence items associated with an incident */
  getEvidenceForIncident: (incidentId: string): Evidence[] => {
    return (hackwellCityWorld.evidence || []).filter((e) => e.incidentId === incidentId);
  },

  /** Get summary metrics dynamically calculated from seed data */
  getSummaryStats: () => {
    const zones = hackwellCityWorld.zones || [];
    const incidents = hackwellCityWorld.incidents || [];
    const resources = hackwellCityWorld.resources || [];
    const hospitals = hackwellCityWorld.hospitals || [];

    const adequateZones = zones.filter((z) => z.coverageStatus === 'ADEQUATE').length;
    const marginalZones = zones.filter((z) => z.coverageStatus === 'MARGINAL').length;
    const riskZones = zones.filter((z) => z.coverageStatus === 'COVERAGE_RISK' || z.coverageStatus === 'BELOW_MINIMUM').length;

    const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED').length;
    const availableResources = resources.filter((r) => r.status === 'AVAILABLE').length;

    return {
      cityName: hackwellCityWorld.city?.name || 'Tiruchirappalli (Trichy)',
      center: hackwellCityWorld.city?.center || { lat: 10.7905, lng: 78.7047 },
      totalIncidents: incidents.length,
      activeIncidents,
      totalResources: resources.length,
      availableResources,
      totalHospitals: hospitals.length,
      totalZones: zones.length,
      adequateZones,
      marginalZones,
      riskZones,
      totalRecommendations: hackwellCityWorld.recommendations?.length || 0,
      totalRoutes: hackwellCityWorld.routes?.length || 0,
    };
  },

  /** Helper to find hospital by ID */
  getHospitalById: (hospitalId: string | null): Hospital | undefined => {
    if (!hospitalId) return undefined;
    return (hackwellCityWorld.hospitals || []).find((h) => h.id === hospitalId);
  },

  /** Helper to find resource by ID */
  getResourceById: (resourceId: string): Resource | undefined => {
    return (hackwellCityWorld.resources || []).find((r) => r.id === resourceId);
  },
};
