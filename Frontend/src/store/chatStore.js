import { create } from 'zustand';
import toast from 'react-hot-toast';
import AxiosInstance from '@/lib/axiosInstance';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/format';
import {
  MAX_TEXT_LEN,
  appendMessage,
  newMessageId,
  parseEnvelope,
  serializeEnvelope,
  unreadFor,
} from '@/lib/chatCodec';

// The backend cannot be changed, so chat messages are stored inside the
// employee `name` field (the only free-text slot both roles can write and
// read). There is no socket push for name changes: the panel polls every 3s
// while open (~15s while closed for the badge), and pauses on a hidden tab.
// `leave:urgent` / `leave:decision` socket pushes still trigger an immediate
// refresh from SocketBridge.
const POLL_MS = 3000;
const IDLE_EVERY = 5; // closed panel refreshes every 5th tick (~15s)
const SEEN_THROTTLE_MS = 3000;

let timer = null;
let tick = 0;
let inFlight = false;
let lastOwnerId = null;
const lastSeenWrite = {};

function identity() {
  const user = useAuthStore.getState().user;
  return { role: user?.role === 'admin' ? 'admin' : 'employee', id: user?.id };
}

function toThread(user, role, myId) {
  const env = parseEnvelope(user.name);
  return {
    id: user.id,
    email: user.email,
    // The employee side talks to a single "Admin" conversation; the admin
    // side labels each thread with the employee's display name.
    title:
      role === 'employee' && user.id === myId
        ? 'Admin'
        : env.real || 'Unnamed',
    real: env.real,
    msgs: env.msgs,
    seen: env.seen,
    unread: unreadFor(env, role),
    lastAt: env.msgs.length ? env.msgs[env.msgs.length - 1].ts : 0,
  };
}

// Fresh read of the envelope owner's profile (the chat mailbox).
async function fetchOwner(threadId) {
  const { role } = identity();
  if (role === 'admin') {
    const { data } = await AxiosInstance.get(`/admin/users/${threadId}`);
    return data.data;
  }
  const { data } = await AxiosInstance.get('/users/me');
  return data.data;
}

async function patchOwner(threadId, name) {
  const { role, id } = identity();
  const url = role === 'admin' ? `/admin/users/${threadId}` : `/users/users/${id}`;
  const { data } = await AxiosInstance.patch(url, { name });
  return data.data;
}

export const useChatStore = create((set, get) => ({
  open: false,
  activeId: null,
  threads: [],
  sending: false,
  error: '',

  // Refetches every thread mailbox and rebuilds the list (newest first).
  refresh: async () => {
    const { role, id } = identity();
    if (!id) return;
    try {
      let users;
      if (role === 'admin') {
        const { data } = await AxiosInstance.get('/admin/users');
        users = data.data || [];
      } else {
        const { data } = await AxiosInstance.get('/users/me');
        users = [data.data];
      }
      const threads = users
        .map((user) => toThread(user, role, id))
        .sort((a, b) => b.lastAt - a.lastAt);
      set({ threads, error: '' });

      // Panel open on a thread with fresh replies → mark it read right away.
      const { open, activeId } = get();
      if (open && activeId) {
        const active = threads.find((t) => t.id === activeId);
        if (active && active.unread > 0) {
          get().markSeen(activeId);
        }
      }
    } catch (err) {
      set({ error: err.message || 'Chat unavailable' });
    }
  },

  startPolling: () => {
    // Different signed-in user than last time (logout → login) → drop the
    // previous account's threads before polling starts.
    const ownerId = identity().id;
    if (lastOwnerId !== ownerId) {
      lastOwnerId = ownerId;
      set({ threads: [], activeId: null, open: false, error: '' });
    }
    if (timer) return;
    timer = setInterval(() => {
      if (document.hidden) return;
      const { open } = get();
      tick += 1;
      if (!open && tick % IDLE_EVERY !== 1) return;
      if (inFlight) return;
      inFlight = true;
      get()
        .refresh()
        .finally(() => {
          inFlight = false;
        });
    }, POLL_MS);
    void get().refresh();
  },

  stopPolling: () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  },

  toggle: () => {
    if (get().open) {
      set({ open: false });
      return;
    }
    get().openForMe();
  },

  // Employee → always the single Admin thread; admin → thread list first.
  openForMe: () => {
    const { role, id } = identity();
    set({ open: true, ...(role === 'employee' && id ? { activeId: id } : {}) });
    const activeId = get().activeId;
    if (activeId) get().markSeen(activeId);
  },

  openThread: (threadId) => {
    set({ open: true, activeId: threadId });
    get().markSeen(threadId);
    void get().refresh();
  },

  closeThread: () => set({ activeId: null }),

  // Read marker write: refetch → stamp → PATCH. Throttled, and skipped when
  // the fresh envelope already shows nothing unread.
  markSeen: async (threadId) => {
    const now = Date.now();
    if (lastSeenWrite[threadId] && now - lastSeenWrite[threadId] < SEEN_THROTTLE_MS) {
      return;
    }
    lastSeenWrite[threadId] = now;
    try {
      const { role } = identity();
      const owner = await fetchOwner(threadId);
      const env = parseEnvelope(owner.name);
      if (unreadFor(env, role) === 0) return;
      const next = { ...env, seen: { ...env.seen, [role]: Date.now() } };
      const saved = await patchOwner(threadId, serializeEnvelope(next));
      adoptSaved(threadId, saved, role, identity().id, set);
    } catch {
      // The next poll retries; chat must render with the socket/app down.
    }
  },

  send: async (text) => {
    const value = String(text || '').trim();
    if (!value || get().sending) return false;
    if (value.length > MAX_TEXT_LEN) {
      toast.error(`Message is too long (max ${MAX_TEXT_LEN} characters)`);
      return false;
    }
    const { role, id } = identity();
    const threadId = role === 'admin' ? get().activeId : id;
    if (!threadId) return false;

    set({ sending: true });
    try {
      // Refetch-then-append: the envelope is a shared last-write-wins field,
      // so the freshest copy must be read immediately before the PATCH.
      const owner = await fetchOwner(threadId);
      const env = parseEnvelope(owner.name);
      const next = appendMessage(env, {
        id: newMessageId(),
        by: role,
        t: value,
        ts: Date.now(),
      });
      const saved = await patchOwner(threadId, serializeEnvelope(next));
      adoptSaved(threadId, saved, role, id, set);
      return true;
    } catch (err) {
      toast.error(err.message || 'Message failed to send');
      return false;
    } finally {
      set({ sending: false });
    }
  },

  // Employee-only: seed the thread with the urgent request context line and
  // open the panel, per the flow "submit urgent → keep chatting with admin".
  seedUrgent: async ({ startDate, endDate, reason }) => {
    const { id } = identity();
    if (!id) return;
    try {
      const owner = await fetchOwner(id);
      const env = parseEnvelope(owner.name);
      const next = appendMessage(env, {
        id: newMessageId(),
        by: 'employee',
        t: `📩 Urgent leave request: ${formatDate(startDate)} – ${formatDate(endDate)} — ${reason}`,
        ts: Date.now(),
        system: true,
      });
      const saved = await patchOwner(id, serializeEnvelope(next));
      adoptSaved(id, saved, 'employee', id, set);
    } catch {
      toast.error('Could not start the chat thread');
    } finally {
      // Open even if seeding failed — chatting still works.
      set({ open: true, activeId: id });
    }
  },
}));

function adoptSaved(threadId, savedUser, role, myId, set) {
  const thread = toThread(savedUser, role, myId);
  set((s) => ({
    threads: [thread, ...s.threads.filter((t) => t.id !== threadId)].sort(
      (a, b) => b.lastAt - a.lastAt
    ),
  }));
}
