import { GeoPoint, Route } from '@shared/types';

interface FetchRouteParams {
  origin: GeoPoint;
  destination: GeoPoint;
  resourceId: string;
  incidentId?: string | null;
  hospitalId?: string | null;
  callSign?: string;
  targetTitle?: string;
}

class RoutingService {
  private cache = new Map<string, Route>();
  private pendingRequests = new Map<string, Promise<Route>>();

  private getCacheKey(params: FetchRouteParams): string {
    const { origin, destination, resourceId, incidentId, hospitalId } = params;
    return `${resourceId}_${incidentId || ''}_${hospitalId || ''}_${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}_${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  }

  async getRoute(params: FetchRouteParams): Promise<Route> {
    const cacheKey = this.getCacheKey(params);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const fetchPromise = this.executeFetch(params, cacheKey);
    this.pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeFetch(params: FetchRouteParams, cacheKey: string): Promise<Route> {
    const { origin, destination, resourceId, incidentId, hospitalId, callSign, targetTitle } = params;

    // OSRM Driving API URL
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometry=geojson&overview=full&steps=true`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM API returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const osrmRoute = data.routes[0];
        const rawCoords: [number, number][] = osrmRoute.geometry.coordinates; // [lng, lat]

        // Convert [lng, lat] -> Leaflet GeoPoint { lat, lng }
        const waypoints: GeoPoint[] = rawCoords.map(([lng, lat]) => ({
          lat,
          lng,
          accuracyMeters: null,
        }));

        const distanceKm = Number((osrmRoute.distance / 1000).toFixed(1));
        const etaMinutes = Math.max(1, Math.round(osrmRoute.duration / 60));

        const route: Route = {
          id: `route-${resourceId}-${incidentId || hospitalId || 'target'}`,
          resourceId,
          incidentId: incidentId || null,
          hospitalId: hospitalId || null,
          origin,
          destination,
          waypoints,
          distanceKm,
          etaMinutes,
          routingMode: 'OSRM',
          blocked: false,
          trafficFactor: 1.0,
          roadEventIds: [],
          lastCalculatedAt: new Date().toISOString(),
          estimated: false,
          routingStatus: 'SUCCESS',
          isSimulated: false,
          callSign: callSign || resourceId,
          targetTitle: targetTitle || 'Incident Site',
        };

        this.cache.set(cacheKey, route);
        return route;
      }
    } catch (err) {
      console.warn(`[RoutingService] OSRM route fetch failed for ${resourceId}, using fallback:`, err);
    }

    // Graceful Fallback route if OSRM is unreachable
    const fallbackRoute: Route = {
      id: `route-${resourceId}-${incidentId || hospitalId || 'target'}-fallback`,
      resourceId,
      incidentId: incidentId || null,
      hospitalId: hospitalId || null,
      origin,
      destination,
      waypoints: [origin, destination],
      distanceKm: null, // Do NOT invent fake distance
      etaMinutes: null, // Do NOT invent fake ETA
      routingMode: 'SIMULATED',
      blocked: false,
      trafficFactor: 1.0,
      roadEventIds: [],
      lastCalculatedAt: new Date().toISOString(),
      estimated: true,
      routingStatus: 'FALLBACK',
      isSimulated: true,
      callSign: callSign || resourceId,
      targetTitle: targetTitle || 'Incident Site',
    };

    return fallbackRoute;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const routingService = new RoutingService();
