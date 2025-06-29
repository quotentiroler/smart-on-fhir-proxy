# Use Bun as the base image
FROM oven/bun:1-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (if you have a build step)
# RUN bun run build

# Expose the port
EXPOSE 8445

# Start the application
CMD ["bun", "run", "src/index.ts"]
