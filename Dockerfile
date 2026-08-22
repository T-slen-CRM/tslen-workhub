# Stage 1: Build Angular frontend
FROM node:20 AS web-build
WORKDIR /app/packages/web
COPY packages/web/package.json packages/web/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY packages/web/ .
COPY .env /app/.env
RUN npm run config && npx ng build --configuration production

# Stage 2: Build NestJS backend
FROM node:22 AS api-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY src/ src/
COPY tsconfig*.json nest-cli.json ./
COPY proto/ proto/
RUN npm run build

# Stage 3: Production image
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
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
