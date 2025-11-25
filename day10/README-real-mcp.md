# Real MCP Server Architecture

This demonstrates **actual** separate MCP servers vs the simulated version.

## Architecture Comparison

### Current (Simulated MCP)
- ✅ Single Node.js process
- ✅ All tools in memory  
- ✅ Fast execution (no network calls)
- ✅ Easy to debug and develop

### Real MCP Servers (New)
- 🌐 Separate processes per tool
- 🌐 HTTP/REST API communication
- 🌐 True distributed architecture 
- 🌐 Realistic MCP protocol implementation

## Quick Start - Real MCP

### 1. Start All Servers (Easy Way)
```bash
node start-all-servers.js
```

### 2. Start Servers Individually (Manual Way)
```bash
# Terminal 1 - SearchDocs Server
node servers/search-mcp-server.js

# Terminal 2 - Summarize Server  
node servers/summarize-mcp-server.js

# Terminal 3 - SaveToFile Server
node servers/savetofile-mcp-server.js
```

### 3. Run Real MCP Client
```bash
# In a new terminal
node real-mcp-client.js
```

## Testing Individual Servers

### SearchDocs Server (Port 3001)
```bash
# Server info
curl http://localhost:3001/mcp/info

# List tools
curl http://localhost:3001/mcp/tools/list

# Execute search
curl -X POST http://localhost:3001/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_docs", 
    "arguments": {
      "query": "JavaScript functions",
      "maxResults": 1
    }
  }'
```

### Summarize Server (Port 3002)
```bash
# Server info
curl http://localhost:3002/mcp/info

# Execute summarization
curl -X POST http://localhost:3002/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "summarize",
    "arguments": {
      "content": "JavaScript is a programming language...",
      "summaryType": "bullet_points"
    }
  }'
```

### SaveToFile Server (Port 3003)
```bash
# Server info
curl http://localhost:3003/mcp/info

# Save file
curl -X POST http://localhost:3003/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "save_to_file",
    "arguments": {
      "content": "My content",
      "filename": "test_via_curl",
      "format": "txt"
    }
  }'
```

## Health Checks
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health  
curl http://localhost:3003/health
```

## Real vs Simulated Performance

### Simulated MCP (Current)
- ⚡ ~1-5ms per pipeline
- 💾 No network overhead
- 🔧 Easy debugging

### Real MCP (New)
- 🌐 ~50-200ms per pipeline  
- 🌐 Network latency included
- 🔧 Realistic production scenario

## Key Benefits of Real MCP

1. **True Microservices**: Each tool runs independently
2. **Scalability**: Scale individual tools separately  
3. **Language Agnostic**: Each server could be different language
4. **Fault Isolation**: One tool failure doesn't crash others
5. **Production Ready**: Matches real-world MCP deployments

## Monitoring Real Servers

```bash
# Check all server health
for port in 3001 3002 3003; do
  echo "Port $port: $(curl -s http://localhost:$port/health || echo 'DOWN')"
done

# Monitor server logs
# When using start-all-servers.js, logs are prefixed with server name
```

## File Structure
```
servers/
├── search-mcp-server.js      # Port 3001 - SearchDocs tool
├── summarize-mcp-server.js    # Port 3002 - Summarize tool  
├── savetofile-mcp-server.js   # Port 3003 - SaveToFile tool
real-mcp-client.js             # Client that calls real servers
start-all-servers.js           # Utility to start all servers
```

This gives you both approaches:
- **Simulated** for development speed
- **Real MCP** for production realism! 🎯