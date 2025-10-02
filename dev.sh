#!/bin/bash

# KAFU System Development Helper Script

case "$1" in
  "dev")
    echo "🚀 Starting KAFU System in DEVELOPMENT mode..."
    echo "✅ Hot reload enabled for frontend and backend"
    echo "✅ Changes will be reflected automatically"
    echo ""
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml up --build
    ;;
  "prod")
    echo "🏭 Starting KAFU System in PRODUCTION mode..."
    echo "⚠️  Changes require rebuild and restart"
    echo ""
    docker-compose down
    docker-compose up --build -d
    ;;
  "stop")
    echo "🛑 Stopping all KAFU System containers..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    ;;
  "logs")
    echo "📋 Showing logs..."
    docker-compose -f docker-compose.dev.yml logs -f
    ;;
  *)
    echo "KAFU System Development Helper"
    echo ""
    echo "Usage: $0 {dev|prod|stop|logs}"
    echo ""
    echo "Commands:"
    echo "  dev   - Start in development mode (hot reload)"
    echo "  prod  - Start in production mode"
    echo "  stop  - Stop all containers"
    echo "  logs  - Show development logs"
    echo ""
    echo "Examples:"
    echo "  $0 dev    # Start development with hot reload"
    echo "  $0 prod   # Start production build"
    echo "  $0 stop   # Stop everything"
    echo "  $0 logs   # View logs"
    ;;
esac
