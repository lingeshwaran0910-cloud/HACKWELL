import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
// Strip /api path to get base origin for Socket.IO
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

class SocketClientService {
  private socket: Socket | null = null;
  private isConnected = false;

  public init() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      // Automatically join command-center room
      this.socket?.emit('join', 'command-center');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.init();
    this.socket?.on(event, callback);
  }

  public off(event: string, callback?: (data: any) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public get connected(): boolean {
    return this.isConnected;
  }
}

export const socketClient = new SocketClientService();
