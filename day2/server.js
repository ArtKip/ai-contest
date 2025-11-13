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

async function makeClaudeRequest(question, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 300,
                    messages: [
                        {
                            role: 'user',
                            content: `Please respond to the following question in a structured JSON format. Your response must be valid JSON with the following structure:

{
  "answer": "Your main response to the question",
  "confidence": "high|medium|low",
  "type": "factual|opinion|creative|unknown",
  "sources": ["list of any relevant sources or 'general knowledge'"],
  "follow_up": "A suggested follow-up question or null"
}

Question: ${question}

Remember to respond ONLY with valid JSON in the exact format above.`
                        }
                    ]
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
            if (error.response?.status === 429 && i < retries - 1) {
                const delay = Math.pow(2, i) * 1000;
                console.log(`Rate limited, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

app.post('/api/ask', async (req, res) => {
    try {
        const { question } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ 
                error: 'Anthropic API key not configured',
                answer: 'I need an Anthropic API key to function. Please set the ANTHROPIC_API_KEY environment variable.' 
            });
        }

        const response = await makeClaudeRequest(question);

        const rawResponse = response.data.content[0].text;
        
        try {
            // Try to parse as JSON first
            const parsedResponse = JSON.parse(rawResponse);
            
            // Validate required fields
            const validatedResponse = {
                answer: parsedResponse.answer || rawResponse,
                confidence: parsedResponse.confidence || 'unknown',
                type: parsedResponse.type || 'unknown',
                sources: Array.isArray(parsedResponse.sources) ? parsedResponse.sources : ['general knowledge'],
                follow_up: parsedResponse.follow_up || null,
                question: question,
                structured: true
            };
            
            res.json(validatedResponse);
        } catch (jsonError) {
            // Fallback to plain text if JSON parsing fails
            console.warn('Failed to parse structured response, using fallback:', jsonError.message);
            res.json({ 
                answer: rawResponse,
                confidence: 'unknown',
                type: 'unknown', 
                sources: ['general knowledge'],
                follow_up: null,
                question: question,
                structured: false
            });
        }

    } catch (error) {
        console.error('Error calling Claude API:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(401).json({ error: 'Invalid Anthropic API key' });
        } else if (error.response?.status === 429) {
            res.status(429).json({ error: 'Rate limit exceeded' });
        } else {
            res.status(500).json({ error: 'Failed to get AI response' });
        }
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        hasApiKey: !!ANTHROPIC_API_KEY,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`AI Agent server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to interact with the agent`);
    console.log(`API Key configured: ${!!ANTHROPIC_API_KEY}`);
});