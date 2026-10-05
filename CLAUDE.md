# CLAUDE.md — context for AI assistants

Orientation for an AI (or new dev) working in `foodo-backend`. Keep it current
when conventions change.

## What this is

A modular food-delivery REST + realtime API. Node 20, ESM (`"type":
"module"`), Express 4. See `README.md` and `docs/ARCHITECTURE.md` for depth.

## Golden rules

- **ESM only.** Use `import`/`export`, include the `.js` extension in relative
  imports (e.g. `import x from "./x.js"`).
- **Layering:** `*.routes.js` → `*.controller.js` → `*.service.js`. Controllers
  are thin (HTTP in/out); all logic and DB access lives in services. Put
  `express-validator` rules in `*.validation.js`.
- **Responses:** always use `successResponse` / `errorResponse`
  (`src/utils/response.js`). Shape is `{ success, message, data|errors }`.
- **Errors:** in services, `throw { statusCode, message }`. Let the global
  handler (`src/middlewares/error.middleware.js`) format Prisma/JWT errors.
  Don't leak internals on 5xx in production.
- **Auth:** protect routes with `protect`, gate roles with `authorize(...)`.
  Tokens are httpOnly cookies — never return them in JSON.

## Where data lives (pick the right store)

- **PostgreSQL / Prisma** (`src/config/db.js`, `prisma/schema.prisma`): users,
  addresses, orders, delivery partners/assignments. Transactional + relational.
- **MongoDB / Mongoose** (`*.model.js`): restaurants (GeoJSON) and menus.
- **Redis** (`src/config/redis.js`): cart, OTP, reset tokens, refresh tokens,
  access-token blacklist, live partner location. Use the `setCache/getCache/
  deleteCache` helpers and the `TTL` constants — don't hardcode TTLs.
- Cross-store links are **id strings**, not FKs (e.g. `Order.restaurantId` is a
  Mongo `_id`). Keep consistency in app code.

## Important behaviours to preserve

- **Delivery OTP is generated on arrival at the customer**
  (`delivery.service.arriveAtCustomer`), NOT at placement or accept. It is
  short-lived (10 min), single-use (wiped on delivery), pushed to the customer
  over Socket.io (`delivery_otp`), and never returned to the partner. Don't move
  its generation earlier — see `docs/PRODUCTION_AUDIT.md` #1.
- **Payment verify must stay owner-scoped and state-guarded**, with a
  timing-safe signature compare (`payment.service.verifyPayment`).
- **Cancelling a paid order refunds it** via `refundOrderPayment`.
- Order status changes go through the transition map in
  `order.service.updateOrderStatus` — extend that map, don't bypass it.

## Tests

- `npm test` (Vitest + Supertest). DBs are mocked; no services needed.
- Mocks that a `vi.mock` factory references must be created with **`vi.hoisted`**
  (factories are hoisted above normal `const`s). See existing tests for the
  pattern. `tests/setup.js` seeds env vars required at import time.
- Add fast logic tests to `tests/unit/`, app-level tests to
  `tests/integration/`. Run `npm test` before claiming anything works.
- Full coverage matrix + what's still missing: `docs/TESTING.md`.

## Env & secrets

- Config comes from env (`.env.development` / `.env.production`, both
  git-ignored). The template is `.env.example`. Several third-party clients
  (Google OAuth, Resend, Cloudinary, Razorpay) are constructed at import time,
  so missing values fail at boot.

## CI/CD & deploy

- `.github/workflows/ci.yml`: test on push/PR → build & push Docker image to
  GHCR on default-branch push. Details in `docs/DEPLOYMENT.md`.
- Migrations are a manual/release step: `npm run prisma:deploy`.

## Known gaps (don't re-report as new)

Open items are tracked in `docs/PRODUCTION_AUDIT.md` (shared rate-limit store,
trusting cart totals, order-before-payment, binding Razorpay order+amount,
socket blacklist check, dropped `specialInstructions`, production logging).
Prefer fixing/extending those over inventing parallel solutions.

## Housekeeping

- `generate-signature.js` and `status.txt` at the repo root are dev/helper
  artifacts, not part of the running app.
- Three long-lived feature branches exist (`feature/admin`, `feature/delivery`,
  `feature/restaurant`) plus `master`. Confirm the intended base branch before
  branching.
