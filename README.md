# Team Time-Off Tracker

A full-stack web application for submitting, reviewing, and approving team time-off
requests. Employees submit leave requests, and an admin reviews them and approves or
rejects them against each employee's remaining annual leave balance.

This project was built as an engineering onboarding exercise. The scope was kept
deliberately small — one employee collection, one leave-request collection, and a
single approval workflow — to focus on project structure, validation, and correctness
under concurrency rather than feature breadth.

---

## Features

- **Employee management** — create employees with a unique, lower-cased email address,
  list them, and fetch one by ID.
- **Leave request creation** — submit a request for a date range with a reason and an
  optional `argency` of `normal` or `urgent`; it is created in `PENDING` state.
- **Paginated leave request listing** — `GET /requests` returns your own requests;
  `GET /admin/requests` returns every user's, filterable by `status` and `userId`.
  Both page with `page` and `limit` and report totals in a `meta` block.
- **Approve / reject workflow** — move a request from `PENDING` to `APPROVED` or
  `REJECTED`, with guarded state transitions.
- **Annual leave balance** — every employee starts with 20 days; approval deducts the
  request's leave days, and reversing an approval restores them.
- **Sunday-free leave calculation** — leave days are counted server-side across the
  inclusive date range, with Sundays excluded. Every other day, including Saturday,
  counts as one leave day.
- **Overlap validation** — an employee cannot have two overlapping `PENDING` or
  `APPROVED` requests.
- **Leave balance validation** — approval is rejected if it would push the balance
  below zero.
- **JWT authentication** — password login issuing a signed token, delivered as an
  `HttpOnly` session cookie. Every route except login, logout and health requires it;
  an `Authorization: Bearer` header is also accepted for non-browser clients.
- **Role-based authorization** — `EMPLOYEE` and `ADMIN`, enforced by middleware.
  Employees can only ever see and act on their own leave.
- **Secure credentials** — passwords are bcrypt-hashed, and the hash is never
  selected into query results or returned by the API.
- **Employee management (admin only)** — create employees, update or delete accounts,
  and read the user list. Creating an employee emails them their temporary password.
- **Email notifications** — credentials on account creation, and approval or rejection
  notices to the employee. Mailpit captures both locally instead of sending.
- **Real-time urgent leave notifications** — an authenticated Socket.IO connection
  pushes a newly submitted `urgent` request to admins, and the approve/reject outcome to
  the employee who owns it. Notification only: REST and the database stay the source of
  truth, and nothing is persisted, replayed or retried. There are no client-to-server
  events, so an admin still acts through `PATCH /admin/requests/:id`.
- **Seeded admin** — the first administrator is created from environment variables
  by `npm run seed`, which is safe to run repeatedly.
- **Swagger / OpenAPI documentation** — interactive API reference at `/api-docs`,
  with a **Authorize** button for pasting a token.

---

## Tech Stack

### Backend

| Technology | Role |
| --- | --- |
| Node.js 24 | Runtime |
| TypeScript | Language |
| Express 4 | HTTP server and routing |
| MongoDB 7 | Database |
| Mongoose 8 | ODM |
| Zod 3 | Request and query validation |
| CORS | Cross-origin access for the frontend dev server |
| Socket.IO 4 | Authenticated real-time push for urgent leave events |
| jsonwebtoken | JWT signing and verification |
| bcryptjs | Password hashing |
| nodemailer + ejs | Outbound mail and `.ejs` templates |
| Swagger UI / swagger-jsdoc | OpenAPI documentation |
| dotenv | Environment variables |
| nodemon + tsx | Development server with reload |
| tsc | Type-check and build to `dist/` |
| Vitest | Test runner for `npm test` |

### Frontend

| Technology | Role |
| --- | --- |
| React 19 | UI library |
| React Router 7 | Client-side routing |
| Vite 8 | Dev server and build tooling |
| ESLint 10 | Linting |

### Infrastructure

- Docker and Docker Compose
- MongoDB 7 running as a **single-node replica set** (`rs0`), which the approval
  workflow requires for transactions
- [Mailpit](https://mailpit.axllent.dev/) — local SMTP sink, inbox at
  **http://localhost:8025**

---

## Project Structure

```text
team-time-off-tracker/
├── Backend/
│   ├── API.md                     # detailed API reference
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.mts          # npm test config
│   ├── tests/
│   │   └── socket.test.ts         # Socket.IO integration tests
│   └── src/
│       ├── config/
│       │   ├── db.ts              # Mongoose connection
│       │   ├── env.ts             # Zod-validated environment variables
│       │   ├── swagger.ts         # OpenAPI definition
│       │   └── swagger.docs.ts    # JSDoc for all endpoints
│       ├── controllers/
│       │   ├── admin.controller.ts
│       │   ├── auth.controller.ts
│       │   ├── request.controller.ts
│       │   └── user.controller.ts
│       ├── middleware/
│       │   └── auth.ts            # requireAuth (401) + requireRole (403)
│       ├── models/
│       │   ├── timeOffRequest.model.ts
│       │   └── user.model.ts      # identity, balance, role, passwordHash
│       ├── routes/
│       │   ├── index.ts           # mounts /auth, /users, /requests and /admin
│       │   ├── admin.routes.ts
│       │   ├── auth.routes.ts
│       │   ├── request.routes.ts
│       │   └── user.routes.ts
│       ├── schemas/
│       │   ├── request.schema.ts
│       │   └── user.schema.ts
│       ├── scripts/
│       │   └── admin.ts           # npm run seed
│       ├── services/
│       │   ├── auth.service.ts    # bcrypt + JWT
│       │   ├── request.service.ts # business rules + transactions
│       │   └── user.service.ts
│       ├── shared/
│       │   ├── catchAsync.ts      # async route handler wrapper
│       │   ├── errorHandler.ts    # single JSON error handler
│       │   └── sendResponse.ts    # success envelope helper
│       ├── socket/
│       │   ├── index.ts           # initSocket, attaches to the HTTP server
│       │   ├── auth.ts            # handshake JWT auth + room joining
│       │   └── emitter.ts         # leave:urgent / leave:decision helpers
│       ├── templates/             # .ejs mail templates
│       ├── types/
│       ├── utils/
│       │   ├── AppError.ts
│       │   ├── cookie.ts          # cookie read/write helpers
│       │   ├── date.ts            # UTC date + leave-day calculation
│       │   ├── emailService.ts    # nodemailer + ejs sending
│       │   ├── jwt.ts             # JWT sign/verify/decode
│       │   └── token.ts           # session token + auth cookie
│       ├── app.ts
│       └── server.ts
├── Frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # routes
│       ├── components/
│       │   ├── guards.jsx
│       │   ├── Loader.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── layout/DashboardLayout.jsx
│       │   └── ui/                # badge, button, card, input, select, ...
│       ├── lib/
│       │   ├── axiosInstance.js   # base URL, Bearer token, 401 redirect
│       │   ├── routes.js
│       │   ├── status.js
│       │   └── URLs.js
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── HomePage.jsx
│       │   ├── EmployeePage.jsx   # submit a request, urgent checkbox
│       │   ├── MyRequestsPage.jsx
│       │   ├── ChangePasswordPage.jsx
│       │   └── admin/
│       │       ├── AdminDashboard.jsx
│       │       ├── AllRequestsPage.jsx
│       │       ├── AllEmployeesPage.jsx
│       │       └── AddEmployeePage.jsx
│       └── store/
│           ├── authStore.js       # login state, token in sessionStorage
│           └── adminStore.js      # admin lists and approve/reject
├── docker-compose.yml
└── .gitignore
```

The backend follows a layered structure: **routes → controllers → services → models**.
Controllers only read the request, call a service, and shape the HTTP response; all
business rules live in the services.

---

## Prerequisites

- **Node.js 24** — the Dockerfiles use `node:24-alpine`
- **npm 11**
- **Docker + Docker Compose** — required if you want to run the stack in containers

You do **not** need a separate MongoDB installation if you use Docker Compose, because
the compose file provides it. Running the backend directly against a local MongoDB
requires your own instance.

---

## Installation

### Clone

```bash
git clone https://github.com/Moneemabdullah/team-time-off-tracker.git
cd team-time-off-tracker
```

### Environment

The backend reads `Backend/.env`. Copy the example and fill in the two required values:

```bash
cp Backend/.env.example Backend/.env
```

| Variable | Example | Description |
| --- | --- | --- |
| `MONGODB_URI` | `MONGODB_URI=mongodb://localhost:27017/team-time-off-tracker` | **Required.** Use the `mongodb` hostname inside Docker. |
| `JWT_SECRET` | `JWT_SECRET=` | **Required**, minimum 32 characters. `openssl rand -base64 48` |
| `PORT` | `PORT=5000` | Optional, defaults to `5000`. |
| `JWT_EXPIRES_IN` | `JWT_EXPIRES_IN=1h` | Optional. The cookie's `Max-Age` follows it. |
| `CORS_ORIGIN` | `CORS_ORIGIN=http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins. Required in practice: credentialed cookies cannot be combined with a wildcard origin. `5173` is the Vite dev server, `3000` the frontend container. Socket.IO handshakes reuse this same list. |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `ADMIN_EMAIL=admin@example.com` | Used only by `npm run seed`. |
| `EMAIL_SENDER_SMTP_HOST` / `EMAIL_SENDER_SMTP_PORT` | `EMAIL_SENDER_SMTP_HOST=localhost` | SMTP relay. Defaults target Mailpit on `1025`. Use `mailpit` as the host inside Docker. |
| `EMAIL_SENDER_SMTP_USER` / `EMAIL_SENDER_SMTP_PASS` | *(blank)* | Leave blank for Mailpit; set both for a real relay. |
| `EMAIL_SENDER_FROM` | `EMAIL_SENDER_FROM=no-reply@team-time-off-tracker.local` | Sender address on notifications. |

The server exits with a clear message if `MONGODB_URI` or `JWT_SECRET` is missing —
there is no fallback secret.


### Create the first admin

There is no registration endpoint, so seed the initial administrator:

```bash
npm run seed        # from Backend/
```

It creates the admin only if that email does not already exist, hashes the password
with bcrypt, and never logs it. Safe to run more than once.

The frontend reads `VITE_BACKEND_URI` and falls back to `http://localhost:5000` if it is
not set. There is no `.env` file for the frontend; set it yourself if you need to point
the UI at a different backend.

### Install Dependencies

```bash
cd Backend  && npm install
cd ../Frontend && npm install
```

### Run with Docker

From the repository root:

```bash
docker compose up --build
```

This starts four services:

| Service | Image / build | Purpose | Port |
| --- | --- | --- | --- |
| `backend` | built from `Backend/Dockerfile` | Express API | `5000` |
| `frontend` | built from `Frontend/Dockerfile` | React UI | `3000` |
| `mailpit` | `axllent/mailpit` | Local SMTP sink and web inbox | `1025`, `8025` |
| `mongodb` | `mongo:7` | Database, started as a single-node replica set | `27017` |
| `mongodb-init` | `mongo:7` | Runs `rs.initiate()` once, then exits | — |

`mongodb-init` initialises the replica set that the approval workflow depends on. It is
a no-op on subsequent runs.

Check on it with:

```bash
docker compose exec mongodb mongosh --quiet --eval 'print(rs.status().myState)'
# 1 means PRIMARY
```

> **Note:** the `frontend` service currently exits immediately. See
> [Known Limitations](#known-limitations--unfinished-work).

### Run Locally

**Backend** (needs a reachable MongoDB — use the compose `mongodb` service, or your
own local instance):

```bash
cd Backend
cp .env.example .env
npm run dev
```

The API starts on **http://localhost:5000**. `nodemon` restarts it on source changes.

**Frontend** (in a second terminal):

```bash
cd Frontend
npm run dev
```

Vite serves the UI on **http://localhost:5173** and forwards API calls to
`http://localhost:5000`. Note that Vite does not proxy API routes in this project — the
frontend calls the backend directly, which works because the backend enables CORS.

---

## API Documentation

Swagger UI is served by the backend at:

```text
http://localhost:5000/api-docs
```

The full written reference, including every validation rule and error code, is in
[`Backend/API.md`](Backend/API.md).

---

## API Overview

Every route requires a token except `POST /auth/login` and `GET /health`. Tokens are
sent as the `authToken` cookie, or as an `Authorization: Bearer` header.

| Method | Endpoint                                | Access | Description                        |
| ------ | --------------------------------------- | ------ | ---------------------------------- |
| `POST` | `/auth/login`                           | Public | Exchange credentials for a JWT     |
| `POST` | `/auth/logout`                          | Any    | Clear the session cookie           |
| `GET`  | `/requests`                             | Any    | Your own requests, paginated       |
| `POST` | `/requests`                             | Any    | Create a leave request             |
| `GET`  | `/users/me`                             | Any    | Own profile and balance            |
| `GET`  | `/admin/requests`                       | Admin  | All requests, paginated + filters  |
| `PATCH`| `/admin/requests/:id`                   | Admin  | Approve/reject request             |
| `GET`  | `/admin/users`                          | Admin  | List users                         |
| `POST` | `/admin/users`                          | Admin  | Create employee (emails credentials) |
| `POST` | `/admin/users/reassign-annual-leave`    | Admin  | Add days to every balance          |
| `GET`  | `/admin/users/:id`                      | Admin  | Get one user                       |
| `PATCH`| `/admin/users/:id`                      | Admin  | Update user                        |
| `DELETE`| `/admin/users/:id`                     | Admin  | Delete user                        |

List endpoints are paginated with `page` (default 1) and `limit` (default 10, max 100),
and return pagination metadata in a `meta` object alongside `data`:

```json
{ "success": true, "data": [ ... ], "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 } }
```

Responses use a consistent envelope:

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "message": "Leave request not found" }
```

`GET /requests` accepts two optional query parameters: `status` and `userId`. The
`userId` filter is admin-only; an employee who passes someone else's id receives
`403`, and omitting it returns only their own requests.

### Real-time events

The table above is the whole API. Socket.IO adds no endpoints and changes no payloads —
it only pushes a notification that something already committed:

| Event          | Recipient          | When                                    |
| -------------- | ------------------ | --------------------------------------- |
| `leave:urgent` | connected admins   | An `urgent` request is created          |
| `leave:decision` | the owning employee | An `urgent` request is approved or rejected |

Both fire after the database write commits, only for `argency: 'urgent'`, and there are
no client-to-server events. Clients pass the same JWT in the handshake
(`auth: { token }`) and must still refetch over REST — a missed event costs nothing
except a refresh. Full details, including the frontend integration spec, are in
[Backend/API.md](Backend/API.md#real-time-notifications-socketio).

---

## Business Rules

- New users start with **20 days** of annual leave balance, and default to the
  `EMPLOYEE` role. Both are set server-side and cannot be supplied by the client.
- A leave request is attributed to the **bearer token's user**. The body cannot
  choose the owner: `userId`, `name`, `email`, `days` and `status` are rejected.
- An employee can only read their **own** requests. Requesting another user's with
  a `userId` filter returns `403`; only admins may list everyone.
- Only admins may approve, reject, or change any leave balance.
- `POST /users/reassign-annual-leave` adds a signed number of days to the balance of
  **every** user. It is a bulk, admin-only operation with no per-user targeting, and
  it is refused outright if the change would leave anyone negative.
- Email addresses are **unique** and stored lower-cased.
- Leave **days are calculated on the server**. A client cannot set `days` or `status`;
  sending either is rejected with `400`.
- **Leave days are counted inclusively, excluding Sundays.** Saturday counts.
- A range containing **zero leave days** — a Sunday-only range — is rejected.
- A request **cannot start in the past**, and `startDate` cannot be after `endDate`.
- Dates are treated as **UTC calendar dates** end to end, which keeps the day count
  free of off-by-one errors.
- A new request is always created as **`PENDING`**.
- Creating a request **does not change the leave balance** — the balance only moves on
  approval.
- An employee cannot have **overlapping `PENDING` or `APPROVED`** requests. A `REJECTED`
  request does not block new ones.
- **Only `PENDING` requests can be approved.** Approving anything else returns `409`.
- Approval **cannot make the balance negative**; if there are not enough days the
  request returns `409` and the balance is untouched.
- Rejecting a `PENDING` request changes **nothing** on the balance.
- Rejecting an **`APPROVED`** request **restores** the deducted days.
- A **`REJECTED` request is terminal** — it cannot change status again.
- The API speaks status in upper case (`PENDING`, `APPROVED`, `REJECTED`); the database
  stores lower case.

---

## Development

### Backend

```bash
cd Backend
npm run dev     # nodemon + tsx, restarts on change
npm run build   # type-check and compile TypeScript to dist/
npm start       # run the compiled output
npm test        # Vitest; needs the MongoDB replica set running
```

`npm test` runs `tests/socket.test.ts` against a real app and a real database, because
approving a request uses a transaction and a standalone `mongod` cannot. Start the
database first:

```bash
docker compose up -d mongodb mongodb-init   # from the repository root
```

The suite creates and drops its own `team-time-off-tracker-socket-test` database and
never touches your development data.

### Frontend

```bash
cd Frontend
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # production build into dist/
npm run preview   # preview the production build
npm run lint      # ESLint
```

---

## Docker

### Services

- **backend** — built from `Backend/Dockerfile` (`node:24-alpine`). Installs
  dependencies, compiles TypeScript, and runs `node dist/server.js`. Exposes `5000`.
- **frontend** — built from `Frontend/Dockerfile` (`node:24-alpine`). Builds the Vite
  app. Exposes `3000`.
- **mongodb** — `mongo:7`, started with `--replSet rs0`, data persisted in the named
  volume `mongodb_data`. Exposes `27017`.
- **mongodb-init** — a short-lived `mongo:7` container that calls `rs.initiate()` once
  and exits.

### Why a replica set

Approving or rejecting a request updates the employee's balance and the request status
together, and that pair of writes runs inside a **MongoDB transaction**. Transactions
are only supported on a replica set or a sharded cluster, so a standalone `mongod`
would make `PATCH /requests/:id` fail. The single-node set configured here is enough
for local development.

### Useful commands

```bash
docker compose up --build          # start everything
docker compose up -d backend mongodb   # start without the frontend
docker compose logs -f backend    # follow backend logs
docker compose ps                  # show service status
docker compose down                # stop and remove containers
docker compose down -v             # stop and also delete the database volume
```

---

## Project Decisions

These were made where the brief left room for interpretation.

- **Pending requests do not reduce the leave balance.** The balance only changes on
  approval, so an employee can hold several pending requests without the balance
  appearing to drop. Rejecting a pending request therefore needs no restoration.
- **Leave days are calculated entirely on the server.** The client sends only dates and
  a reason; `days` and `status` are never accepted from the request body.
- **Sundays are excluded and every other day counts**, including Saturday. The backend
  rejects a request that spans no leave days at all, which is a Sunday-only range.
- **All dates are handled as UTC calendar dates.** Parsing and iteration both use UTC
  getters, which is what keeps the day count from drifting by a day.
- **New employees start with 20 days** of balance, set server-side.
- **Leave requests reference a `user`, not an `employee`,** and the owner is taken from
  the bearer token rather than the request body. There is no client-supplied user id.
- **Authentication and role-based authorization are in place.** The earlier design was
  deliberately unauthenticated, but JWT login and `EMPLOYEE`/`ADMIN` roles have since
  been added, so no endpoint is open and the approval actions are admin-only.
- **The configuration contract stays on `MONGODB_URI` with port `5000`.** A
  parallel draft of `config/env.ts` proposed `MONGO_URI`, port `3000` and a
  `leave-management` database; that was reconciled back because `docker-compose.yml`
  sets `MONGODB_URI`, port 3000 collides with the frontend container's published port,
  and the database name must match the rest of the project. The zod validation from
  that draft was kept.
- **Approving uses an atomic guard as well as a transaction.** The deduction filters on
  `annualLeaveBalance >= days` in the same `updateOne`, so even without the transaction
  parallel approvals cannot drive a balance negative.
- **The API exposes `annualLeaveBalance`, matching the model field name**, rather than
  introducing a second name for the same value.

---

## Known Limitations / Unfinished Work

### Frontend

The backend and the frontend are integrated: there is a login step, the session token is
sent as an `Authorization: Bearer` header, the admin pages call the `/admin` endpoints,
and status and id handling match the API. Two things remain:

- **There is no socket client.** The backend pushes `leave:urgent` and
  `leave:decision`, but no frontend code subscribes to them — `socket.io-client` is not
  a dependency yet. Until it is, urgent leave is submitted and reviewed through normal
  request/response cycles and the real-time part is unused. The integration spec is in
  [Backend/API.md](Backend/API.md#frontend-integration-spec).
- **`VITE_BACKEND_URI` is not set in Docker Compose.** `axiosInstance.js` falls back to
  `http://localhost:5000`, which happens to work through the published backend port but
  is not configured. Vite inlines it at build time, so it would need to be a build
  argument rather than a runtime one.
- **The session token is only ever sent as a Bearer header.** The backend also sets an
  `HttpOnly` `authToken` cookie, but the frontend does not send credentials, so the
  cookie is currently unused. That is fine for the token-in-`sessionStorage` flow it
  implements, but it is why a page reload cannot restore a session without the stored
  token.

### Backend

- **There is an automated test suite, but only for the socket.** `npm test` runs
  `Backend/tests/socket.test.ts` (14 tests) against the real app and a real replica set.
  The REST endpoints, validation rules and concurrent-approval behaviour are still only
  covered by throwaway scripts outside the repository, so those are not committed and
  cannot be re-run as-is.
- **`npm test` requires the MongoDB replica set.** Approving a request uses a
  transaction, and `mongodb-memory-server` is a standalone `mongod` that cannot do that,
  so the suite cannot run without `docker compose up -d mongodb mongodb-init`.
- **The frontend has no socket client yet.** The backend pushes `leave:urgent` and
  `leave:decision`, and the UI can now submit an `urgent` request, but nothing
  subscribes to the events yet, so nothing is pushed in the running app. The
  integration spec is in
  [Backend/API.md](Backend/API.md#frontend-integration-spec).
- **No user registration endpoint exists.** New users must be created directly in the
  database; only the initial admin can be created from the command line, via
  `npm run seed`. Adding a way to create further employees is an obvious next step.
- **There is no annual leave renewal.** Balances only change through approvals,
  rejections and the admin reassign endpoint, so a year passes without them resetting.
  The original brief asked to keep an existing renewal job, but no such job or yearly
  configuration existed in the repository, and it was skipped rather than invented.
- **`POST /users/reassign-annual-leave` is admin-only but still not transactional.**
  It validates its input and refuses an operation that would leave anyone negative,
  but the bulk `updateMany` is a single write, so a mid-operation failure is unlikely
  but not impossible.
- **Password hashes are excluded from responses by convention, not by the model.**
  `user.model.ts` does not set `select: false` on `passwordHash`, so `userModel.find()`
  returns documents containing it. Nothing leaks today because `toPublicUser` builds a
  new object from a fixed field list, but any future endpoint returning a raw document
  would expose the hashes. See [Backend/API.md](Backend/API.md#known-limitations).
- **`createUser` in the user service accepts a caller-supplied `role`,** so code that
  holds the admin password could mint another admin. No route reaches it today, so it is
  not exploitable, but it should be tightened before employee creation is exposed.
- **CORS uses an explicit origin allowlist and login is not rate limited.** The allowlist
  in `CORS_ORIGIN` is a development convenience, not a deployment policy, and rate
  limiting is still needed before any real deployment.
- **Tokens cannot be revoked individually** — there is no signout or deny list, so a
  token stays valid until it expires.
- **The credentials email carries the password in plain text**, so it transits SMTP and
  lands in a mailbox. There is no `mustChangePassword` flag yet, so the emailed
  password stays valid until an admin resets it. Adding one was deliberately left out
  of this change because it touches the login path.
- **Email templates still resolve from the process working directory**, not from
  `__dirname`, so starting the server from an unexpected directory will not find them.
  The Dockerfile copies the `.ejs` files to `dist/templates` and `templatePath` checks
  `dist/templates` before falling back to `src/templates`, so a compiled server no
  longer depends on `src/` being present in the image. The fallback is what keeps
  `npm run dev` working, where there is no `dist/`.
- **The SMTP transport has no timeout, so an unreachable relay stalls a request for
  about two minutes.** `emailService.ts` sets no `connectionTimeout` or
  `greetingTimeout`, so nodemailer falls back to its 120s default. This is harmless
  against the Mailpit default, but pointing `EMAIL_SENDER_SMTP_HOST` at a relay the host
  cannot reach makes `PATCH /admin/requests/:id` hang after the transaction has already
  committed. The write succeeds; only the response is delayed. Adding an explicit
  `connectionTimeout` is the fix, and it was left alone as unrelated to the socket work.
- **`GET /users` excludes admins**, so the admin account never appears in the employee
  list.
- **Unmatched routes return Express's default HTML 404**, not the `{ success, message }`
  envelope, because the error handler only covers requests that matched a route. A
  client that JSON-parses every response will throw on an unknown path or a wrong
  method.

---

## Contributing

1. Create a branch off `main`:

   ```bash
   git checkout -b feat/short-description
   ```

2. Make focused changes — one logical change per commit. Write commit messages in the
   existing style, e.g. `feat: add employees API endpoints` or
   `fix: run mongodb as a replica set for transactions`.

3. Verify your work:

   ```bash
   cd Backend  && npx tsc --noEmit && npm run build
   cd ../Frontend && npm run lint
   ```

4. Push and open a pull request against `main`:

   ```bash
   git push -u origin feat/short-description
   ```

Keep pull requests small and describe the behaviour change, not just the file list.

---

## License

`Backend/package.json` declares `"license": "MIT"`, but **no `LICENSE` file is present
in the repository**, and `Frontend/package.json` declares no license. A license has not
formally been specified for the project as a whole — add a `LICENSE` file before
publishing or distributing this code.
