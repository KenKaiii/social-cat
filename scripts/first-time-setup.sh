#!/bin/bash

# First-Time Setup Script for b0t
# Handles complete environment setup from scratch

set -e  # Exit on error

echo "🚀 Welcome to b0t Setup!"
echo "This script will set up your complete development environment."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print step headers
print_step() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warnings
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print errors
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================================================
# STEP 1: Prerequisites Check
# ============================================================================
print_step "Step 1/7: Checking Prerequisites"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 20+ from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    print_error "Node.js version $NODE_VERSION is too old (need 20+)"
    exit 1
fi
print_success "Node.js $(node -v) installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
print_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') installed"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_warning "Docker is not running"
    echo "Attempting to start Docker Desktop..."

    # Try to start Docker (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        echo "Waiting for Docker to start..."

        for i in {1..30}; do
            if docker info > /dev/null 2>&1; then
                print_success "Docker is now running"
                break
            fi
            echo "  Waiting... ($i/30)"
            sleep 2
        done

        if ! docker info > /dev/null 2>&1; then
            print_error "Docker failed to start. Please start Docker Desktop manually and run this script again."
            exit 1
        fi
    else
        print_error "Please start Docker Desktop manually and run this script again."
        exit 1
    fi
fi
print_success "Docker is running"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed (should come with Node.js)"
    exit 1
fi
print_success "npm $(npm -v) installed"

# ============================================================================
# STEP 2: Install Dependencies
# ============================================================================
print_step "Step 2/7: Installing Node.js Dependencies"

if [ ! -d "node_modules" ]; then
    echo "Running npm install..."
    npm install --silent
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed (skipping)"
fi

# ============================================================================
# STEP 3: Environment Configuration
# ============================================================================
print_step "Step 3/7: Configuring Environment Variables"

if [ ! -f .env.local ]; then
    print_warning ".env.local not found - creating from example"
    cp .env.local.example .env.local
    print_success ".env.local created"

    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}IMPORTANT: You need to configure your API keys!${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Please add the following to .env.local:"
    echo ""
    echo "1. OPENAI_API_KEY - Get from: https://platform.openai.com/api-keys"
    echo "2. AUTH_SECRET - Generate with: openssl rand -base64 32"
    echo ""
    echo -e "${YELLOW}The script will pause here. Press Enter after you've configured these...${NC}"
    read -p ""
else
    print_success ".env.local already exists"
fi

# Check if required variables are set
source .env.local 2>/dev/null || true

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" == "sk-your-key-here" ]; then
    print_warning "OPENAI_API_KEY not configured in .env.local"
    echo "You'll need to add this before the app will work properly"
fi

if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" == "your-secret-here" ]; then
    print_warning "AUTH_SECRET not configured - generating one..."
    AUTH_SECRET=$(openssl rand -base64 32)

    # Update .env.local with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|AUTH_SECRET=.*|AUTH_SECRET=$AUTH_SECRET|" .env.local
    else
        sed -i "s|AUTH_SECRET=.*|AUTH_SECRET=$AUTH_SECRET|" .env.local
    fi
    print_success "Generated AUTH_SECRET"
fi

# Ensure DATABASE_URL and REDIS_URL are set for Docker
if ! grep -q "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_cat_dev" .env.local; then
    echo "" >> .env.local
    echo "# Docker Services (auto-configured)" >> .env.local
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_cat_dev" >> .env.local
    echo "REDIS_URL=redis://localhost:6379" >> .env.local
    print_success "Added Docker connection strings to .env.local"
fi

# ============================================================================
# STEP 4: Start Docker Services
# ============================================================================
print_step "Step 4/7: Starting Docker Services (PostgreSQL + Redis)"

# Stop any existing containers
echo "Stopping any existing containers..."
docker compose down 2>/dev/null || true

# Start PostgreSQL and Redis
echo "Starting PostgreSQL and Redis containers..."
echo "(This may take a few minutes on first run while images download)"
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo ""
echo "Waiting for PostgreSQL to be ready..."
max_attempts=60
attempt=0
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        print_error "PostgreSQL failed to start after ${max_attempts} seconds"
        echo "Check logs with: docker compose logs postgres"
        exit 1
    fi
    echo "  Waiting... ($attempt/$max_attempts)"
    sleep 1
done
print_success "PostgreSQL is ready"

# Wait for Redis to be ready
echo ""
echo "Waiting for Redis to be ready..."
max_attempts=30
attempt=0
until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        print_error "Redis failed to start after ${max_attempts} seconds"
        echo "Check logs with: docker compose logs redis"
        exit 1
    fi
    echo "  Waiting... ($attempt/$max_attempts)"
    sleep 1
done
print_success "Redis is ready"

# ============================================================================
# STEP 5: Database Setup
# ============================================================================
print_step "Step 5/7: Setting Up Database Schema"

# Source .env.local to make DATABASE_URL available
export $(grep -v '^#' .env.local | xargs)

echo "Pushing database schema to PostgreSQL..."
npm run db:push --silent || {
    print_warning "Database push failed - trying force push..."
    npm run db:push:force --silent
}
print_success "Database schema created"

# ============================================================================
# STEP 6: Verify Installation
# ============================================================================
print_step "Step 6/7: Verifying Installation"

# Check Docker containers
echo "Checking Docker containers..."
if docker compose ps | grep -q "postgres.*running"; then
    print_success "PostgreSQL container running"
else
    print_error "PostgreSQL container not running"
fi

if docker compose ps | grep -q "redis.*running"; then
    print_success "Redis container running"
else
    print_error "Redis container not running"
fi

# Test database connection
echo "Testing database connection..."
if docker compose exec -T postgres psql -U postgres -d social_cat_dev -c "SELECT 1" > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_warning "Database connection test failed"
fi

# Test Redis connection
echo "Testing Redis connection..."
if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_success "Redis connection successful"
else
    print_warning "Redis connection test failed"
fi

# ============================================================================
# STEP 7: Final Instructions
# ============================================================================
print_step "Step 7/7: Setup Complete! 🎉"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   Your development environment is ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Services Running:"
echo "   ✓ PostgreSQL:  localhost:5432"
echo "   ✓ Redis:       localhost:6379"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "   1. Start the development server:"
echo -e "      ${BLUE}npm run dev${NC}"
echo ""
echo "   2. Open your browser:"
echo -e "      ${BLUE}http://localhost:3000${NC}"
echo ""
echo "   3. Login with:"
echo "      Email:    admin@b0t.dev"
echo "      Password: admin"
echo ""
echo "🔧 Useful Commands:"
echo ""
echo "   npm run dev              # Start development server"
echo "   npm run db:studio        # Open database GUI"
echo "   npm run docker:logs      # View Docker logs"
echo "   npm run docker:stop      # Stop Docker services"
echo ""
echo "📚 Documentation:"
echo "   docs/GETTING_STARTED.md       # Complete guide"
echo "   docs/DOCKER_SETUP.md          # Docker details"
echo "   docs/CONCURRENT_WORKFLOWS.md  # Queue system"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
