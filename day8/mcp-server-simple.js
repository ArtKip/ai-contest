#!/usr/bin/env node

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
                                text: `Echo: ${args.message}`
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
                                text: `Current time (${args.format || 'locale'}): ${timeString}`
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
                            throw new Error(`Unknown operation: ${operation}`);
                    }

                    return {
                        content: [
                            {
                                type: 'text',
                                text: `${a} ${operation} ${b} = ${result}`
                            }
                        ]
                    };

                default:
                    throw new Error(`Unknown tool: ${name}`);
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
