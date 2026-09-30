import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { env } from '../config/env';
import { authenticateSocket } from './auth';
import { setSocketServer } from './emitter';

/**
 * Attaches Socket.IO to the existing HTTP server. There are no client-to-server
 * events: the REST API stays the source of truth and the socket only pushes
 * notifications about writes it has already committed.
 */
export function initSocket(httpServer: HttpServer): Server {
  const allowedOrigins = env.corsOrigin.split(',').map((origin) => origin.trim());

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      await authenticateSocket(socket);
      next();
    } catch {
      // Same wording as the REST 401 so a client cannot tell the two apart.
      next(new Error('unauthorized'));
    }
  });

  setSocketServer(io);
  return io;
}
