#!/usr/bin/env node

const express = require('express');
const path = require('path');
const { IntelligentMCPAgent } = require('../llm-orchestrator/intelligent-mcp-agent.js');
const { AdaptiveWorkflowAgent } = require('../llm-orchestrator/adaptive-workflow-agent.js');

/**
 * Web UI Server for LLM-Driven MCP Orchestration Testing
 */

class WebUIServer {
    constructor(port = 4000) {
        this.port = port;
        this.app = express();
        this.intelligentAgent = null;
        this.adaptiveAgent = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeAgents();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname)));
        
        // CORS for local development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            next();
        });

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Serve the main UI
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // API Routes for testing
        this.app.post('/api/intelligent-test', async (req, res) => {
            try {
                const { request } = req.body;
                console.log(`🧠 Running intelligent test: "${request}"`);
                
                if (!this.intelligentAgent) {
                    await this.initializeIntelligentAgent();
                }
                
                const result = await this.intelligentAgent.processRequest(request);
                
                res.json({
                    success: result.success,
                    steps: result.steps,
                    totalTime: result.totalTime,
                    finalResponse: result.finalResponse,
                    mode: 'intelligent'
                });
                
            } catch (error) {
                console.error('Intelligent test error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        this.app.post('/api/adaptive-test', async (req, res) => {
            try {
                const { request } = req.body;
                console.log(`🔄 Running adaptive test: "${request}"`);
                
                if (!this.adaptiveAgent) {
                    await this.initializeAdaptiveAgent();
                }
                
                const result = await this.adaptiveAgent.executeAdaptiveWorkflow(request);
                
                res.json({
                    success: result.success,
                    steps: result.executionSteps,
                    adaptations: result.adaptations ? result.adaptations.length : 0,
                    totalTime: result.totalTime,
                    finalConfidence: result.finalConfidence,
                    mode: 'adaptive'
                });
                
            } catch (error) {
                console.error('Adaptive test error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Server status endpoint
        this.app.get('/api/status', async (req, res) => {
            const status = await this.checkMCPServers();
            res.json(status);
        });

        // Tool stats endpoint
        this.app.get('/api/stats', (req, res) => {
            const intelligentStats = this.intelligentAgent ? 
                this.intelligentAgent.getIntelligenceStats() : { totalSessions: 0, averageSteps: 0 };
                
            res.json({
                intelligent: intelligentStats,
                adaptive: {
                    // Add adaptive stats if needed
                }
            });
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                agents: {
                    intelligent: !!this.intelligentAgent,
                    adaptive: !!this.adaptiveAgent
                }
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    async initializeAgents() {
        console.log('🤖 Initializing MCP agents...');
        
        try {
            await this.initializeIntelligentAgent();
            await this.initializeAdaptiveAgent();
            console.log('✅ All agents initialized successfully');
        } catch (error) {
            console.warn('⚠️ Agent initialization failed:', error.message);
            console.warn('   Agents will be initialized on first use');
        }
    }

    async initializeIntelligentAgent() {
        if (!this.intelligentAgent) {
            this.intelligentAgent = new IntelligentMCPAgent('WebUI-Intelligent');
            await this.intelligentAgent.discoverTools();
            console.log('🧠 Intelligent agent ready');
        }
    }

    async initializeAdaptiveAgent() {
        if (!this.adaptiveAgent) {
            this.adaptiveAgent = new AdaptiveWorkflowAgent('WebUI-Adaptive');
            await this.adaptiveAgent.discoverTools();
            console.log('🔄 Adaptive agent ready');
        }
    }

    async checkMCPServers() {
        const axios = require('axios');
        const servers = {
            search: 'http://localhost:3001',
            summarize: 'http://localhost:3002',
            save: 'http://localhost:3003'
        };

        const status = {};
        
        for (const [name, url] of Object.entries(servers)) {
            try {
                await axios.get(`${url}/health`, { timeout: 2000 });
                status[name] = { online: true, url };
            } catch (error) {
                status[name] = { online: false, url, error: error.message };
            }
        }

        return status;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('🌐 LLM-Driven MCP Web UI Server Started');
            console.log('═'.repeat(50));
            console.log(`🚀 Web UI: http://localhost:${this.port}`);
            console.log('📊 Features:');
            console.log('   • Real-time LLM decision visualization');
            console.log('   • Intelligent vs Adaptive mode comparison');
            console.log('   • Server status monitoring');
            console.log('   • Interactive testing interface');
            console.log('═'.repeat(50));
            console.log('💡 Make sure MCP servers are running:');
            console.log('   node start-all-servers.js');
            console.log();
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\\n🛑 Shutting down Web UI server...');
            process.exit(0);
        });
    }
}

/**
 * Create and start the web server
 */
async function startWebUI() {
    const server = new WebUIServer(4000);
    server.start();
}

// Export for use as module
module.exports = { WebUIServer };

// Start server if run directly
if (require.main === module) {
    startWebUI().catch(error => {
        console.error('Failed to start Web UI:', error);
        process.exit(1);
    });
}