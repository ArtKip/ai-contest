#!/usr/bin/env node

require('dotenv').config();

/**
 * Day 8 - MCP Integration (Simplified Demo)
 * 
 * This demonstrates MCP concepts without requiring a complex server setup.
 * We'll simulate the MCP protocol and tool discovery process.
 */

class MCPDemo {
    constructor() {
        this.isConnected = false;
        this.serverInfo = null;
        this.availableTools = [];
    }

    /**
     * Simulate connecting to an MCP server
     */
    async connect() {
        console.log('🔗 Connecting to MCP server...');
        
        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.isConnected = true;
        this.serverInfo = {
            name: 'demo-mcp-server',
            version: '1.0.0',
            capabilities: {
                tools: true,
                resources: false,
                prompts: false
            }
        };

        console.log('✅ Connected to MCP server!');
        console.log('📋 Server Info:', JSON.stringify(this.serverInfo, null, 2));
        
        return true;
    }

    /**
     * Simulate discovering available tools
     */
    async discoverTools() {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        console.log('🔍 Discovering available tools...');
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock tools that would be available from a real MCP server
        this.availableTools = [
            {
                name: 'web_search',
                description: 'Search the web for information using a search engine',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of results to return',
                            default: 10
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'file_read',
                description: 'Read contents of a file from the local filesystem',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to the file to read'
                        },
                        encoding: {
                            type: 'string',
                            description: 'File encoding (utf8, base64, etc.)',
                            default: 'utf8'
                        }
                    },
                    required: ['path']
                }
            },
            {
                name: 'http_request',
                description: 'Make HTTP requests to external APIs',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to make the request to'
                        },
                        method: {
                            type: 'string',
                            description: 'HTTP method',
                            enum: ['GET', 'POST', 'PUT', 'DELETE'],
                            default: 'GET'
                        },
                        headers: {
                            type: 'object',
                            description: 'HTTP headers to send'
                        },
                        body: {
                            type: 'string',
                            description: 'Request body for POST/PUT requests'
                        }
                    },
                    required: ['url']
                }
            },
            {
                name: 'calculate',
                description: 'Perform mathematical calculations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        expression: {
                            type: 'string',
                            description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")'
                        }
                    },
                    required: ['expression']
                }
            },
            {
                name: 'text_transform',
                description: 'Transform text using various operations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        text: {
                            type: 'string',
                            description: 'The text to transform'
                        },
                        operation: {
                            type: 'string',
                            description: 'Type of transformation',
                            enum: ['uppercase', 'lowercase', 'reverse', 'base64_encode', 'base64_decode']
                        }
                    },
                    required: ['text', 'operation']
                }
            }
        ];

        console.log(`📦 Discovered ${this.availableTools.length} tools!`);
        return this.availableTools;
    }

    /**
     * Display available tools in a formatted way
     */
    displayTools() {
        if (this.availableTools.length === 0) {
            console.log('📭 No tools discovered yet. Call discoverTools() first.');
            return;
        }

        console.log('\n' + '='.repeat(70));
        console.log('🛠️  AVAILABLE MCP TOOLS');
        console.log('='.repeat(70));

        this.availableTools.forEach((tool, index) => {
            console.log(`\n${index + 1}. ${tool.name}`);
            console.log(`   📝 ${tool.description}`);
            
            if (tool.inputSchema && tool.inputSchema.properties) {
                console.log('   📋 Parameters:');
                Object.entries(tool.inputSchema.properties).forEach(([key, prop]) => {
                    const required = tool.inputSchema.required?.includes(key) ? ' (required)' : '';
                    const defaultVal = prop.default ? ` [default: ${prop.default}]` : '';
                    console.log(`      • ${key}${required}: ${prop.description}${defaultVal}`);
                });
            }
            
            console.log('   ' + '-'.repeat(50));
        });

        console.log('\n' + '='.repeat(70));
    }

    /**
     * Simulate calling a tool
     */
    async callTool(toolName, parameters = {}) {
        if (!this.isConnected) {
            throw new Error('Not connected to MCP server');
        }

        const tool = this.availableTools.find(t => t.name === toolName);
        if (!tool) {
            throw new Error(`Tool '${toolName}' not found`);
        }

        console.log(`🧪 Calling tool: ${toolName}`);
        console.log(`📋 Parameters:`, JSON.stringify(parameters, null, 2));

        // Simulate tool execution delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock responses for different tools
        let response;
        switch (toolName) {
            case 'web_search':
                response = {
                    results: [
                        { title: 'Example Result 1', url: 'https://example.com/1', snippet: 'This is a mock search result...' },
                        { title: 'Example Result 2', url: 'https://example.com/2', snippet: 'Another mock search result...' }
                    ],
                    count: 2
                };
                break;
                
            case 'calculate':
                try {
                    // Simple expression evaluation (in real implementation, use a proper parser)
                    const result = eval(parameters.expression);
                    response = { result, expression: parameters.expression };
                } catch (error) {
                    response = { error: 'Invalid expression', expression: parameters.expression };
                }
                break;
                
            case 'text_transform':
                const { text, operation } = parameters;
                let transformed;
                switch (operation) {
                    case 'uppercase':
                        transformed = text.toUpperCase();
                        break;
                    case 'lowercase':
                        transformed = text.toLowerCase();
                        break;
                    case 'reverse':
                        transformed = text.split('').reverse().join('');
                        break;
                    case 'base64_encode':
                        transformed = Buffer.from(text).toString('base64');
                        break;
                    case 'base64_decode':
                        transformed = Buffer.from(text, 'base64').toString('utf8');
                        break;
                    default:
                        transformed = text;
                }
                response = { original: text, transformed, operation };
                break;
                
            default:
                response = { message: `Mock response from ${toolName}`, parameters };
        }

        console.log('✅ Tool response:', JSON.stringify(response, null, 2));
        return response;
    }

    /**
     * Get comprehensive information about the MCP connection
     */
    getConnectionInfo() {
        return {
            connected: this.isConnected,
            server: this.serverInfo,
            toolsDiscovered: this.availableTools.length,
            tools: this.availableTools.map(tool => ({
                name: tool.name,
                description: tool.description,
                parameterCount: Object.keys(tool.inputSchema?.properties || {}).length
            }))
        };
    }

    /**
     * Disconnect from the MCP server
     */
    async disconnect() {
        if (this.isConnected) {
            console.log('🔌 Disconnecting from MCP server...');
            this.isConnected = false;
            this.serverInfo = null;
            this.availableTools = [];
            console.log('✅ Disconnected successfully');
        }
    }
}

/**
 * Main demonstration function
 */
async function main() {
    console.log('🚀 Day 8 - MCP Integration Demo');
    console.log('================================');
    console.log('This demo simulates connecting to an MCP server and discovering tools.\n');

    const mcpDemo = new MCPDemo();

    try {
        // Step 1: Connect to MCP server
        await mcpDemo.connect();
        console.log();

        // Step 2: Discover available tools
        await mcpDemo.discoverTools();
        console.log();

        // Step 3: Display tools in formatted way
        mcpDemo.displayTools();

        // Step 4: Test some tools
        console.log('\n🧪 Testing MCP Tools:');
        console.log('='.repeat(30));

        // Test calculation tool
        await mcpDemo.callTool('calculate', { expression: '15 * 7 + 3' });
        console.log();

        // Test text transformation tool
        await mcpDemo.callTool('text_transform', { 
            text: 'Hello MCP World!', 
            operation: 'uppercase' 
        });
        console.log();

        // Test web search tool (mock)
        await mcpDemo.callTool('web_search', { 
            query: 'Model Context Protocol', 
            maxResults: 3 
        });
        console.log();

        // Step 5: Display connection information
        console.log('📊 Connection Information:');
        console.log('='.repeat(30));
        const info = mcpDemo.getConnectionInfo();
        console.log(JSON.stringify(info, null, 2));

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    } finally {
        // Cleanup
        await mcpDemo.disconnect();
    }

    console.log('\n✨ MCP Integration Demo Complete!');
    console.log('This demonstrates the core concepts of MCP: connecting, discovering tools, and calling them.');
}

// Export for use in other modules
module.exports = { MCPDemo };

// Run demo if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}