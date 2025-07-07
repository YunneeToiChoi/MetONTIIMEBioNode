#!/bin/bash

echo "🚀 Starting MetONTIIME Web Interface..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please run ./setup.sh first"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create necessary directories
mkdir -p uploads outputs history

echo "✅ Starting server on http://localhost:3000"
echo "📱 Open your browser and navigate to: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"

# Start the server
node server.js
