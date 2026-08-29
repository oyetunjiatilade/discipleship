# ── Stage 1: Build the Vite app ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_BASE_URL is intentionally left empty so the app uses relative URLs,
# which nginx (below) reverse-proxies to the API — keeping everything same-origin.
RUN npm run build

# ── Stage 2: Serve static files + proxy the API/websocket ──
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1
