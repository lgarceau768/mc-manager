#!/bin/bash
#
# Show status of MC Server Manager services
#
# Usage:
#   ./scripts/status.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --example|-e)
            COMPOSE_FILE="docker-compose.example.yml"
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --example, -e   Use docker-compose.example.yml"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
    esac
done

cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MC Server Manager - Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check compose file
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${YELLOW}Compose file not found: $COMPOSE_FILE${NC}"
    echo ""
fi

# MC Manager Services
echo -e "${YELLOW}MC Manager Services:${NC}"
if [ -f "$COMPOSE_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  No services defined."
else
    # Check by container name
    docker ps --filter "name=mc-manager" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  No services running."
fi
echo ""

# Minecraft Server Containers
echo -e "${YELLOW}Minecraft Server Containers:${NC}"
MC_CONTAINERS=$(docker ps -a --filter "name=mc-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -v "mc-manager" || true)
if [ -n "$MC_CONTAINERS" ]; then
    echo "$MC_CONTAINERS"
else
    echo "  No Minecraft servers running."
fi
echo ""

# Docker Images
echo -e "${YELLOW}MC Manager Images:${NC}"
docker images "ltgarc768/mc-manager" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}" 2>/dev/null || echo "  No images found."
echo ""

# Disk Usage
echo -e "${YELLOW}Data Directory Sizes:${NC}"
if [ -d "$PROJECT_ROOT/data" ]; then
    du -sh "$PROJECT_ROOT/data"/* 2>/dev/null | while read -r size dir; do
        echo "  $(basename "$dir"): $size"
    done
else
    echo "  No data directory found."
fi
echo ""

# Health Check
echo -e "${YELLOW}Health Check:${NC}"
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")

if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "  Backend:  ${GREEN}Healthy${NC} (http://localhost:3001)"
else
    echo -e "  Backend:  ${RED}Unavailable${NC}"
fi

if [ "$FRONTEND_HEALTH" = "200" ] || [ "$FRONTEND_HEALTH" = "304" ]; then
    echo -e "  Frontend: ${GREEN}Healthy${NC} (http://localhost:3000)"
else
    echo -e "  Frontend: ${RED}Unavailable${NC}"
fi
echo ""
