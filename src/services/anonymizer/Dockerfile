FROM oven/bun:alpine

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production
COPY . .
EXPOSE 3002

CMD ["bun", "run", "index.ts"]
