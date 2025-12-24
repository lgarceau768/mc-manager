#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENV_FILE="${BUILD_ENV_FILE:-${SCRIPT_DIR}/.env}"
if [[ -f "${ENV_FILE}" ]]; then
  echo "Loading build environment from ${ENV_FILE}"
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

IMAGE_NAME="${IMAGE_NAME:-mc-server-manager}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NODE_VERSION="${NODE_VERSION:-20-alpine}"

echo "Building ${IMAGE_NAME}:${IMAGE_TAG} (Node ${NODE_VERSION})"

docker build \
  --file "${SCRIPT_DIR}/Dockerfile" \
  --build-arg NODE_VERSION="${NODE_VERSION}" \
  --build-arg DEFAULT_NODE_ENV="${NODE_ENV:-production}" \
  --build-arg DEFAULT_PORT="${PORT:-3001}" \
  --build-arg DEFAULT_DATABASE_PATH="${DATABASE_PATH:-/data/database/servers.db}" \
  --build-arg DEFAULT_SERVERS_DATA_PATH="${SERVERS_DATA_PATH:-/data/servers}" \
  --build-arg DEFAULT_SERVERS_DATA_PATH_HOST="${SERVERS_DATA_PATH_HOST:-/var/lib/mc-manager/servers}" \
  --build-arg DEFAULT_PUBLIC_SERVER_HOST="${PUBLIC_SERVER_HOST:-host.docker.internal}" \
  --build-arg DEFAULT_PORT_RANGE_START="${PORT_RANGE_START:-25565}" \
  --build-arg DEFAULT_PORT_RANGE_END="${PORT_RANGE_END:-25600}" \
  --build-arg DEFAULT_LOG_LEVEL="${LOG_LEVEL:-info}" \
  --build-arg DEFAULT_FRONTEND_DIST_PATH="${FRONTEND_DIST_PATH:-/app/frontend}" \
  --build-arg DEFAULT_MODPACKS_PATH="${MODPACKS_PATH:-/data/modpacks}" \
  "${PROJECT_ROOT}" \
  -t "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Successfully built ${IMAGE_NAME}:${IMAGE_TAG}"
echo
echo "Next steps:"
echo "  docker run -it --rm \\"
echo "    -p 3001:3001 \\"
echo "    -v \"\${PWD}/data:/data\" \\"
echo "    -v /var/run/docker.sock:/var/run/docker.sock \\"
echo "    -e SERVERS_DATA_PATH_HOST=\"/absolute/host/path/to/servers\" \\"
echo "    ${IMAGE_NAME}:${IMAGE_TAG}"
