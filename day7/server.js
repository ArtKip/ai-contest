require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY environment variable not set');
}

// Configuration for dialogue compression
const COMPRESSION_CONFIG = {
    messagesBeforeCompression: 10,  // Compress every 10 messages
    model: 'claude-3-haiku-20240307',
    temperature: 0.3,
    maxTokens: 4000
};

// Store active conversation sessions
const conversationSessions = new Map();

// Conversation session structure
class ConversationSession {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.messages = [];
        this.summaries = [];
        this.compressionEvents = [];
        this.stats = {
            totalMessages: 0,
            totalCompressions: 0,
            tokensBeforeCompression: 0,
            tokensAfterCompression: 0,
            tokensSaved: 0
        };
        this.useCompression = true;
        this.createdAt = new Date();
        this.lastActivity = new Date();
    }

    addMessage(role, content) {
        this.messages.push({
            role,
            content,
            timestamp: new Date().toISOString()
        });
        this.stats.totalMessages++;
        this.lastActivity = new Date();
    }

    shouldCompress() {
        // Check if we have enough messages to compress
        // Don't count summary messages in the compression threshold
        const userAssistantMessages = this.messages.filter(
            msg => msg.role === 'user' || msg.role === 'assistant'
        );
        return userAssistantMessages.length >= COMPRESSION_CONFIG.messagesBeforeCompression;
    }

    getFullHistory() {
        // Return all messages including summaries
        return this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    getCompressedHistory() {
        // Return only summaries plus recent messages
        const result = [];

        // Add all summaries
        this.summaries.forEach(summary => {
            result.push({
                role: 'user',
                content: `[CONVERSATION SUMMARY UP TO THIS POINT]\n${summary.content}`
            });
        });

        // Add messages after last compression
        const lastCompressionIndex = this.compressionEvents.length > 0
            ? this.compressionEvents[this.compressionEvents.length - 1].messageIndex
            : 0;

        const recentMessages = this.messages.slice(lastCompressionIndex);
        recentMessages.forEach(msg => {
            result.push({
                role: msg.role,
                content: msg.content
            });
        });

        return result;
    }

    async compress(apiKey) {
        const messagesToCompress = [...this.messages];

        // Create a summary of the conversation so far
        const conversationText = messagesToCompress
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');

        const summaryPrompt = `Please create a concise but comprehensive summary of the following conversation. Include all key information, decisions, context, and important details that would be needed to continue the conversation naturally. Format the summary in a clear, structured way.

CONVERSATION:
${conversationText}

Provide a summary that captures:
1. Main topics discussed
2. Key information exchanged
3. Any decisions or conclusions
4. Important context for future messages
5. User preferences or requirements mentioned`;

        try {
            const result = await callClaude(
                COMPRESSION_CONFIG.model,
                COMPRESSION_CONFIG.temperature,
                summaryPrompt,
                apiKey,
                COMPRESSION_CONFIG.maxTokens
            );

            if (result.success) {
                const summary = {
                    content: result.response,
                    originalMessageCount: messagesToCompress.length,
                    compressedAt: new Date().toISOString(),
                    tokensInOriginal: result.inputTokensEstimate || 0,
                    tokensInSummary: result.usage?.output_tokens || 0
                };

                this.summaries.push(summary);

                const compressionEvent = {
                    timestamp: new Date().toISOString(),
                    messageIndex: messagesToCompress.length,
                    messagesCompressed: messagesToCompress.length,
                    summaryLength: result.response.length,
                    tokensBeforeCompression: result.inputTokensEstimate || 0,
                    tokensAfterCompression: result.usage?.output_tokens || 0,
                    tokensSaved: (result.inputTokensEstimate || 0) - (result.usage?.output_tokens || 0)
                };

                this.compressionEvents.push(compressionEvent);
                this.stats.totalCompressions++;
                this.stats.tokensBeforeCompression += compressionEvent.tokensBeforeCompression;
                this.stats.tokensAfterCompression += compressionEvent.tokensAfterCompression;
                this.stats.tokensSaved += compressionEvent.tokensSaved;

                // Clear old messages, keeping only recent ones
                // Keep the last 2 messages to maintain context continuity
                const messagesToKeep = 2;
                this.messages = this.messages.slice(-messagesToKeep);

                return {
                    success: true,
                    summary: summary.content,
                    compressionEvent
                };
            } else {
                return {
                    success: false,
                    error: result.error
                };
            }
        } catch (error) {
            console.error('Compression failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Function to call Claude API
async function callClaude(model, temperature, userMessage, apiKey, maxTokens = 2000, systemPrompt = null) {
    const startTime = Date.now();

    try {
        const messages = [
            {
                role: 'user',
                content: userMessage
            }
        ];

        const requestBody = {
            model: model,
            max_tokens: maxTokens,
            temperature: temperature,
            messages: messages
        };

        if (systemPrompt) {
            requestBody.system = systemPrompt;
        }

        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            requestBody,
            {
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                }
            }
        );

        const responseTime = Date.now() - startTime;
        const responseText = response.data.content[0].text;

        return {
            success: true,
            response: responseText,
            usage: response.data.usage,
            responseTime,
            model,
            temperature,
            inputTokensEstimate: response.data.usage.input_tokens
        };
    } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);

        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            errorType: error.response?.data?.error?.type || 'unknown',
            responseTime: Date.now() - startTime
        };
    }
}

// Create or get conversation session
app.post('/api/session/create', (req, res) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const session = new ConversationSession(sessionId);
    conversationSessions.set(sessionId, session);

    res.json({
        success: true,
        sessionId,
        config: COMPRESSION_CONFIG
    });
});

// Get session info
app.get('/api/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = conversationSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
        success: true,
        session: {
            sessionId: session.sessionId,
            messageCount: session.messages.length,
            summaryCount: session.summaries.length,
            stats: session.stats,
            compressionEvents: session.compressionEvents,
            useCompression: session.useCompression,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity
        }
    });
});

// Toggle compression for a session
app.post('/api/session/:sessionId/toggle-compression', (req, res) => {
    const { sessionId } = req.params;
    const session = conversationSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    session.useCompression = !session.useCompression;

    res.json({
        success: true,
        useCompression: session.useCompression
    });
});

// Send a message in a conversation
app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, message, useCompression } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: 'Session ID and message are required' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'Anthropic API key not configured' });
        }

        const session = conversationSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Update compression preference if provided
        if (typeof useCompression === 'boolean') {
            session.useCompression = useCompression;
        }

        // Add user message to history
        session.addMessage('user', message);

        // Check if compression is needed
        let compressionResult = null;
        if (session.useCompression && session.shouldCompress()) {
            console.log(`🗜️ Compressing conversation for session ${sessionId}...`);
            compressionResult = await session.compress(ANTHROPIC_API_KEY);

            if (!compressionResult.success) {
                console.error('Compression failed:', compressionResult.error);
            }
        }

        // Get conversation history (compressed or full)
        const history = session.useCompression
            ? session.getCompressedHistory()
            : session.getFullHistory();

        // Build messages for API call
        const apiMessages = [...history];

        // Create the API request
        const systemPrompt = `You are a helpful AI assistant engaged in a conversation with a user. ${
            session.summaries.length > 0
                ? 'You have access to a summary of previous conversation history marked with [CONVERSATION SUMMARY UP TO THIS POINT].'
                : ''
        } Continue the conversation naturally, referring to previous context when relevant.`;

        const result = await callClaude(
            COMPRESSION_CONFIG.model,
            0.7, // Higher temperature for more natural conversation
            apiMessages[apiMessages.length - 1].content,
            ANTHROPIC_API_KEY,
            2000,
            systemPrompt
        );

        if (!result.success) {
            return res.status(500).json({
                error: 'Failed to get response from AI',
                details: result.error
            });
        }

        // Add assistant response to history
        session.addMessage('assistant', result.response);

        res.json({
            success: true,
            message: result.response,
            usage: result.usage,
            responseTime: result.responseTime,
            compressionOccurred: compressionResult?.success || false,
            compressionInfo: compressionResult?.success ? compressionResult.compressionEvent : null,
            sessionStats: {
                totalMessages: session.stats.totalMessages,
                totalCompressions: session.stats.totalCompressions,
                tokensSaved: session.stats.tokensSaved,
                currentHistorySize: history.length,
                useCompression: session.useCompression
            }
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error.message
        });
    }
});

// Get conversation history
app.get('/api/session/:sessionId/history', (req, res) => {
    const { sessionId } = req.params;
    const { compressed } = req.query;

    const session = conversationSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const history = compressed === 'true'
        ? session.getCompressedHistory()
        : session.getFullHistory();

    res.json({
        success: true,
        history,
        summaries: session.summaries,
        messageCount: session.messages.length,
        compressionEvents: session.compressionEvents,
        stats: session.stats
    });
});

// Compare compressed vs full history
app.get('/api/session/:sessionId/compare', (req, res) => {
    const { sessionId } = req.params;
    const session = conversationSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const fullHistory = session.getFullHistory();
    const compressedHistory = session.getCompressedHistory();

    // Estimate tokens (rough estimate: 1 token ≈ 4 characters)
    const estimateTokens = (text) => Math.ceil(text.length / 4);

    const fullHistoryText = fullHistory.map(m => m.content).join(' ');
    const compressedHistoryText = compressedHistory.map(m => m.content).join(' ');

    const comparison = {
        full: {
            messageCount: fullHistory.length,
            characterCount: fullHistoryText.length,
            estimatedTokens: estimateTokens(fullHistoryText)
        },
        compressed: {
            messageCount: compressedHistory.length,
            characterCount: compressedHistoryText.length,
            estimatedTokens: estimateTokens(compressedHistoryText)
        },
        savings: {
            messageReduction: fullHistory.length - compressedHistory.length,
            characterReduction: fullHistoryText.length - compressedHistoryText.length,
            estimatedTokenReduction: estimateTokens(fullHistoryText) - estimateTokens(compressedHistoryText),
            percentageSaved: ((estimateTokens(fullHistoryText) - estimateTokens(compressedHistoryText)) / estimateTokens(fullHistoryText) * 100).toFixed(2)
        },
        stats: session.stats
    };

    res.json({
        success: true,
        comparison,
        compressionEvents: session.compressionEvents,
        summaries: session.summaries.map(s => ({
            content: s.content.substring(0, 200) + '...',
            originalMessageCount: s.originalMessageCount,
            compressedAt: s.compressedAt
        }))
    });
});

// Delete a session
app.delete('/api/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const deleted = conversationSessions.delete(sessionId);

    res.json({
        success: deleted,
        message: deleted ? 'Session deleted' : 'Session not found'
    });
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
    const sessions = Array.from(conversationSessions.values()).map(session => ({
        sessionId: session.sessionId,
        messageCount: session.messages.length,
        summaryCount: session.summaries.length,
        totalMessages: session.stats.totalMessages,
        totalCompressions: session.stats.totalCompressions,
        tokensSaved: session.stats.tokensSaved,
        useCompression: session.useCompression,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
    }));

    res.json({
        success: true,
        sessions,
        totalSessions: sessions.length
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        hasApiKey: !!ANTHROPIC_API_KEY,
        activeSessions: conversationSessions.size,
        compressionConfig: COMPRESSION_CONFIG,
        timestamp: new Date().toISOString()
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Clean up old sessions (run every hour)
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleaned = 0;

    conversationSessions.forEach((session, sessionId) => {
        if (session.lastActivity.getTime() < oneHourAgo) {
            conversationSessions.delete(sessionId);
            cleaned++;
        }
    });

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} inactive sessions`);
    }
}, 60 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Day 7 - Dialogue Compression running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to test dialogue compression`);
    console.log(`API Key configured: ${!!ANTHROPIC_API_KEY}`);
    console.log(`\nCompression Settings:`);
    console.log(`  - Messages before compression: ${COMPRESSION_CONFIG.messagesBeforeCompression}`);
    console.log(`  - Model: ${COMPRESSION_CONFIG.model}`);
    console.log(`  - Temperature: ${COMPRESSION_CONFIG.temperature}`);
});

