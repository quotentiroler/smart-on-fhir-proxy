# Multi-stage build for SMART on FHIR monorepo
FROM oven/bun:slim AS base
WORKDIR /app

# Build stage
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    pkg-config \
    python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy root package files first
COPY package.json bun.lock ./

# Copy workspace package files
COPY backend/package.json ./backend/
COPY ui/package.json ./ui/

# Install dependencies for all workspaces
RUN bun install --frozen-lockfile

# Copy source code for both workspaces
COPY backend/ ./backend/
COPY ui/ ./ui/

# Build backend
WORKDIR /app/backend
RUN bun run build

# Build UI
WORKDIR /app/ui
RUN bun run build

# Production stage - serve both backend and frontend
FROM base AS production
WORKDIR /app

# Install minimal runtime dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built backend
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/node_modules ./backend/node_modules

# Copy built UI to be served by backend as static files
COPY --from=build /app/ui/dist ./backend/public

# Expose backend port
EXPOSE 8445

# Start the backend (which will serve the UI static files)
WORKDIR /app/backend
CMD ["bun", "run", "start"]
