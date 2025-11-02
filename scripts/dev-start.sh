#!/bin/bash

# Quick start script for development
# Starts Docker services and Next.js dev server

set -e

echo "🚀 Starting development environment..."

# Check if Docker containers are running
if ! docker compose ps | grep -q "postgres.*running" || ! docker compose ps | grep -q "redis.*running"; then
    echo "⚠️  Docker containers not running. Starting them..."
    docker compose up -d postgres redis

    # Wait for services
    echo "⏳ Waiting for services to be ready..."
    sleep 3

    # Wait for PostgreSQL
    until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
        echo "   Waiting for PostgreSQL..."
        sleep 1
    done

    # Wait for Redis
    until docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
        echo "   Waiting for Redis..."
        sleep 1
    done

    echo "✅ Services are ready"
fi

echo "✅ Docker services running"
echo ""
echo "📊 Service URLs:"
echo "   - App: http://localhost:3000"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "🔧 Starting Next.js development server..."
echo ""

# Start Next.js dev server
npm run dev
