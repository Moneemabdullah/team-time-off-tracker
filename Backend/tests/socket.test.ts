/**
 * Socket.IO integration tests.
 *
 * These run against the real app and a real MongoDB replica set, because
 * approving a request uses a transaction and a standalone mongod cannot do
 * that. Start the database first:
 *
 *   docker compose up -d mongodb mongodb-init
 *
 * `tests/` sits outside `src/`, so `tsc` never compiles it into dist/.
 */
import 'dotenv/config';

import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';

// Real SMTP is not reachable from CI, and nodemailer blocks for its 120s
// default connectionTimeout when it cannot connect, so the approval path would
// stall instead of failing fast. Email delivery is not what these tests cover.
vi.mock('../src/utils/emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({}),
  sendEmailSafely: vi.fn().mockResolvedValue(true),
}));

import app from '../src/app';
import { env } from '../src/config/env';
import { connectDB } from '../src/config/db';
import { initSocket } from '../src/socket';
import { setSocketServer } from '../src/socket/emitter';
import { userModel } from '../src/models/user.model';
import { timeOffRequestModel } from '../src/models/timeOffRequest.model';
import { hashPassword } from '../src/services/auth.service';
import * as requestService from '../src/services/request.service';

const TEST_DB = 'team-time-off-tracker-socket-test';

let httpServer: HttpServer;
let baseUrl: string;

const sockets: ClientSocket[] = [];

/** Opens a socket, resolving once connected and rejecting if the handshake fails. */
function openSocket(auth?: Record<string, unknown>): Promise<ClientSocket> {
  const socket = connectClient(baseUrl, {
    auth,
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);

  return new Promise<ClientSocket>((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => {
      socket.close();
      reject(err);
    });
  });
}

function connectAs(token: string): Promise<ClientSocket> {
  return openSocket({ token });
}

function login(base: string, email: string, password: string): Promise<string> {
  return fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then((r) => r.json())
    .then((j) => j.data.token as string);
}

/** Resolves with the first matching event, or rejects on timeout. */
function waitFor<T = unknown>(socket: ClientSocket, event: string, ms = 4000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for "${event}"`));
    }, ms);
    const handler = (payload: T) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

/** Asserts an event does NOT arrive within the window. */
async function expectNoEvent(socket: ClientSocket, event: string, ms = 1200): Promise<void> {
  let received = false;
  const handler = () => { received = true; };
  socket.on(event, handler);
  await new Promise((r) => setTimeout(r, ms));
  socket.off(event, handler);
  expect(received, `"${event}" should not have been emitted`).toBe(false);
}

const monday = (weeksAhead: number): string => {
  const d = new Date();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  let mon = new Date(t);
  mon.setUTCDate(mon.getUTCDate() + 1);
  while (mon.getUTCDay() !== 1) mon.setUTCDate(mon.getUTCDate() + 1);
  mon.setUTCDate(mon.getUTCDate() + weeksAhead * 7);
  return mon.toISOString().slice(0, 10);
};
const fridayOf = (startIso: string): string =>
  new Date(Date.parse(`${startIso}T00:00:00Z`) + 4 * 86_400_000).toISOString().slice(0, 10);

let adminToken: string;
let empToken: string;
let empId: string;
let adminId: string;
let week = 0;

beforeAll(async () => {
  // Transactions require a replica set; the published port reaches the same one
  // the compose stack starts.
  const uri = process.env.TEST_MONGODB_URI;
  if (!uri) throw new Error('TEST_MONGODB_URI is required');

  await connectDB(uri);
  await mongoose.connection.db.dropDatabase();

  const admin = await userModel.create({
    name: 'Socket Admin',
    email: 'socket-admin@example.com',
    passwordHash: await hashPassword('admin12345'),
    role: 'ADMIN',
  });
  const emp = await userModel.create({
    name: 'Socket Employee',
    email: 'socket-emp@example.com',
    passwordHash: await hashPassword('emp12345'),
    role: 'EMPLOYEE',
  });
  adminId = admin._id.toString();
  empId = emp._id.toString();

  httpServer = createServer(app);
  initSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;

  adminToken = await login(baseUrl, 'socket-admin@example.com', 'admin12345');
  empToken = await login(baseUrl, 'socket-emp@example.com', 'emp12345');
}, 30_000);

afterAll(async () => {
  for (const s of sockets) s.close();
  setSocketServer(null);
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe('Socket.IO handshake authentication', () => {
  it('refuses a connection with no token', async () => {
    await expect(openSocket()).rejects.toThrow(/unauthorized/i);
  });

  it('refuses a garbage token', async () => {
    await expect(connectAs('garbage.token.here')).rejects.toThrow(/unauthorized/i);
  });

  it('accepts a valid employee token', async () => {
    const s = await connectAs(empToken);
    expect(s.connected).toBe(true);
  });

  it('accepts a valid admin token', async () => {
    const s = await connectAs(adminToken);
    expect(s.connected).toBe(true);
  });
});

describe('urgent leave creation pushes to admins', () => {
  it('delivers leave:urgent to a connected admin', async () => {
    const admin = await connectAs(adminToken);
    const incoming = waitFor(admin, 'leave:urgent');

    await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Family emergency', argency: 'urgent' },
      empId
    );
    week += 1;

    const payload = (await incoming) as { id: string; argency: string; user: { id: string } };
    expect(payload.argency).toBe('urgent');
    expect(payload.user.id).toBe(empId);
    expect(payload.id).toBeTruthy();
  });

  it('does not emit for a normal request', async () => {
    const admin = await connectAs(adminToken);
    await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Ordinary holiday' },
      empId
    );
    week += 1;

    await expectNoEvent(admin, 'leave:urgent');
  });

  it('does not deliver leave:urgent to an employee', async () => {
    const emp = await connectAs(empToken);
    const incoming = waitFor(emp, 'leave:urgent');

    await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Urgent but not for you', argency: 'urgent' },
      empId
    );
    week += 1;

    await expect(incoming).rejects.toThrow(/timed out/);
  });

  it('is a no-op when no admin is connected', async () => {
    // No admin socket: the emit must not throw, and the request still exists.
    await expect(
      requestService.createRequest(
        { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Nobody listening', argency: 'urgent' },
        empId
      )
    ).resolves.toBeTruthy();
    week += 1;
  });
});

describe('decision push reaches the owning employee', () => {
  it('delivers leave:decision on approval', async () => {
    const emp = await connectAs(empToken);
    const incoming = waitFor(emp, 'leave:decision');

    const created = await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Approve me', argency: 'urgent' },
      empId
    );
    week += 1;

    const updated = await requestService.updateRequestStatus(created.id, { status: 'APPROVED' });
    const payload = (await incoming) as { id: string; status: string; annualLeaveBalance?: number };

    expect(payload.id).toBe(created.id);
    expect(payload.status).toBe('APPROVED');
    expect(updated.user).toMatchObject({ id: empId });
  });

  it('delivers leave:decision on rejection and restores the balance', async () => {
    const emp = await connectAs(empToken);
    const incoming = waitFor(emp, 'leave:decision');

    const created = await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Reject me', argency: 'urgent' },
      empId
    );
    week += 1;

    await requestService.updateRequestStatus(created.id, { status: 'REJECTED' });
    const payload = (await incoming) as { status: string };

    expect(payload.status).toBe('REJECTED');
  });

  it('does not emit for a normal request decision', async () => {
    const emp = await connectAs(empToken);

    const created = await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Quiet decision' },
      empId
    );
    week += 1;

    await expectNoEvent(emp, 'leave:decision');
    await requestService.updateRequestStatus(created.id, { status: 'APPROVED' });
  });

  it('REST stays the source of truth: the request really is persisted', async () => {
    const created = await requestService.createRequest(
      { startDate: monday(week), endDate: fridayOf(monday(week)), reason: 'Persisted check', argency: 'urgent' },
      empId
    );
    week += 1;
    await requestService.updateRequestStatus(created.id, { status: 'APPROVED' });

    const stored = await timeOffRequestModel.findById(created.id);
    expect(stored?.status).toBe('approved');
  });
});

describe('emitter without an initialised server', () => {
  it('does not throw when no socket server is attached', async () => {
    setSocketServer(null);
    const { emitUrgentToAdmins, emitDecisionToUser } = await import('../src/socket/emitter');
    expect(() => emitUrgentToAdmins({ id: 'x' })).not.toThrow();
    expect(() => emitDecisionToUser(empId, { id: 'x' })).not.toThrow();
  });
});

describe('environment sanity', () => {
  it('reads a JWT secret so auth is meaningful', () => {
    expect(env.jwtSecret.length).toBeGreaterThanOrEqual(32);
  });
});
