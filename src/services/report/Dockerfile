FROM oven/bun:1-alpine

WORKDIR /app

# Copy shared utilities first
COPY ../shared /app/shared

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Run the application
CMD ["bun", "index.ts"]
