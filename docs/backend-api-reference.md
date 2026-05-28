# Backend API Reference

This document describes the HTTP API surface exposed by the frontend backend
(`src/app/api`).  The routes are intentionally thin stubs in the current code
base; they exist primarily for analytics hooks and development/testing.

Each entry includes the HTTP method, path, expected request body (if any), and
an example response.  All endpoints return JSON.

---

## Standard Response Conventions

All endpoints follow these conventions.

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }       // optional pagination / additional metadata
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests. Please try again later.",
    "retryAfterSeconds": 60  // present on 429 and 503 only
  }
}
```

### Rate Limited Responses (429 / 503)

When a request is rate-limited, the response includes the `Retry-After` HTTP header:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

| Status | `retryAfterSeconds` default | Meaning |
|--------|---------------------------|---------|
| 429 | 60 s | Client exceeded rate limit |
| 503 | 30 s | Service temporarily unavailable |

Clients should wait the indicated seconds before retrying. See [error-handling.md](./error-handling.md) for the full client retry strategy (exponential backoff + jitter).

---

## `POST /api/commitments`

Creates a new commitment.  In the stub implementation, no persistence occurs;
this route is mainly used to log `CommitmentCreated` analytics events.

- **Request body**: arbitrary JSON with commitment parameters (amount, term,
etc.)
- **Response**: stub message with the requester IP.

### Example

```bash
curl -X POST http://localhost:3000/api/commitments \
     -H 'Content-Type: application/json' \
     -d '{"asset":"XLM","amount":100}'
```

```json
{
  "message": "Commitments creation endpoint stub - rate limiting applied",
  "ip": "::1"
}
```

---

## `POST /api/commitments/[id]/settle`

Marks the commitment identified by `id` as settled.  Currently a stub that emits
`CommitmentSettled` events.

- **Path parameter**: `id` (string)
- **Request body**: optional JSON payload with additional details.
- **Response**: stub confirmation message.

### Example

```bash
curl -X POST http://localhost:3000/api/commitments/abc123/settle \
     -H 'Content-Type: application/json' \
     -d '{"finalValue":105}'
```

```json
{
  "message": "Stub settlement endpoint for commitment abc123",
  "commitmentId": "abc123"
}
```

---

## `POST /api/commitments/[id]/early-exit`

Triggers an early exit (with penalty) for the named commitment.  Emits
`CommitmentEarlyExit` events.

- **Path parameter**: `id` (string)
- **Request body**: optional JSON with penalty or reason.
- **Response**: stub message.

### Example

```bash
curl -X POST http://localhost:3000/api/commitments/abc123/early-exit \
     -H 'Content-Type: application/json' \
     -d '{"reason":"user-request"}'
```

```json
{
  "message": "Stub early-exit endpoint for commitment abc123",
  "commitmentId": "abc123"
}
```

---

## `POST /api/attestations`

Records an attestation event.  Stub implementation logs
`AttestationReceived`.

- **Request body**: JSON describing the attestation (e.g. signature,
commitmentId).
- **Response**: stub message with requester IP.

### Example

```bash
curl -X POST http://localhost:3000/api/attestations \
     -H 'Content-Type: application/json' \
     -d '{"commitmentId":"abc123","status":"valid"}'
```

```json
{
  "message": "Attestations recording endpoint stub - rate limiting applied",
  "ip": "::1"
}
```

---

## `GET /api/protocol/constants`

Returns the public protocol constants used by UX copy and calculations, including fee parameters, penalty tiers, and commitment limits. This endpoint is public and includes caching headers.

### Example

```bash
curl http://localhost:3000/api/protocol/constants
```

```json
{
  "success": true,
  "data": {
    "protocolVersion": "v1",
    "network": "Test SDF Network ; September 2015",
    "fees": {
      "networkBaseFeeStroops": 100,
      "platformFeePercent": 0
    },
    "penalties": [...],
    "commitmentLimits": { ... },
    "cachedAt": "2026-02-25T00:00:00.000Z"
  }
}
```

---

## `POST /api/commitments/[id]/dispute`

Opens a dispute for the named commitment.  Calls the escrow contract's
`dispute` method and records an audit log event.

- **Path parameter**: `id` (string) — the commitment ID
- **Request body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Reason for the dispute (1–500 characters) |
| `evidence` | string | No | Optional URL or reference to supporting evidence |
| `callerAddress` | string | No | Stellar address of the caller (defaults to commitment owner) |

- **Response**: dispute details including `disputeId`, `status`, and `txHash`.

### Example

```bash
curl -X POST http://localhost:3000/api/commitments/abc123/dispute \
     -H 'Content-Type: application/json' \
     -d '{"reason":"Payment not received","evidence":"https://example.com/proof"}'
```

```json
{
  "success": true,
  "data": {
    "commitmentId": "abc123",
    "disputeId": "DSP-001",
    "status": "DISPUTED",
    "txHash": "0xdispute123",
    "disputedAt": "2026-05-28T14:00:00.000Z"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing or invalid `reason`, empty commitment ID |
| 409 | Commitment already settled, exited, or already in dispute |
| 502 | Blockchain call failed |

---

## `POST /api/commitments/[id]/resolve`

Resolves an open dispute on a commitment. **Admin access only** — the caller
must authenticate with a valid Bearer token and the address must be listed in
`ADMIN_ADDRESSES`.  Calls the escrow contract's `resolve_dispute` method and
records an audit log event.

- **Path parameter**: `id` (string) — the commitment ID
- **Authentication**: Bearer token required (admin only)
- **Request body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolution` | enum | Yes | One of: `resolved_in_favor_of_owner`, `resolved_in_favor_of_counterparty`, `dismissed` |
| `notes` | string | No | Optional resolution notes (max 1000 characters) |

- **Response**: resolution details including `disputeId`, `resolution`, and `finalStatus`.

### Example

```bash
curl -X POST http://localhost:3000/api/commitments/abc123/resolve \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer <session_token>' \
     -d '{"resolution":"resolved_in_favor_of_owner","notes":"Evidence reviewed and validated"}'
```

```json
{
  "success": true,
  "data": {
    "commitmentId": "abc123",
    "disputeId": "DSP-001",
    "resolution": "resolved_in_favor_of_owner",
    "finalStatus": "ACTIVE",
    "txHash": "0xresolve123",
    "resolvedAt": "2026-05-28T14:30:00.000Z"
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Missing or invalid `resolution`, empty commitment ID, notes too long |
| 401 | Missing or invalid Bearer token |
| 403 | Caller is not an admin |
| 409 | Commitment is not currently in dispute |
| 502 | Blockchain call failed |

---

## `GET /api/metrics`

Simple health/metrics endpoint used by monitoring tools.

- **Response**: JSON object containing uptime, mock request/error counts, and
current timestamp.

### Example

```bash
curl http://localhost:3000/api/metrics
```

```json
{
  "status": "up",
  "uptime": 123.456,
  "mock_requests_total": 789,
  "mock_errors_total": 2,
  "timestamp": "2026-02-25T00:00:00.000Z"
}
```

---

> 🔧 _This reference will grow as the backend implements real business logic._

```
