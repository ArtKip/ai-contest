#!/usr/bin/env node

const express = require('express');
const { SummarizeTool } = require('../tools/summarize-tool.js');

/**
 * Standalone MCP Server for Summarize Tool
 * Runs on port 3002
 */

class SummarizeMCPServer {
    constructor(port = 3002) {
        this.port = port;
        this.app = express();
        this.tool = new SummarizeTool();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`📝 [SummarizeMCP] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // MCP Protocol Routes
        this.app.get('/mcp/info', (req, res) => {
            res.json({
                name: 'summarize-mcp-server',
                version: '1.0.0',
                protocol: 'mcp',
                capabilities: {
                    tools: true,
                    resources: false,
                    prompts: false
                }
            });
        });

        this.app.get('/mcp/tools/list', (req, res) => {
            res.json({
                tools: [this.tool.getToolSchema()]
            });
        });

        this.app.post('/mcp/tools/call', async (req, res) => {
            try {
                const { name, arguments: args } = req.body;
                
                if (name !== 'summarize') {
                    return res.status(404).json({
                        error: `Tool '${name}' not found`,
                        available: ['summarize']
                    });
                }

                console.log(`🛠️ [SummarizeMCP] Executing: ${name}`);
                const result = await this.tool.execute(args);
                
                res.json({
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ],
                    isError: !result.success
                });
                
            } catch (error) {
                console.error(`❌ [SummarizeMCP] Error:`, error.message);
                res.status(500).json({
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error.message
                            }, null, 2)
                        }
                    ],
                    isError: true
                });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', tool: 'summarize' });
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Summarize MCP Server running on port ${this.port}`);
            console.log(`📋 Available at: http://localhost:${this.port}`);
            console.log(`🛠️ Tool: summarize`);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new SummarizeMCPServer();
    server.start();
}

module.exports = { SummarizeMCPServer };