#!/usr/bin/env node

const express = require('express');
const { SearchDocsTool } = require('../tools/search-docs-tool.js');

/**
 * Standalone MCP Server for SearchDocs Tool
 * Runs on port 3001
 */

class SearchMCPServer {
    constructor(port = 3001) {
        this.port = port;
        this.app = express();
        this.tool = new SearchDocsTool();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`🔍 [SearchMCP] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // MCP Protocol Routes
        this.app.get('/mcp/info', (req, res) => {
            res.json({
                name: 'search-docs-mcp-server',
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
                
                if (name !== 'search_docs') {
                    return res.status(404).json({
                        error: `Tool '${name}' not found`,
                        available: ['search_docs']
                    });
                }

                console.log(`🛠️ [SearchMCP] Executing: ${name}`);
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
                console.error(`❌ [SearchMCP] Error:`, error.message);
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
            res.json({ status: 'healthy', tool: 'search_docs' });
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 SearchDocs MCP Server running on port ${this.port}`);
            console.log(`📋 Available at: http://localhost:${this.port}`);
            console.log(`🛠️ Tool: search_docs`);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new SearchMCPServer();
    server.start();
}

module.exports = { SearchMCPServer };