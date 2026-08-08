# ── Build stage ───────────────────────────────────────────────────────────────
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Cache dependency installs
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# PUBLIC_BACKEND_URL is baked into the HTML at build time (Astro inlines
# import.meta.env.PUBLIC_* and index.astro writes it into a <meta> tag), so it
# has to be known here -- it cannot be changed at container runtime.
# Host and optional port only, no scheme: the client picks http/https and
# ws/wss from location.protocol.
ARG PUBLIC_BACKEND_URL=localhost:8084
ENV PUBLIC_BACKEND_URL=$PUBLIC_BACKEND_URL

COPY . .
RUN bun run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# The Vercel adapter only copies dist/ into .vercel/output/static afterwards,
# so dist/ is the real build output either way.
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1 rather than localhost on purpose: localhost resolves to [::1] first
# in this image, and an nginx listening only on IPv4 refuses that, so the
# healthcheck fails while the site is actually fine. Traefik drops unhealthy
# containers from its router table, which takes the whole route down.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
