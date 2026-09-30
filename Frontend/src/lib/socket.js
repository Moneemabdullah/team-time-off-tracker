import { io } from 'socket.io-client';
import { getToken } from './axiosInstance';

// One shared socket for the whole app (API.md "Frontend integration spec":
// never open a socket per request or per event). The handshake carries the
// same JWT axios uses; the server re-reads role from the database.
const baseURL = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5000';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(baseURL, {
    auth: { token: getToken() },
    // The token lives in sessionStorage and can change across logins, so a
    // reconnect must rebuild the auth object rather than cache the old JWT.
  });
  socket.on('connect_error', (err) => {
    // The server refuses bad tokens with 'unauthorized'; drop the socket
    // instead of hammering a connection that can never succeed.
    if (err?.message === 'unauthorized') {
      disconnectSocket();
    }
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
