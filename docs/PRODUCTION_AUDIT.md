# Production Readiness Audit

_Reviewed: 2026-10-05 · Scope: `foodo-backend`_

Overall the backend is well-structured for its stage: clean modular layering,
consistent response envelope, validation, per-route rate limiting, JWT with
blacklist + refresh rotation, httpOnly cookies, Swagger docs, graceful
shutdown, and a sensible polyglot data split. The items below are what stood
between it and "production-grade". **Fixed** items were changed in this pass;
**Open** items are recommendations with no code change yet.

---

## Fixed in this pass

### 1. Delivery OTP expired before delivery (High — functional bug)
`order.service.placeOrder` generated the delivery OTP with a **5-minute**
expiry at **order placement**. Delivery happens 30+ minutes later, so
`verifyDeliveryOTP`'s expiry check would reject essentially every real
delivery.
**Fix:** the OTP is now generated **on arrival at the customer's door**
(`delivery.service.arriveAtCustomer`, `POST /api/delivery/orders/:orderId/
arrive`) with a short **10-minute** expiry, and pushed to the customer in
real-time via Socket.io (`delivery_otp`). It is single-use (wiped on delivery)
and never returned to the partner. Neither placement nor accept sets an OTP.
Covered by `tests/unit/order.test.js` (verify) and
`tests/unit/delivery.test.js` (arrival).

### 2. Payment verify didn't scope to the owner (High — security)
`payment.service.verifyPayment` updated the order by `orderId` from the request
body without confirming it belonged to the authenticated user or was still
unpaid. A valid signature for any Razorpay order could flip another user's
order to paid.
**Fix:** after signature verification it now loads the order scoped to
`userId`, rejects COD/already-paid orders, and only then updates. Signature
comparison is also now **timing-safe** (`crypto.timingSafeEqual`). Covered by
`tests/unit/payment.test.js`.

### 3. No refund when a paid order is cancelled (Medium — money)
Cancelling a `PENDING` order that had already been paid online left the money
captured and the order simply `CANCELLED`.
**Fix:** new `payment.service.refundOrderPayment` issues a best-effort Razorpay
refund and sets `paymentStatus = REFUNDED`; `cancelOrder` calls it. No-ops for
COD/unpaid orders. Covered by `tests/unit/payment.test.js`.

### 4. No global rate limiting (Medium — hardening)
Only auth routes were rate limited.
**Fix:** a coarse global limiter (300 req / 15 min / IP) now wraps `/api`, plus
`app.set("trust proxy", 1)` so limits key on the real client IP and `secure`
cookies work behind a TLS-terminating proxy.

### 5. 500 errors leaked internal messages (Low — info disclosure)
The global error handler returned `err.message` for everything.
**Fix:** in production, unexpected 5xx errors return a generic message; our
deliberate 4xx operational errors keep their friendly message.

### 6. No process-level crash handlers (Low — resilience)
**Fix:** `server.js` now handles `unhandledRejection` / `uncaughtException` by
logging and shutting down cleanly (a process manager restarts the container).

### 7. Missing ops scaffolding
Added: `Dockerfile` + `.dockerignore`, `.env.example`, Vitest test suite, and
GitHub Actions CI/CD (test → build & push image to GHCR). Also added
`engines.node >= 20` and `prisma:deploy`.

---

## Open recommendations (not yet changed)

### A. Rate-limit store is in-memory (High for multi-instance)
`express-rate-limit` defaults to per-process memory. With more than one
instance/replica, limits are per-pod and easily bypassed. Use a shared store
(`rate-limit-redis`) backed by the existing Redis before scaling horizontally.

### B. Order total is trusted from the Redis cart (Medium)
`placeOrder` trusts `cart.totalAmount`/`subtotal` computed when items were
added. Item prices are not re-validated against MongoDB at order time, so a
price change (or a stale cart) can produce a wrong charge. Recompute totals
from live `FoodItem` prices (and re-check availability) at placement.

### C. Online orders proceed before payment (Medium — business logic)
An order is created `PENDING` and visible to the restaurant regardless of
payment. For RAZORPAY/STRIPE, consider gating restaurant visibility/acceptance
on `paymentStatus = COMPLETED`, or auto-cancel unpaid online orders after a
timeout.

### D. `verifyPayment` doesn't bind the Razorpay order to our order (Medium)
The signature proves Razorpay generated the `razorpayOrderId`/`paymentId`
pair, but nothing stores which Razorpay order was created for which internal
order, nor re-checks the amount. Persist `razorpayOrderId` on the `Order` at
create-time and assert it (and the amount) during verify.

### E. Socket auth reads `accessToken` but skips the blacklist (Low)
`socket.js` verifies the JWT but doesn't consult the logout blacklist, so a
logged-out-but-unexpired token can still open a socket. Add the
`isTokenBlacklisted` check in the socket auth middleware.

### F. `specialInstructions` is accepted but dropped (Low)
`placeOrderRules` validates it and `placeOrder` destructures it, but there is no
column to store it. Add `specialInstructions String?` to the `Order` model (and
a migration) or stop accepting it.

### G. Structured/production logging (Low)
`morgan` runs only in development and logs are plain `console`. Add a
structured logger (pino/winston) with request ids and ship logs in production.

### H. Secrets & config hygiene (Low)
`.env.development` / `.env.production` are correctly git-ignored and not
tracked. Confirm production secrets live in the host's secret manager, rotate
the JWT secrets, and ensure access/refresh secrets differ.

### I. No automated DB migration step in deploy (Low)
Add `prisma migrate deploy` to the release process (documented in
`DEPLOYMENT.md`) so schema changes ship with the image.

---

## Quick severity summary

| # | Item | Severity | Status |
| - | ---- | -------- | ------ |
| 1 | Delivery OTP expiry | High | Fixed |
| 2 | Payment ownership scope | High | Fixed |
| 3 | Refund on cancel | Medium | Fixed |
| 4 | Global rate limit / trust proxy | Medium | Fixed |
| 5 | 500 message leak | Low | Fixed |
| 6 | Crash handlers | Low | Fixed |
| A | Shared rate-limit store | High (at scale) | Open |
| B | Trust cart totals | Medium | Open |
| C | Order before payment | Medium | Open |
| D | Bind Razorpay order + amount | Medium | Open |
| E | Socket blacklist check | Low | Open |
| F | Dropped specialInstructions | Low | Open |
| G | Production logging | Low | Open |
