#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Local MCP Servers${NC}"
echo -e "${BLUE}================================${NC}"

# Kill any existing MCP servers
echo -e "${YELLOW}Cleaning up existing MCP servers...${NC}"
pkill -f "mcp-server" || true
pkill -f "@playwright/mcp" || true
pkill -f "context7" || true

# Start MCP servers on different ports
echo -e "${GREEN}Starting MCP servers on localhost...${NC}"

# Memory MCP Server (Sequential Thinking)
echo -e "${BLUE}🧠 Starting Memory MCP Server on port 8091...${NC}"
mcp-server-memory --port 8091 > /tmp/mcp-memory.log 2>&1 &
echo "Memory MCP PID: $!"

# Filesystem MCP Server  
echo -e "${BLUE}📁 Starting Filesystem MCP Server on port 8092...${NC}"
mcp-server-filesystem --port 8092 /Users/heerackbang/Desktop/geulpi-project-1 > /tmp/mcp-filesystem.log 2>&1 &
echo "Filesystem MCP PID: $!"

# Playwright MCP Server
echo -e "${BLUE}🎭 Starting Playwright MCP Server on port 8093...${NC}"
npx @playwright/mcp@latest --port 8093 > /tmp/mcp-playwright.log 2>&1 &
echo "Playwright MCP PID: $!"

# Context7 MCP Server (if available)
if command -v mcp-context7 &> /dev/null; then
    echo -e "${BLUE}📚 Starting Context7 MCP Server on port 8094...${NC}"
    mcp-context7 --port 8094 > /tmp/mcp-context7.log 2>&1 &
    echo "Context7 MCP PID: $!"
else
    echo -e "${YELLOW}⚠️ Context7 MCP not found, skipping...${NC}"
fi

echo -e "${GREEN}✅ All MCP servers started!${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Logs available at:"
echo -e "  Memory MCP: /tmp/mcp-memory.log"
echo -e "  Filesystem MCP: /tmp/mcp-filesystem.log"
echo -e "  Playwright MCP: /tmp/mcp-playwright.log"
echo -e "  Context7 MCP: /tmp/mcp-context7.log"
echo -e "${BLUE}================================${NC}"

# Keep script running
echo -e "${YELLOW}Press Ctrl+C to stop all MCP servers${NC}"
trap 'echo -e "\n${RED}Stopping all MCP servers...${NC}"; pkill -f "mcp-server"; pkill -f "@playwright/mcp"; pkill -f "context7"; exit' INT
while true; do sleep 1; done