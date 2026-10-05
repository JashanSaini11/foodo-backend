# Foodo Backend

A modular food-delivery API (Swiggy/Zomato-style) built with **Express**, a
**polyglot data layer** (PostgreSQL + MongoDB + Redis), **Socket.io** for
real-time tracking, and JWT cookie auth with Google OAuth.

> New here? Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the big
> picture, [`docs/TESTING.md`](docs/TESTING.md) for the test strategy, and
> [`docs/PRODUCTION_AUDIT.md`](docs/PRODUCTION_AUDIT.md) for the current
> production-readiness status and known gaps.

---

## Tech stack

| Concern              | Choice                                             |
| -------------------- | -------------------------------------------------- |
| Runtime              | Node.js 20 (ESM, `"type": "module"`)               |
| Web framework        | Express 4                                          |
| Relational store     | PostgreSQL via **Prisma** (users, orders, delivery)|
| Document store       | MongoDB via **Mongoose** (restaurants, menus)      |
| Cache / ephemeral     | **Redis** (OTP, cart, token blacklist, refresh)    |
| Realtime             | Socket.io (order + delivery tracking)              |
| Auth                 | JWT (httpOnly cookies) + Passport Google OAuth     |
| Payments             | Razorpay                                           |
| Email                | Resend                                             |
| Image uploads        | Cloudinary                                         |
| API docs             | Swagger (`/api/docs`)                              |
| Tests                | Vitest + Supertest                                 |

## Why three databases?

- **PostgreSQL** holds relational, transactional data that needs integrity:
  users, addresses, orders, delivery partners/assignments.
- **MongoDB** holds flexible, nested catalog data: restaurants (with GeoJSON
  for `$near` geo queries) and menus.
- **Redis** holds fast, expiring data: the active cart, email OTPs, password
  reset tokens, refresh-token records, and the access-token blacklist.

Cross-store links are by id string (e.g. `Order.restaurantId` in Postgres
points at a MongoDB `_id`). See the audit doc for the trade-offs.

---

## Quick start (local)

```bash
# 1. Install deps
npm install

# 2. Create your env file from the template
cp .env.example .env.development     # then fill in real values

# 3. Start the datastores (Postgres, Mongo, Redis)
docker compose up -d

# 4. Apply the database schema
npm run prisma:generate
npm run prisma:migrate

# 5. Run the API (watch mode)
npm run dev
```

Then open:

- Health check → <http://localhost:5000/health>
- API docs → <http://localhost:5000/api/docs>

`docker-compose.yml` reads `POSTGRES_*`, `MONGO_*`, and `REDIS_PASSWORD` from
your env file, so keep the datastore credentials there consistent with
`DATABASE_URL` / `MONGODB_URI`.

---

## NPM scripts

| Script                    | Does                                           |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Start with nodemon (auto-reload)               |
| `npm start`               | Start for production                           |
| `npm test`                | Run the Vitest suite once                      |
| `npm run test:watch`      | Vitest watch mode                              |
| `npm run test:coverage`   | Run tests with a coverage report               |
| `npm run prisma:generate` | Regenerate the Prisma client                   |
| `npm run prisma:migrate`  | Create/apply a dev migration                   |
| `npm run prisma:deploy`   | Apply migrations in production (no prompts)    |
| `npm run prisma:studio`   | Open Prisma Studio                             |

---

## Environment variables

Every variable is documented in [`.env.example`](.env.example). Required
groups: server, PostgreSQL, MongoDB, Redis, JWT, Google OAuth, Resend,
Cloudinary, Google Maps, Razorpay. The app reads env at import time, so a
missing OAuth/Resend value will fail fast at boot.

Generate JWT secrets with `openssl rand -hex 32` (use **different** values for
access and refresh).

---

## Project layout

```
server.js                 # boot: connect DBs → create http server → sockets
src/
  app.js                  # express app: middleware, routes, error handlers
  config/                 # db, redis, passport, socket, swagger, cloudinary
  middlewares/            # protect/authorize, error handler, uploads
  modules/                # feature modules (see below)
    auth/  user/  restaurant/  order/  delivery/  admin/
  routes/index.js         # mounts every module router under /api
  utils/                  # jwt, response envelope, email
prisma/schema.prisma      # PostgreSQL schema + migrations
tests/                    # vitest unit + integration tests
```

Each module follows the same shape: `*.routes.js` → `*.controller.js` →
`*.service.js` (+ `*.validation.js`, and `*.model.js` for Mongo-backed
modules). Controllers stay thin; business logic lives in services.

---

## Testing

```bash
npm test
```

37 tests cover the highest-risk logic (JWT, payment signature + refunds, order
state machine, delivery-OTP arrival + verify, cart math, and app middleware/
validation) with the databases mocked, so the suite runs anywhere with no
services. The full
feature-by-feature test matrix (including what still needs live-integration
coverage) is in [`docs/TESTING.md`](docs/TESTING.md).

---

## Docker & deployment

Build and run the production image:

```bash
docker build -t foodo-backend .
docker run --env-file .env.production -p 5000:5000 foodo-backend
```

CI builds this image and pushes it to **GitHub Container Registry** on every
push to the default branch. Full deployment steps (migrations, image tags,
runtime env) are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## CI/CD

`.github/workflows/ci.yml`:

1. **Lint & Test** — on every push/PR: `npm ci` → `prisma generate` → `npm test`.
2. **Build & Push Image** — on push to `main`/`master` after tests pass: build
   the Docker image and push to `ghcr.io/<owner>/<repo>`.

The frontend has its own `foodo-frontend/.github/workflows/ci.yml` (lint +
Next.js build).
