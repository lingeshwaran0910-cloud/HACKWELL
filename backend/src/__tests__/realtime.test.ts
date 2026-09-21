import http from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { app } from '../app';
import { initSocketServer } from '../realtime/socket';
import { prisma } from '../db/prisma';

describe('Realtime Socket.IO Integration Suite', () => {
  let httpServer: http.Server;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll((done) => {
    httpServer = http.createServer(app);
    initSocketServer(httpServer);
    httpServer.listen(0, async () => {
      const addr = httpServer.address();
      port = typeof addr === 'object' && addr ? addr.port : 4001;
      await prisma.resource.upsert({
        where: { id: 'res-a12' },
        create: {
          id: 'res-a12',
          callSign: 'AMB-12',
          type: 'AMBULANCE',
          capabilities: '[]',
          homeZoneId: 'zone-central',
          location: '{"lat":10.79,"lng":78.70}',
          status: 'AVAILABLE',
          freshnessSeconds: 0,
          stale: false,
          isReserve: false,
          lastUpdateAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        update: {},
      });
      await prisma.hospital.upsert({
        where: { id: 'hosp-001' },
        create: {
          id: 'hosp-001',
          name: 'City Central Hospital',
          location: '{"lat":10.79,"lng":78.70}',
          zoneId: 'zone-central',
          capabilities: '[]',
          bedsTotal: 100,
          bedsAvailable: '80',
          currentLoad: '20',
          incomingLoad: 0,
          stale: false,
          predictedPressure: '{"level":"LOW"}',
          lastUpdateAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        update: {},
      });
      clientSocket = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
      });
      clientSocket.on('connect', () => {
        done();
      });
    });
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    httpServer.close(async () => {
      await prisma.$disconnect();
      done();
    });
  });

  it('client successfully connects to command-center room and receives connection', () => {
    expect(clientSocket.connected).toBe(true);
  });

  it('broadcasts incident.created realtime event when REST POST /api/v1/incidents is called', (done) => {
    const payload = {
      type: 'FIRE',
      title: 'Realtime Test Fire Incident',
      description: 'Test fire incident for realtime socket verification',
      location: { lat: 10.78, lng: 78.72 },
      zoneId: 'zone-forest',
      severity: 3,
    };

    clientSocket.once('incident.created', (eventPayload: any) => {
      expect(eventPayload.event).toBe('incident.created');
      expect(eventPayload.data.title).toBe('Realtime Test Fire Incident');
      expect(eventPayload.data.zoneId).toBe('zone-forest');
      done();
    });

    request(app)
      .post('/api/v1/incidents')
      .send(payload)
      .expect(201)
      .then(() => {});
  });

  it('broadcasts resource.updated realtime event when REST PATCH /api/v1/resources/:id is called', (done) => {
    clientSocket.once('resource.updated', (eventPayload: any) => {
      expect(eventPayload.event).toBe('resource.updated');
      expect(eventPayload.data.id).toBe('res-a12');
      expect(eventPayload.data.status).toBe('AT_INCIDENT');
      done();
    });

    request(app)
      .patch('/api/v1/resources/res-a12')
      .send({ status: 'AT_INCIDENT' })
      .expect(200)
      .then(() => {});
  });

  it('broadcasts hospital.updated realtime event when REST PATCH /api/v1/hospitals/:id is called', (done) => {
    clientSocket.once('hospital.updated', (eventPayload: any) => {
      expect(eventPayload.event).toBe('hospital.updated');
      expect(eventPayload.data.id).toBe('hosp-001');
      expect(eventPayload.data.incomingLoad).toBe(5);
      done();
    });

    request(app)
      .patch('/api/v1/hospitals/hosp-001')
      .send({ incomingLoad: 5 })
      .expect(200)
      .then(() => {});
  });

  it('does NOT emit realtime event if REST payload validation fails', (done) => {
    let emitted = false;
    const listener = () => {
      emitted = true;
    };

    clientSocket.on('incident.created', listener);

    request(app)
      .post('/api/v1/incidents')
      .send({ title: 'Invalid' }) // Missing required type, location, etc.
      .expect(400)
      .then(() => {
        setTimeout(() => {
          clientSocket.off('incident.created', listener);
          expect(emitted).toBe(false);
          done();
        }, 150);
      });
  });
});
