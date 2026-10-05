# ─── Foodo Backend — production image ─────────────────────────
# Single-stage build tuned for a Prisma + Express app.
#   1. install ALL deps (Prisma CLI is a devDependency)
#   2. generate the Prisma client
#   3. copy source
#   4. prune dev dependencies (keeps the generated client)
FROM node:20-bookworm-slim AS runtime

# Prisma needs OpenSSL at runtime on slim images.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client against the schema.
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application source.
COPY . .

# Drop dev dependencies (vitest, nodemon, prisma CLI) — the already
# generated @prisma/client stays in node_modules.
RUN npm prune --omit=dev

# Run as an unprivileged user.
USER node

EXPOSE 5000

# Container-level health check hitting the app's /health route.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
