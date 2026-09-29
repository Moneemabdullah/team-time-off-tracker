# API — Team Time-Off Tracker

Base URL: `http://localhost:5000`

All request and response bodies are JSON.

Interactive documentation is served at **`/api-docs`**.

---

## Authentication

Every route except `POST /auth/login` and `GET /health` requires a bearer token.

```http
Authorization: Bearer <token>
```

Log in to obtain one:

```bash
curl -X POST http://localhost:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "admin@example.com", "password": "admin123" }'
```

### `200` response

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
| `reason` | string | yes | at least 3 characters |

### Example

```bash
curl -X POST http://localhost:5000/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "startDate": "2026-10-05",
    "endDate": "2026-10-09",
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

### Query parameters (both optional)

| Parameter | Values |
| --- | --- |
| `status` | `PENDING`, `APPROVED`, `REJECTED` (case-insensitive) |
| `userId` | a 24-character ObjectId — **admin only** |

An employee who passes someone else's `userId` receives `403`; passing their own id
is allowed and behaves the same as omitting it.

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

## 5. List users

```
GET /users
```

**Admin only.** `passwordHash` is never included.

## 6. Get one user

```
GET /users/:id
```

**Admin only.** Returns `400` for a malformed id and `404` when the user does not
exist.

## 7. Reassign annual leave

```
POST /users/reassign-annual-leave
```

**Admin only.** Adds a signed number of days to the balance of **every** user.

> This is a bulk operation, not a per-user one. It takes no user identifier, and
> there is no way to target a single user.

### Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | integer | yes | Signed whole days to add. Positive grants leave, negative removes it. |

```bash
curl -X POST http://localhost:5000/users/reassign-annual-leave \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{ "number": 5 }'
```

### `200` response

```json
{
  "success": true,
  "message": "Annual leave reassigned successfully",
  "data": { "updated": 3 }
}
```

### Errors

| Code | When |
| --- | --- |
| `400` | `number` is not a number, is not a whole number, is zero, or would leave any user negative |
| `401` | missing, invalid or expired token |
| `403` | caller is not an admin |

The input is validated here rather than by a Zod schema, so the checks are strict:
a quoted `"7"` is rejected rather than coerced, and an operation that would drive
any user below zero is refused outright instead of clamping.

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

- **CORS is wide open.** The backend serves `Access-Control-Allow-Origin: *`, which is
  appropriate for local development but needs an explicit origin allowlist before any
  real deployment.

- **Login is not rate limited.** Passwords are compared with bcrypt, which is slow by
  design, but there is no lockout or throttling, so credentials can still be guessed.

- **Tokens cannot be revoked individually.** Signout is not implemented; a token stays
  valid until it expires. Deleting a user does invalidate their tokens, and a role
  change takes effect immediately, but there is no per-token deny list.

- **Unmatched routes return HTML, not the JSON envelope.** The error handler is mounted
  after the routers, so it covers errors thrown from a matched route but not requests
  that match no route at all. An unknown path, or a wrong method such as
  `GET /auth/login` or `GET /requests/:id`, gets Express's default `404` page with
  `Content-Type: text/html` rather than `{ "success": false, ... }`. A client parsing
  every response as JSON will throw on those. Fixing it means adding a catch-all
  `app.use()` after the routers.

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
| `JWT_EXPIRES_IN` | no | Any `jsonwebtoken` duration, defaults to `1h` |
| `ADMIN_NAME` | no | Used by the seed |
| `ADMIN_EMAIL` | no | Used by the seed |
| `ADMIN_PASSWORD` | no | Used by the seed, minimum 8 characters |

`MONGODB_URI` and `JWT_SECRET` are validated at startup and the process exits with
a clear message if either is missing. There is no hardcoded fallback secret.
