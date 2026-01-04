#!/bin/bash
#
# Push MC Server Manager Docker images to Docker Hub
#
# Usage:
#   ./scripts/push.sh              # Push both images with 'latest' tag
#   ./scripts/push.sh v1.0.0       # Push both images with specific version tag
#   ./scripts/push.sh v1.0.0 api   # Push only the API image
#   ./scripts/push.sh v1.0.0 ui    # Push only the UI image
#
# Note: You must be logged in to Docker Hub first (docker login)
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
echo -e "${BLUE}  MC Server Manager - Push Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Repository: ${GREEN}${DOCKER_REPO}${NC}"
echo -e "Version:    ${GREEN}${VERSION}${NC}"
echo -e "Component:  ${GREEN}${COMPONENT}${NC}"
echo ""

# Check if logged in to Docker Hub
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo -e "${YELLOW}Warning: You may not be logged in to Docker Hub.${NC}"
    echo -e "Run 'docker login' if you encounter authentication errors."
    echo ""
fi

# Function to push API image
push_api() {
    echo -e "${YELLOW}Pushing API image...${NC}"

    # Check if image exists
    if ! docker image inspect "${DOCKER_REPO}:api_${VERSION}" &>/dev/null; then
        echo -e "${RED}Error: Image ${DOCKER_REPO}:api_${VERSION} not found.${NC}"
        echo "Run './scripts/build.sh ${VERSION}' first."
        return 1
    fi

    docker push "${DOCKER_REPO}:api_${VERSION}"

    # Also push latest if pushing a version
    if [ "$VERSION" != "latest" ]; then
        if docker image inspect "${DOCKER_REPO}:api_latest" &>/dev/null; then
            docker push "${DOCKER_REPO}:api_latest"
        fi
    fi

    echo -e "${GREEN}API image pushed successfully!${NC}"
    echo ""
}

# Function to push UI image
push_ui() {
    echo -e "${YELLOW}Pushing UI image...${NC}"

    # Check if image exists
    if ! docker image inspect "${DOCKER_REPO}:ui_${VERSION}" &>/dev/null; then
        echo -e "${RED}Error: Image ${DOCKER_REPO}:ui_${VERSION} not found.${NC}"
        echo "Run './scripts/build.sh ${VERSION}' first."
        return 1
    fi

    docker push "${DOCKER_REPO}:ui_${VERSION}"

    # Also push latest if pushing a version
    if [ "$VERSION" != "latest" ]; then
        if docker image inspect "${DOCKER_REPO}:ui_latest" &>/dev/null; then
            docker push "${DOCKER_REPO}:ui_latest"
        fi
    fi

    echo -e "${GREEN}UI image pushed successfully!${NC}"
    echo ""
}

# Push based on component selection
case "$COMPONENT" in
    api|backend)
        push_api
        ;;
    ui|frontend)
        push_ui
        ;;
    all)
        push_api
        push_ui
        ;;
    *)
        echo -e "${RED}Unknown component: $COMPONENT${NC}"
        echo "Valid options: all, api, ui, backend, frontend"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Push complete!${NC}"
echo -e "${GREEN}========================================${NC}"
