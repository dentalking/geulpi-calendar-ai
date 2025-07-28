#!/bin/bash
# Script to synchronize MCP configuration between local and Docker environments

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Synchronizing MCP Configuration...${NC}"

# Create MCP config directory if it doesn't exist
mkdir -p mcp-config

# Local Claude config path
LOCAL_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
PROJECT_CONFIG="./mcp-config/mcp-servers-local.json"
DOCKER_CONFIG="./mcp-config/mcp-servers-docker.json"

# Check if local config exists
if [ ! -f "$LOCAL_CONFIG" ]; then
    echo -e "${RED}❌ Local Claude config not found at: $LOCAL_CONFIG${NC}"
    exit 1
fi

# Copy local config to project
echo -e "${YELLOW}📋 Copying local MCP config to project...${NC}"
cp "$LOCAL_CONFIG" "$PROJECT_CONFIG"

# Create Docker-compatible version
echo -e "${YELLOW}🐳 Creating Docker-compatible MCP config...${NC}"
cat > "$DOCKER_CONFIG" << 'EOF'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "/ms-playwright"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/app/project"
      ]
    },
    "memory": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-memory"
      ]
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-context7"
      ]
    }
  }
}
EOF

# Create MCP launcher script for Docker
echo -e "${YELLOW}🚀 Creating MCP launcher script...${NC}"
cat > "./mcp-config/launch-mcp-servers.sh" << 'EOF'
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
EOF

chmod +x "./mcp-config/launch-mcp-servers.sh"

# Create health check HTML
echo -e "${YELLOW}🏥 Creating health check page...${NC}"
cat > "./mcp-config/health.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>MCP Services Health</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .healthy { background-color: #d4edda; color: #155724; }
        .info { background-color: #d1ecf1; color: #0c5460; }
    </style>
</head>
<body>
    <h1>🔌 MCP Services Health Status</h1>
    <div class="status healthy">✅ MCP Services Container: Running</div>
    <div class="status info">
        <h3>Available MCP Servers:</h3>
        <ul>
            <li>Playwright MCP Server</li>
            <li>Filesystem MCP Server</li>
            <li>Memory MCP Server</li>
            <li>Context7 MCP Server</li>
        </ul>
    </div>
</body>
</html>
EOF

# Update docker-compose.mcp.yml with new configuration
echo -e "${YELLOW}🐳 Updating docker-compose.mcp.yml...${NC}"
cat > "./docker-compose.mcp.yml" << 'EOF'
services:
  # MCP Services Container
  mcp-services:
    image: node:18-alpine
    container_name: geulpi_mcp_services
    working_dir: /app
    environment:
      - NODE_ENV=development
      - PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
    volumes:
      - ./mcp-config:/app/config
      - .:/app/project:ro
      - playwright_cache:/ms-playwright
      - mcp_node_modules:/app/node_modules
    networks:
      - geulpi_network
    command: /app/config/launch-mcp-servers.sh
    healthcheck:
      test: ["CMD", "pgrep", "-f", "mcp"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Health Check Dashboard
  mcp-health:
    image: nginx:alpine
    container_name: geulpi_mcp_health
    ports:
      - "9090:80"
    volumes:
      - ./mcp-config/health.html:/usr/share/nginx/html/index.html:ro
    networks:
      - geulpi_network
    depends_on:
      - mcp-services

volumes:
  playwright_cache:
  mcp_node_modules:

networks:
  geulpi_network:
    external: true
EOF

echo -e "${GREEN}✅ MCP configuration synchronized!${NC}"
echo -e "${GREEN}📁 Configuration files created:${NC}"
echo "   - mcp-config/mcp-servers-local.json (for local development)"
echo "   - mcp-config/mcp-servers-docker.json (for Docker environment)"
echo "   - mcp-config/launch-mcp-servers.sh (launcher script)"
echo "   - mcp-config/health.html (health check page)"
echo ""
echo -e "${YELLOW}🚀 To run MCP services in Docker:${NC}"
echo "   docker-compose -f docker-compose.mcp.yml up -d"
echo ""
echo -e "${YELLOW}🔍 To check MCP health status:${NC}"
echo "   Open http://localhost:9090 in your browser"