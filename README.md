# Finault

A production-grade fullstack finance dashboard with a backend-first architecture — featuring role-based access control, real-time anomaly detection, and SMS auto-ledger capabilities.

> Built to demonstrate how a well-structured backend serves data to a frontend dashboard cleanly, securely, and efficiently.

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js + TypeScript | Type-safe backend |
| **Framework** | Express 5 | HTTP routing, middleware pipeline |
| **Database** | PostgreSQL + Prisma ORM | Relational persistence with type-safe queries |
| **Auth** | JWT + bcrypt | Access/refresh token rotation, password hashing |
| **Validation** | Zod v4 | Runtime schema validation on every endpoint |
| **Real-time** | Socket.io | Live dashboard updates via WebSocket |
| **Security** | Helmet + CORS + Rate Limiting + XSS | Defense-in-depth |
| **API Docs** | Swagger / OpenAPI 3.0 | Interactive documentation at `/api/docs` |
| **Frontend** | React 19 + Vite + Tailwind CSS + Recharts | Dashboard UI |

---

## Architecture

```
backend/src/
├── config/                  # Environment, database, Socket.io, Swagger
│   ├── env.ts               # Zod-validated env vars (fails fast on bad config)
│   ├── database.ts          # Prisma singleton with global caching
│   ├── socket.ts            # Socket.io with JWT-authenticated connections
│   └── swagger.ts           # OpenAPI 3.0 spec (28 documented endpoints)
│
├── middleware/               # Cross-cutting concerns
│   ├── authenticate.ts      # JWT Bearer token verification
│   ├── authorize.ts         # RBAC: role hierarchy + granular permissions
│   ├── validate.ts          # Zod schema validation (body/query/params)
│   ├── rateLimiter.ts       # 3-tier rate limiting (global/auth/webhook)
│   ├── errorHandler.ts      # Centralized error formatting
│   └── requestLogger.ts     # HTTP request logging
│
├── modules/                  # Domain-driven, self-contained modules
│   ├── auth/                # Register, login, refresh, logout, profile
│   ├── users/               # User CRUD, role assignment, status management
│   ├── transactions/        # Financial records CRUD with filtering & sorting
│   ├── dashboard/           # Aggregated analytics (summary, trends, categories)
│   ├── anomaly/             # 3-strategy detection engine
│   └── sms-ledger/          # SMS parsing webhook + auto-categorization
│
├── shared/                   # Cross-module utilities
│   ├── constants/           # Role permissions, merchant category map
│   ├── types/               # TypeScript interfaces (JwtPayload, Express augments)
│   └── utils/               # ApiError, pagination, date utilities
│
├── app.ts                    # Express middleware pipeline + route mounting
└── server.ts                 # HTTP server + Socket.io + graceful shutdown
```

Each module follows the pattern: **routes** (endpoint definitions) -> **controller** (HTTP handling) -> **service** (business logic) -> **validation** (Zod schemas). No module directly imports another module's internals.

---

## Request Lifecycle

```
Client Request
     │
     v
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE PIPELINE                        │
│                                                              │
│  Helmet ──> CORS ──> JSON Parser ──> Logger ──> Rate Limit  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          v
┌─────────────────────────────────────────────────────────────┐
│                     ROUTE HANDLER                            │
│                                                              │
│  authenticate() ──> authorize(role) ──> validate(schema)    │
│         │                  │                    │            │
│    Verify JWT        Check role            Parse & validate │
│    Extract user      hierarchy             request body     │
│    from token        + permissions         with Zod         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          v
┌─────────────────────────────────────────────────────────────┐
│              CONTROLLER ──> SERVICE ──> DATABASE             │
│                                                              │
│  Parse request ──> Business logic ──> Prisma queries        │
│  Format response    RBAC data scoping  PostgreSQL            │
│                     Anomaly triggers                         │
│                     WebSocket events                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          v
┌─────────────────────────────────────────────────────────────┐
│                   RESPONSE FORMATTING                        │
│                                                              │
│  Success: { success: true, data: {...}, meta: {...} }       │
│  Error:   { success: false, error: { code, message } }     │
│                                                              │
│  Unhandled errors caught by global errorHandler middleware   │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication & Token Flow

```
  ┌──────────┐          ┌──────────┐          ┌──────────┐
  │  Client  │          │  Server  │          │    DB    │
  └────┬─────┘          └────┬─────┘          └────┬─────┘
       │                     │                     │
       │  POST /auth/login   │                     │
       │  {email, password}  │                     │
       │────────────────────>│                     │
       │                     │  Find user by email │
       │                     │────────────────────>│
       │                     │     User record     │
       │                     │<────────────────────│
       │                     │                     │
       │                     │  bcrypt.compare()   │
       │                     │  Check lockout      │
       │                     │  Reset fail count   │
       │                     │                     │
       │                     │  Store hashed       │
       │                     │  refresh token      │
       │                     │────────────────────>│
       │                     │                     │
       │  { accessToken,     │                     │
       │    refreshToken }   │                     │
       │<────────────────────│                     │
       │                     │                     │
       │  GET /api/data      │                     │
       │  Bearer: accessToken│                     │
       │────────────────────>│                     │
       │                     │  jwt.verify()       │
       │                     │  Extract userId,    │
       │                     │  role from payload  │
       │                     │                     │
       │  200 OK + data      │                     │
       │<────────────────────│                     │
       │                     │                     │
       │  ── Token expires (15 min) ──             │
       │                     │                     │
       │  POST /auth/refresh │                     │
       │  {refreshToken}     │                     │
       │────────────────────>│                     │
       │                     │  Hash token (SHA256)│
       │                     │  Find in DB         │
       │                     │────────────────────>│
       │                     │  Delete old token   │
       │                     │  Store new hashed   │
       │                     │  refresh token      │
       │                     │────────────────────>│
       │                     │                     │
       │  { new accessToken, │                     │
       │    new refreshToken}│  (Token Rotation)   │
       │<────────────────────│                     │
```

**Security measures:**
- Access tokens: 15-minute expiry, signed with HS256
- Refresh tokens: 7-day expiry, SHA-256 hashed before storage, single-use (rotation)
- Account lockout: 5 failed attempts triggers 15-minute lock
- Password policy: min 8 chars, uppercase, number, special character

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
  ADMIN (level 3)
    │
    │  Inherits all permissions below
    v
  ANALYST (level 2)
    │
    │  Inherits all permissions below
    v
  VIEWER (level 1)
```

### Permission Matrix

| Permission | Viewer | Analyst | Admin |
|:-----------|:------:|:-------:|:-----:|
| `transactions:read` | x | x | x |
| `transactions:create` | | | x |
| `transactions:update` | | | x |
| `transactions:delete` | | | x |
| `dashboard:read` | x | x | x |
| `dashboard:trends` | | x | x |
| `dashboard:anomalies` | | x | x |
| `anomalies:read` | | x | x |
| `anomalies:resolve` | | | x |
| `users:read` | | | x |
| `users:create` | | | x |
| `users:update` | | | x |
| `users:delete` | | | x |
| `sms-ledger:read` | | | x |

### Data Scoping

Permissions control **what actions** a user can perform. Data scoping controls **what data** they see:

| Data | Admin | Analyst / Viewer |
|:-----|:------|:-----------------|
| Transactions list | All users' transactions | Only their own |
| Dashboard summary | Org-wide totals | Their own totals |
| Dashboard trends | Org-wide trends | Their own trends |
| Recent activity | All transactions | Their own |
| Category breakdown | All categories | Their own categories |

This is enforced at the **service layer**, not just the route — ensuring no data leaks regardless of how the API is called.

---

## Anomaly Detection Engine

Runs automatically on every transaction create/update. Three strategies execute in parallel:

```
Transaction Created/Updated
         │
         v
   ┌─────────────────────────────────────────────┐
   │         ANOMALY DETECTION ENGINE             │
   │                                              │
   │  ┌─────────────┐  ┌──────────┐  ┌────────┐ │
   │  │  Category    │  │Duplicate │  │Unusual │ │
   │  │  Spike       │  │Detection │  │Frequen.│ │
   │  │             │  │          │  │        │ │
   │  │ amount >    │  │ Same amt │  │ Daily  │ │
   │  │ avg + 2*std │  │ + cat +  │  │ count  │ │
   │  │ for this    │  │ type     │  │ > 3x   │ │
   │  │ category    │  │ within   │  │ 30-day │ │
   │  │             │  │ 5 min    │  │ avg    │ │
   │  └──────┬──────┘  └────┬─────┘  └───┬────┘ │
   │         │              │             │      │
   │         v              v             v      │
   │      ┌─────────────────────────────────┐    │
   │      │     Persist to anomalies table  │    │
   │      │     Emit WebSocket event        │    │
   │      │     anomaly:detected            │    │
   │      └─────────────────────────────────┘    │
   └─────────────────────────────────────────────┘
```

| Strategy | What it catches | Example |
|:---------|:---------------|:--------|
| **Category Spike** | Unusually high amount for the category | Food & Dining avg is ~800, a 8,500 dinner flags at 10.6x |
| **Duplicate Detection** | Possible double-charges | Two identical 450 "Office Supplies" entries 2 min apart |
| **Unusual Frequency** | Spending bursts | 5 grocery transactions in one day vs average of 1/day |

Each anomaly stores: type, message, severity (0-1), metadata (avg, threshold, etc.), and can be resolved by admins.

---

## SMS Auto-Ledger

```
Bank SMS ──> Webhook ──> 7-Step Parser ──> Transaction ──> Anomaly Check
                │
                v
    ┌───────────────────────────────────┐
    │       SMS PARSING PIPELINE        │
    │                                   │
    │  1. Detect type (debit/credit)    │
    │  2. Extract amount (Rs/INR/₹)    │
    │  3. Parse date (DD-Mon-YY, etc.) │
    │  4. Identify merchant             │
    │  5. Extract reference ID          │
    │  6. Extract balance               │
    │  7. Auto-categorize from merchant │
    │                                   │
    │  Status: SUCCESS / PARTIAL / FAIL │
    └───────────────────────────────────┘
```

**Supported formats:** `Rs. 1,234.56`, `INR 25000`, `₹ 500.00` — handles 15+ Indian bank SMS patterns.

**Example webhook call:**
```bash
curl -X POST http://localhost:3000/api/sms-ledger/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-sms-api-key" \
  -d '{
    "message": "Rs.2,500.00 debited from A/c XX4521 on 02-Apr-26 to UPI/Swiggy. Avl Bal: Rs.45,230.50",
    "sender": "HDFCBK"
  }'
```

**Result:** Creates a transaction (EXPENSE, 2500, Food & Dining), links it to the SMS log, and runs anomaly detection — all in one request.

---

## Database Schema

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   users      │       │  transactions    │       │  anomalies  │
├─────────────┤       ├──────────────────┤       ├─────────────┤
│ id          │──┐    │ id               │──┐    │ id          │
│ email       │  │    │ amount (12,2)    │  │    │ transaction │
│ passwordHash│  │    │ type (enum)      │  │    │ type (enum) │
│ name        │  │    │ category         │  │    │ message     │
│ role (enum) │  ├───>│ date             │  ├───>│ severity    │
│ isActive    │  │    │ notes            │  │    │ metadata    │
│ failedAttempts│ │    │ userId (FK)      │  │    │ isResolved  │
│ lockedUntil │  │    │ smsLogId (FK)    │  │    │ createdAt   │
│ deletedAt   │  │    │ deletedAt        │  │    └─────────────┘
│ createdAt   │  │    │ createdAt        │  │
│ updatedAt   │  │    │ updatedAt        │  │
└─────────────┘  │    └──────────────────┘  │
                 │                           │
┌─────────────┐  │    ┌──────────────────┐   │
│refresh_tokens│  │    │    sms_logs      │   │
├─────────────┤  │    ├──────────────────┤   │
│ id          │  │    │ id               │───┘
│ token (hash)│  │    │ rawMessage       │
│ userId (FK) │──┘    │ sender           │
│ expiresAt   │       │ parseStatus      │
│ createdAt   │       │ parsedData (JSON)│
└─────────────┘       │ errorReason      │
                      │ createdAt        │
┌─────────────┐       └──────────────────┘
│ audit_logs  │
├─────────────┤
│ id          │
│ userId (FK) │
│ action      │
│ entity      │
│ entityId    │
│ oldValue    │
│ newValue    │
│ ipAddress   │
│ createdAt   │
└─────────────┘
```

**Design decisions:**
- `Decimal(12,2)` for monetary amounts — never floating point
- `deletedAt` nullable field for soft deletes with index
- Composite index `[userId, category, date]` for dashboard aggregation queries
- Separate `anomalies` table (not boolean flags) — supports multiple anomalies per transaction and resolution tracking
- `sms_logs` with one-to-one link to `transactions` for full audit trail
- `refresh_tokens` stored as SHA-256 hashes, not plaintext
- 15 database indexes for query performance

---

## API Endpoints (28 total)

### Auth (`/api/auth`)
| Method | Path | Access | Description |
|:-------|:-----|:-------|:------------|
| POST | `/register` | Public | Register (first user becomes ADMIN) |
| POST | `/login` | Public | Login with credentials (lockout after 5 fails) |
| POST | `/refresh` | Public | Rotate access + refresh tokens |
| POST | `/logout` | Authenticated | Invalidate refresh token |
| GET | `/me` | Authenticated | Get current user profile |

### Users (`/api/users`)
| Method | Path | Access | Description |
|:-------|:-----|:-------|:------------|
| GET | `/` | Admin | List users (paginated, searchable by name/email) |
| GET | `/:id` | Admin | Get user with transaction count |
| POST | `/` | Admin | Create user with role assignment |
| PATCH | `/:id` | Admin | Update role/status (guards against last-admin demotion) |
| DELETE | `/:id` | Admin | Soft delete (can't delete self or last admin) |

### Transactions (`/api/transactions`)
| Method | Path | Access | Description |
|:-------|:-----|:-------|:------------|
| GET | `/` | Viewer+ | List with filters, pagination, sorting |
| GET | `/:id` | Viewer+ | Get with anomalies and SMS log |
| POST | `/` | Admin | Create + trigger anomaly detection |
| PATCH | `/:id` | Admin | Update + re-run anomaly detection |
| DELETE | `/:id` | Admin | Soft delete + resolve linked anomalies |

**Query params:** `type`, `category`, `startDate`, `endDate`, `search`, `sortBy` (date/amount/createdAt), `sortOrder` (asc/desc), `page`, `limit`

### Dashboard (`/api/dashboard`)
| Method | Path | Access | Description |
|:-------|:-----|:-------|:------------|
| GET | `/summary` | Viewer+ | Total income, expenses, net balance, counts |
| GET | `/category-totals` | Viewer+ | Per-category income/expense breakdown |
| GET | `/trends` | Analyst+ | Weekly/monthly trends (raw SQL `DATE_TRUNC`) |
| GET | `/recent-activity` | Viewer+ | Last N transactions |

### Anomalies (`/api/anomalies`)
| Method | Path | Access | Description |
|:-------|:-----|:-------|:------------|
| GET | `/` | Analyst+ | List with filters (type, isResolved) |
| PATCH | `/:id/resolve` | Admin | Mark anomaly as resolved |

### SMS Ledger (`/api/sms-ledger`)
| Method | Path | Access | Description |
|:-------|:-----|:-------|:------------|
| POST | `/webhook` | API Key | Parse SMS, create transaction, detect anomalies |
| GET | `/logs` | Admin | View SMS parse history with status |

---

## Standardized Response Format

Every endpoint returns a consistent JSON structure:

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 67,
    "totalPages": 4
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "amount", "message": "Amount must be positive" }
    ]
  }
}
```

**HTTP status codes used:** 200, 201, 400, 401, 403, 404, 409, 429, 500

---

## Quick Start

### Prerequisites
- Node.js 20.19+ or 22+
- PostgreSQL 14+

### Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string

# Run migrations and generate Prisma client
npx prisma migrate dev --name init
npx prisma generate

# Seed demo data (4 users, 75+ transactions, anomaly detection)
npx prisma db seed

# Start development server
npm run dev
# Server: http://localhost:3000
# API docs: http://localhost:3000/api/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard: http://localhost:5173
```

### Demo Credentials

| Role | Email | Password | What to test |
|:-----|:------|:---------|:-------------|
| **Admin** | rahul@finault.com | Admin@123 | Full CRUD, all transactions, user management, anomaly resolution |
| **Analyst** | priya@finault.com | Analyst@123 | Own transactions only, trends chart, anomaly alerts (read-only) |
| **Viewer** | arjun@finault.com | Viewer@123 | Own transactions only, basic dashboard (no trends/anomalies) |
| **Inactive** | neha@finault.com | Inactive@123 | Login blocked — "Account is deactivated" |

---

## Scripts

```bash
# Backend (from /backend)
npm run dev              # Dev server with hot reload (tsx watch)
npm run build            # TypeScript compilation
npm run start            # Production server
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed demo data with anomaly detection
npm run db:studio        # Open Prisma Studio (visual DB browser)
npm run lint             # Type check (tsc --noEmit)

# Frontend (from /frontend)
npm run dev              # Vite dev server with HMR
npm run build            # Production build
```

---

## Assumptions & Design Tradeoffs

| Decision | Reasoning |
|:---------|:----------|
| In-memory rate limiter | Sufficient for single-server. Would use Redis for horizontal scaling |
| SMS parser uses regex | Handles 15+ Indian bank SMS formats. Production would use ML-based NER |
| Refresh tokens as SHA-256 | Not plaintext. Rotation on every use prevents replay attacks |
| Dashboard trends use raw SQL | Prisma's `groupBy` lacks `DATE_TRUNC`. Demonstrates SQL comfort when ORM falls short |
| First user becomes ADMIN | Simplifies bootstrap without separate admin creation flow |
| Non-admin data isolation | Users only see their own data at the service layer — not just hidden in UI |
| Soft deletes over hard deletes | Preserves audit trail; `deletedAt` indexed for query performance |
| Module-per-domain architecture | Each module owns its routes, controller, service, and validation — no cross-module imports |
