#!/usr/bin/env node

require('dotenv').config();
const { WeatherMCPServer } = require('./weather-server.js');

/**
 * Day 9 - WeatherTool MCP Client
 * 
 * This client demonstrates how to connect to our custom MCP server
 * and call the WeatherTool through the MCP protocol.
 */

class WeatherMCPClient {
    constructor() {
        this.server = null;
        this.isConnected = false;
        this.availableTools = [];
    }

    /**
     * Connect to the MCP server
     */
    async connect() {
        try {
            console.log('🔗 Connecting to Weather MCP Server...');
            
            // In a real implementation, this would connect through transport
            // For demo purposes, we'll directly instantiate the server
            this.server = new WeatherMCPServer();
            
            const serverInfo = await this.server.simulateServer();
            this.isConnected = true;
            
            console.log('✅ Connected successfully!');
            console.log(`📋 Server: ${serverInfo.name} v${serverInfo.version}`);
            console.log(`🛠️ Tools available: ${serverInfo.toolsCount}`);
            
            return true;
        } catch (error) {
            console.error('❌ Connection failed:', error.message);
            return false;
        }
    }

    /**
     * Discover available tools
     */
    async discoverTools() {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        try {
            console.log('🔍 Discovering available tools...');
            
            const response = await this.server.processRequest('tools/list');
            this.availableTools = response.tools;
            
            console.log(`📦 Discovered ${this.availableTools.length} tools:`);
            this.availableTools.forEach(tool => {
                console.log(`  - ${tool.name}: ${tool.description}`);
            });
            
            return this.availableTools;
        } catch (error) {
            console.error('❌ Tool discovery failed:', error.message);
            throw error;
        }
    }

    /**
     * Call a specific tool
     */
    async callTool(toolName, parameters) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        try {
            console.log(`🛠️ Calling tool: ${toolName}`);
            console.log(`📋 Parameters:`, JSON.stringify(parameters, null, 2));
            
            const response = await this.server.processRequest('tools/call', {
                name: toolName,
                arguments: parameters
            });
            
            if (response.isError) {
                console.log('❌ Tool execution failed');
            } else {
                console.log('✅ Tool executed successfully');
            }
            
            // Parse the response
            const result = JSON.parse(response.content[0].text);
            return result;
        } catch (error) {
            console.error(`❌ Tool call failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get weather for a location
     */
    async getWeather(location, options = {}) {
        const parameters = {
            location,
            ...options
        };

        return this.callTool('weather_tool', parameters);
    }

    /**
     * Display weather information in a formatted way
     */
    displayWeather(weatherData) {
        if (weatherData.error) {
            console.log(`❌ Error: ${weatherData.message}`);
            return;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`🌤️ WEATHER INFORMATION - ${weatherData.location}`);
        console.log('='.repeat(60));
        
        if (weatherData.current) {
            console.log('📊 Current Conditions:');
            console.log(`  🌡️ Temperature: ${weatherData.current.temperature}°C`);
            console.log(`  ☁️ Condition: ${weatherData.current.condition}`);
            
            if (weatherData.current.humidity !== undefined) {
                console.log(`  💧 Humidity: ${weatherData.current.humidity}%`);
            }
            
            if (weatherData.current.windSpeed !== undefined) {
                console.log(`  🌪️ Wind Speed: ${weatherData.current.windSpeed} km/h`);
            }
            
            if (weatherData.current.pressure !== undefined) {
                console.log(`  📊 Pressure: ${weatherData.current.pressure} hPa`);
            }
        }

        if (weatherData.forecast && weatherData.forecast.length > 0) {
            console.log('\n📅 Forecast:');
            weatherData.forecast.forEach(day => {
                console.log(`  ${day.day}: ${day.high}°/${day.low}° - ${day.condition}`);
            });
        }

        if (weatherData.alerts && weatherData.alerts.length > 0) {
            console.log('\n⚠️ Weather Alerts:');
            weatherData.alerts.forEach(alert => {
                console.log(`  ${alert.type} (${alert.severity}): ${alert.message}`);
            });
        }

        if (weatherData.details) {
            console.log('\n🔍 Additional Details:');
            console.log(`  🌅 Sunrise: ${weatherData.details.sunrise}`);
            console.log(`  🌆 Sunset: ${weatherData.details.sunset}`);
            console.log(`  🌙 Moon Phase: ${weatherData.details.moonPhase}`);
            
            if (weatherData.details.airQuality) {
                console.log(`  🏭 Air Quality: ${weatherData.details.airQuality.quality} (${weatherData.details.airQuality.index})`);
            }
        }

        console.log('\n💬 Summary: ' + weatherData.summary);
        console.log('='.repeat(60));
    }

    /**
     * Disconnect from the server
     */
    async disconnect() {
        if (this.isConnected) {
            console.log('🔌 Disconnecting from MCP server...');
            this.server = null;
            this.isConnected = false;
            this.availableTools = [];
            console.log('✅ Disconnected successfully');
        }
    }
}

/**
 * Interactive demo function
 */
async function runInteractiveDemo() {
    console.log('🌤️ Day 9 - Weather MCP Client Interactive Demo');
    console.log('==============================================\n');

    const client = new WeatherMCPClient();

    try {
        // Connect to server
        const connected = await client.connect();
        if (!connected) {
            console.log('❌ Failed to connect to MCP server');
            return;
        }

        // Discover tools
        await client.discoverTools();

        // Test different weather queries
        console.log('\n🧪 Testing Weather Queries...\n');

        const weatherQueries = [
            {
                description: 'Current weather in London',
                location: 'London',
                options: { type: 'current' }
            },
            {
                description: '3-day forecast for New York',
                location: 'New York',
                options: { type: 'forecast', days: 3 }
            },
            {
                description: 'Detailed weather for Tokyo',
                location: 'Tokyo',
                options: { type: 'detailed' }
            },
            {
                description: 'Weather alerts for Sydney',
                location: 'Sydney',
                options: { type: 'alerts' }
            },
            {
                description: 'Weather in Fahrenheit for Paris',
                location: 'Paris',
                options: { type: 'current', units: 'fahrenheit' }
            },
            {
                description: 'Unknown location test',
                location: 'Atlantis',
                options: { type: 'current' }
            }
        ];

        for (const query of weatherQueries) {
            console.log(`\n📍 ${query.description}:`);
            console.log('-'.repeat(50));

            try {
                const weatherData = await client.getWeather(query.location, query.options);
                client.displayWeather(weatherData);
            } catch (error) {
                console.log(`❌ Query failed: ${error.message}`);
            }

            // Add delay for readability
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Test tool schema validation
        console.log('\n🧪 Testing Parameter Validation...\n');

        try {
            console.log('📍 Testing missing location parameter:');
            const invalidResult = await client.callTool('weather_tool', {});
            client.displayWeather(invalidResult);
        } catch (error) {
            console.log(`❌ Validation test: ${error.message}`);
        }

        console.log('\n🎉 Interactive demo completed successfully!');
        console.log('💡 Custom WeatherTool MCP integration is working perfectly!');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    } finally {
        await client.disconnect();
    }
}

// Export for use as module
module.exports = { WeatherMCPClient };

// Run demo if executed directly
if (require.main === module) {
    runInteractiveDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}