# TransitOps — Smart Transport Operations Platform

An end-to-end transport operations platform that digitizes vehicle, driver, dispatch, maintenance, and expense management while enforcing business rules and providing operational insights.

Built for the Odoo Hackathon (8-hour build).

## Tech Stack

- **Next.js 16** (App Router, Server Actions, TypeScript)
- **Tailwind CSS 4** — responsive, dark-mode-ready UI
- **SQLite + Prisma 6** — zero-setup database with typed schema
- **JWT session cookies (jose) + bcrypt** — secure email/password auth

## Quick Start

```bash
npm install
echo SESSION_SECRET=any-secret-here > .env
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000.

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
