#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { WeatherMCPServer } = require('./weather-server.js');

const app = express();
const PORT = process.env.PORT || 3009;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

/**
 * Day 9 - Custom WeatherTool MCP Web Server
 * Provides web UI for testing the custom WeatherTool through MCP
 */

// Store MCP server instance
let mcpServer = new WeatherMCPServer();
let isConnected = false;

// API Routes

// Connect to MCP server
app.post('/api/mcp/connect', async (req, res) => {
    try {
        console.log('🔗 Web client connecting to WeatherMCP server...');
        
        mcpServer = new WeatherMCPServer();
        const serverInfo = await mcpServer.simulateServer();
        isConnected = true;
        
        res.json({
            success: true,
            message: 'Connected to Weather MCP Server',
            serverInfo: {
                name: serverInfo.name,
                version: serverInfo.version,
                capabilities: serverInfo.capabilities,
                toolsCount: serverInfo.toolsCount
            }
        });
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
            isConnected = false;
            mcpServer = null;
        }
        
        res.json({
            success: true,
            message: 'Disconnected from Weather MCP Server'
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
    res.json({
        success: true,
        connected: isConnected,
        serverInfo: isConnected ? mcpServer.getServerInfo() : null
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

        const toolsList = await mcpServer.processRequest('tools/list');
        
        res.json({
            success: true,
            message: `Discovered ${toolsList.tools.length} tools`,
            tools: toolsList.tools,
            count: toolsList.tools.length
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
        if (!isConnected) {
            return res.json({
                success: true,
                connected: false,
                tools: [],
                count: 0
            });
        }

        const serverInfo = mcpServer.getServerInfo();
        
        res.json({
            success: true,
            connected: true,
            tools: serverInfo.tools,
            count: serverInfo.toolsCount
        });
    } catch (error) {
        console.error('Get tools error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Execute the weather tool
app.post('/api/weather', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                error: 'Not connected to MCP server. Connect first.'
            });
        }

        const { location, type = 'current', units = 'celsius', days = 5 } = req.body;

        if (!location) {
            return res.status(400).json({
                success: false,
                error: 'Location is required'
            });
        }

        console.log(`🌤️ Weather request: ${location} (${type}, ${units})`);

        const startTime = Date.now();
        const result = await mcpServer.processRequest('tools/call', {
            name: 'weather_tool',
            arguments: { location, type, units, days }
        });
        const executionTime = Date.now() - startTime;

        // Parse the weather data from MCP response
        const weatherData = JSON.parse(result.content[0].text);

        res.json({
            success: true,
            weather: weatherData,
            executionTime,
            location,
            type,
            units
        });
    } catch (error) {
        console.error('Weather request error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            location: req.body.location
        });
    }
});

// Get weather for specific locations (convenience endpoint)
app.get('/api/weather/:location', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                error: 'Not connected to MCP server'
            });
        }

        const { location } = req.params;
        const { type = 'current', units = 'celsius', days = 5 } = req.query;

        console.log(`🌤️ Weather GET request: ${location}`);

        const result = await mcpServer.processRequest('tools/call', {
            name: 'weather_tool',
            arguments: { location, type, units: units, days: parseInt(days) }
        });

        const weatherData = JSON.parse(result.content[0].text);

        res.json({
            success: true,
            weather: weatherData,
            location,
            type,
            units
        });
    } catch (error) {
        console.error('Weather GET error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            location: req.params.location
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'WeatherTool MCP Web UI',
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
        console.log('🔗 Auto-connecting to Weather MCP server...');
        mcpServer = new WeatherMCPServer();
        const serverInfo = await mcpServer.simulateServer();
        isConnected = true;
        console.log(`✅ Auto-connected to WeatherMCP server with ${serverInfo.toolsCount} tool(s)`);
    } catch (error) {
        console.log('⚠️ Auto-connect failed (this is OK):', error.message);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down WeatherTool MCP server...');
    if (isConnected) {
        isConnected = false;
        mcpServer = null;
    }
    process.exit(0);
});

app.listen(PORT, async () => {
    console.log(`🌤️ Day 9 - WeatherTool MCP Web UI running on port ${PORT}`);
    console.log(`📱 Visit http://localhost:${PORT} to test custom WeatherTool`);
    console.log(`🔧 API endpoints available at http://localhost:${PORT}/api/`);
    
    // Auto-connect after server starts
    await autoConnect();
});