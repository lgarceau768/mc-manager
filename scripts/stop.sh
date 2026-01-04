#!/bin/bash
#
# Stop MC Server Manager services
#
# Usage:
#   ./scripts/stop.sh               # Stop all services gracefully
#   ./scripts/stop.sh --remove      # Stop and remove containers
#   ./scripts/stop.sh --timeout 60  # Custom shutdown timeout (default: 30s)
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

# Default options
REMOVE=false
TIMEOUT=30
COMPOSE_FILE="docker-compose.yml"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --remove|-r)
            REMOVE=true
            shift
            ;;
        --timeout|-t)
            TIMEOUT="$2"
            shift 2
            ;;
        --example|-e)
            COMPOSE_FILE="docker-compose.example.yml"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --remove, -r      Remove containers after stopping"
            echo "  --timeout, -t N   Shutdown timeout in seconds (default: 30)"
            echo "  --example, -e     Use docker-compose.example.yml"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MC Server Manager - Shutdown${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${YELLOW}Warning: $COMPOSE_FILE not found.${NC}"
    # Try to stop containers by name anyway
    echo -e "Attempting to stop containers by name..."
    docker stop mc-manager-frontend mc-manager-backend 2>/dev/null || true
    exit 0
fi

echo -e "Using: ${GREEN}${COMPOSE_FILE}${NC}"
echo -e "Timeout: ${GREEN}${TIMEOUT}s${NC}"
echo ""

# Show current status
echo -e "${YELLOW}Current status:${NC}"
docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "  No services running."
echo ""

# Stop services
if $REMOVE; then
    echo -e "${YELLOW}Stopping and removing services...${NC}"
    docker compose -f "$COMPOSE_FILE" down --timeout "$TIMEOUT"
else
    echo -e "${YELLOW}Stopping services...${NC}"
    docker compose -f "$COMPOSE_FILE" stop --timeout "$TIMEOUT"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Services stopped!${NC}"
echo -e "${GREEN}========================================${NC}"
