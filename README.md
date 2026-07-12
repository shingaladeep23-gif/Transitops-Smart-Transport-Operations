# TransitOps — Smart Transport Operations Platform

An end-to-end transport operations platform that digitizes vehicle, driver, dispatch, maintenance, and expense management while enforcing business rules and providing operational insights.

Built for the Odoo Hackathon (8-hour build).

## Tech Stack

- **Next.js 16** (App Router, Server Actions, TypeScript)
- **Tailwind CSS 4** — responsive, dark-mode-ready UI
- **PostgreSQL + Prisma 6** — relational schema with enums, indexes on hot query paths, and a least-privilege application role
- **JWT session cookies (jose) + bcrypt** — secure email/password auth with login rate limiting

## Quick Start

Requires PostgreSQL. Create a database and role, then:

```sql
CREATE ROLE transitops_app LOGIN PASSWORD 'your-password' CREATEDB;
CREATE DATABASE transitops OWNER transitops_app;
```

```bash
npm install
copy .env.example .env   # then edit DATABASE_URL + SESSION_SECRET
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

## REST API (v1)

First-party JSON API — same session auth, RBAC and business rules as the UI. All list endpoints support `?page=&limit=` pagination (limit ≤ 100).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/kpis` | Live fleet KPIs (vehicle/driver/trip counts, utilization %) |
| GET | `/api/v1/vehicles` | List vehicles — filters: `status`, `type`, `region`, `q` |
| POST | `/api/v1/vehicles` | Register a vehicle (Fleet Manager role) |
| GET | `/api/v1/drivers` | List drivers — filters: `status`, `q` |
| POST | `/api/v1/drivers` | Register a driver (Fleet Manager / Safety Officer) |
| GET | `/api/v1/trips` | List trips — filter: `status` |
| POST | `/api/v1/trips` | Create a draft trip — enforces all dispatch business rules (422 on violation) |
| GET | `/api/reports/csv` | Vehicle report as CSV |

Errors return `{ "error": "message" }` with proper status codes (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 duplicate, 422 business-rule violation).

## Architecture & Engineering Practices

- **Database design** — normalized 8-entity relational schema (PostgreSQL), native enums for all statuses, unique constraints on registration/license numbers, composite indexes on every hot query path (`Trip(vehicleId,status)`, `Vehicle(status)`, `FuelLog(vehicleId,date)`, …).
- **Modularity** — clear layering: `lib/actions` (write operations + business rules), `lib/tripRules.ts` (shared rule engine used by both UI actions and REST API), `lib/reports.ts` (analytics), `app/api/v1` (REST), `components` (UI primitives).
- **Security** — bcrypt password hashing, httpOnly/sameSite JWT cookies, RBAC enforced server-side on every write, login rate limiting (10 attempts / 15 min), security headers (X-Frame-Options, nosniff, referrer & permissions policies), least-privilege DB role, secrets only in gitignored `.env`.
- **Input validation** — every server action and API endpoint validates types, ranges and enums server-side; the UI additionally pre-filters (e.g. only dispatchable vehicles/drivers in dropdowns) but the server is the source of truth.
- **Real-time data** — every screen renders live from PostgreSQL (no static JSON anywhere); the dashboard and customer tracking page auto-refresh (15s / 20s); all status transitions are transactional so reads are always consistent.
- **Scalability** — stateless app (horizontal scaling ready), paginated APIs, indexed queries, singleton Prisma connection pool; the rate limiter is the only in-memory piece and is documented for a Redis swap.

## Demo Accounts

Password for all accounts: `password123`

| Email | Role |
|---|---|
| manager@transitops.com | Fleet Manager |
| driver@transitops.com | Dispatcher / Driver |
| safety@transitops.com | Safety Officer |
| finance@transitops.com | Financial Analyst |

## Features

### Mandatory deliverables
- **Authentication with RBAC** — login required everywhere; write permissions scoped per role (Fleet Manager → vehicles & maintenance, Safety Officer → drivers, Dispatcher → trips, Financial Analyst → fuel & expenses). All roles have read access.
- **Dashboard with KPIs** — active/available/in-maintenance vehicles, fleet utilization %, active & pending trips, drivers on duty; filterable by vehicle type, status, and region. Includes a License Watch panel for licenses expiring within 60 days.
- **Vehicle Registry** — unique registration number, model, type, max load capacity, odometer, acquisition cost; statuses: Available / On Trip / In Shop / Retired.
- **Driver Management** — license number, category, expiry, contact, safety score; statuses: Available / On Trip / Off Duty / Suspended.
- **Trip Management** — full lifecycle Draft → Dispatched → Completed / Cancelled with server-side validation. Completing a trip records final odometer + fuel, updates the vehicle odometer, and auto-creates a fuel log.
- **Maintenance workflow** — opening a log automatically moves the vehicle to In Shop (removed from dispatch pool); closing it restores availability.
- **Fuel & Expense tracking** — fuel logs (liters, cost, date) and other expenses (tolls, repairs, etc.), with total operational cost per vehicle.
- **Reports & Analytics** — per-vehicle fuel efficiency (km/L), fleet utilization, operational cost, and ROI = (Revenue − (Maintenance + Fuel)) ÷ Acquisition Cost. **CSV export** included.

### Bonus features
- **Charts & visual analytics** — operational cost and fuel efficiency bar charts on the Reports page (dependency-free, dark-mode aware).
- **PDF export** — print-optimized Reports page with an Export PDF button.
- **Dark mode** — toggle persisted across sessions, with no flash on load.
- **Search & sorting** — server-side search on Vehicles, Drivers and Trips; sort by odometer/capacity/cost, safety score, or license expiry.
- **License Watch** — dashboard panel flags licenses expiring within 60 days.

### Beyond the brief: driver & customer features
- **Public customer tracking link** (`/track/TRP-0001`) — no login needed; customers see a status timeline (Created → In Transit → Delivered), route, vehicle and driver first name. One-click "Copy tracking link" on every trip card. Exposes no phone numbers, license data or financials.
- **Proof of Delivery** — trip completion captures receiver name and delivery note, shown in trip history and on the customer tracking page.
- **Pre-dispatch vehicle check (DVIR-lite)** — dispatching requires confirming brakes, tires, lights and documents; the confirmation is stored on the trip as an audit record.

### Business rules enforced (server-side, transactional)
1. Vehicle registration numbers are unique.
2. Retired / In Shop vehicles never appear in dispatch selection.
3. Drivers with expired licenses or Suspended status cannot be assigned to trips.
4. A driver or vehicle already On Trip cannot be double-booked.
5. Cargo weight must not exceed the vehicle's max load capacity.
6. Dispatching sets vehicle + driver to On Trip; completing or cancelling restores both to Available.
7. Opening maintenance sets the vehicle to In Shop; closing restores it to Available (unless retired).

All transitions run inside Prisma transactions in a single service layer (`src/lib/actions/`), so statuses can never drift — the UI pre-filters dropdowns, and the server re-validates everything.

## Project Structure

```
src/
├── app/
│   ├── (app)/            # Authenticated pages (dashboard, trips, vehicles, ...)
│   ├── api/reports/csv/  # CSV export endpoint
│   └── login/
├── components/           # ActionForm, UI primitives, nav
├── lib/
│   ├── actions/          # Server actions: auth, vehicles, drivers, trips, maintenance, finance
│   ├── auth.ts           # Session + RBAC
│   ├── db.ts             # Prisma client
│   └── reports.ts        # Analytics computation
├── proxy.ts              # Auth gate (Next 16 middleware)
└── prisma/               # Schema, migrations, seed
```
