# Multi-stage Dockerfile for NexusERP
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_BASE44_APP_ID=6a2d9d7735d1dc49c79d3f5e
ARG VITE_BASE44_APP_BASE_URL=https://ethereal-nexus-open-flow.base44.app

ENV VITE_BASE44_APP_ID=$VITE_BASE44_APP_ID
ENV VITE_BASE44_APP_BASE_URL=$VITE_BASE44_APP_BASE_URL
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
