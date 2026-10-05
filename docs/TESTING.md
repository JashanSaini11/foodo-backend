# Testing

## Stack & philosophy

- **Vitest** (runner) + **Supertest** (HTTP assertions).
- The current suite is a **fast, dependency-free starter suite**: Postgres,
  MongoDB, Redis and Razorpay are all mocked at the module boundary, so
  `npm test` runs anywhere (including CI) with **no services running**.
- Unit tests target the highest-risk business logic. One integration test
  boots the real Express app (with DB/Redis mocked) to exercise middleware,
  routing and validation.

## Running

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage report (html + lcov in ./coverage)
```

## What is covered today (37 tests)

| File                              | Area            | Cases |
| --------------------------------- | --------------- | ----- |
| `tests/unit/jwt.test.js`          | JWT utils       | sign/verify round-trip, tampered token rejected, token-pair stored & validated, revoke invalidates, blacklist detected |
| `tests/unit/payment.test.js`      | Payments        | invalid signature rejected pre-DB, non-owner → 404, COD rejected, already-paid rejected, valid+owned → COMPLETED; refund no-ops for COD/unpaid, refunds paid order → REFUNDED, REFUNDED even if gateway throws |
| `tests/unit/order.test.js`        | Order lifecycle | valid/invalid status transitions, not-found; delivery-OTP: not-found, expired, wrong, success marks DELIVERED + COD paid |
| `tests/unit/delivery.test.js`     | Delivery arrival| no partner → 404, no active delivery → 404, arrival generates 4-digit OTP + stores future expiry + pushes to customer + never leaks OTP to partner |
| `tests/unit/cart.test.js`         | Cart math       | totals, qty increment, unavailable item, closed restaurant, cross-restaurant reset, empty cart, remove-to-empty, qty update recompute |
| `tests/integration/app.test.js`   | App wiring      | `/health` 200, 404 envelope, signup validation (bad email / weak password → 422), rate-limit headers |

### How the mocking works

- `vi.hoisted(...)` creates shared mock objects (the `vi.mock` factory is
  hoisted above normal `const`s, so referencing a plain `const` from the
  factory throws a TDZ error — use `vi.hoisted`).
- `src/config/redis.js` is replaced with an in-memory `Map` (it opens a real
  connection on import otherwise).
- `src/config/db.js` is replaced with a `prisma` object whose methods are
  `vi.fn()`.
- `tests/setup.js` seeds every env var the import chain needs (Google OAuth and
  Resend clients throw at import without them).

## Feature test matrix (target coverage)

Legend: ✅ covered · 🟡 partial · ⬜ not yet (needs live-integration tests).

### Auth (`/api/auth`)
| Scenario | Status |
| --- | --- |
| signup validation (name/email/password/phone rules) | ✅ |
| signup creates user + sends OTP, duplicate email → 409 | ⬜ |
| verify-email: correct/expired/wrong OTP | ⬜ |
| resend-otp: unknown user, already verified | ⬜ |
| login: bad creds, unverified, deactivated, Google-only account | ⬜ |
| refresh-token: valid, revoked, expired | 🟡 (jwt layer ✅) |
| logout: blacklists access + revokes refresh | 🟡 (jwt layer ✅) |
| forgot/reset password: token validity, revokes sessions | ⬜ |
| Google OAuth find-or-create / account linking | ⬜ |
| rate limiters (auth 10/15m, OTP 3/5m) | 🟡 (global limiter ✅) |

### Cart (`/api/cart`)
| Scenario | Status |
| --- | --- |
| add item, totals, qty increment | ✅ |
| unavailable item / closed restaurant | ✅ |
| cross-restaurant reset | ✅ |
| update/remove, empty handling | ✅ |
| TTL expiry behaviour | ⬜ |

### Orders (`/api/orders`)
| Scenario | Status |
| --- | --- |
| status transition rules | ✅ |
| delivery-OTP verify (expiry/wrong/success) | ✅ |
| place order: empty cart, foreign address, closed restaurant, min-order | ⬜ |
| cancel: only-PENDING rule + refund on paid order | 🟡 (refund unit ✅) |
| ownership scoping (can't read others' orders) | ⬜ |
| pagination | ⬜ |

### Payments (`/api/payments`)
| Scenario | Status |
| --- | --- |
| signature verify + ownership + state guards | ✅ |
| refund on cancel | ✅ |
| create order: COD rejected, already-paid rejected | 🟡 |

### Delivery (`/api/delivery`)
| Scenario | Status |
| --- | --- |
| register (role flip), duplicate | ⬜ |
| availability requires verification | ⬜ |
| accept delivery (transaction) | ⬜ |
| arrive at customer → OTP generated + pushed to customer | ✅ |
| location update, active delivery, history | ⬜ |

### Restaurant / Menu, Users/Addresses, Admin
| Scenario | Status |
| --- | --- |
| restaurant create/geo-search, menu CRUD, ownership | ⬜ |
| address CRUD + default handling | ⬜ |
| admin verify restaurant/partner, listings | ⬜ |

## Extending the suite

For live-integration tests of the ⬜ rows, add service containers to the CI
`test` job (Postgres/Mongo/Redis), point env at them, run
`prisma migrate deploy`, and seed fixtures. Keep these in
`tests/integration/` and the fast mocked tests in `tests/unit/` so the default
`npm test` stays quick. Prefer one assertion theme per `it`, and use
`vi.hoisted` for any mock the factory references.
