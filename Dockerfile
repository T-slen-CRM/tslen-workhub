# Stage 1: Build Angular frontend
FROM node:20 AS web-build
WORKDIR /app
COPY packages/web/package.json packages/web/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY packages/web/ .
RUN npx ng build --configuration production

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
RUN npm ci --legacy-peer-deps --omit=dev
COPY --from=api-build /app/dist ./dist
COPY --from=web-build /app/dist ./packages/web/dist
COPY proto/ proto/

ARG APP_PORT=4004
EXPOSE ${APP_PORT}
CMD ["node", "dist/main.js"]
