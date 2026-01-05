#!/bin/bash
#
# Build and push MC Server Manager Docker images in one step
#
# Usage:
#   ./scripts/release.sh              # Build and push with 'latest' tag
#   ./scripts/release.sh v1.0.0       # Build and push with specific version tag
#   ./scripts/release.sh v1.0.0 api   # Build and push only the API
#   ./scripts/release.sh v1.0.0 ui    # Build and push only the UI
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m'

VERSION="${1:-latest}"
COMPONENT="${2:-all}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MC Server Manager - Release Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Run build
"${SCRIPT_DIR}/build.sh" "$VERSION" "$COMPONENT"

# Run push
"${SCRIPT_DIR}/push.sh" "$VERSION" "$COMPONENT"

echo ""
echo -e "${BLUE}Release complete for version: ${VERSION}${NC}"
