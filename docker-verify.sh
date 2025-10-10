#!/bin/bash

# Docker Setup Verification Script
# Studio Revenue Manager

set -e

echo "🔍 Verifying Docker setup for Studio Revenue Manager..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo "1️⃣  Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

DOCKER_VERSION=$(docker --version)
echo -e "${GREEN}✅ Docker installed: ${DOCKER_VERSION}${NC}"
echo ""

# Check Docker Compose
echo "2️⃣  Checking Docker Compose..."
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available${NC}"
    exit 1
fi

COMPOSE_VERSION=$(docker compose version)
echo -e "${GREEN}✅ Docker Compose available: ${COMPOSE_VERSION}${NC}"
echo ""

# Check if Docker daemon is running
echo "3️⃣  Checking Docker daemon..."
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "   Please start Docker Desktop"
    exit 1
fi
echo -e "${GREEN}✅ Docker daemon is running${NC}"
echo ""

# Check for required files
echo "4️⃣  Checking required files..."
FILES=(
    "docker-compose.yml"
    ".env.docker.example"
    "packages/backend/Dockerfile"
    "packages/backend/.dockerignore"
    "DOCKER.md"
)

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "${GREEN}✅ Found: $FILE${NC}"
    else
        echo -e "${RED}❌ Missing: $FILE${NC}"
        exit 1
    fi
done
echo ""

# Check for .env.docker
echo "5️⃣  Checking environment configuration..."
if [ ! -f ".env.docker" ]; then
    echo -e "${YELLOW}⚠️  .env.docker not found${NC}"
    echo "   Creating from .env.docker.example..."
    cp .env.docker.example .env.docker
    echo -e "${GREEN}✅ Created .env.docker${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.docker and set:${NC}"
    echo "   - POSTGRES_PASSWORD"
    echo "   - JWT_SECRET"
fi
echo ""

# Validate docker-compose.yml
echo "6️⃣  Validating docker-compose.yml..."
if docker compose --env-file .env.docker config --quiet; then
    echo -e "${GREEN}✅ docker-compose.yml is valid${NC}"
else
    echo -e "${RED}❌ docker-compose.yml has errors${NC}"
    exit 1
fi
echo ""

# Check for port conflicts
echo "7️⃣  Checking for port conflicts..."
PORTS=(3000 5432)
for PORT in "${PORTS[@]}"; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $PORT is already in use${NC}"
        echo "   You may need to change the port in .env.docker"
    else
        echo -e "${GREEN}✅ Port $PORT is available${NC}"
    fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Docker setup verification complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Edit .env.docker and set secure values for:"
echo "   - POSTGRES_PASSWORD"
echo "   - JWT_SECRET (generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
echo ""
echo "2. Build and start containers:"
echo "   docker compose --env-file .env.docker up --build -d"
echo ""
echo "3. Check container status:"
echo "   docker compose ps"
echo ""
echo "4. View logs:"
echo "   docker compose logs -f backend"
echo ""
echo "5. Test health endpoint:"
echo "   curl http://localhost:3000/health"
echo ""
echo "For more information, see DOCKER.md"
