// Chat lives inside the employee `name` field — the only store both roles can
// write (PATCH /users/users/:id, PATCH /admin/users/:id) and both can read
// (GET /users/me, GET /admin/users/:id). The backend has no message model and
// cannot be changed, so the name carries a small JSON envelope:
//
//   {"v":1,"real":"Kashif Sial","msgs":[...],"seen":{"employee":0,"admin":0}}
//
// Every UI surface renders `displayName(raw)`; plain (never-chatted) names
// fall through untouched, so nothing needs migrating.

export const MAX_MSGS = 100;
export const MAX_ENVELOPE_CHARS = 32000;
export const MAX_TEXT_LEN = 500;

function emptyEnvelope(raw) {
  return {
    v: 1,
    // Plain (non-JSON) names are the display name itself; a missing name
    // stays empty so tables render blank exactly as before the chat existed.
    real: typeof raw === 'string' && raw.length > 0 ? raw : '',
    msgs: [],
    seen: { employee: 0, admin: 0 },
  };
}

export function parseEnvelope(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('{')) {
    return emptyEnvelope(raw);
  }
  try {
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || typeof data.real !== 'string') {
      return emptyEnvelope(raw);
    }
    const msgs = Array.isArray(data.msgs)
      ? data.msgs.filter(
          (m) =>
            m &&
            typeof m.id === 'string' &&
            typeof m.t === 'string' &&
            typeof m.ts === 'number' &&
            (m.by === 'employee' || m.by === 'admin')
        )
      : [];
    const seen = data.seen || {};
    return {
      v: 1,
      real: data.real,
      msgs: msgs.sort((a, b) => a.ts - b.ts),
      seen: {
        employee: Number(seen.employee) || 0,
        admin: Number(seen.admin) || 0,
      },
    };
  } catch {
    // A malformed blob still has to render somewhere sensible.
    return emptyEnvelope(raw);
  }
}

export function serializeEnvelope(env) {
  let out = JSON.stringify({
    v: 1,
    real: env.real,
    msgs: env.msgs,
    seen: env.seen,
  });
  // Drop the oldest messages until the field stays a reasonable size.
  while (out.length > MAX_ENVELOPE_CHARS && env.msgs.length > 1) {
    env.msgs.shift();
    out = JSON.stringify({
      v: 1,
      real: env.real,
      msgs: env.msgs,
      seen: env.seen,
    });
  }
  return out;
}

/** The plain name for display: unwraps an envelope, passes anything else. */
export function displayName(raw) {
  return parseEnvelope(raw).real;
}

export function appendMessage(env, msg) {
  const next = {
    ...env,
    msgs: [...env.msgs, msg].slice(-MAX_MSGS),
    seen: { ...env.seen },
  };
  return next;
}

/** Messages from the other side newer than my read marker. */
export function unreadFor(env, role) {
  const marker = env.seen[role] || 0;
  return env.msgs.filter((m) => m.by !== role && m.ts > marker).length;
}

export function newMessageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
