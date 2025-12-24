# syntax=docker/dockerfile:1.6

ARG NODE_VERSION=20-alpine

# Build the frontend bundle
FROM node:${NODE_VERSION} AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
RUN npm install --workspace frontend

COPY frontend ./frontend
RUN npm run build --workspace frontend

# Install backend production dependencies
FROM node:${NODE_VERSION} AS backend-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN npm install --omit=dev --workspace backend

COPY backend ./backend

# Final runtime image
FROM node:${NODE_VERSION}
WORKDIR /app

COPY --from=backend-deps /app/package.json ./package.json
COPY --from=backend-deps /app/package-lock.json ./package-lock.json
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-deps /app/backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend

RUN mkdir -p /data/database /data/servers /data/modpacks /app/logs

ARG DEFAULT_NODE_ENV=production
ENV NODE_ENV=${DEFAULT_NODE_ENV}

ARG DEFAULT_PORT=3001
ENV PORT=${DEFAULT_PORT}

ARG DEFAULT_DATABASE_PATH=/data/database/servers.db
ENV DATABASE_PATH=${DEFAULT_DATABASE_PATH}

ARG DEFAULT_SERVERS_DATA_PATH=/data/servers
ENV SERVERS_DATA_PATH=${DEFAULT_SERVERS_DATA_PATH}

ARG DEFAULT_SERVERS_DATA_PATH_HOST=/var/lib/mc-manager/servers
ENV SERVERS_DATA_PATH_HOST=${DEFAULT_SERVERS_DATA_PATH_HOST}

ARG DEFAULT_PUBLIC_SERVER_HOST=host.docker.internal
ENV PUBLIC_SERVER_HOST=${DEFAULT_PUBLIC_SERVER_HOST}

ARG DEFAULT_PORT_RANGE_START=25565
ENV PORT_RANGE_START=${DEFAULT_PORT_RANGE_START}

ARG DEFAULT_PORT_RANGE_END=25600
ENV PORT_RANGE_END=${DEFAULT_PORT_RANGE_END}

ARG DEFAULT_LOG_LEVEL=info
ENV LOG_LEVEL=${DEFAULT_LOG_LEVEL}

ARG DEFAULT_FRONTEND_DIST_PATH=/app/frontend
ENV FRONTEND_DIST_PATH=${DEFAULT_FRONTEND_DIST_PATH}

ARG DEFAULT_MODPACKS_PATH=/data/modpacks
ENV MODPACKS_PATH=${DEFAULT_MODPACKS_PATH}

ENV DOCKER_SOCKET=/var/run/docker.sock \
    DATA_ROOT=/data

VOLUME ["/data", "/app/logs"]
EXPOSE 3001

WORKDIR /app/backend
CMD ["node", "src/server.js"]
