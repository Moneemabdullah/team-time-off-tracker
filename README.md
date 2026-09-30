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
  request's working days, and reversing an approval restores them.
- **Weekday-only leave calculation** — leave days are counted server-side as
  Monday–Friday only; Saturdays and Sundays are excluded.
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
| jsonwebtoken | JWT signing and verification |
| bcryptjs | Password hashing |
| nodemailer + ejs | Outbound mail and `.ejs` templates |
| Swagger UI / swagger-jsdoc | OpenAPI documentation |
| dotenv | Environment variables |
| nodemon + tsx | Development server with reload |
| tsc | Type-check and build to `dist/` |

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
│   └── src/
│       ├── config/
│       │   ├── db.ts              # Mongoose connection
│       │   ├── swagger.ts         # OpenAPI definition
│       │   └── swagger.docs.ts    # JSDoc for all endpoints
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── request.controller.ts
│       │   └── user.controller.ts
│       ├── middleware/
│       │   └── auth.ts            # requireAuth (401) + requireRole (403)
│       ├── models/
│       │   ├── timeOffRequest.model.ts
│       │   └── user.model.ts      # identity, balance, role, passwordHash
│       ├── routes/
│       │   ├── index.ts           # mounts /auth, /users and /requests
│       │   ├── auth.routes.ts
│       │   ├── request.routes.ts
│       │   └── user.routes.ts
│       ├── schemas/
│       │   ├── request.schema.ts
│       │   └── user.schema.ts
│       ├── seed/
│       │   └── admin.ts           # npm run seed
│       ├── services/
│       │   ├── auth.service.ts    # bcrypt + JWT
│       │   ├── request.service.ts # business rules + transactions
│       │   └── user.service.ts
│       ├── shared/
│       │   ├── catchAsync.ts      # async route handler wrapper
│       │   ├── errorHandler.ts    # single JSON error handler
│       │   └── sendResponse.ts    # success envelope helper
│       ├── utils/
│       │   ├── AppError.ts
│       │   ├── cookie.ts          # cookie read/write helpers
│       │   ├── date.ts            # UTC date + weekday calculation
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
│       │   └── Navbar.jsx
│       └── pages/
│           ├── EmployeePage.jsx   # submit a request
│           └── AdminPage.jsx      # review and approve/reject
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
| `CORS_ORIGIN` | `CORS_ORIGIN=http://localhost:5173` | Comma-separated allowed origins. Required in practice: credentialed cookies cannot be combined with a wildcard origin. |
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

The frontend reads `VITE_API_URL` and falls back to `http://localhost:5000` if it is not
set. There is no `.env` file for the frontend; set it yourself if you need to point the
UI at a different backend.

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
- **Only Monday–Friday count.** Saturdays and Sundays are excluded.
- A range containing **zero working days** is rejected.
- A request **cannot start in the past**, and `startDate` cannot be after `endDate`.
- Dates are treated as **UTC calendar dates** end to end, which keeps the weekday count
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
```

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
- **Saturdays and Sundays are excluded**, and the backend rejects a request that spans
  no working days at all.
- **All dates are handled as UTC calendar dates.** Parsing and iteration both use UTC
  getters, which is what keeps the weekday count from drifting by a day.
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

The backend is complete and verified. The frontend is **not integrated with
authentication** and has known defects:

- **The frontend sends no credentials at all.** It has no login step and no
  `credentials: 'include'` on its requests, so every call now fails — with `401`
  because no token is sent, and with a CORS error even once one is. It needs a login
  step plus `credentials: 'include'` on each request.
- **The frontend still calls the removed `/employees` endpoints.** `AdminPage`
  requests `/employees` and `POST /employees/reassign-annual-leave`; both moved to
  `/users` and are now admin-only.
- **`POST /requests` no longer accepts `name` and `email`.** The backend derives the
  user from the token, so `EmployeePage` must drop those fields and send only
  `startDate`, `endDate` and `reason`.
- **`AdminPage` reads the wrong response shape.** It assigns the full
  `{ success, data }` envelope to state and then calls `.filter()` on it, which
  throws at runtime.
- **`AdminPage` uses `_id`, but the API returns `id`.** Approve/reject therefore
  calls `PATCH /requests/undefined`, and the list never refreshes after an update.
- **`AdminPage` compares status against `'pending'`,** while the API returns
  `'PENDING'`, so the approve/reject buttons never render.
- **The frontend container cannot start.** `Frontend/Dockerfile` runs
  `CMD ["npm", "start"]`, but `Frontend/package.json` defines no `start` script. The
  service exits with an npm error.
- **`EXPOSE 3000` does not match the Vite default ports** (5173 for dev, 4173 for
  preview), and `vite.config.js` sets no `server.port`.
- **`VITE_API_URL` is not set in Docker Compose.** The bundle falls back to
  `http://localhost:5000`, which happens to work through the published port but is
  not configured. Vite inlines this at build time, so it would need to be a build
  argument.

### Backend

- **There is no automated test suite.** The verification for this work was done with
  throwaway scripts outside the repository, covering login, token handling, role
  separation, the request rules and concurrent approvals. Those scripts are not
  committed, so they cannot be re-run as-is.
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
- **CORS allows every origin** (`Access-Control-Allow-Origin: *`) and **login is not
  rate limited**. Both are fine for local development and both need restricting before
  any real deployment.
- **Tokens cannot be revoked individually** — there is no signout or deny list, so a
  token stays valid until it expires.
- **The credentials email carries the password in plain text**, so it transits SMTP and
  lands in a mailbox. There is no `mustChangePassword` flag yet, so the emailed
  password stays valid until an admin resets it. Adding one was deliberately left out
  of this change because it touches the login path.
- **Email templates resolve from the process working directory** (`<cwd>/src/templates`),
  because `tsc` does not copy `.ejs` files into `dist/`. Running the server from a
  different directory will fail to find them.
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
