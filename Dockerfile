# Stage 1: install the npm workspace (root + packages/*) once from the
# single root lockfile, and build the shared types package everything else
# needs at compile/run time.
FROM node:24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/package.json
COPY packages/web/scripts/ packages/web/scripts/
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --legacy-peer-deps
COPY packages/shared/ packages/shared/
RUN npm run build:shared

# Stage 2: build Angular frontend
FROM deps AS web-build
WORKDIR /app/packages/web
COPY packages/web/ .
COPY .env /app/.env
RUN npm run config && npx ng build --configuration production

# Stage 3: build NestJS backend
FROM deps AS api-build
WORKDIR /app
COPY src/ src/
COPY tsconfig*.json nest-cli.json ./
COPY proto/ proto/
RUN npm run build

# Stage 4: production image
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/package.json
COPY packages/web/scripts/ packages/web/scripts/
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --legacy-peer-deps
COPY --from=deps /app/packages/shared/dist ./packages/shared/dist
COPY --from=api-build /app/dist ./dist
COPY --from=web-build /app/packages/web/dist ./packages/web/dist
COPY proto/ proto/
COPY migrations/ migrations/
COPY typeOrm.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ARG APP_PORT=4004
EXPOSE ${APP_PORT}
CMD ["./docker-entrypoint.sh"]
