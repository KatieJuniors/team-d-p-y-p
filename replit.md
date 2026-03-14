# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── coreinventory/      # COREINVENTORY React frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Application: COREINVENTORY

A full-stack Inventory Management System (IMS).

### Features
- JWT-based authentication (login, signup, OTP password reset)
- Role-based access: `manager` and `staff`
- Dashboard with KPI cards, stock distribution charts, low stock alerts
- Product management with categories, SKU, stock tracking
- Receipts (incoming goods) — increases stock on validate
- Delivery Orders (outgoing goods) — decreases stock on validate
- Internal Transfers — moves stock between locations
- Inventory Adjustments — corrects stock discrepancies
- Stock Ledger / Move History — full audit trail
- Warehouse Management — multiple warehouses with zones and rack locations

### Demo Accounts
- **Manager**: manager@coreinventory.com / password123
- **Staff**: staff@coreinventory.com / password123

### Database Schema
Tables: users, categories, warehouses, locations, products, receipts, receipt_items, deliveries, delivery_items, transfers, transfer_items, adjustments, stock_ledger

### API Routes
All routes under `/api/`:
- `/auth` — signup, login, forgot-password, verify-otp, me
- `/dashboard` — stats, stock-distribution, recent-operations, low-stock
- `/categories` — CRUD
- `/warehouses` — CRUD
- `/locations` — CRUD
- `/products` — CRUD with search/filter
- `/receipts` — CRUD + validate + cancel
- `/deliveries` — CRUD + validate + cancel
- `/transfers` — CRUD + validate + cancel
- `/adjustments` — CRUD + validate
- `/ledger` — read-only stock ledger

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for validation and `@workspace/db` for persistence.
- Auth: bcryptjs for password hashing, jsonwebtoken for JWT
- Run dev: `pnpm --filter @workspace/api-server run dev`

### `artifacts/coreinventory` (`@workspace/coreinventory`)
React + Vite frontend. Uses React Query, wouter routing, recharts, framer-motion, react-hook-form.
- Run dev: `pnpm --filter @workspace/coreinventory run dev`

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.
- Push schema: `pnpm --filter @workspace/db run push`
- Push force: `pnpm --filter @workspace/db run push-force`

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec + Orval codegen config.
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
