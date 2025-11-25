#!/usr/bin/env node

const express = require('express');
const { SaveToFileTool } = require('../tools/save-to-file-tool.js');

/**
 * Standalone MCP Server for SaveToFile Tool
 * Runs on port 3003
 */

class SaveToFileMCPServer {
    constructor(port = 3003) {
        this.port = port;
        this.app = express();
        this.tool = new SaveToFileTool();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            console.log(`💾 [SaveToFileMCP] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // MCP Protocol Routes
        this.app.get('/mcp/info', (req, res) => {
            res.json({
                name: 'savetofile-mcp-server',
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
                
                if (name !== 'save_to_file') {
                    return res.status(404).json({
                        error: `Tool '${name}' not found`,
                        available: ['save_to_file']
                    });
                }

                console.log(`🛠️ [SaveToFileMCP] Executing: ${name}`);
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
                console.error(`❌ [SaveToFileMCP] Error:`, error.message);
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
            res.json({ status: 'healthy', tool: 'save_to_file' });
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 SaveToFile MCP Server running on port ${this.port}`);
            console.log(`📋 Available at: http://localhost:${this.port}`);
            console.log(`🛠️ Tool: save_to_file`);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new SaveToFileMCPServer();
    server.start();
}

module.exports = { SaveToFileMCPServer };