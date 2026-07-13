# ==========================================
# Phase 1: Build static assets
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /workspace

# Copy root configs and package dependencies
COPY package*.json ./
COPY tsconfig.base.json ./
COPY nx.json ./
COPY apps/ops-dashboard/package*.json ./apps/ops-dashboard/

# Install dependencies
RUN npm ci

# Copy application files and shared libraries
COPY apps/ops-dashboard/ ./apps/ops-dashboard/
COPY libs/ ./libs/

# Run build step using Nx
RUN npm run build --workspace=apps/ops-dashboard

# ==========================================
# Phase 2: Serve compiled HTML/JS bundles
# ==========================================
FROM nginx:1.23-alpine

COPY --from=builder /workspace/apps/ops-dashboard/dist /usr/share/nginx/html
COPY apps/ops-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
