#!/usr/bin/env node

require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

/**
 * Day 8 - MCP Integration
 * 
 * This module demonstrates how to connect to an MCP (Model Context Protocol) server
 * and retrieve the list of available tools.
 */

class MCPIntegration {
    constructor() {
        this.client = null;
        this.transport = null;
        this.isConnected = false;
        this.serverCapabilities = null;
        this.availableTools = [];
    }

    /**
     * Initialize MCP client with different transport options
     */
    async initializeClient(transportType = 'stdio', config = {}) {
        try {
            console.log(`🔗 Initializing MCP client with ${transportType} transport...`);
            
            // Create transport based on type
            switch (transportType) {
                case 'stdio':
                    this.transport = new StdioClientTransport({
                        command: config.command || 'node',
                        args: config.args || ['mcp-server-simple.js'],
                        env: config.env || process.env
                    });
                    break;
                
                case 'sse':
                    this.transport = new SSEClientTransport(
                        config.url || 'http://localhost:3000/sse'
                    );
                    break;
                
                default:
                    throw new Error(`Unsupported transport type: ${transportType}`);
            }

            // Create and initialize the client
            this.client = new Client(
                {
                    name: 'ai-contest-day8',
                    version: '1.0.0'
                },
                {
                    capabilities: {
                        tools: {}
                    }
                }
            );

            // Connect to the server
            await this.client.connect(this.transport);
            this.isConnected = true;
            
            console.log('✅ Successfully connected to MCP server!');
            
            // Get server capabilities
            this.serverCapabilities = this.client.getServerCapabilities();
            console.log('📋 Server capabilities:', JSON.stringify(this.serverCapabilities, null, 2));
            
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize MCP client:', error.message);
            console.error('Stack:', error.stack);
            return false;
        }
    }

    /**
     * Retrieve list of available tools from the MCP server
     */
    async getAvailableTools() {
        if (!this.isConnected) {
            throw new Error('MCP client is not connected. Call initializeClient() first.');
        }

        try {
            console.log('🔍 Fetching available tools from MCP server...');
            
            // Request tools list
            const response = await this.client.request({
                method: 'tools/list'
            }, {
                // Optional parameters for tools/list
            });

            this.availableTools = response.tools || [];
            
            console.log(`📦 Found ${this.availableTools.length} available tools:`);
            
            // Display tools in a formatted way
            this.displayTools();
            
            return this.availableTools;

        } catch (error) {
            console.error('❌ Failed to fetch tools:', error.message);
            throw error;
        }
    }

    /**
     * Display tools in a formatted, readable way
     */
    displayTools() {
        if (this.availableTools.length === 0) {
            console.log('📭 No tools available from the MCP server.');
            return;
        }

        console.log('\n' + '='.repeat(60));
        console.log('🛠️  AVAILABLE MCP TOOLS');
        console.log('='.repeat(60));

        this.availableTools.forEach((tool, index) => {
            console.log(`\n${index + 1}. ${tool.name}`);
            console.log(`   Description: ${tool.description || 'No description provided'}`);
            
            if (tool.inputSchema) {
                console.log('   Input Schema:');
                if (tool.inputSchema.properties) {
                    Object.entries(tool.inputSchema.properties).forEach(([key, prop]) => {
                        const required = tool.inputSchema.required?.includes(key) ? ' (required)' : '';
                        console.log(`     - ${key}${required}: ${prop.description || prop.type || 'no description'}`);
                    });
                } else {
                    console.log('     No input parameters');
                }
            }
            
            console.log('   ---');
        });

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Test calling a specific tool (if available)
     */
    async testTool(toolName, args = {}) {
        if (!this.isConnected) {
            throw new Error('MCP client is not connected.');
        }

        try {
            console.log(`🧪 Testing tool: ${toolName}`);
            
            const response = await this.client.request({
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            });

            console.log('✅ Tool response:', JSON.stringify(response, null, 2));
            return response;

        } catch (error) {
            console.error(`❌ Failed to call tool ${toolName}:`, error.message);
            throw error;
        }
    }

    /**
     * Get server information and status
     */
    async getServerInfo() {
        if (!this.isConnected) {
            return { connected: false };
        }

        return {
            connected: this.isConnected,
            capabilities: this.serverCapabilities,
            toolCount: this.availableTools.length,
            tools: this.availableTools.map(tool => ({
                name: tool.name,
                description: tool.description
            }))
        };
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.close();
                this.isConnected = false;
                console.log('🔌 Disconnected from MCP server');
            } catch (error) {
                console.error('⚠️ Error during disconnect:', error.message);
            }
        }
    }
}

/**
 * Create a simple MCP server for testing purposes
 */
async function createSimpleMCPServer() {
    const fs = require('fs');
    const path = require('path');
    
    const serverCode = `#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

/**
 * Simple MCP Server for testing
 * Provides basic tools for demonstration
 */

class SimpleMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'simple-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupTools();
    }

    setupTools() {
        // Tool 1: Echo - returns the input message
        this.server.setRequestHandler('tools/list', async () => {
            return {
                tools: [
                    {
                        name: 'echo',
                        description: 'Returns the input message back to the caller',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: 'The message to echo back'
                                }
                            },
                            required: ['message']
                        }
                    },
                    {
                        name: 'get_time',
                        description: 'Returns the current date and time',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                format: {
                                    type: 'string',
                                    description: 'Time format (iso, locale, or timestamp)',
                                    enum: ['iso', 'locale', 'timestamp']
                                }
                            }
                        }
                    },
                    {
                        name: 'calculate',
                        description: 'Performs basic mathematical calculations',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                operation: {
                                    type: 'string',
                                    description: 'Mathematical operation',
                                    enum: ['add', 'subtract', 'multiply', 'divide']
                                },
                                a: {
                                    type: 'number',
                                    description: 'First number'
                                },
                                b: {
                                    type: 'number',
                                    description: 'Second number'
                                }
                            },
                            required: ['operation', 'a', 'b']
                        }
                    }
                ]
            };
        });

        // Handle tool calls
        this.server.setRequestHandler('tools/call', async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case 'echo':
                    return {
                        content: [
                            {
                                type: 'text',
                                text: \`Echo: \${args.message}\`
                            }
                        ]
                    };

                case 'get_time':
                    const now = new Date();
                    let timeString;
                    
                    switch (args.format) {
                        case 'iso':
                            timeString = now.toISOString();
                            break;
                        case 'timestamp':
                            timeString = now.getTime().toString();
                            break;
                        case 'locale':
                        default:
                            timeString = now.toLocaleString();
                            break;
                    }

                    return {
                        content: [
                            {
                                type: 'text',
                                text: \`Current time (\${args.format || 'locale'}): \${timeString}\`
                            }
                        ]
                    };

                case 'calculate':
                    const { operation, a, b } = args;
                    let result;

                    switch (operation) {
                        case 'add':
                            result = a + b;
                            break;
                        case 'subtract':
                            result = a - b;
                            break;
                        case 'multiply':
                            result = a * b;
                            break;
                        case 'divide':
                            if (b === 0) {
                                throw new Error('Division by zero');
                            }
                            result = a / b;
                            break;
                        default:
                            throw new Error(\`Unknown operation: \${operation}\`);
                    }

                    return {
                        content: [
                            {
                                type: 'text',
                                text: \`\${a} \${operation} \${b} = \${result}\`
                            }
                        ]
                    };

                default:
                    throw new Error(\`Unknown tool: \${name}\`);
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Simple MCP Server running on stdio transport');
    }
}

// Run the server if this file is executed directly
if (require.main === module) {
    const server = new SimpleMCPServer();
    server.run().catch(console.error);
}

module.exports = SimpleMCPServer;
`;

    const serverPath = path.join(__dirname, 'mcp-server-simple.js');
    fs.writeFileSync(serverPath, serverCode);
    console.log('📄 Created simple MCP server at:', serverPath);
    
    return serverPath;
}

/**
 * Main function to demonstrate MCP integration
 */
async function main() {
    console.log('🚀 Day 8 - MCP Integration Demo');
    console.log('================================');

    // Create a simple MCP server for testing
    await createSimpleMCPServer();

    const mcpClient = new MCPIntegration();

    try {
        // Initialize the client and connect to the server
        const connected = await mcpClient.initializeClient('stdio', {
            command: 'node',
            args: ['mcp-server-simple.js']
        });

        if (!connected) {
            console.error('Failed to connect to MCP server');
            process.exit(1);
        }

        // Get and display available tools
        await mcpClient.getAvailableTools();

        // Test some tools
        console.log('\\n🧪 Testing MCP tools...');
        
        // Test echo tool
        try {
            await mcpClient.testTool('echo', { message: 'Hello MCP!' });
        } catch (error) {
            console.error('Echo tool test failed:', error.message);
        }

        // Test time tool
        try {
            await mcpClient.testTool('get_time', { format: 'iso' });
        } catch (error) {
            console.error('Time tool test failed:', error.message);
        }

        // Test calculator tool
        try {
            await mcpClient.testTool('calculate', { 
                operation: 'multiply', 
                a: 15, 
                b: 7 
            });
        } catch (error) {
            console.error('Calculator tool test failed:', error.message);
        }

        // Display server information
        const serverInfo = await mcpClient.getServerInfo();
        console.log('\\n📊 Server Information:');
        console.log(JSON.stringify(serverInfo, null, 2));

    } catch (error) {
        console.error('❌ MCP Demo failed:', error.message);
    } finally {
        // Clean up
        await mcpClient.disconnect();
    }
}

// Export for use in other modules
module.exports = { MCPIntegration, createSimpleMCPServer };

// Run the demo if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}