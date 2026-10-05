# Deployment

The backend ships as a Docker image. CI builds it and pushes to **GitHub
Container Registry (GHCR)**; any host that can run a container (Render,
Railway, Fly.io, a VPS, ECS, k8s) can deploy it.

## Prerequisites in production

- Managed **PostgreSQL**, **MongoDB**, and **Redis** (or self-hosted).
- All env vars from [`.env.example`](../.env.example), with `NODE_ENV=production`.
- TLS terminated at a proxy/load balancer (the app sets `trust proxy` and
  issues `secure` cookies in production).

## The image

`Dockerfile` builds a `node:20-bookworm-slim` image that installs deps,
generates the Prisma client, prunes dev dependencies, runs as the non-root
`node` user, and exposes a `/health` HEALTHCHECK.

Build & run locally:

```bash
docker build -t foodo-backend .
docker run --env-file .env.production -p 5000:5000 foodo-backend
```

## CI/CD image publishing

`.github/workflows/ci.yml` pushes to `ghcr.io/<owner>/<repo>` on every push to
`main`/`master` after tests pass. Tags:

- `sha-<commit>` — immutable, per commit.
- `latest` — the default branch tip.

Pull it:

```bash
docker pull ghcr.io/<owner>/<repo>:latest
```

The package is private by default; grant your host read access to GHCR (a PAT
or a deploy token) or make the package public.

## Database migrations

Migrations are **not** auto-applied by the container. Run them as a release
step against the production database:

```bash
# with DATABASE_URL pointed at production
npx prisma migrate deploy      # or: npm run prisma:deploy
```

MongoDB is schemaless (Mongoose enforces shape at the app layer) — no migration
step, but ensure the `2dsphere` index on `Restaurant.location` exists (Mongoose
creates indexes on connect by default).

## Typical release flow

1. Merge to `main`/`master` → CI runs tests and pushes a new image.
2. Run `prisma migrate deploy` against production (manually or as a pre-deploy
   job) if the schema changed.
3. Roll the service to the new image tag (prefer the immutable `sha-` tag).
4. Verify `GET /health` returns `200` and check logs.

## Deploying to a specific host

This repo is intentionally host-agnostic (image → GHCR). To wire an automatic
deploy, add a `deploy` job to `ci.yml` after `docker` that calls your host's
deploy hook/CLI, e.g.:

- **Render/Railway**: trigger a deploy hook URL (store it as a repo secret).
- **Fly.io**: `flyctl deploy --image ghcr.io/<owner>/<repo>:sha-<sha>`.
- **VPS**: SSH in and `docker pull && docker compose up -d`.
- **k8s**: `kubectl set image deploy/foodo-backend ...`.

## Runtime notes

- Scale-out requires a **shared rate-limit store** (see
  `PRODUCTION_AUDIT.md` item A) — switch `express-rate-limit` to
  `rate-limit-redis`.
- Socket.io across multiple instances needs the Redis adapter
  (`@socket.io/redis-adapter`) so rooms work cluster-wide.
- Set container restart policy to `always`/`on-failure`; the app exits the
  process on unhandled errors and expects to be restarted.
