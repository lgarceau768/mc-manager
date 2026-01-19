#!/bin/bash
#
# Remove all local Docker data relevant to MC Server Manager
#
# Usage:
#   ./scripts/clean.sh              # Interactive mode - asks for confirmation
#   ./scripts/clean.sh --force      # Skip confirmation prompts
#   ./scripts/clean.sh --images     # Only remove images
#   ./scripts/clean.sh --containers # Only remove containers
#   ./scripts/clean.sh --volumes    # Only remove volumes
#   ./scripts/clean.sh --all        # Remove everything (images, containers, volumes, networks)
#

set -e

# Configuration
DOCKER_REPO="ltgarc768/mc-manager"
PROJECT_NAME="mc-manager"
MC_CONTAINER_PREFIX="mc-"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FORCE=false
CLEAN_IMAGES=false
CLEAN_CONTAINERS=false
CLEAN_VOLUMES=false
CLEAN_NETWORKS=false
CLEAN_ALL=false

for arg in "$@"; do
    case $arg in
        --force|-f)
            FORCE=true
            ;;
        --images|-i)
            CLEAN_IMAGES=true
            ;;
        --containers|-c)
            CLEAN_CONTAINERS=true
            ;;
        --volumes|-v)
            CLEAN_VOLUMES=true
            ;;
        --networks|-n)
            CLEAN_NETWORKS=true
            ;;
        --all|-a)
            CLEAN_ALL=true
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force, -f       Skip confirmation prompts"
            echo "  --images, -i      Remove MC Manager images only"
            echo "  --containers, -c  Remove MC Manager containers only"
            echo "  --volumes, -v     Remove MC Manager volumes only"
            echo "  --networks, -n    Remove MC Manager networks only"
            echo "  --all, -a         Remove everything"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "If no options specified, runs in interactive mode."
            exit 0
            ;;
    esac
done

# If no specific option, default to all in interactive mode
if ! $CLEAN_IMAGES && ! $CLEAN_CONTAINERS && ! $CLEAN_VOLUMES && ! $CLEAN_NETWORKS && ! $CLEAN_ALL; then
    CLEAN_ALL=true
fi

if $CLEAN_ALL; then
    CLEAN_IMAGES=true
    CLEAN_CONTAINERS=true
    CLEAN_VOLUMES=true
    CLEAN_NETWORKS=true
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MC Server Manager - Cleanup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to confirm action
confirm() {
    if $FORCE; then
        return 0
    fi
    local message="$1"
    echo -e -n "${YELLOW}$message [y/N]: ${NC}"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Stop and remove containers
remove_containers() {
    echo -e "${YELLOW}Checking for MC Manager containers...${NC}"

    # Find MC Manager containers (backend, frontend, and minecraft servers)
    local containers=$(docker ps -a --format "{{.Names}}" 2>/dev/null | grep -E "(${PROJECT_NAME}|${MC_CONTAINER_PREFIX})" || true)

    if [ -z "$containers" ]; then
        echo -e "  No MC Manager containers found."
        return
    fi

    echo -e "  Found containers:"
    echo "$containers" | while read -r name; do
        echo -e "    - $name"
    done
    echo ""

    if confirm "Stop and remove these containers?"; then
        echo "$containers" | while read -r name; do
            echo -e "  Stopping $name..."
            docker stop "$name" 2>/dev/null || true
            echo -e "  Removing $name..."
            docker rm "$name" 2>/dev/null || true
        done
        echo -e "${GREEN}  Containers removed.${NC}"
    else
        echo -e "  Skipped container removal."
    fi
    echo ""
}

# Remove images
remove_images() {
    echo -e "${YELLOW}Checking for MC Manager images...${NC}"

    local images=$(docker images "${DOCKER_REPO}" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)

    if [ -z "$images" ]; then
        echo -e "  No MC Manager images found."
        return
    fi

    echo -e "  Found images:"
    echo "$images" | while read -r image; do
        echo -e "    - $image"
    done
    echo ""

    if confirm "Remove these images?"; then
        echo "$images" | while read -r image; do
            echo -e "  Removing $image..."
            docker rmi "$image" 2>/dev/null || true
        done
        echo -e "${GREEN}  Images removed.${NC}"
    else
        echo -e "  Skipped image removal."
    fi
    echo ""
}

# Remove volumes
remove_volumes() {
    echo -e "${YELLOW}Checking for MC Manager volumes...${NC}"

    local volumes=$(docker volume ls --format "{{.Name}}" 2>/dev/null | grep -E "^${PROJECT_NAME}" || true)

    if [ -z "$volumes" ]; then
        echo -e "  No MC Manager volumes found."
        return
    fi

    echo -e "  Found volumes:"
    echo "$volumes" | while read -r vol; do
        echo -e "    - $vol"
    done
    echo ""

    if confirm "Remove these volumes? (This will delete all server data!)"; then
        echo "$volumes" | while read -r vol; do
            echo -e "  Removing $vol..."
            docker volume rm "$vol" 2>/dev/null || true
        done
        echo -e "${GREEN}  Volumes removed.${NC}"
    else
        echo -e "  Skipped volume removal."
    fi
    echo ""
}

# Remove networks
remove_networks() {
    echo -e "${YELLOW}Checking for MC Manager networks...${NC}"

    local networks=$(docker network ls --format "{{.Name}}" 2>/dev/null | grep -E "^${PROJECT_NAME}" || true)

    if [ -z "$networks" ]; then
        echo -e "  No MC Manager networks found."
        return
    fi

    echo -e "  Found networks:"
    echo "$networks" | while read -r net; do
        echo -e "    - $net"
    done
    echo ""

    if confirm "Remove these networks?"; then
        echo "$networks" | while read -r net; do
            echo -e "  Removing $net..."
            docker network rm "$net" 2>/dev/null || true
        done
        echo -e "${GREEN}  Networks removed.${NC}"
    else
        echo -e "  Skipped network removal."
    fi
    echo ""
}

# Remove local data directories
remove_local_data() {
    echo -e "${YELLOW}Checking for local data directories...${NC}"

    local data_dirs=("data" "logs" "temp")
    local found=false

    for dir in "${data_dirs[@]}"; do
        if [ -d "${PROJECT_ROOT}/${dir}" ]; then
            found=true
            echo -e "  Found: ${PROJECT_ROOT}/${dir}"
        fi
    done

    if ! $found; then
        echo -e "  No local data directories found."
        return
    fi
    echo ""

    if confirm "Remove local data directories? (This will delete ALL server data, backups, and logs!)"; then
        for dir in "${data_dirs[@]}"; do
            if [ -d "${PROJECT_ROOT}/${dir}" ]; then
                echo -e "  Removing ${PROJECT_ROOT}/${dir}..."
                rm -rf "${PROJECT_ROOT}/${dir}"
            fi
        done
        echo -e "${GREEN}  Local data removed.${NC}"
    else
        echo -e "  Skipped local data removal."
    fi
    echo ""
}

# Main execution
if $CLEAN_CONTAINERS; then
    remove_containers
fi

if $CLEAN_IMAGES; then
    remove_images
fi

if $CLEAN_VOLUMES; then
    remove_volumes
fi

if $CLEAN_NETWORKS; then
    remove_networks
fi

# Always offer to clean local data in interactive mode
if $CLEAN_ALL && ! $FORCE; then
    remove_local_data
fi

# Clean up dangling images
echo -e "${YELLOW}Cleaning up dangling images...${NC}"
docker image prune -f 2>/dev/null || true
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Cleanup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
