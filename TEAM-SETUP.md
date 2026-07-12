# TransitOps — Team Setup & Commit Guide

## What's in this zip
The full project source WITHOUT: `.git` history, `node_modules`, build output, and secrets (`.env`).

## Run it locally
1. Install Node.js 20+ and PostgreSQL.
2. In psql (as postgres user):
   ```sql
   CREATE ROLE transitops_app LOGIN PASSWORD 'your-password' CREATEDB;
   CREATE DATABASE transitops OWNER transitops_app;
   ```
3. In the project folder:
   ```
   npm install
   copy .env.example .env    (edit DATABASE_URL with your password; set any SESSION_SECRET)
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   npm run dev
   ```
4. Open http://localhost:3000 — login: manager@transitops.com / password123

## Committing your part
1. Clone the team repository (do NOT unzip on top of it blindly).
2. Copy YOUR assigned files from this zip into the clone.
3. `git add <your files>` → `git commit -m "..."` → `git push` from YOUR account.
4. Coordinate order with the team so each commit builds on the previous one.

Suggested file split (keeps each commit coherent):
- Member 1: `prisma/` + `src/lib/` (schema, business rules, auth)
- Member 2: `src/app/(app)/` + `src/components/` (UI pages)
- Member 3: `src/app/api/` + `src/app/track/` + `src/app/login/` (API + public pages)
- Member 4: config files, `README.md`, `docs/`
