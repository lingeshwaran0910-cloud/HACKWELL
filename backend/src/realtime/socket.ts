import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './types';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

export const initSocketServer = (httpServer: HttpServer) => {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    socket.data.clientId = socket.id;
    socket.data.joinedRooms = ['command-center'];

    // Auto-join main command-center room
    socket.join('command-center');
    logger.info({ socketId: socket.id }, 'Socket.IO client connected to SafeCity Command Center');

    // Room join listener
    socket.on('join_room', (room: string) => {
      if (room && typeof room === 'string') {
        socket.join(room);
        if (!socket.data.joinedRooms.includes(room)) {
          socket.data.joinedRooms.push(room);
        }
        logger.info({ socketId: socket.id, room }, 'Client joined room');
      }
    });

    // Room leave listener
    socket.on('leave_room', (room: string) => {
      if (room && typeof room === 'string') {
        socket.leave(room);
        socket.data.joinedRooms = socket.data.joinedRooms.filter((r) => r !== room);
        logger.info({ socketId: socket.id, room }, 'Client left room');
      }
    });

    socket.on('ping', () => {
      socket.emit('incident.updated' as any, {
        event: 'incident.updated' as any,
        timestamp: new Date().toISOString(),
        data: { pong: true } as any,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket.IO client disconnected');
    });
  });

  logger.info('Socket.IO realtime server initialized successfully');
  return io;
};

export const getIo = () => {
  if (!io) {
    logger.warn('getIo() called before initSocketServer(). Socket.IO emits will be no-ops.');
  }
  return io;
};
