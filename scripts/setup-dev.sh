#!/bin/bash

# Development Environment Setup Script
# Sets up Docker containers (PostgreSQL + Redis) and initializes the database

set -e  # Exit on error

echo "🚀 Setting up development environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from example...${NC}"
    cp .env.local.example .env.local
    echo -e "${YELLOW}📝 Please edit .env.local and add your API keys${NC}"
    echo -e "${YELLOW}   Required: OPENAI_API_KEY, AUTH_SECRET${NC}"
    echo ""
    echo -e "${YELLOW}   Generate AUTH_SECRET with: openssl rand -base64 32${NC}"
    echo ""
    read -p "Press Enter after you've configured .env.local..."
fi

# Stop existing containers (if any)
echo ""
echo "🛑 Stopping any existing containers..."
docker compose down 2>/dev/null || true

# Start Docker containers
echo ""
echo "🐳 Starting Docker containers (PostgreSQL + Redis)..."
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ PostgreSQL failed to start after ${max_attempts} seconds${NC}"
        exit 1
    fi
    echo "   Waiting... ($attempt/$max_attempts)"
    sleep 1
done

echo -e "${GREEN}✅ PostgreSQL is ready${NC}"

# Wait for Redis to be ready
echo ""
echo "⏳ Waiting for Redis to be ready..."
max_attempts=30
attempt=0
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Redis failed to start after ${max_attempts} seconds${NC}"
        exit 1
    fi
    echo "   Waiting... ($attempt/$max_attempts)"
    sleep 1
done

echo -e "${GREEN}✅ Redis is ready${NC}"

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
npm run db:push

echo ""
echo -e "${GREEN}✅ Development environment is ready!${NC}"
echo ""
echo "📊 Services running:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "🎯 Next steps:"
echo "   1. npm run dev          # Start development server"
echo "   2. npm run db:studio    # Open database GUI (optional)"
echo ""
echo "🔧 Useful commands:"
echo "   - docker compose logs postgres  # View PostgreSQL logs"
echo "   - docker compose logs redis     # View Redis logs"
echo "   - docker compose down           # Stop all containers"
echo "   - docker compose --profile debug up  # Start with GUI tools (pgAdmin + Redis Commander)"
echo ""
