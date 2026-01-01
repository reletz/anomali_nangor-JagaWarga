FROM oven/bun:1.0-alpine

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
EXPOSE 3002

CMD ["bun", "run", "index.ts"]
