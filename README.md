# Zorvyn Finance Dashboard

A fullstack finance dashboard system with role-based access control, real-time anomaly detection, and SMS auto-ledger capabilities.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh tokens) + bcrypt |
| Validation | Zod (TypeScript-native) |
| Frontend | React + Vite + TypeScript + Tailwind CSS + Recharts |
| Real-time | Socket.io |
| API Docs | Swagger/OpenAPI |

## Architecture

```
backend/src/
├── config/          # Database, env validation, Socket.io, Swagger
├── modules/         # Domain-driven modules
│   ├── auth/        # JWT auth, register/login/refresh/logout
│   ├── users/       # User CRUD, role management
│   ├── transactions/# Financial records CRUD with filtering
│   ├── dashboard/   # Summary, trends, category analytics
│   ├── anomaly/     # 3-strategy anomaly detection engine
│   └── sms-ledger/  # SMS parsing, webhook, auto-categorization
├── middleware/      # Auth, RBAC, validation, rate limiting, error handling
└── shared/          # Types, utilities, constants
```

Each module is self-contained with its own controller, service, routes, and validation — demonstrating clear separation of concerns.

## Features

### Core
- **User & Role Management** — CRUD with VIEWER / ANALYST / ADMIN roles
- **Financial Records** — Full CRUD with filtering, pagination, search, soft delete
- **Dashboard Analytics** — Income/expense summaries, category breakdowns, monthly trends (raw SQL)
- **Role-Based Access Control** — Permission-based middleware (not just role checks)
- **Input Validation** — Zod schemas on every endpoint with structured error responses

### Security
- JWT access tokens (15min) + refresh token rotation (7d)
- Account lockout after 5 failed login attempts (15min)
- Refresh token reuse detection
- Password strength enforcement (uppercase, number, special char)
- Rate limiting (global, auth-specific, webhook-specific)
- API key authentication for webhooks (SHA-256 hashed, timing-safe comparison)
- Helmet security headers + CORS whitelist
- Audit logging table for sensitive operations

### Advanced
- **Anomaly Detection Engine** — Three strategies:
  1. **Category Spike** — Flags amounts > avg + 2σ for the category
  2. **Duplicate Detection** — Same amount/category/type within 5 minutes
  3. **Unusual Frequency** — Daily count > 3x the 30-day average
- **SMS Auto-Ledger** — Webhook receives forwarded bank SMS, parses amount/type/merchant/date via regex, auto-categorizes using merchant keyword map, creates transaction, triggers anomaly detection
- **Real-time Dashboard** — Socket.io pushes live updates on new transactions and anomalies

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (or use `npx prisma dev` for local Prisma Postgres)

### Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets

# Start local Prisma Postgres (if no external PostgreSQL)
npx prisma dev

# In another terminal — run migrations and seed
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Access

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Frontend dashboard |
| http://localhost:3000/api/docs | Swagger API documentation |
| http://localhost:3000/api/health | Health check |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@zorvyn.com | Admin@123 |
| Analyst | analyst@zorvyn.com | Analyst@123 |
| Viewer | viewer@zorvyn.com | Viewer@123 |

## API Endpoints (28 total)

### Auth (`/api/auth`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /register | Public | Register (first user → ADMIN) |
| POST | /login | Public | Login with credentials |
| POST | /refresh | Public | Rotate tokens |
| POST | /logout | Auth | Invalidate refresh token |
| GET | /me | Auth | Current user profile |

### Users (`/api/users`) — Admin only
| Method | Path | Description |
|--------|------|-------------|
| GET | / | List users (paginated, searchable) |
| GET | /:id | Get user detail |
| POST | / | Create user |
| PATCH | /:id | Update role/status |
| DELETE | /:id | Soft delete |

### Transactions (`/api/transactions`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | / | Viewer+ | List with filters & pagination |
| GET | /:id | Viewer+ | Get detail |
| POST | / | Admin | Create (triggers anomaly detection) |
| PATCH | /:id | Admin | Update |
| DELETE | /:id | Admin | Soft delete |

**Filters:** `type`, `category`, `startDate`, `endDate`, `search`, `sortBy`, `sortOrder`

### Dashboard (`/api/dashboard`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /summary | Viewer+ | Income, expenses, net balance |
| GET | /category-totals | Viewer+ | Category breakdown |
| GET | /trends | Analyst+ | Monthly/weekly trends |
| GET | /recent-activity | Viewer+ | Last N transactions |

### Anomalies (`/api/anomalies`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | / | Analyst+ | List anomalies |
| PATCH | /:id/resolve | Admin | Mark as resolved |

### SMS Ledger (`/api/sms-ledger`)
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /webhook | API Key | Receive & parse bank SMS |
| GET | /logs | Admin | View parse history |

**SMS Webhook Example:**
```bash
curl -X POST http://localhost:3000/api/sms-ledger/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: zorvyn-sms-api-key-dev-only" \
  -d '{"message": "Rs.500.00 debited from A/c XX1234 on 15-Mar-25 to UPI/Swiggy. Bal: Rs.12,450.50", "sender": "HDFCBK"}'
```

## Standardized API Response

```json
// Success
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

## Database Schema

7 tables: `users`, `refresh_tokens`, `transactions`, `anomalies`, `sms_logs`, `audit_logs`

Key design decisions:
- `Decimal(12,2)` for monetary amounts (never float)
- `deletedAt` nullable field for soft deletes with index
- Composite index `[userId, category, date]` for dashboard aggregation queries
- Separate `anomalies` table (not flags) — supports multiple anomalies per transaction and resolution tracking
- `sms_logs` with one-to-one link to transactions for audit trail

## Assumptions & Tradeoffs

1. **In-memory rate limiter** — Sufficient for single-server deployment. Would use Redis store for horizontal scaling.
2. **SMS parser uses regex** — Handles 15+ Indian bank SMS formats. A production system would use ML-based NER.
3. **Refresh token stored as SHA-256 hash** — Not plaintext. Rotation on every use prevents replay attacks.
4. **Dashboard trends use raw SQL** — Prisma's `groupBy` cannot do `DATE_TRUNC`. This demonstrates comfort with SQL when ORM falls short.
5. **First registered user becomes ADMIN** — Simplifies initial setup without requiring separate admin creation flow.
6. **Non-admin users see only their own transactions** — Data isolation by design.

## Scripts

```bash
# Backend
npm run dev          # Development server with hot reload
npm run build        # TypeScript compilation
npm run start        # Production server
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
npm run lint         # Type check
npm run test         # Run tests

# Frontend
npm run dev          # Vite dev server
npm run build        # Production build
```
