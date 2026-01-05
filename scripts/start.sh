#!/bin/bash
#
# Start MC Server Manager services
#
# Usage:
#   ./scripts/start.sh              # Start all services
#   ./scripts/start.sh --detach     # Start in background (default)
#   ./scripts/start.sh --attach     # Start with logs attached
#   ./scripts/start.sh --pull       # Pull latest images before starting
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
DETACH=true
PULL=false
COMPOSE_FILE="docker-compose.yml"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --attach|-a)
            DETACH=false
            ;;
        --detach|-d)
            DETACH=true
            ;;
        --pull|-p)
            PULL=true
            ;;
        --example|-e)
            COMPOSE_FILE="docker-compose.example.yml"
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --detach, -d   Run in background (default)"
            echo "  --attach, -a   Run with logs attached"
            echo "  --pull, -p     Pull latest images before starting"
            echo "  --example, -e  Use docker-compose.example.yml"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
    esac
done

cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MC Server Manager - Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: $COMPOSE_FILE not found.${NC}"
    if [ -f "docker-compose.example.yml" ]; then
        echo -e "Tip: Copy docker-compose.example.yml to docker-compose.yml first:"
        echo -e "  cp docker-compose.example.yml docker-compose.yml"
    fi
    exit 1
fi

echo -e "Using: ${GREEN}${COMPOSE_FILE}${NC}"
echo ""

# Create data directories if they don't exist
echo -e "${YELLOW}Ensuring data directories exist...${NC}"
mkdir -p data/database data/servers data/modpacks data/backups data/notifications
mkdir -p logs temp
echo -e "${GREEN}Done.${NC}"
echo ""

# Pull latest images if requested
if $PULL; then
    echo -e "${YELLOW}Pulling latest images...${NC}"
    docker compose -f "$COMPOSE_FILE" pull
    echo ""
fi

# Start services
if $DETACH; then
    echo -e "${YELLOW}Starting services in background...${NC}"
    docker compose -f "$COMPOSE_FILE" up -d

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Services started!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Services:"
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
    echo -e "Backend:  ${GREEN}http://localhost:3001${NC}"
    echo ""
    echo "View logs:  ./scripts/logs.sh"
    echo "Stop:       ./scripts/stop.sh"
else
    echo -e "${YELLOW}Starting services (logs attached, Ctrl+C to stop)...${NC}"
    echo ""
    docker compose -f "$COMPOSE_FILE" up
fi
