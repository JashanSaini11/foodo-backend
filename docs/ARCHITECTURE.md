# Architecture

## Boot sequence

`server.js` is the entry point:

1. Load env (`dotenv/config`).
2. `connectPostgres()` (Prisma `$connect`) and `connectMongoDB()` (Mongoose).
   Either failing exits the process.
3. Redis connects automatically when `src/config/redis.js` is imported.
4. Wrap the Express app in `http.createServer` so Socket.io can share the port.
5. `initSocket(httpServer)` attaches Socket.io.
6. Listen on `PORT`.
7. Register `SIGTERM`/`SIGINT` graceful shutdown and `unhandledRejection` /
   `uncaughtException` crash handlers.

`src/app.js` builds the Express app: `trust proxy` → helmet → global rate
limiter (`/api`) → CORS → body parsers → cookie-parser → Passport →
`/health` → Swagger (`/api/docs`) → `/api` routes → `notFound` → `errorHandler`.

## Data layer (polyglot)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ PostgreSQL  │     │   MongoDB    │     │    Redis    │
│ (Prisma)    │     │  (Mongoose)  │     │  (ioredis)  │
├─────────────┤     ├──────────────┤     ├─────────────┤
│ User        │     │ Restaurant   │     │ cart:<uid>  │
│ Address     │     │ MenuCategory │     │ otp:<email> │
│ Order       │     │ FoodItem     │     │ reset_token │
│ Delivery*   │     │ (GeoJSON)    │     │ refresh_tkn │
└─────────────┘     └──────────────┘     │ blacklist:* │
                                          └─────────────┘
```

**Cross-store references are by string id, not foreign keys.** For example
`Order.restaurantId` (Postgres) stores a MongoDB restaurant `_id`. Order
listing enriches Postgres rows with restaurant names fetched from MongoDB in a
second query (`order.service.js`). There is no DB-level integrity between the
stores — the application is responsible for consistency.

### PostgreSQL models (`prisma/schema.prisma`)

- `User` — auth identity, role (`USER | RESTAURANT_OWNER | DELIVERY_PARTNER |
  ADMIN`), provider (`LOCAL | GOOGLE`), verification/active flags, refresh token.
- `Address` — belongs to a user; has lat/lng; cascades on user delete.
- `Order` — user + address + `restaurantId` (Mongo id); status, amounts,
  payment fields, delivery OTP, estimated time.
- `DeliveryPartner` — 1:1 with a user; vehicle, availability, verification,
  location, earnings/stats.
- `DeliveryAssignment` — 1:1 with an order; links the order to a partner.

### MongoDB collections

- `Restaurant` — basic info, address, **GeoJSON `location` with a `2dsphere`
  index** for `$near` queries, timings, delivery settings, ratings, status.
- `MenuCategory` / `FoodItem` — menu tree; items carry price, veg flag,
  availability, customizations.

### Redis keys (`src/config/redis.js`)

| Key pattern            | TTL        | Purpose                        |
| ---------------------- | ---------- | ------------------------------ |
| `cart:<userId>`        | 30 min     | Active cart                    |
| `otp:<email>`          | 5 min      | Email verification OTP         |
| `reset_token:<token>`  | 15 min     | Password reset                 |
| `refresh_token:<uid>`  | 7 days     | Valid refresh token per user   |
| `blacklist:<token>`    | token life | Logged-out access tokens       |
| `partner_location:<id>`| 5 min      | Live partner location          |

## Modules

All routers mount under `/api` (`src/routes/index.js`):

| Base path             | Module      | Highlights                                   |
| --------------------- | ----------- | -------------------------------------------- |
| `/api/auth`           | auth        | signup+OTP, login, refresh, logout, Google, reset |
| `/api/users`          | user        | profile                                      |
| `/api/users/addresses`| address     | CRUD addresses                               |
| `/api/restaurants`    | restaurant  | restaurant + nested menu routes              |
| `/api/cart`           | cart        | Redis-backed cart                            |
| `/api/orders`         | order       | place/track/cancel + restaurant status flow  |
| `/api/payments`       | payment     | Razorpay create/verify/refund                |
| `/api/delivery`       | delivery    | partner lifecycle + assignments              |
| `/api/admin`          | admin       | admin operations                             |

## Authentication flow

- **Tokens live in httpOnly cookies** (`accessToken`, `refreshToken`); the
  frontend never reads them from JS.
- `protect` middleware reads `accessToken` from the cookie, checks the Redis
  blacklist, then verifies it via the Passport JWT strategy (which it feeds
  through a temporary `Authorization` header).
- `authorize(...roles)` gates routes by `req.user.role`.
- **Refresh**: `refresh_token:<uid>` in Redis is the source of truth. Logout
  blacklists the access token and revokes the stored refresh token. Password
  reset also revokes refresh tokens (logs the user out everywhere).
- **Google OAuth**: Passport finds-or-creates the user and links Google to an
  existing email account.

## Order lifecycle (state machine)

```
PENDING ─▶ ACCEPTED ─▶ PREPARING ─▶ READY_FOR_PICKUP ─▶ OUT_FOR_DELIVERY ─▶ DELIVERED
   │                                      (partner accepts)                    ▲
   ├─▶ REJECTED (restaurant)                                                   │
   └─▶ CANCELLED (user, only while PENDING)         delivery OTP verified ─────┘
```

- The restaurant drives `PENDING → ACCEPTED → PREPARING → READY_FOR_PICKUP`
  (`order.service.updateOrderStatus`, transitions enforced server-side).
- A delivery partner accepting a `READY_FOR_PICKUP` order moves it to
  `OUT_FOR_DELIVERY` (`delivery.service.acceptDelivery`). **No OTP yet.**
- When the partner reaches the customer's door they call
  `delivery.service.arriveAtCustomer` (`POST /api/delivery/orders/:orderId/
  arrive`), which generates a fresh **10-minute, single-use** OTP, stores it
  on the order, and **pushes it to the customer in real-time** via Socket.io
  (`delivery_otp` event). The OTP is never returned to the partner.
- The customer reads the OTP to the partner, who submits it
  (`order.service.verifyDeliveryOTP`) to mark the order `DELIVERED`; COD
  orders are marked paid here and the OTP is wiped.
- A user can only cancel while `PENDING`; a paid online order triggers a
  Razorpay refund (`payment.service.refundOrderPayment`).

## Payments (Razorpay)

1. `POST /api/payments/create` — server creates a Razorpay order for the amount.
2. Frontend runs Razorpay checkout.
3. `POST /api/payments/verify` — server recomputes the HMAC-SHA256 signature
   (timing-safe compare), confirms the order belongs to the caller and is still
   unpaid, then marks it `COMPLETED`.

## Real-time (Socket.io, `src/config/socket.js`)

- Every socket must present a valid JWT (from `auth.token` or the cookie).
- Rooms: `user:<id>`, `restaurant:<id>`, `order:<id>`.
- Events: partners emit `partner_location_update`; customers `track_order`.
- Service helpers: `notifyRestaurant`, `notifyOrderStatus`, `notifyPartner`.

## Conventions

- **Response envelope** (`src/utils/response.js`): every response is
  `{ success, message, data }` or `{ success, message, errors }`.
- **Errors**: services throw `{ statusCode, message }`; controllers translate
  to the envelope; the global handler maps Prisma/JWT errors and hides 500
  details in production.
- **Validation**: `express-validator` rule arrays + a shared `validate`
  middleware return `422` with a field-level error list.
