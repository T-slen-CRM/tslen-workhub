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
# Baked into the bundle by set-env.ts as `buildVersion` - compared against
# the X-App-Version response header (see AppVersionMiddleware) to detect a
# redeploy and prompt the user to refresh, without a separate polling
# endpoint. Defaults to "dev" for local builds where no GIT_SHA build-arg is
# passed - must match AppVersionMiddleware's own "dev" fallback so local
# dev never shows a false "new version" banner.
ARG GIT_SHA=dev
ENV GIT_SHA=${GIT_SHA}
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
# Pinned so the app server's own interpretation of "no time zone" Postgres
# timestamp columns is deterministic regardless of the host - without this,
# a day-off request's start/end can silently land on the wrong calendar day
# whenever the container's ambient timezone differs from whoever created it.
ENV TZ=UTC
# Runtime env var read by AppVersionMiddleware to stamp X-App-Version on
# every response - same value baked into the frontend bundle above, so the
# two sides can be compared. Must be redeclared (Docker ARGs don't persist
# across FROM boundaries) and re-set as ENV here to survive past the build
# steps into the actual running container, unlike a plain ARG.
ARG GIT_SHA=dev
ENV GIT_SHA=${GIT_SHA}
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
