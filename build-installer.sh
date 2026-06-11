#!/usr/bin/env bash
#
# TeamForge IDE — Build Installer Script
#
# Usage:
#   ./build-installer.sh          # Build for current platform
#   ./build-installer.sh win      # Build Windows NSIS installer (.exe)
#   ./build-installer.sh mac      # Build macOS DMG
#   ./build-installer.sh linux    # Build Linux AppImage + DEB
#   ./build-installer.sh all      # Build for all platforms
#

set -euo pipefail

GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════════════╗"
echo "║       TeamForge IDE — Install Shield Builder     ║"
echo "║          Autonomous AI Development Platform       ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

PLATFORM="${1:-auto}"

# Detect platform if auto
if [ "$PLATFORM" = "auto" ]; then
  case "$(uname -s)" in
    Darwin*) PLATFORM="mac" ;;
    Linux*)  PLATFORM="linux" ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM="win" ;;
    *) echo "Unknown platform. Specify: win, mac, or linux"; exit 1 ;;
  esac
fi

echo -e "${GREEN}📦 Platform: ${PLATFORM}${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${GREEN}[1/5] Installing dependencies...${NC}"
bun install
echo ""

# Step 2: Push database schema
echo -e "${GREEN}[2/5] Preparing database...${NC}"
bun run db:push 2>/dev/null || echo "  → Database push skipped (may already be up to date)"
bun run db:generate 2>/dev/null || echo "  → Prisma generate skipped"
echo ""

# Step 3: Build Next.js
echo -e "${GREEN}[3/5] Building Next.js application...${NC}"
bun run build
echo ""

# Step 4: Verify build output
echo -e "${GREEN}[4/5] Verifying build output...${NC}"
if [ ! -d ".next" ]; then
  echo "❌ Next.js build failed — .next directory not found"
  exit 1
fi
echo "  ✅ .next directory found"
echo ""

# Step 5: Build Electron installer
echo -e "${GREEN}[5/5] Building Electron installer...${NC}"
case "$PLATFORM" in
  win)
    echo -e "  Building ${BOLD}Windows NSIS installer (.exe)${NC}..."
    npx electron-builder --win --x64
    echo ""
    echo -e "${GREEN}✅ Windows installer built!${NC}"
    echo -e "   📁 Location: dist/TeamForge-IDE-*-Setup.exe"
    ;;
  mac)
    echo -e "  Building ${BOLD}macOS DMG${NC}..."
    npx electron-builder --mac
    echo ""
    echo -e "${GREEN}✅ macOS installer built!${NC}"
    echo -e "   📁 Location: dist/TeamForge-IDE-*.dmg"
    ;;
  linux)
    echo -e "  Building ${BOLD}Linux AppImage + DEB${NC}..."
    npx electron-builder --linux
    echo ""
    echo -e "${GREEN}✅ Linux installers built!${NC}"
    echo -e "   📁 Location: dist/TeamForge-IDE-*.AppImage"
    echo -e "   📁 Location: dist/TeamForge-IDE-*.deb"
    ;;
  all)
    echo -e "  Building ${BOLD}all platforms${NC}..."
    npx electron-builder --win --mac --linux
    echo ""
    echo -e "${GREEN}✅ All installers built!${NC}"
    echo -e "   📁 dist/TeamForge-IDE-*-Setup.exe (Windows)"
    echo -e "   📁 dist/TeamForge-IDE-*.dmg (macOS)"
    echo -e "   📁 dist/TeamForge-IDE-*.AppImage (Linux)"
    echo -e "   📁 dist/TeamForge-IDE-*.deb (Linux)"
    ;;
  *)
    echo "Unknown platform: $PLATFORM. Use: win, mac, linux, or all"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  TeamForge IDE installer build complete! 🚀${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════${NC}"
