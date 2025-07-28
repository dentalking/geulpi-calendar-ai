#!/bin/sh
# Launch MCP servers in Docker container

echo "Starting MCP servers..."

# Install required packages
npm install -g @playwright/mcp@latest
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-memory
npm install -g mcp-context7

# Start servers in background
echo "Launching Playwright MCP server..."
npx -y @playwright/mcp@latest &

echo "Launching Filesystem MCP server..."
npx -y @modelcontextprotocol/server-filesystem /app/project &

echo "Launching Memory MCP server..."
npx -y @modelcontextprotocol/server-memory &

echo "Launching Context7 MCP server..."
npx -y mcp-context7 &

echo "All MCP servers launched. Keeping container alive..."
# Keep container running
tail -f /dev/null
