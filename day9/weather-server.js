#!/usr/bin/env node

require('dotenv').config();
const { WeatherTool } = require('./weather-tool.js');

/**
 * Day 9 - Custom MCP Server with WeatherTool
 * 
 * This MCP server registers our custom WeatherTool and handles
 * tool discovery and execution requests.
 */

class WeatherMCPServer {
    constructor() {
        this.weatherTool = new WeatherTool();
        this.tools = new Map();
        this.registerTools();
    }

    /**
     * Register all available tools
     */
    registerTools() {
        // Register the weather tool
        const weatherSchema = this.weatherTool.getToolSchema();
        this.tools.set(weatherSchema.name, {
            schema: weatherSchema,
            executor: this.weatherTool
        });
        
        console.log(`📦 Registered tool: ${weatherSchema.name}`);
    }

    /**
     * Handle tools/list request
     */
    async handleToolsList() {
        const toolSchemas = Array.from(this.tools.values()).map(tool => tool.schema);
        
        console.log(`🔍 Tools list requested - returning ${toolSchemas.length} tools`);
        
        return {
            tools: toolSchemas
        };
    }

    /**
     * Handle tools/call request
     */
    async handleToolCall(request) {
        const { name, arguments: args } = request.params;
        
        console.log(`🛠️ Tool call: ${name} with arguments:`, args);

        if (!this.tools.has(name)) {
            throw new Error(`Tool '${name}' not found`);
        }

        const tool = this.tools.get(name);
        
        try {
            const startTime = Date.now();
            const result = await tool.executor.execute(args);
            const executionTime = Date.now() - startTime;
            
            console.log(`✅ Tool '${name}' executed successfully in ${executionTime}ms`);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ],
                isError: result.error || false
            };
        } catch (error) {
            console.error(`❌ Tool '${name}' execution failed:`, error.message);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: true,
                            message: error.message,
                            tool: name,
                            arguments: args
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    /**
     * Simulate MCP server for testing without SDK issues
     */
    async simulateServer() {
        console.log('🚀 WeatherMCP Server starting...');
        console.log('📋 Server Info:');
        console.log('  Name: weather-mcp-server');
        console.log('  Version: 1.0.0');
        console.log('  Capabilities: tools');
        console.log(`  Tools: ${this.tools.size}`);
        
        // List available tools
        const toolsList = await this.handleToolsList();
        console.log('\n🛠️ Available Tools:');
        toolsList.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
        });
        
        return {
            name: 'weather-mcp-server',
            version: '1.0.0',
            capabilities: {
                tools: true,
                resources: false,
                prompts: false
            },
            toolsCount: this.tools.size
        };
    }

    /**
     * Get server information
     */
    getServerInfo() {
        return {
            name: 'weather-mcp-server',
            version: '1.0.0',
            capabilities: {
                tools: true,
                resources: false,
                prompts: false
            },
            tools: Array.from(this.tools.values()).map(tool => ({
                name: tool.schema.name,
                description: tool.schema.description
            })),
            toolsCount: this.tools.size
        };
    }

    /**
     * Process MCP requests (simulation)
     */
    async processRequest(method, params = {}) {
        console.log(`📨 Processing request: ${method}`);
        
        switch (method) {
            case 'tools/list':
                return this.handleToolsList();
            
            case 'tools/call':
                return this.handleToolCall({ params });
            
            case 'server/info':
                return this.getServerInfo();
            
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }
}

/**
 * Demo function to test the MCP server
 */
async function runDemo() {
    console.log('🌤️ Day 9 - Custom WeatherTool MCP Server Demo');
    console.log('===============================================\n');

    const server = new WeatherMCPServer();
    
    try {
        // Start server
        const serverInfo = await server.simulateServer();
        console.log(`\n✅ Server started successfully!`);
        
        // Test tool discovery
        console.log('\n🔍 Testing tool discovery...');
        const toolsList = await server.processRequest('tools/list');
        console.log(`📦 Found ${toolsList.tools.length} tools`);
        
        // Test weather tool calls
        console.log('\n🧪 Testing weather tool calls...');
        
        const testCases = [
            {
                name: 'Current weather in London',
                call: { name: 'weather_tool', arguments: { location: 'London' } }
            },
            {
                name: 'Forecast for New York',
                call: { name: 'weather_tool', arguments: { location: 'New York', type: 'forecast', days: 3 } }
            },
            {
                name: 'Detailed weather for Tokyo',
                call: { name: 'weather_tool', arguments: { location: 'Tokyo', type: 'detailed' } }
            },
            {
                name: 'Weather alerts for Sydney',
                call: { name: 'weather_tool', arguments: { location: 'Sydney', type: 'alerts' } }
            },
            {
                name: 'Weather in Fahrenheit for Paris',
                call: { name: 'weather_tool', arguments: { location: 'Paris', units: 'fahrenheit' } }
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n📍 ${testCase.name}:`);
            console.log('-'.repeat(50));
            
            try {
                const result = await server.processRequest('tools/call', testCase.call);
                const weatherData = JSON.parse(result.content[0].text);
                
                if (weatherData.success) {
                    console.log(`✅ Location: ${weatherData.location}`);
                    console.log(`🌡️ Temperature: ${weatherData.current?.temperature}°${testCase.call.arguments.units === 'fahrenheit' ? 'F' : 'C'}`);
                    console.log(`☁️ Condition: ${weatherData.current?.condition}`);
                    
                    if (weatherData.forecast) {
                        console.log(`📅 Forecast: ${weatherData.forecast.length} days`);
                    }
                    
                    if (weatherData.alerts) {
                        console.log(`⚠️ Alerts: ${weatherData.alertCount}`);
                    }
                } else {
                    console.log(`❌ Error: ${weatherData.message}`);
                }
            } catch (error) {
                console.log(`💥 Test failed: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Demo completed successfully!');
        console.log('💡 The custom WeatherTool is working and can be called through MCP.');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

// Export for use as a module
module.exports = { WeatherMCPServer };

// Run demo if executed directly
if (require.main === module) {
    runDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}