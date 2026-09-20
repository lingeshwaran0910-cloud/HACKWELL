import { prisma } from '../db/prisma';
import { Route } from '../types/shared';
import { CreateRouteInput, UpdateRouteInput, RouteQueryInput } from '../validators/route.validator';
import { NotFoundError } from '../utils/errors';
import { eventPublisher } from '../realtime/publisher';

export function mapRouteFromDb(record: any): Route {
  return {
    id: record.id,
    resourceId: record.resourceId,
    incidentId: record.incidentId,
    hospitalId: record.hospitalId,
    origin: JSON.parse(record.origin || '{}'),
    destination: JSON.parse(record.destination || '{}'),
    waypoints: JSON.parse(record.waypoints || '[]'),
    distanceKm: record.distanceKm,
    etaMinutes: record.etaMinutes,
    routingMode: record.routingMode,
    blocked: record.blocked,
    trafficFactor: record.trafficFactor,
    roadEventIds: JSON.parse(record.roadEventIds || '[]'),
    lastCalculatedAt: record.lastCalculatedAt,
    estimated: record.estimated,
    routingStatus: record.routingStatus ?? undefined,
    isSimulated: record.isSimulated ?? undefined,
    callSign: record.callSign ?? undefined,
    targetTitle: record.targetTitle ?? undefined,
  };
}

const ALLOWED_SORT_FIELDS = ['id', 'resourceId', 'incidentId', 'hospitalId', 'distanceKm', 'etaMinutes', 'blocked', 'lastCalculatedAt'];

export class RouteService {
  async getRoutes(query: RouteQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }
    if (query.incidentId) {
      where.incidentId = query.incidentId;
    }
    if (query.hospitalId) {
      where.hospitalId = query.hospitalId;
    }
    if (query.blocked !== undefined) {
      where.blocked = query.blocked;
    }
    if (query.q) {
      where.OR = [
        { resourceId: { contains: query.q } },
        { callSign: { contains: query.q } },
        { targetTitle: { contains: query.q } },
      ];
    }

    const sortBy = query.sortBy && ALLOWED_SORT_FIELDS.includes(query.sortBy) ? query.sortBy : 'lastCalculatedAt';
    const sortOrder = query.sortOrder || 'desc';

    const [records, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.route.count({ where }),
    ]);

    return {
      data: records.map(mapRouteFromDb),
      total,
      page,
      limit,
    };
  }

  async getRouteById(id: string): Promise<Route> {
    const record = await prisma.route.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundError(`Route with ID '${id}' not found`);
    }
    return mapRouteFromDb(record);
  }

  async createRoute(input: CreateRouteInput): Promise<Route> {
    const id = input.id || `route-${Date.now()}`;
    const now = new Date().toISOString();

    const record = await prisma.route.create({
      data: {
        id,
        resourceId: input.resourceId,
        incidentId: input.incidentId ?? null,
        hospitalId: input.hospitalId ?? null,
        origin: JSON.stringify(input.origin),
        destination: JSON.stringify(input.destination),
        waypoints: JSON.stringify(input.waypoints),
        distanceKm: input.distanceKm ?? null,
        etaMinutes: input.etaMinutes ?? null,
        routingMode: input.routingMode,
        blocked: input.blocked,
        trafficFactor: input.trafficFactor,
        roadEventIds: JSON.stringify(input.roadEventIds),
        lastCalculatedAt: now,
        estimated: input.estimated,
        routingStatus: input.routingStatus ?? null,
        isSimulated: input.isSimulated !== undefined ? input.isSimulated : null,
        callSign: input.callSign ?? null,
        targetTitle: input.targetTitle ?? null,
      },
    });

    const route = mapRouteFromDb(record);
    eventPublisher.publishRouteCreated(route);
    return route;
  }

  async updateRoute(id: string, input: UpdateRouteInput): Promise<Route> {
    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Route with ID '${id}' not found`);
    }

    const now = new Date().toISOString();
    const data: any = {
      lastCalculatedAt: now,
    };

    if (input.resourceId !== undefined) data.resourceId = input.resourceId;
    if (input.incidentId !== undefined) data.incidentId = input.incidentId;
    if (input.hospitalId !== undefined) data.hospitalId = input.hospitalId;
    if (input.origin !== undefined) data.origin = JSON.stringify(input.origin);
    if (input.destination !== undefined) data.destination = JSON.stringify(input.destination);
    if (input.waypoints !== undefined) data.waypoints = JSON.stringify(input.waypoints);
    if (input.distanceKm !== undefined) data.distanceKm = input.distanceKm;
    if (input.etaMinutes !== undefined) data.etaMinutes = input.etaMinutes;
    if (input.routingMode !== undefined) data.routingMode = input.routingMode;
    if (input.blocked !== undefined) data.blocked = input.blocked;
    if (input.trafficFactor !== undefined) data.trafficFactor = input.trafficFactor;
    if (input.roadEventIds !== undefined) data.roadEventIds = JSON.stringify(input.roadEventIds);
    if (input.estimated !== undefined) data.estimated = input.estimated;
    if (input.routingStatus !== undefined) data.routingStatus = input.routingStatus;
    if (input.isSimulated !== undefined) data.isSimulated = input.isSimulated;
    if (input.callSign !== undefined) data.callSign = input.callSign;
    if (input.targetTitle !== undefined) data.targetTitle = input.targetTitle;

    const updated = await prisma.route.update({
      where: { id },
      data,
    });

    const route = mapRouteFromDb(updated);
    eventPublisher.publishRouteUpdated(route);
    return route;
  }
}

export const routeService = new RouteService();
