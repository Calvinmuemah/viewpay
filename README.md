# ViewPay - Rewarded Ads & Wallet Payouts SaaS Platform

A production-ready rewarded advertising platform where advertisers fund targeted ad campaigns and viewers/users earn money for watching ads and sponsored posts on mobile. Payout approvals and fraud monitors are handled inside a dedicated Super Admin control panel.

---

## Project Structure

```
ViewPay/
├── backend/                  # Node.js + Express API + PostgreSQL raw SQL queries
│   ├── sql/                  # DDL Schema and Initial Seed data scripts
│   ├── src/
│   │   ├── config/           # pg connection pool and winston logger settings
│   │   ├── controllers/      # Route controllers (auth, user, campaign, support, general)
│   │   ├── services/         # Transactional business logic (auth, reward logic, payouts)
│   │   ├── queries/          # Raw SQL queries registry mapped by domain
│   │   ├── routes/           # REST endpoints mapping
│   │   ├── middlewares/      # Security guards, JWT validation, and Rate Limiting
│   │   ├── validators/       # Request body schemas (express-validator)
│   │   ├── cron/             # node-cron scheduler for midnight budget resets
│   │   ├── utils/            # JWT generators and OTP helper functions
│   │   └── docs/             # Swagger UI documentation config
│   ├── Dockerfile
│   └── server.js
├── advertiser-dashboard/     # React + Vite + Tailwind Advertiser campaign portal
├── admin-dashboard/          # React + Vite + Tailwind Super Admin portal
├── company-website/          # React + Vite + Tailwind Landing & Pricing site
├── mobile/                   # Flutter + Material 3 mobile application
└── docker-compose.yml        # Orchestration file mapping Postgres database and Express API
```

---

## Tech Stack Overview

* **Backend**: Node.js, Express, PostgreSQL (raw SQL queries with parameterization), Nodemailer, Winston Logger, rate limiters, Helmet, CORS, and compression.
* **Advertiser Portal**: React, Vite, Tailwind CSS, Axios, Lucide Icons, Recharts dashboard.
* **Super Admin Portal**: React, Vite, Tailwind CSS, Axios, Lucide Icons.
* **Company Website**: React, Vite, Tailwind CSS, Lucide Icons, interactive reach calculators.
* **Mobile Client**: Flutter SDK, Material 3 layouts, Riverpod state, GoRouter navigation, Dio.

---

## Setup & Running Guide

### 1. Database & Docker Run (Recommended)
Launch the PostgreSQL database and backend API automatically using Docker Compose:
```bash
docker-compose up --build
```
This automatically initiates the database container and runs the schema and seed files inside `backend/sql/` to populate tables, FAQ entries, default game settings, achievements, and a mock admin account.

### 2. Manual Backend Dev Setup
If running locally:
1. Navigate to backend: `cd backend`
2. Install packages: `npm install`
3. Copy `.env.example` to `.env` and fill in local PG database credentials.
4. Run migrations: `npm run db:init`
5. Start dev server: `npm run dev` (running on `http://localhost:5000`)

### 3. Frontend Web Dashboards
To launch the Vite web servers:
* **Advertiser Portal**:
  1. `cd advertiser-dashboard`
  2. `npm install`
  3. `npm run dev` (will start on `http://localhost:3000`)
* **Super Admin Portal**:
  1. `cd admin-dashboard`
  2. `npm install`
  3. `npm run dev` (will start on `http://localhost:3001` - Default credentials: `admin` / `Admin@PayView2026`)
* **Company Website**:
  1. `cd company-website`
  2. `npm install`
  3. `npm run dev` (will start on `http://localhost:3002`)

### 4. Flutter Mobile Client
To compile the mobile viewer application:
1. `cd mobile`
2. Verify Flutter SDK: `flutter doctor`
3. Fetch dependencies: `flutter pub get`
4. Run in emulator/device: `flutter run`

---

## Security Features

1. **Brute Force Lock**: User and Advertiser accounts automatically lock for 15 minutes after 5 consecutive failed login attempts.
2. **Fraud Monitors**: Database queries check for multi-account farming (same IP footprint) and click-spamming bots (abnormally high CTR ratios with click counts > 80% view counts).
3. **Database Security**: Strictly parameterized raw SQL queries protect the platform against SQL Injections. No Object Relational Mappers (ORMs) are used.
4. **Transaction Integrity**: Ledger balance adjustments, campaign locks, and withdrawal approvals execute inside strict transaction queries to prevent race conditions.
