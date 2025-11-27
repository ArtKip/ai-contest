#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const { MemoryAgent } = require('./memory-agent');

/**
 * Web Server for Memory Agent Demo
 * 
 * Provides a web interface to test the memory-enabled agent
 * and visualize memory persistence across conversations.
 */

class MemoryAgentWebServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.agent = null;
        this.sessions = new Map(); // Track multiple agent instances
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Serve the web interface
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Create a new agent session
        this.app.post('/api/sessions/new', async (req, res) => {
            try {
                const { agentName, personality } = req.body;
                
                const agent = new MemoryAgent({
                    name: agentName || 'WebMemoryBot',
                    personality: personality || {
                        helpful: 0.9,
                        curious: 0.7,
                        formal: 0.3,
                        creative: 0.8
                    },
                    memory: {
                        dbPath: `./memory-${Date.now()}.db`,
                        autoBackup: true
                    }
                });

                // Wait for initialization
                await new Promise(resolve => setTimeout(resolve, 500));

                const sessionId = agent.currentSessionId;
                this.sessions.set(sessionId, agent);

                res.json({
                    success: true,
                    sessionId,
                    agentName: agent.name,
                    message: 'New memory agent session created'
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Send a message to an agent
        this.app.post('/api/sessions/:sessionId/message', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const { message, metadata } = req.body;

                const agent = this.sessions.get(sessionId);
                if (!agent) {
                    return res.status(404).json({
                        success: false,
                        error: 'Agent session not found'
                    });
                }

                const result = await agent.processMessage(message, metadata);

                res.json({
                    success: true,
                    ...result
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get memory statistics
        this.app.get('/api/sessions/:sessionId/stats', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const agent = this.sessions.get(sessionId);
                
                if (!agent) {
                    return res.status(404).json({
                        success: false,
                        error: 'Agent session not found'
                    });
                }

                const stats = await agent.getMemoryStats();
                res.json({
                    success: true,
                    stats
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get conversation history
        this.app.get('/api/sessions/:sessionId/history', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const { limit = 50 } = req.query;
                
                const agent = this.sessions.get(sessionId);
                if (!agent) {
                    return res.status(404).json({
                        success: false,
                        error: 'Agent session not found'
                    });
                }

                const history = await agent.memory.getSessionHistory(sessionId, parseInt(limit));
                res.json({
                    success: true,
                    history
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Search conversations
        this.app.get('/api/sessions/:sessionId/search', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const { q: searchTerm, limit = 10 } = req.query;
                
                const agent = this.sessions.get(sessionId);
                if (!agent) {
                    return res.status(404).json({
                        success: false,
                        error: 'Agent session not found'
                    });
                }

                const results = await agent.memory.searchConversations(searchTerm, parseInt(limit));
                res.json({
                    success: true,
                    results,
                    query: searchTerm
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // End a session
        this.app.post('/api/sessions/:sessionId/end', async (req, res) => {
            try {
                const { sessionId } = req.params;
                const agent = this.sessions.get(sessionId);
                
                if (!agent) {
                    return res.status(404).json({
                        success: false,
                        error: 'Agent session not found'
                    });
                }

                await agent.endSession();
                this.sessions.delete(sessionId);

                res.json({
                    success: true,
                    message: 'Session ended successfully'
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get all active sessions
        this.app.get('/api/sessions', (req, res) => {
            const sessions = Array.from(this.sessions.entries()).map(([sessionId, agent]) => ({
                sessionId,
                agentName: agent.name,
                conversationCount: agent.conversationCount,
                started: new Date().toISOString() // This would be tracked properly in a real app
            }));

            res.json({
                success: true,
                sessions,
                count: sessions.length
            });
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                activeSessions: this.sessions.size
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found'
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('Server error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });
    }

    async start() {
        this.app.listen(this.port, () => {
            console.log('🌐 Memory Agent Web Server Started');
            console.log('═'.repeat(50));
            console.log(`🚀 Web Interface: http://localhost:${this.port}`);
            console.log('📊 Features:');
            console.log('   • Memory-enabled conversations');
            console.log('   • Cross-session memory persistence');
            console.log('   • Conversation history and search');
            console.log('   • Real-time memory statistics');
            console.log('   • Multi-agent session support');
            console.log('═'.repeat(50));
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\\n🛑 Shutting down server...');
            
            // End all agent sessions
            for (const [sessionId, agent] of this.sessions) {
                console.log(`   Ending session: ${sessionId}`);
                try {
                    await agent.shutdown();
                } catch (error) {
                    console.error(`   Error ending session ${sessionId}:`, error.message);
                }
            }
            
            console.log('✅ All sessions ended');
            console.log('👋 Goodbye!');
            process.exit(0);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new MemoryAgentWebServer(3000);
    server.start().catch(error => {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    });
}

module.exports = { MemoryAgentWebServer };