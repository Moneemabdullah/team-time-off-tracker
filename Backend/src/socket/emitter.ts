import type { Server } from 'socket.io';

import { ADMINS_ROOM, userRoom } from './auth';

/**
 * Set once by `initSocket`. Stays null when the module is loaded outside the
 * HTTP server (the admin seed script, for example), so emitting is a no-op
 * rather than a crash.
 */
let io: Server | null = null;

export function setSocketServer(server: Server | null): void {
  io = server;
}

/**
 * Pushes a newly created urgent leave to every connected admin. Emitting to an
 * empty room is a silent no-op, so an offline admin simply sees the request on
 * their next REST fetch.
 */
export function emitUrgentToAdmins(payload: unknown): void {
  io?.to(ADMINS_ROOM).emit('leave:urgent', payload);
}

/** Pushes an approve/reject outcome to the employee who owns the request. */
export function emitDecisionToUser(userId: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit('leave:decision', payload);
}
