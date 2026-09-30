import type { Socket } from 'socket.io';

import { env } from '../config/env';
import { userModel, type UserRole } from '../models/user.model';
import { jwtUtils } from '../utils/jwt';

export type SocketUser = {
  id: string;
  role: UserRole;
};

/** Room every admin socket joins, so a new urgent leave can be pushed to all of them. */
export const ADMINS_ROOM = 'admins';

/** Room per user, so a decision reaches only the employee who owns the request. */
export const userRoom = (userId: string): string => `user:${userId}`;

function readHandshakeToken(socket: Socket): string {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) {
    return fromAuth;
  }

  // The browser cannot read the httpOnly authToken cookie, so the header is
  // the fallback for non-browser clients that send one.
  const header = socket.handshake.headers.authorization;
  if (typeof header === 'string') {
    const [scheme, token] = header.split(' ');
    if (token && scheme.toLowerCase() === 'bearer') {
      return token;
    }
  }

  throw new Error('unauthorized');
}

/**
 * Authenticates the Socket.IO handshake using the same token verification the
 * REST middleware uses, and confirms the user still exists. A rejected
 * handshake fails the connection rather than joining any room.
 */
export async function authenticateSocket(socket: Socket): Promise<void> {
  const token = readHandshakeToken(socket);

  const result = jwtUtils.verifyToken(token, env.jwtSecret);
  if (!result.success) {
    throw new Error('unauthorized');
  }

  const subject = (result.data as { sub?: unknown } | null)?.sub;
  if (typeof subject !== 'string') {
    throw new Error('unauthorized');
  }

  const user = await userModel.findById(subject);
  if (!user) {
    throw new Error('unauthorized');
  }

  // Role is read from the database rather than trusted from the token.
  const authUser: SocketUser = {
    id: user._id.toString(),
    role: user.role as UserRole,
  };

  socket.data.user = authUser;
  socket.join(userRoom(authUser.id));
  if (authUser.role === 'ADMIN') {
    socket.join(ADMINS_ROOM);
  }
}
