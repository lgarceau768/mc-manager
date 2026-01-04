#!/bin/bash
#
# Build the MC Server Manager Docker images
#
# Usage:
#   ./scripts/build.sh              # Build both images with 'latest' tag
#   ./scripts/build.sh v1.0.0       # Build both images with specific version tag
#   ./scripts/build.sh v1.0.0 api   # Build only the API image
#   ./scripts/build.sh v1.0.0 ui    # Build only the UI image
#

set -e

# Configuration
DOCKER_REPO="ltgarc768/mc-manager"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
VERSION="${1:-latest}"
COMPONENT="${2:-all}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MC Server Manager - Build Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Repository: ${GREEN}${DOCKER_REPO}${NC}"
echo -e "Version:    ${GREEN}${VERSION}${NC}"
echo -e "Component:  ${GREEN}${COMPONENT}${NC}"
echo ""

cd "$PROJECT_ROOT"

# Function to build backend
build_api() {
    echo -e "${YELLOW}Building API image...${NC}"

    docker build \
        -t "${DOCKER_REPO}:api_${VERSION}" \
        -f backend/Dockerfile \
        ./backend

    # Also tag as latest if building a version
    if [ "$VERSION" != "latest" ]; then
        docker tag "${DOCKER_REPO}:api_${VERSION}" "${DOCKER_REPO}:api_latest"
    fi

    echo -e "${GREEN}API image built successfully!${NC}"
    echo -e "  Tagged as: ${DOCKER_REPO}:api_${VERSION}"
    if [ "$VERSION" != "latest" ]; then
        echo -e "  Also tagged: ${DOCKER_REPO}:api_latest"
    fi
    echo ""
}

# Function to build frontend
build_ui() {
    echo -e "${YELLOW}Building UI image...${NC}"

    docker build \
        -t "${DOCKER_REPO}:ui_${VERSION}" \
        -f frontend/Dockerfile \
        ./frontend

    # Also tag as latest if building a version
    if [ "$VERSION" != "latest" ]; then
        docker tag "${DOCKER_REPO}:ui_${VERSION}" "${DOCKER_REPO}:ui_latest"
    fi

    echo -e "${GREEN}UI image built successfully!${NC}"
    echo -e "  Tagged as: ${DOCKER_REPO}:ui_${VERSION}"
    if [ "$VERSION" != "latest" ]; then
        echo -e "  Also tagged: ${DOCKER_REPO}:ui_latest"
    fi
    echo ""
}

# Build based on component selection
case "$COMPONENT" in
    api|backend)
        build_api
        ;;
    ui|frontend)
        build_ui
        ;;
    all)
        build_api
        build_ui
        ;;
    *)
        echo -e "${RED}Unknown component: $COMPONENT${NC}"
        echo "Valid options: all, api, ui, backend, frontend"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Built images:"
docker images "${DOCKER_REPO}" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
