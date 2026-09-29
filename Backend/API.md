# API — Team Time-Off Tracker

Base URL: `http://localhost:5000`

All request and response bodies are JSON.

There is **no authentication or authorization** in this project — every endpoint is open.

---

## Response format

Every response uses one of two shapes.

**Success**

```json
{
  "success": true,
  "data": {}
}
```

**Error**

```json
{
  "success": false,
  "message": "Employee not found"
}
```

`data` is an object for single records and an array for list endpoints.

### Status codes

| Code | Meaning |
| --- | --- |
| `200` | Successful read or update |
| `201` | Record created |
| `400` | Invalid input or a violated business rule |
| `404` | Employee or request not found |
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
* Creating a request does **not** touch the employee's balance — that happens on approval.
* The client cannot set `days` or `status`; both are decided by the server. Sending
  either is rejected with `400`.

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

### Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `employeeId` | string | yes | 24-character MongoDB ObjectId |
| `startDate` | string | yes | `YYYY-MM-DD` |
| `endDate` | string | yes | `YYYY-MM-DD` |
| `reason` | string | yes | at least 3 characters |

`days` and `status` are **not accepted** — the body is strictly validated.

### Example

```bash
curl -X POST http://localhost:5000/requests \
  -H 'Content-Type: application/json' \
  -d '{
    "employeeId": "6abacda7072b490f821f313e",
    "startDate": "2026-10-05",
    "endDate": "2026-10-09",
    "reason": "Family trip"
  }'
```

### `201` response

```json
{
  "success": true,
  "data": {
    "id": "6abacd3f296d71f2c0b00417",
    "employee": {
      "id": "6abacda7072b490f821f313e",
      "name": "Alice Tester",
      "annualLeaveBalance": 10
    },
    "startDate": "2026-10-05",
    "endDate": "2026-10-09",
    "reason": "Family trip",
    "days": 5,
    "status": "PENDING",
    "createdAt": "2026-09-29T10:15:00.000Z",
    "updatedAt": "2026-09-29T10:15:00.000Z"
  }
}
```

`2026-10-05` (Mon) to `2026-10-09` (Fri) is 5 working days, so `days` is `5`.

### Errors

| Code | When |
| --- | --- |
| `400` | malformed body, bad date format, real-calendar check failed, `reason` too short, `days`/`status` sent by client |
| `400` | `startDate` is after `endDate` |
| `400` | `startDate` is in the past |
| `400` | the range contains zero working days |
| `404` | `Employee not found` |
| `409` | employee already has a `PENDING` or `APPROVED` request overlapping these dates |

---

## 2. List leave requests

```
GET /requests
```

### Query parameters (both optional)

| Parameter | Values |
| --- | --- |
| `status` | `PENDING`, `APPROVED`, `REJECTED` (case-insensitive) |
| `employeeId` | a 24-character ObjectId |

Unknown query parameters are rejected with `400`.

### Examples

```bash
curl http://localhost:5000/requests
curl "http://localhost:5000/requests?status=PENDING"
curl "http://localhost:5000/requests?employeeId=6abacda7072b490f821f313e"
curl "http://localhost:5000/requests?status=APPROVED&employeeId=6abacda7072b490f821f313e"
```

### `200` response

Results are sorted newest first.

```json
{
  "success": true,
  "data": [
    {
      "id": "6abacd3f296d71f2c0b00417",
      "employee": {
        "id": "6abacda7072b490f821f313e",
        "name": "Alice Tester",
        "annualLeaveBalance": 10
      },
      "startDate": "2026-10-05",
      "endDate": "2026-10-09",
      "reason": "Family trip",
      "days": 5,
      "status": "PENDING",
      "createdAt": "2026-09-29T10:15:00.000Z",
      "updatedAt": "2026-09-29T10:15:00.000Z"
    }
  ]
}
```

No matches returns an empty array, not a `404`.

### Errors

| Code | When |
| --- | --- |
| `400` | unknown query parameter, invalid `status`, malformed `employeeId` |

---

## 3. Approve or reject a request

```
PATCH /requests/:id
```

### Request body

| Field | Type | Required | Values |
| --- | --- | --- | --- |
| `status` | string | yes | `APPROVED` or `REJECTED` |

### Example

```bash
curl -X PATCH http://localhost:5000/requests/6abacd3f296d71f2c0b00417 \
  -H 'Content-Type: application/json' \
  -d '{ "status": "APPROVED" }'
```

### `200` response

Same object shape as create, with the updated `status` and the employee's
resulting `annualLeaveBalance`.

```json
{
  "success": true,
  "data": {
    "id": "6abacd3f296d71f2c0b00417",
    "employee": {
      "id": "6abacda7072b490f821f313e",
      "name": "Alice Tester",
      "annualLeaveBalance": 5
    },
    "startDate": "2026-10-05",
    "endDate": "2026-10-09",
    "reason": "Family trip",
    "days": 5,
    "status": "APPROVED",
    "createdAt": "2026-09-29T10:15:00.000Z",
    "updatedAt": "2026-09-29T11:02:00.000Z"
  }
}
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
| `400` | `:id` is not a valid ObjectId, or `status` is not `APPROVED`/`REJECTED` |
| `404` | `Leave request not found` |
| `409` | only `PENDING` requests can be approved |
| `409` | `Insufficient leave balance` — approving would push the balance below zero |
| `409` | a `REJECTED` request cannot change status |

### Concurrency

The balance update and the status update run inside a **MongoDB transaction**, so
they commit or roll back together. The deduction is also guarded by an atomic
`annualLeaveBalance >= days` condition, so parallel approvals can never drive a
balance negative. The first succeeds and the rest get `409`.

> **Requires a replica set.** MongoDB transactions are not supported on a standalone
> `mongod`. The bundled `docker-compose.yml` starts MongoDB as a single-node
> replica set and initialises it automatically, so `PATCH /requests/:id` works
> out of the box. See [Running with transactions](#running-with-transactions).

---

# Employee endpoints

## 4. Reassign annual leave

```
POST /employees/reassign-annual-leave
```

Adds a number of days to the leave balance of **every** employee.

> **This is a bulk operation, not a per-employee one.** Despite the name, it takes no
> employee identifier — `number` is applied to all employees in the collection. There
> is no way to target a single employee.

### Request body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `number` | number | yes | Signed days to add. Positive grants leave, negative removes it. |

```bash
curl -X POST http://localhost:5000/employees/reassign-annual-leave \
  -H 'Content-Type: application/json' \
  -d '{ "number": 5 }'
```

### `200` response

Note that this endpoint returns a `message` and **no `data` field**, unlike every
other endpoint in the API:

```json
{
  "success": true,
  "message": "Annual leave reassigned successfully"
}
```

### Errors

| Code | When |
| --- | --- |
| `500` | the balance could not be written — see the warnings below |

### ⚠️ Known defects

This endpoint is **not validated and not transactional**. Verified behaviour:

| Input | Actual result |
| --- | --- |
| `{"number": 5}` | Works. Every balance increases by 5. |
| `{"number": -30}` | `500`. Caught by the model's `min: 0` validator, so no data is written. |
| `{"number": "7"}` | **`200` — silently corrupts data.** A string is accepted and JavaScript concatenates it, turning a balance of `25` into `"257"`. |
| `{}` | `500`, with a raw Mongoose error leaked to the client: `Employee validation failed: annualLeaveBalance: Cast to Number failed for value "NaN"`. |

Consequences worth knowing before calling it:

- **Send a JSON number, never a quoted string.** A string is not rejected; it
  permanently corrupts the stored balance and there is no undo.
- **No partial-failure protection.** Each employee is saved in a separate loop
  iteration, so a failure part-way through leaves earlier employees already
  updated.
- **The success response omits `data`,** so a client that reads `response.data`
  will get `undefined`.

Adding a Zod schema for the body and wrapping the loop in a transaction would close
all three. Until then, treat this endpoint as development-only.

---

# Health check

```
GET /health
```

Not part of the response format above — it predates it.

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

`mongodb-init` runs `rs.initiate()` the first time and exits; `rs.status()` succeeds on
later runs, so it becomes a no-op. `restart: on-failure` covers the brief window where
MongoDB is not accepting connections yet. The state lives in the `mongodb_data` volume,
so `docker compose down` keeps it and only `docker compose down -v` forces a
re-initialisation.

To check it came up:

```bash
docker compose exec mongodb mongosh --quiet --eval 'print(rs.status().myState)'
# 1 means PRIMARY
```

The backend connects with `mongodb://mongodb:27017/team-time-off-tracker` as
configured, and retries on startup until the set is ready. `POST` and `GET` work
without a replica set; only `PATCH` needs it.
