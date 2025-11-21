#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { MCPDemo } = require('./simple-mcp-demo.js');

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

/**
 * Day 8 - MCP Integration Web Server
 * Provides web UI for testing MCP tool discovery and execution
 */

// Store MCP demo instance
let mcpDemo = new MCPDemo();
let isConnected = false;

// API Routes

// Connect to MCP server
app.post('/api/mcp/connect', async (req, res) => {
    try {
        if (isConnected) {
            await mcpDemo.disconnect();
        }
        
        mcpDemo = new MCPDemo();
        const connected = await mcpDemo.connect();
        
        if (connected) {
            isConnected = true;
            const serverInfo = mcpDemo.getConnectionInfo();
            
            res.json({
                success: true,
                message: 'Connected to MCP server',
                serverInfo: serverInfo.server,
                capabilities: serverInfo.server?.capabilities
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to connect to MCP server'
            });
        }
    } catch (error) {
        console.error('Connection error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Disconnect from MCP server
app.post('/api/mcp/disconnect', async (req, res) => {
    try {
        if (isConnected) {
            await mcpDemo.disconnect();
            isConnected = false;
        }
        
        res.json({
            success: true,
            message: 'Disconnected from MCP server'
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get connection status
app.get('/api/mcp/status', (req, res) => {
    const connectionInfo = mcpDemo.getConnectionInfo();
    
    res.json({
        success: true,
        connected: isConnected,
        connectionInfo
    });
});

// Discover available tools
app.post('/api/mcp/tools/discover', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                error: 'Not connected to MCP server. Connect first.'
            });
        }

        const tools = await mcpDemo.discoverTools();
        
        res.json({
            success: true,
            message: `Discovered ${tools.length} tools`,
            tools: tools,
            count: tools.length
        });
    } catch (error) {
        console.error('Tool discovery error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get list of available tools
app.get('/api/mcp/tools', (req, res) => {
    try {
        const connectionInfo = mcpDemo.getConnectionInfo();
        
        if (!isConnected) {
            return res.json({
                success: true,
                connected: false,
                tools: [],
                count: 0
            });
        }

        res.json({
            success: true,
            connected: true,
            tools: connectionInfo.tools,
            count: connectionInfo.toolsDiscovered
        });
    } catch (error) {
        console.error('Get tools error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Execute a specific tool
app.post('/api/mcp/tools/execute', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                error: 'Not connected to MCP server. Connect first.'
            });
        }

        const { toolName, parameters } = req.body;

        if (!toolName) {
            return res.status(400).json({
                success: false,
                error: 'Tool name is required'
            });
        }

        console.log(`🧪 Executing tool: ${toolName} with parameters:`, parameters);

        const startTime = Date.now();
        const result = await mcpDemo.callTool(toolName, parameters || {});
        const executionTime = Date.now() - startTime;

        res.json({
            success: true,
            message: `Tool ${toolName} executed successfully`,
            toolName,
            parameters,
            result,
            executionTime
        });
    } catch (error) {
        console.error('Tool execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            toolName: req.body.toolName,
            parameters: req.body.parameters
        });
    }
});

// Get tool schema/details
app.get('/api/mcp/tools/:toolName', (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                error: 'Not connected to MCP server'
            });
        }

        const { toolName } = req.params;
        const connectionInfo = mcpDemo.getConnectionInfo();
        
        // Find the tool in available tools
        const availableTools = mcpDemo.availableTools || [];
        const tool = availableTools.find(t => t.name === toolName);

        if (!tool) {
            return res.status(404).json({
                success: false,
                error: `Tool '${toolName}' not found`
            });
        }

        res.json({
            success: true,
            tool
        });
    } catch (error) {
        console.error('Get tool schema error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'MCP Integration Web UI',
        connected: isConnected,
        timestamp: new Date().toISOString()
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auto-connect on server start
async function autoConnect() {
    try {
        console.log('🔗 Auto-connecting to MCP server...');
        const connected = await mcpDemo.connect();
        if (connected) {
            isConnected = true;
            await mcpDemo.discoverTools();
            console.log(`✅ Auto-connected and discovered ${mcpDemo.availableTools.length} tools`);
        }
    } catch (error) {
        console.log('⚠️ Auto-connect failed (this is OK):', error.message);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down MCP server...');
    if (isConnected) {
        await mcpDemo.disconnect();
    }
    process.exit(0);
});

app.listen(PORT, async () => {
    console.log(`🚀 Day 8 - MCP Integration Web UI running on port ${PORT}`);
    console.log(`📱 Visit http://localhost:${PORT} to test MCP integration`);
    console.log(`🔧 API endpoints available at http://localhost:${PORT}/api/`);
    
    // Auto-connect after server starts
    await autoConnect();
});