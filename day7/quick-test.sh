#!/bin/bash

# Quick test script for Day 7 - Dialogue Compression
# Tests basic functionality without running full demo

echo "🧪 Day 7 - Quick Test Script"
echo "============================"
echo ""

# Check if server is running
echo "📡 Checking if server is running..."
if curl -s http://localhost:3007/api/health > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running"
    echo ""
    echo "Please start the server first:"
    echo "  npm start"
    echo ""
    exit 1
fi

# Check API key
echo ""
echo "🔑 Checking API configuration..."
API_KEY_STATUS=$(curl -s http://localhost:3007/api/health | grep -o '"hasApiKey":[^,]*' | cut -d':' -f2)
if [ "$API_KEY_STATUS" = "true" ]; then
    echo "✅ API key is configured"
else
    echo "❌ API key is not configured"
    echo ""
    echo "Please set your API key:"
    echo "  export ANTHROPIC_API_KEY='your_key_here'"
    echo ""
    exit 1
fi

# Check active sessions
echo ""
echo "📊 Server Status:"
curl -s http://localhost:3007/api/health | grep -o '"activeSessions":[^,]*' | cut -d':' -f2 | xargs echo "  Active sessions:"
curl -s http://localhost:3007/api/health | grep -o '"messagesBeforeCompression":[^,]*' | cut -d':' -f2 | xargs echo "  Compression threshold:"

echo ""
echo "✅ All checks passed!"
echo ""
echo "🌐 Open http://localhost:3007 in your browser to test"
echo ""
echo "📝 Or run the full test suite:"
echo "  npm test"
echo ""
echo "📊 Or run the comparison demo:"
echo "  npm run demo"
echo ""

