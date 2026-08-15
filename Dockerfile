# ---- Build stage: install workspace deps + build the Vite SPA ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install workspace dependencies first for better layer caching.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
RUN npm ci

# Build the client bundle (client/dist) from the full source tree.
COPY . .
RUN npm run build

# ---- Runtime stage: Express API + built SPA ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install production-only workspace deps (server + shared, no dev tooling).
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared ./shared
RUN npm ci --omit=dev

# Bring in the built SPA and the server source.
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/src ./server/src

# Runtime helpers (wait-for-mongo + idempotent demo seed).
COPY docker/ ./docker/
RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/app/docker/entrypoint.sh"]