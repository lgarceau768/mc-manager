#!/bin/bash
#
# View logs for MC Server Manager services
#
# Usage:
#   ./scripts/logs.sh              # Follow all service logs
#   ./scripts/logs.sh backend      # Follow backend logs only
#   ./scripts/logs.sh frontend     # Follow frontend logs only
#   ./scripts/logs.sh --tail 100   # Show last 100 lines
#   ./scripts/logs.sh --no-follow  # Don't follow, just show recent logs
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

# Default options
FOLLOW=true
TAIL="100"
SERVICE=""
COMPOSE_FILE="docker-compose.yml"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-follow|-n)
            FOLLOW=false
            shift
            ;;
        --tail|-t)
            TAIL="$2"
            shift 2
            ;;
        --example|-e)
            COMPOSE_FILE="docker-compose.example.yml"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [SERVICE] [OPTIONS]"
            echo ""
            echo "Services:"
            echo "  backend       Show backend logs"
            echo "  frontend      Show frontend logs"
            echo "  (empty)       Show all logs"
            echo ""
            echo "Options:"
            echo "  --no-follow, -n   Don't follow logs"
            echo "  --tail, -t N      Show last N lines (default: 100)"
            echo "  --example, -e     Use docker-compose.example.yml"
            echo "  --help, -h        Show this help message"
            exit 0
            ;;
        backend|frontend)
            SERVICE="$1"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

cd "$PROJECT_ROOT"

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $COMPOSE_FILE not found."
    exit 1
fi

echo -e "${BLUE}MC Server Manager Logs${NC}"
echo -e "${BLUE}Press Ctrl+C to exit${NC}"
echo ""

# Build command
CMD="docker compose -f $COMPOSE_FILE logs --tail $TAIL"

if $FOLLOW; then
    CMD="$CMD --follow"
fi

if [ -n "$SERVICE" ]; then
    CMD="$CMD $SERVICE"
fi

# Execute
eval "$CMD"
