FROM oven/bun:1.4.4-alpine AS build
WORKDIR /src/services/identity
COPY src/services/identity/package.json src/services/identity/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src/services/identity/ ./
COPY src/services/shared/ ../shared/
RUN bun build index.ts --target=bun --packages=external --outdir=/out

FROM oven/bun:1.4.4-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=1000:1000 /out/index.js ./index.js
COPY --from=build --chown=1000:1000 /src/services/identity/node_modules ./node_modules
USER 1000:1000
EXPOSE 3001
CMD ["bun", "index.js"]
