# API — Team Time-Off Tracker

Base URL: `http://localhost:5000`

All request and response bodies are JSON.

Interactive documentation is served at **`/api-docs`**.

---

## Authentication

Every route except `POST /auth/login` and `GET /health` requires a token. Tokens are
sent as a session cookie, with the `Authorization` header accepted as a fallback for
non-browser clients.

```http
Cookie: authToken=<token>          # browser, set automatically by login
Authorization: Bearer <token>      # non-browser clients
```

Log in to obtain one:

```bash
curl -X POST http://localhost:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "admin@example.com", "password": "admin123" }'
```

### `200` response

Also sets an `authToken` cookie (`HttpOnly`, `SameSite=Strict`, `Secure` in production)
whose `Max-Age` is derived from `JWT_EXPIRES_IN`, so the cookie never outlives the
token it carries.

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6abc11a25775719ba0c228b1",
      "name": "System Admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "annualLeaveBalance": 20
    }
  }
}
```

`passwordHash` is **never** included in any response. That guarantee rests entirely
on `toPublicUser`, which builds a new object from a fixed list of fields
(`id`, `name`, `email`, `role`, `annualLeaveBalance`) rather than passing a document
through.

> **Note:** the model does **not** set `select: false` on `passwordHash`, so a plain
> `userModel.find()` does load the hash into the returned documents. Nothing currently
> returns a raw document, so there is no leak, but any future endpoint that does would
> expose the hashes. Restoring `select: false` is the recommended hardening. See
> [Known limitations](#known-limitations).

Tokens carry the user id and role, but the role is re-read from the database on
every request, so a role change takes effect immediately rather than waiting for
the token to expire. Deleting a user invalidates their tokens at once.

### Errors

| Code | When |
| --- | --- |
| `400` | malformed body |
| `401` | `Invalid email or password` |

An unknown email and a wrong password return the same `401` with the same message,
so the endpoint cannot be used to discover which accounts exist.

---

## Logging out

```
POST /auth/logout
```

Clears the `authToken` cookie. The JWT itself is **not** revoked, so any copy held
elsewhere — an `Authorization` header, for instance — stays valid until it expires.

## Calling from a browser

Credentialed cookies cannot be combined with a wildcard origin, so the allowed origins
are listed explicitly in `CORS_ORIGIN` (comma-separated). A browser client must also
send credentials on every request:

```js
fetch('http://localhost:5000/requests', { credentials: 'include' })
```

A request without `credentials: 'include'` will be rejected by CORS even though the
cookie is present.

---

## Roles

| Role | Can do |
| --- | --- |
| `EMPLOYEE` (default) | Log in, create own leave requests, view own requests, view own balance |
| `ADMIN` | Everything an employee can, plus view all requests, list/get users, approve or reject, reassign annual leave |

Employees **cannot** approve or reject, read another user's requests, or change any
leave balance. Role checks are enforced by `requireRole` middleware rather than
inside controllers.

---

## Response format

**Success**

```json
{ "success": true, "data": {} }
```

**Error**

```json
{ "success": false, "message": "Leave request not found" }
```

`data` is an object for single records and an array for list endpoints.

### Status codes

| Code | Meaning |
| --- | --- |
| `200` | Successful read or update |
| `201` | Record created |
| `400` | Invalid input or a violated business rule |
| `401` | Missing, invalid or expired token |
| `403` | Authenticated, but not permitted |
| `404` | User or request not found |
| `409` | Conflict — overlapping dates, invalid state transition, or insufficient balance |
| `500` | Unexpected server error |

---

## Leave rules

* Dates are `YYYY-MM-DD` and are treated as **UTC calendar dates** everywhere, which
  keeps the weekday count free of off-by-one errors.
* Only **Monday–Friday** count as leave days. Saturdays and Sundays are skipped.
* A request that spans **zero** working days is rejected with `400`.
* `startDate` must be **on or after today**; past dates are rejected with `400`.
* A new request always starts as `PENDING`.
* Each request carries an **argency** of `normal` or `urgent`, defaulting to
  `normal`. It is optional on creation, validated on input, and returned by the
  API.
* Creating a request does **not** change the balance — that happens on approval.
* The request is attributed to the **bearer token's user**. The body cannot choose
  the owner: `userId`, `name`, `email`, `days` and `status` are all rejected with
  `400`.
* An employee cannot read another user's requests, even by passing a `userId`
  filter — that returns `403`.

### Status values

The API uses upper case; the database stores lower case.

| API value | Stored value |
| --- | --- |
| `PENDING` | `pending` |
| `APPROVED` | `approved` |
| `REJECTED` | `rejected` |

---

# Endpoints

## 1. Create a leave request

```
POST /requests
```

Any authenticated user. The owner comes from the token.

### Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `startDate` | string | yes | `YYYY-MM-DD` |
| `endDate` | string | yes | `YYYY-MM-DD` |
| `argency` | string | no | `normal` (default) or `urgent` |
| `reason` | string | yes | at least 3 characters |

### Example

```bash
curl -X POST http://localhost:5000/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "startDate": "2026-10-05",
    "endDate": "2026-10-09",
    "argency": "urgent",
    "reason": "Family event"
  }'
```

### `201` response

```json
{
  "success": true,
  "data": {
    "id": "6abc1285dc54d57107daa61f",
    "user": {
      "id": "6abc1275dc54d57107daa61b",
      "name": "Employee One",
      "email": "emp@example.com",
      "role": "EMPLOYEE",
      "annualLeaveBalance": 20
    },
    "startDate": "2026-10-05",
    "endDate": "2026-10-09",
    "reason": "Family event",
    "days": 5,
    "status": "PENDING",
    "argency": "urgent",
    "createdAt": "2026-09-29T12:00:00.000Z",
    "updatedAt": "2026-09-29T12:00:00.000Z"
  }
}
```

`2026-10-05` (Mon) to `2026-10-09` (Fri) is 5 working days, so `days` is `5`.

### Errors

| Code | When |
| --- | --- |
| `400` | malformed body, bad date, `reason` too short, or any client-supplied `userId` / `days` / `status` |
| `400` | `startDate` after `endDate`, a past start date, or zero working days |
| `401` | missing, invalid or expired token |
| `409` | overlaps an existing `PENDING` or `APPROVED` request for the same user |

---

## 2. List leave requests

```
GET /requests
```

* An `EMPLOYEE` receives only their own requests.
* An `ADMIN` receives all requests and may filter.

| Query parameter | Values | Default |
| --- | --- | --- |
| `status` | `PENDING`, `APPROVED`, `REJECTED` (case-insensitive) | — |
| `page` | 1-based page number | `1` |
| `limit` | 1–100 items per page | `10` |

There is **no `userId` filter here** — this route is always scoped to the caller, so
passing one is rejected with `400` as an unknown query parameter. For the all-users
view use `GET /admin/requests`.

### `200` response

Results are sorted newest first. An empty result set returns an empty array, not a
`404`.

```json
{
  "success": true,
  "data": [
    {
      "id": "6abc1285dc54d57107daa61f",
      "user": {
        "id": "6abc1275dc54d57107daa61b",
        "name": "Employee One",
        "email": "emp@example.com",
        "role": "EMPLOYEE",
        "annualLeaveBalance": 20
      },
      "startDate": "2026-10-05",
      "endDate": "2026-10-09",
      "reason": "Family event",
      "days": 5,
      "status": "PENDING",
      "createdAt": "2026-09-29T12:00:00.000Z",
      "updatedAt": "2026-09-29T12:00:00.000Z"
    }
  ]
}
```

### Errors

| Code | When |
| --- | --- |
| `400` | unknown query parameter, invalid `status`, malformed `userId` |
| `401` | missing, invalid or expired token |
| `403` | an employee asked for another user's requests |

---

## 3. Approve or reject a request

```
PATCH /requests/:id
```

**Admin only.** An employee receives `403`.

### Request body

```json
{ "status": "APPROVED" }
```

or

```json
{ "status": "REJECTED" }
```

### State transitions

| From | To | Balance effect |
| --- | --- | --- |
| `PENDING` | `APPROVED` | deducts `days` |
| `PENDING` | `REJECTED` | none — nothing was deducted |
| `APPROVED` | `REJECTED` | restores `days` |
| `APPROVED` | `APPROVED` | rejected, `409` |
| `REJECTED` | anything | rejected, `409` — terminal state |

### Errors

| Code | When |
| --- | --- |
| `400` | `:id` malformed, or `status` is not `APPROVED`/`REJECTED` |
| `401` | missing, invalid or expired token |
| `403` | caller is not an admin |
| `404` | `Leave request not found` |
| `409` | only `PENDING` requests can be approved |
| `409` | `Insufficient leave balance` — approval would push the balance below zero |

### Concurrency

The balance update and the status update run inside a **MongoDB transaction**, so
they commit or roll back together. The deduction is also guarded by an atomic
`annualLeaveBalance >= days` condition, so parallel approvals can never drive a
balance negative. Verified: three simultaneous approvals against a balance of 5 and
three 5-day requests produce exactly one `200` and two `409`, with the balance
landing at 0.

> **Requires a replica set.** MongoDB transactions are not supported on a standalone
> `mongod`. The bundled `docker-compose.yml` starts MongoDB as a single-node
> replica set and initialises it automatically. See
> [Running with transactions](#running-with-transactions).

---

# User endpoints

Only `GET /users/me` is self-service. Every other user route lives under `/admin` — see
[Admin endpoints](#admin-endpoints).

## 4. Get the signed-in user

```
GET /users/me
```

Any authenticated user. This is how a client reads its own leave balance.

```json
{
  "success": true,
  "data": {
    "id": "6abc1275dc54d57107daa61b",
    "name": "Employee One",
    "email": "emp@example.com",
    "role": "EMPLOYEE",
    "annualLeaveBalance": 15
  }
}
```

---

# Admin endpoints

Everything below requires the `ADMIN` role. An authenticated employee receives `403`;
a missing or invalid token receives `401`. The routes are mounted under `/admin`, so
none of them share a path with the self-service surface.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/admin/requests` | Every request, paginated and filterable |
| `PATCH` | `/admin/requests/:id` | Approve or reject |
| `GET` | `/admin/users` | List users (admins excluded) |
| `POST` | `/admin/users` | Create an employee and email their credentials |
| `POST` | `/admin/users/reassign-annual-leave` | Add days to every balance |
| `GET` | `/admin/users/:id` | Get one user |
| `PATCH` | `/admin/users/:id` | Update a user |
| `DELETE` | `/admin/users/:id` | Delete a user |

## Listing every request

```
GET /admin/requests
```

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `status` | string | — | `PENDING`, `APPROVED` or `REJECTED` |
| `userId` | string | — | Restrict to one user |
| `page` | integer | `1` | 1-based page number |
| `limit` | integer | `10` | 1–100; above 100 is rejected with `400` |

```bash
curl "http://localhost:5000/admin/requests?status=PENDING&page=2&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `200` response

`meta` sits alongside `data`. Endpoints that do not paginate omit it entirely.

```json
{
  "success": true,
  "data": [ { "id": "...", "status": "PENDING", "days": 5 } ],
  "meta": { "total": 42, "page": 2, "limit": 20, "totalPages": 3 }
}
```

Requesting a page beyond the end returns an empty `data` array with the real `total`
still reported.

## Employee management

`POST /admin/users` takes `name`, `email`, `password` and an optional `role`. The
balance defaults to 20 and the credentials email is sent; a send failure is logged
rather than failing the request, because the account already exists by then.

`PATCH /admin/users/:id` accepts any of `name`, `email`, `password`, `role`. It is
admin-only because `role` can be changed, and demoting the **last remaining** admin is
rejected with `400`.

`DELETE /admin/users/:id` rejects deleting your own account and deleting the last
remaining admin, so the system cannot be left with no administrator.

---

---

# Seeding the first admin

There is no public registration endpoint. The initial admin is created from
environment variables:

```bash
npm run seed
```

The script checks whether the admin already exists and creates it only if it does
not, so running it repeatedly never produces a duplicate or resets a password that
was changed later. The password is hashed with bcrypt before storage and is never
logged.

Configuration (`Backend/.env`):

```env
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

Running the seed inside Docker:

```bash
docker compose exec backend npm run seed
```

---

# Real-time notifications (Socket.IO)

Socket.IO is **only a notification mechanism**. REST and MongoDB remain the source of
truth: nothing is persisted for a notification, and every client must be able to work
with the socket disconnected. There is no notification table, no queue, and no retry.

The server attaches Socket.IO to the same HTTP server and port as the REST API, so
there is no extra port to expose.

## Connecting

Connect to the same origin as the REST API and pass the JWT in the handshake auth:

```js
const socket = io(import.meta.env.VITE_API_URL, {
  auth: { token: getToken() }, // JWT from sessionStorage
});
```

The handshake is verified with the same `jwtUtils.verifyToken` the REST middleware
uses, and the user is re-read from the database. The role is taken from the database,
never from the token. A missing or invalid token fails the connection with
`unauthorized`, so the socket never joins a room.

The browser cannot read the `authToken` cookie because it is `HttpOnly`, which is why
the token is passed explicitly. Non-browser clients may instead send an
`Authorization: Bearer <token>` handshake header; the two are read in that order.

Two rooms are joined automatically on connect:

| Room | Joined by |
| --- | --- |
| `user:<id>` | everyone, for their own updates |
| `admins` | sockets whose role is `ADMIN` |

Room names are internal routing labels. They are not chat or topic rooms.

## Events

Server to client only. There are **no client-to-server events**, and the client must
not send any.

| Event | Recipient | Payload |
| --- | --- | --- |
| `leave:urgent` | the `admins` room | the created request, same shape `POST /requests` returns |
| `leave:decision` | `user:<ownerId>` | the updated request, same shape `PATCH /admin/requests/:id` returns |

Both fire **after** the database write has committed, never inside the transaction,
and only for `argency: 'urgent'`. A normal request produces no socket traffic at all.

Socket events are additive: the existing emails for new requests and for approval or
rejection are unchanged, and are still sent after the commit.

## Frontend integration spec

Not yet implemented on the frontend. Whoever picks this up needs:

1. **A single shared socket.** Create it once in `src/lib/socket.js` and reuse it.
   Do not open a socket per request or per event; the point of a persistent connection
   is that it already exists when the event arrives.
2. **Lifecycle tied to auth.** Connect when `authStore.status === 'authenticated'`,
   disconnect on logout or when the token is cleared, and reconnect with the new token
   after a re-login.
3. **Reconnection.** `socket.io-client` reconnects automatically and replays the
   handshake auth, so reconnection needs no special handling.
4. **Refetch after a push.** The payload is a convenience, not a replacement for the
   list call. On `leave:urgent` an admin should show a toast and call the existing list
   endpoint; on `leave:decision` the employee should toast and update the shown
   request and balance.
5. **Treat the socket as optional.** Any screen must render correctly if it never
   connects. Nothing may depend on a push having been received.

## Offline behaviour

Emitting to a room with no members is a silent no-op. An admin who is offline sees
the urgent request on their next `GET /admin/requests`; an employee who is offline sees
their decision on their next fetch. There is no replay or catch-up on reconnect —
the client refetches instead, which is why REST stays authoritative.

## Tests

`tests/socket.test.ts` runs the real app against the real replica set, because
approving a request uses a transaction. Start the database first:

```bash
docker compose up -d mongodb mongodb-init
npm test
```

It covers handshake rejection, room targeting, urgent-versus-normal delivery, the
null-server no-op and persistence. The suite uses its own
`team-time-off-tracker-socket-test` database, which it drops before and after, and mocks
`emailService` so no SMTP relay is needed.

---

# Known limitations

Things that are true today and worth knowing before extending the API.

- **Password hashes are only kept out of responses by `toPublicUser`.** The model
  does not use `select: false`, so `userModel.find()` and `findById()` return
  documents that include `passwordHash`. Every current endpoint maps the document
  through `toPublicUser`, which whitelists fields, so no hash is ever serialised —
  this is verified against `/auth/login`, `/users`, `/users/:id`, `/users/me` and
  `/requests`. But the protection is one function, not a model-level guarantee. Add
  `select: false` to `passwordHash` so future endpoints are safe by default.

- **`createUser` accepts a caller-supplied `role`.** The service function in
  `src/services/user.service.ts` takes an optional `role` and applies it, so any code
  path holding the admin password could mint another admin. No route currently
  reaches it — it exists for the seed, which always passes `ADMIN` — so it is not
  exploitable today, but it should not stay reachable. Drop the parameter, or have it
  reject anything other than `EMPLOYEE`, before exposing employee creation.

- **CORS uses a configured allowlist, but nothing else.** `app.ts` splits `CORS_ORIGIN`
  on commas and passes the result to the `cors` middleware with `credentials: true`, so
  the wildcard is no longer served. The defaults only cover the local Vite dev server
  and the frontend container, and the list is a development convenience rather than a
  deployment policy. The same list is reused for Socket.IO handshakes.

- **Login is not rate limited.** Passwords are compared with bcrypt, which is slow by
  design, but there is no lockout or throttling, so credentials can still be guessed.

- **Tokens cannot be revoked individually.** `POST /auth/logout` clears the cookie but
  does not revoke the JWT, so any copy held elsewhere stays valid until it expires.
  Deleting a user does invalidate their tokens, and a role change takes effect
  immediately, but there is no per-token deny list.

- **Unmatched routes return HTML, not the JSON envelope.** The error handler is mounted
  after the routers, so it covers errors thrown from a matched route but not requests
  that match no route at all. An unknown path, or a wrong method such as
  `GET /auth/login` or `GET /requests/:id`, gets Express's default `404` page with
  `Content-Type: text/html` rather than `{ "success": false, ... }`. A client parsing
  every response as JSON will throw on those. Fixing it means adding a catch-all
  `app.use()` after the routers.

- **The SMTP transport has no timeout.** `emailService.ts` sets no `connectionTimeout`
  or `greetingTimeout`, so nodemailer waits its 120s default when a relay is
  unreachable. Against the Mailpit default this never happens, but pointing
  `EMAIL_SENDER_SMTP_HOST` at a host the machine cannot reach makes the response to
  `PATCH /admin/requests/:id` stall for about two minutes — after the transaction has
  already committed, so the write itself is correct and only the response is late.
  `sendEmailSafely` swallows failures but cannot shorten a hang. The socket tests mock
  `emailService` for exactly this reason.

- **Socket.IO is wired up server-side only.** The handshake, rooms and emits are tested
  and working, but no client subscribes yet and the frontend has no `argency` control, so
  nothing can actually be marked urgent from the browser. See
  [Frontend integration spec](#frontend-integration-spec).

---

# Health check

```
GET /health
```

Public. Not part of the response format above — it predates it.

```json
{ "status": "ok" }
```

---

# Running with transactions

Approval and rejection need a replica set. The bundled `docker-compose.yml` already
provides one — nothing to set up by hand:

```yaml
  mongodb:
    image: mongo:7
    command: ["--replSet", "rs0"]   # transactions need a replica set
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  mongodb-init:
    image: mongo:7
    depends_on:
      - mongodb
    restart: on-failure
    entrypoint:
      - mongosh
      - --host
      - mongodb:27017
      - --quiet
      - --eval
      - "try { rs.status() } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'mongodb:27017'}]}) }"
```

`mongodb-init` runs `rs.initiate()` the first time and exits; `rs.status()` succeeds
on later runs, so it becomes a no-op. The state lives in the `mongodb_data` volume,
so `docker compose down` keeps it and only `docker compose down -v` forces a
re-initialisation.

To check it came up:

```bash
docker compose exec mongodb mongosh --quiet --eval 'print(rs.status().myState)'
# 1 means PRIMARY
```

The backend connects with `mongodb://mongodb:27017/team-time-off-tracker` as
configured. Read-only endpoints work without a replica set; only `PATCH /requests/:id`
needs it.

---

# Required environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Token signing key, minimum 32 characters |
| `PORT` | no | Defaults to `5000` |
| `JWT_EXPIRES_IN` | no | Any `jsonwebtoken` duration, defaults to `1h`. The cookie's `Max-Age` follows it. |
| `CORS_ORIGIN` | no | Comma-separated allowed origins, defaults to `http://localhost:5173`. Needed because credentialed cookies cannot use a wildcard. Add `http://localhost:3000` for the frontend container. Also used for Socket.IO handshakes. |
| `EMAIL_SENDER_SMTP_HOST` | no | SMTP host, defaults to `localhost` (Mailpit) |
| `EMAIL_SENDER_SMTP_PORT` | no | SMTP port, defaults to `1025`. Implicit TLS is used only on `465` |
| `EMAIL_SENDER_SMTP_USER` / `EMAIL_SENDER_SMTP_PASS` | no | Leave blank for Mailpit; set both for a real relay |
| `EMAIL_SENDER_FROM` | no | Sender address shown in the notification |
| `ADMIN_NAME` | no | Used by the seed |
| `ADMIN_EMAIL` | no | Used by the seed |
| `ADMIN_PASSWORD` | no | Used by the seed, minimum 8 characters |

`MONGODB_URI` and `JWT_SECRET` are validated at startup and the process exits with
a clear message if either is missing. There is no hardcoded fallback secret.
