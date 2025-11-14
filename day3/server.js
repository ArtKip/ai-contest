require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY environment variable not set');
}

// In-memory storage for conversation sessions
const conversations = new Map();

class ConversationSession {
    constructor() {
        this.requirements = {
            projectName: null,
            projectType: null,
            functionality: [],
            techStack: [],
            timeline: null,
            budget: null,
            teamSize: null,
            deployment: null
        };
        this.messages = [];
        this.phase = 'greeting'; // greeting, gathering, finalizing, complete
        this.isComplete = false;
    }

    addMessage(role, content) {
        this.messages.push({ role, content, timestamp: new Date() });
    }

    hasRequiredInfo() {
        const req = this.requirements;
        return req.projectName && 
               req.projectType && 
               req.functionality.length > 0 && 
               req.techStack.length > 0 && 
               req.timeline;
    }

    extractRequirements(response) {
        const text = response.toLowerCase();
        
        // Extract project name - only from explicit mentions
        if (!this.requirements.projectName) {
            const nameMatches = response.match(/(?:called|named|project name is)\s+["']?([^"',.!?\n]+)["']?/i) ||
                               response.match(/(?:build|create|develop)\s+(?:a|an|the)?\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})(?:\s+app|\s+game|\s+system)?/i);
            if (nameMatches) {
                this.requirements.projectName = nameMatches[1].trim();
            }
        }

        // Extract project type - be more specific
        if (!this.requirements.projectType) {
            if (text.includes('android') || text.includes('mobile app')) this.requirements.projectType = 'mobile';
            else if (text.includes('web app') || text.includes('website')) this.requirements.projectType = 'web';
            else if (text.includes('desktop') || text.includes('windows') || text.includes('macos')) this.requirements.projectType = 'desktop';
        }

        // Extract functionality - only when explicitly mentioned
        const features = text.match(/(?:features?|functionality|should|can|will)\s+[^.!?]*(?:login|authentication|user|dashboard|timer|score|grid|level)/gi);
        if (features && this.requirements.functionality.length === 0) {
            this.requirements.functionality = features.slice(0, 3); // Limit to prevent over-extraction
        }

        // Extract tech stack - be more selective
        const technologies = ['kotlin', 'java', 'react', 'vue', 'angular', 'node', 'python', 'javascript', 'typescript', 'android sdk'];
        technologies.forEach(tech => {
            if (text.includes(tech) && !this.requirements.techStack.includes(tech)) {
                this.requirements.techStack.push(tech);
            }
        });

        // Extract timeline
        const timelineMatch = response.match(/(\d+)\s+(days?|weeks?|months?)/i);
        if (timelineMatch && !this.requirements.timeline) {
            this.requirements.timeline = timelineMatch[0];
        }
    }
}

async function makeClaudeRequest(messages, systemPrompt, maxTokens = 400) {
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-haiku-20240307',
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: messages
            },
            {
                headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                }
            }
        );
        return response;
    } catch (error) {
        throw error;
    }
}

function getSystemPrompt(session) {
    const basePrompt = `You are a technical requirements analyst helping gather information for a software project specification. Your goal is to collect all necessary requirements through conversation.`;

    switch (session.phase) {
        case 'greeting':
            return `${basePrompt}

This is the initial greeting. Ask a simple, open-ended question about their project.

Guidelines:
- Be friendly and professional
- Ask open-ended questions to understand their project vision
- Move to gathering detailed requirements after understanding the basic project idea
- Respond conversationally, not in structured format yet`;

        case 'gathering':
            const missing = [];
            if (!session.requirements.projectName) missing.push('project name');
            if (!session.requirements.projectType) missing.push('platform type');
            if (session.requirements.functionality.length === 0) missing.push('key features');
            if (session.requirements.techStack.length === 0) missing.push('technology preferences');
            if (!session.requirements.timeline) missing.push('timeline');
            
            return `${basePrompt}

You are gathering requirements step by step. Ask focused questions to collect missing information.

Current progress:
- Project name: ${session.requirements.projectName || 'NOT SET'}
- Platform: ${session.requirements.projectType || 'NOT SET'}
- Features: ${session.requirements.functionality.length > 0 ? 'SET' : 'NOT SET'}
- Technology: ${session.requirements.techStack.length > 0 ? session.requirements.techStack.join(', ') : 'NOT SET'}
- Timeline: ${session.requirements.timeline || 'NOT SET'}

Still missing: ${missing.join(', ')}

Guidelines:
- Ask ONE focused question about the first missing requirement
- Do NOT provide assumptions or fill in details yourself
- Keep responses short and conversational
- Only ask for what's specifically missing
- Do not list out all requirements - just ask the next question`;

        case 'finalizing':
            return `${basePrompt}

IMPORTANT: Generate a final technical specification document. You have gathered enough requirements.

Requirements collected: ${JSON.stringify(session.requirements, null, 2)}
Conversation history: ${session.messages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\\n')}

Generate a comprehensive technical specification document with these sections:
1. Project Overview
2. Functional Requirements
3. Technical Architecture
4. Technology Stack
5. Timeline & Milestones
6. Team & Resources
7. Deployment Strategy

Format as a professional technical specification document. This is your FINAL response - do not ask for more information.`;

        default:
            return basePrompt;
    }
}

app.post('/api/conversation', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ 
                error: 'Anthropic API key not configured',
                response: 'I need an Anthropic API key to function. Please set the ANTHROPIC_API_KEY environment variable.' 
            });
        }

        // Get or create conversation session
        let session = conversations.get(sessionId) || new ConversationSession();
        conversations.set(sessionId, session);

        // Add user message to conversation
        session.addMessage('user', message);

        // Extract requirements from user message
        session.extractRequirements(message);

        // Determine conversation phase
        if (session.phase === 'greeting' && message.trim().length > 10) {
            session.phase = 'gathering';
        } else if (session.phase === 'gathering' && session.hasRequiredInfo()) {
            session.phase = 'finalizing';
        }

        // Get system prompt based on current phase
        const systemPrompt = getSystemPrompt(session);

        // Prepare messages for Claude (last 6 messages for context)
        const contextMessages = session.messages.slice(-6).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        // Get response from Claude
        const response = await makeClaudeRequest(
            contextMessages,
            systemPrompt,
            session.phase === 'finalizing' ? 800 : 400
        );

        const aiResponse = response.data.content[0].text;

        // Add AI response to conversation
        session.addMessage('assistant', aiResponse);

        // Check if this is a final specification
        const isFinalSpec = session.phase === 'finalizing' && 
                           (aiResponse.includes('Technical Specification') || 
                            aiResponse.includes('Project Overview') ||
                            aiResponse.length > 500);

        if (isFinalSpec) {
            session.phase = 'complete';
            session.isComplete = true;
        }

        res.json({
            response: aiResponse,
            sessionId: sessionId,
            phase: session.phase,
            isComplete: session.isComplete,
            requirements: session.requirements,
            isFinalSpecification: isFinalSpec
        });

    } catch (error) {
        console.error('Error in conversation:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Invalid Anthropic API key' });
        } else if (error.response?.status === 429) {
            res.status(429).json({ error: 'Rate limit exceeded' });
        } else {
            res.status(500).json({ error: 'Failed to get AI response' });
        }
    }
});

app.post('/api/new-conversation', (req, res) => {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const session = new ConversationSession();
    conversations.set(sessionId, session);
    
    res.json({
        sessionId: sessionId,
        message: "I'm ready to help you create a technical specification for your software project! What kind of project are you planning to build?"
    });
});

app.get('/api/conversation/:sessionId', (req, res) => {
    const session = conversations.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
        phase: session.phase,
        isComplete: session.isComplete,
        requirements: session.requirements,
        messageCount: session.messages.length
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        hasApiKey: !!ANTHROPIC_API_KEY,
        conversationSessions: conversations.size,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cleanup old sessions every hour
const oneHour = 60 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    
    for (const [sessionId, session] of conversations.entries()) {
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage && (now - new Date(lastMessage.timestamp).getTime()) > oneHour) {
            conversations.delete(sessionId);
        }
    }
}, oneHour);

app.listen(PORT, () => {
    console.log(`Day 3 - AI Interaction Agent running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to start gathering requirements`);
    console.log(`API Key configured: ${!!ANTHROPIC_API_KEY}`);
});