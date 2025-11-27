#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const { VoiceAgent } = require('./voice-agent');

/**
 * Voice Agent Web Server
 * 
 * Provides a web interface for the voice-driven conversational agent,
 * handling speech-to-text input and returning intelligent text responses.
 */

class VoiceAgentServer {
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.voiceAgent = new VoiceAgent({
            name: 'VoiceBot',
            personality: {
                helpful: 0.9,
                conversational: 0.8,
                precise: 0.7,
                friendly: 0.9
            }
        });
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Request logging
        this.app.use((req, res, next) => {
            if (req.path !== '/health') {
                console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            }
            next();
        });
    }

    setupRoutes() {
        // Serve the main voice interface
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // Process voice input
        this.app.post('/api/voice/process', async (req, res) => {
            try {
                const { spokenText, metadata = {} } = req.body;

                if (!spokenText || typeof spokenText !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'spokenText is required and must be a string'
                    });
                }

                console.log(`🎙️ Processing voice input: "${spokenText}"`);
                
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Voice processing timeout')), 10000);
                });
                
                const processingPromise = this.voiceAgent.processVoiceInput(spokenText, {
                    ...metadata,
                    userAgent: req.headers['user-agent'],
                    clientIP: req.ip
                });
                
                const result = await Promise.race([processingPromise, timeoutPromise]);
                res.json(result);

            } catch (error) {
                console.error('❌ Voice processing error:', error.message);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error during voice processing'
                });
            }
        });

        // Get conversation statistics
        this.app.get('/api/voice/stats', (req, res) => {
            try {
                const stats = this.voiceAgent.getStats();
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
        this.app.get('/api/voice/history', (req, res) => {
            try {
                const { limit = 10 } = req.query;
                const history = this.voiceAgent.getHistory(parseInt(limit));
                
                res.json({
                    success: true,
                    history,
                    total: history.length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Clear conversation history
        this.app.post('/api/voice/clear', (req, res) => {
            try {
                this.voiceAgent.conversationHistory = [];
                
                res.json({
                    success: true,
                    message: 'Conversation history cleared'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get agent capabilities
        this.app.get('/api/voice/capabilities', (req, res) => {
            res.json({
                success: true,
                capabilities: this.voiceAgent.capabilities,
                examples: {
                    calculations: [
                        "Calculate 25 times 37",
                        "What's the square root of 144?",
                        "Add 123 and 456"
                    ],
                    definitions: [
                        "Define artificial intelligence", 
                        "What is machine learning?",
                        "Explain quantum computing"
                    ],
                    entertainment: [
                        "Tell me a joke",
                        "Give me a funny story", 
                        "Make me laugh"
                    ],
                    conversation: [
                        "How are you today?",
                        "What can you do?",
                        "Tell me something interesting"
                    ]
                }
            });
        });

        // Test voice processing with sample inputs
        this.app.get('/api/voice/test', async (req, res) => {
            const testInputs = [
                "Calculate 15 times 8",
                "Define machine learning",
                "Tell me a joke", 
                "What time is it?",
                "Help me understand what you can do"
            ];

            try {
                const results = [];
                
                for (const input of testInputs) {
                    const result = await this.voiceAgent.processVoiceInput(input, { test: true });
                    results.push({
                        input,
                        response: result.response,
                        intent: result.analysis?.intent,
                        processingTime: result.processingTime
                    });
                }

                res.json({
                    success: true,
                    testResults: results
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                agent: {
                    name: this.voiceAgent.name,
                    sessionId: this.voiceAgent.sessionId,
                    conversationsCount: this.voiceAgent.conversationHistory.length
                }
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: `Endpoint not found: ${req.method} ${req.path}`
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

    start() {
        this.app.listen(this.port, () => {
            console.log('🎤 Voice Agent Server Started');
            console.log('═'.repeat(50));
            console.log(`🚀 Web Interface: http://localhost:${this.port}`);
            console.log('🎙️ Features:');
            console.log('   • Speech-to-Text → LLM → Text Response');
            console.log('   • Real-time voice processing');
            console.log('   • Multiple query types (math, definitions, jokes)');
            console.log('   • Audio visualization and feedback');
            console.log('   • Conversation history and statistics');
            console.log('═'.repeat(50));
            console.log('💡 API Endpoints:');
            console.log('   POST /api/voice/process   - Process voice input');
            console.log('   GET  /api/voice/stats     - Get conversation stats');
            console.log('   GET  /api/voice/history   - Get conversation history');
            console.log('   GET  /api/voice/test      - Run test scenarios');
            console.log('═'.repeat(50));
            console.log(`🎯 Agent: ${this.voiceAgent.name} ready for voice commands!`);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\\n🛑 Shutting down Voice Agent server...');
            
            const stats = this.voiceAgent.getStats();
            console.log(`📊 Final stats: ${stats.totalConversations} conversations processed`);
            console.log('👋 Voice Agent offline');
            
            process.exit(0);
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new VoiceAgentServer(3000);
    server.start();
}

module.exports = { VoiceAgentServer };