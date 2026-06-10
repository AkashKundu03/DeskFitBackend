# DeskFit — Local Development Guide

How to run the **backend** and point the **iOS app** at it locally, **without ever
touching production**.

Production (VPS, `docker-compose.yml`, `.env.production`) is completely separate
from everything here. Nothing in this guide deploys, pushes, or modifies the
server.

---

## TL;DR — start the backend locally

```bash
cd desk-fit-backend

# 1. Create your local env file from the template (first time only)
cp .env.local.example .env.local

# 2. Start the local Postgres (docker), published on localhost:5432
npm run db:local:up

# 3. Install deps + generate Prisma client + apply migrations (first time only)
npm install
npm run prisma:generate
npm run prisma:migrate:deploy

# 4. Run the API in watch mode
npm run start:dev

# 5. Verify
curl http://localhost:3000/health
# → {"status":"ok","app":"DeskFit","timestamp":"..."}
```

> Steps 2–3 are bundled in one helper: `npm run local:setup` (then `npm run start:dev`).

---

## 1. How to run the backend locally

The API runs **natively on your Mac** (not in Docker) via `npm run start:dev`
(NestJS watch mode). Only **Postgres** runs in Docker locally. The API reaches
Postgres over the published host port `localhost:5432`.

Env loading precedence (wired in `app.module.ts` and `prisma.config.ts`):
**`.env.local` → `.env`**. So `.env.local` (git-ignored, local-only) overrides
`.env`. In production neither file exists in the container — Docker injects env
vars directly — so this wiring is a no-op on the server.

## 2. How to start local Postgres

```bash
npm run db:local:up      # docker compose -f docker-compose.local.yml --env-file .env.local up -d postgres
npm run db:local:logs    # tail the postgres logs
npm run db:local:down    # stop the container (SAFE — keeps your data volume)
```

- Local DB data lives in the Docker volume `deskfit_local_pgdata` (project
  `deskfit-local`). It is **separate** from production.
- ⚠️ **Never** run `docker compose ... down -v` or `docker volume rm` here unless
  you intend to wipe your local dev data. Never run these against production.

## 3. How to run Prisma locally

```bash
npm run prisma:generate        # regenerate the Prisma client after schema edits
npm run prisma:migrate:deploy  # apply existing migrations to the local DB
```

To create a **new** migration during local feature work:

```bash
npx prisma migrate dev --name your_change
```

> `migrate dev` is fine **locally**. Never run `prisma migrate reset` (it drops
> data) and never run any migration command against production from here.

## 4. How to test /health

```bash
curl http://localhost:3000/health
# → {"status":"ok","app":"DeskFit","timestamp":"..."}
```

## 5. How to configure the iOS Simulator API URL

Nothing to do — it's automatic. In the iOS app, `DeskFit/Services/AppConfig.swift`
resolves the base URL by build configuration:

- **DEBUG + Simulator → `http://localhost:3000`** (reaches your Mac's local backend).

Just run the backend locally, then run the app on the Simulator.

## 6. How to configure a real iPhone for the local API

A real iPhone's `localhost` is the **iPhone itself**, not your Mac — so you must
use your Mac's **LAN IP**.

1. Put the iPhone and Mac on the **same Wi-Fi**.
2. Find your Mac's LAN IP:
   ```bash
   ipconfig getifaddr en0     # Wi-Fi (try en1 if en0 is empty)
   ```
3. Open `DeskFit/Services/AppConfig.swift` and edit the **one** marked line:
   ```swift
   static let macLANIP = "192.168.1.100"   // ← put your Mac's IP here
   ```
4. Run the app on the device in **Debug**. It will call `http://<macLANIP>:3000`.

Notes:
- The app's `Info.plist` already allows plain-HTTP (`NSAllowsArbitraryLoads`), so
  HTTP to your LAN IP works for testing.
- If the device can't connect, check your Mac firewall isn't blocking port 3000.

## 7. How to switch back to production / TestFlight

No code change needed — it's by build configuration:

- **Release / TestFlight / App Store builds → production** (`http://45.195.159.233:3000`)
  automatically. `#if DEBUG` selects local; everything else selects production, so
  a Release build can never accidentally hit localhost.
- The `macLANIP` value only affects **Debug builds on a real device**; it is
  ignored by Release builds.

## 8. Common mistakes

- **iPhone `localhost` ≠ Mac `localhost`.** On a real device you must use your
  Mac's LAN IP (`AppConfig.macLANIP`). Simulator can use `localhost`.
- **Do not use the production server for local experiments.** Point local builds
  at your local backend; leave production for Release/TestFlight.
- **Never run `docker compose down -v` (or `docker volume rm`) on production** —
  it deletes the database volume. Even locally, `-v` wipes your local dev DB.
- **Never edit `.env.production` from local dev.** Local config goes in `.env.local`.
- **Don't commit `.env.local`** — it's git-ignored on purpose. Commit only
  `.env.local.example`.

## 9. Coach engine endpoints (deterministic — no AI, no auth, no DB writes)

These public endpoints power the Today dashboard, nutrition cards, and planner.
They are stateless and safe to curl locally:

```bash
B=http://localhost:3000

# Nutrition + fat-loss targets (75 kg → 65 kg in 4 months)
curl -s -X POST $B/coach/calculate-targets -H "Content-Type: application/json" \
  -d '{"age":31,"gender":"male","heightCm":178,"weightKg":75,"targetWeightKg":65,"activityLevel":"sedentary","goal":"fatLoss","timelineMonths":4}'

# Full Today dashboard for a demo persona
curl -s "$B/coach/today?profile=inconsistent-missed-two"

# Generate a workout
curl -s -X POST $B/workouts/generate -H "Content-Type: application/json" \
  -d '{"location":"home","durationMin":30,"equipment":["dumbbells"],"focus":"strength","level":"intermediate"}'

# Missed-workout adaptation
curl -s -X POST $B/workouts/adjust-week -H "Content-Type: application/json" \
  -d '{"strategy":"rebalance","missedWeekday":"Fri"}'

# Demo / sample profiles
curl -s $B/demo/sample-profiles
curl -s $B/nutrition/targets
```

> No Prisma migration is required for the coach engine — it computes from inputs
> and the local dataset, and never writes to the database.
