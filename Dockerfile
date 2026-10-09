# Multi-stage build para producción / Railway
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data/migrations ./src/data/migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
USER node

# Al arrancar: aplica migraciones y seed (idempotente) y luego levanta la API.
# `exec` hace que node sea PID 1 para recibir señales (SIGTERM) correctamente.
CMD ["sh", "-c", "node scripts/run-migrations.js && node dist/data/seeds/initial-seed.js && exec node dist/main.js"]