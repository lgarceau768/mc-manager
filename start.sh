#!/bin/bash

# Minecraft Server Manager - Quick Start Script

set -e

echo "🎮 Minecraft Server Manager - Quick Start"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is installed and running"
echo ""

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose is available"
echo ""

# Pull Minecraft server image
echo "📦 Pulling Minecraft server image (this may take a few minutes)..."
docker pull itzg/minecraft-server:latest
echo "✅ Minecraft server image pulled"
echo ""

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/database data/servers logs
echo "✅ Data directories created"
echo ""

# Build and start services
echo "🚀 Building and starting services..."
docker compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   API:      http://localhost:3001/api"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs:    docker compose logs -f"
    echo "   Stop:         docker compose down"
    echo "   Restart:      docker compose restart"
    echo ""
    echo "📖 For more information, see README.md"
else
    echo ""
    echo "❌ Services failed to start. Check logs:"
    echo "   docker compose logs"
    exit 1
fi
