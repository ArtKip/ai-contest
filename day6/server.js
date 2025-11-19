require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY environment variable not set');
}

// Rate limiting configuration (optional - can be disabled if not needed)
const RATE_LIMITS = {
    minDelayBetweenRequests: 500, // 0.5 seconds between requests (reduced)
    maxRequestsPerMinute: 50, // Increased limit
    requestTimestamps: []
};

// Check if we can make a request
function canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    RATE_LIMITS.requestTimestamps = RATE_LIMITS.requestTimestamps.filter(
        timestamp => timestamp > oneMinuteAgo
    );

    // Check if we're under the limit
    return RATE_LIMITS.requestTimestamps.length < RATE_LIMITS.maxRequestsPerMinute;
}

// Record a request
function recordRequest() {
    RATE_LIMITS.requestTimestamps.push(Date.now());
}

// Wait for rate limit
async function waitForRateLimit() {
    if (!canMakeRequest()) {
        const oldestRequest = RATE_LIMITS.requestTimestamps[0];
        const timeToWait = 60000 - (Date.now() - oldestRequest) + 100; // Add 100ms buffer

        if (timeToWait > 0) {
            console.log(`⏰ Rate limit reached. Waiting ${Math.ceil(timeToWait / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
    }

    // Also add minimum delay between requests
    await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.minDelayBetweenRequests));
}

// Agent configurations
const AGENTS = {
    generator: {
        name: 'Content Generator',
        model: 'claude-3-haiku-20240307',
        temperature: 0.8,
        role: 'Generate creative content based on user requirements',
        systemPrompt: 'You are a creative content generator. Your task is to create content based on user requirements. Always output ONLY valid JSON (no markdown, no explanations) with the following structure:\n{\n  "title": "string",\n  "content": "string with no line breaks - use spaces instead",\n  "metadata": {\n    "word_count": number,\n    "tone": "string",\n    "key_points": ["string", "string", "string"]\n  }\n}\n\nIMPORTANT: In the content field, replace all newlines with spaces. Output only the JSON object, nothing else.'
    },
    validator: {
        name: 'Content Validator & Refiner',
        model: 'claude-3-haiku-20240307', // Using Haiku for both agents - Sonnet 3.5 model name varies by region
        temperature: 0.3,
        role: 'Validate and improve content from the generator',
        systemPrompt: 'You are a content validator and refiner. You will receive content in JSON format. Your task is to: 1) Validate that it meets quality standards, 2) Check for accuracy and coherence, 3) Suggest improvements, 4) Provide a refined version if needed. Output ONLY valid JSON with fields: validation_status (pass/fail/needs_improvement), issues (array), suggestions (array), refined_content (with same structure as input), quality_score (0-100), validation_notes (string). No markdown, no explanations.'
    }
};

// Function to call Claude API with rate limiting
async function callClaude(agentConfig, userMessage, systemPrompt = null) {
    // Wait for rate limit before making request
    await waitForRateLimit();
    recordRequest();

    const startTime = Date.now();

    try {
        const messages = [
            {
                role: 'user',
                content: userMessage
            }
        ];

        const requestBody = {
            model: agentConfig.model,
            max_tokens: 2000,
            temperature: agentConfig.temperature,
            messages: messages
        };

        // Add system prompt if provided
        if (systemPrompt || agentConfig.systemPrompt) {
            requestBody.system = systemPrompt || agentConfig.systemPrompt;
        }

        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            requestBody,
            {
                headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
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
            model: agentConfig.model,
            temperature: agentConfig.temperature
        };
    } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);

        // Handle rate limit errors specifically
        if (error.response?.status === 429) {
            const retryAfter = error.response?.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

            console.log(`⏰ Rate limit hit. Waiting ${waitTime / 1000} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Retry once after waiting
            return callClaude(agentConfig, userMessage, systemPrompt);
        }

        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            errorType: error.response?.data?.error?.type || 'unknown',
            responseTime: Date.now() - startTime
        };
    }
}

// Parse JSON from agent response (handles markdown code blocks and cleaning)
function parseAgentResponse(responseText) {
    // Helper to clean JSON string of control characters
    function cleanJsonString(str) {
        // Remove control characters except for \n, \r, \t which are valid in JSON strings
        return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    try {
        // Try direct JSON parse first
        const cleaned = cleanJsonString(responseText);
        return JSON.parse(cleaned);
    } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const cleaned = cleanJsonString(jsonMatch[1]);
                return JSON.parse(cleaned);
            } catch (e2) {
                console.error('Failed to parse JSON from markdown:', e2);
            }
        }

        // Try to find JSON-like content
        const jsonStart = responseText.indexOf('{');
        const jsonEnd = responseText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            try {
                const jsonStr = responseText.substring(jsonStart, jsonEnd + 1);
                const cleaned = cleanJsonString(jsonStr);
                return JSON.parse(cleaned);
            } catch (e3) {
                console.error('Failed to extract JSON:', e3);
                // Log the problematic content for debugging
                console.error('Attempted to parse:', jsonStr.substring(0, 200));
            }
        }

        return null;
    }
}

// Agent 1: Content Generator
async function runGeneratorAgent(task) {
    console.log('🤖 Agent 1 (Generator) starting...');

    const prompt = `Generate content for the following task: "${task}"

Please create engaging content that addresses this task. Remember to format your response as JSON with the following structure:
{
    "title": "Title of the content",
    "content": "The main content text",
    "metadata": {
        "word_count": number,
        "tone": "description of tone",
        "key_points": ["point1", "point2", "point3"]
    }
}`;

    const result = await callClaude(AGENTS.generator, prompt);

    if (!result.success) {
        return { success: false, error: result.error, agent: 'generator' };
    }

    const parsedContent = parseAgentResponse(result.response);

    return {
        success: true,
        agent: 'generator',
        rawResponse: result.response,
        parsedContent,
        usage: result.usage,
        responseTime: result.responseTime,
        model: result.model,
        temperature: result.temperature
    };
}

// Agent 2: Validator & Refiner
async function runValidatorAgent(generatedContent, originalTask) {
    console.log('🔍 Agent 2 (Validator) starting...');

    const prompt = `Review and validate the following content that was generated for the task: "${originalTask}"

Generated Content:
${JSON.stringify(generatedContent, null, 2)}

Please analyze this content and provide your validation in JSON format with the following structure:
{
    "validation_status": "pass" or "needs_improvement" or "fail",
    "issues": ["list of any issues found"],
    "suggestions": ["list of improvement suggestions"],
    "refined_content": {
        "title": "improved title if needed",
        "content": "improved content if needed",
        "metadata": {
            "word_count": number,
            "tone": "tone description",
            "key_points": ["refined points"]
        }
    },
    "quality_score": number between 0-100,
    "validation_notes": "overall assessment and reasoning"
}`;

    const result = await callClaude(AGENTS.validator, prompt);

    if (!result.success) {
        return { success: false, error: result.error, agent: 'validator' };
    }

    const parsedValidation = parseAgentResponse(result.response);

    return {
        success: true,
        agent: 'validator',
        rawResponse: result.response,
        parsedValidation,
        usage: result.usage,
        responseTime: result.responseTime,
        model: result.model,
        temperature: result.temperature
    };
}

// Main endpoint: Run both agents in sequence
app.post('/api/run-agents', async (req, res) => {
    try {
        const { task } = req.body;

        if (!task) {
            return res.status(400).json({ error: 'Task is required' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({
                error: 'Anthropic API key not configured'
            });
        }

        const executionLog = [];
        const startTime = Date.now();

        // Step 1: Run Generator Agent
        executionLog.push({
            step: 1,
            agent: AGENTS.generator.name,
            status: 'starting',
            timestamp: new Date().toISOString()
        });

        const generatorResult = await runGeneratorAgent(task);

        if (!generatorResult.success) {
            return res.status(500).json({
                error: 'Generator agent failed',
                details: generatorResult.error,
                executionLog
            });
        }

        executionLog.push({
            step: 1,
            agent: AGENTS.generator.name,
            status: 'completed',
            timestamp: new Date().toISOString(),
            responseTime: generatorResult.responseTime,
            tokensUsed: generatorResult.usage
        });

        // Step 2: Run Validator Agent with Generator's output
        executionLog.push({
            step: 2,
            agent: AGENTS.validator.name,
            status: 'starting',
            timestamp: new Date().toISOString()
        });

        const validatorResult = await runValidatorAgent(
            generatorResult.parsedContent,
            task
        );

        if (!validatorResult.success) {
            return res.status(500).json({
                error: 'Validator agent failed',
                details: validatorResult.error,
                generatorResult,
                executionLog
            });
        }

        executionLog.push({
            step: 2,
            agent: AGENTS.validator.name,
            status: 'completed',
            timestamp: new Date().toISOString(),
            responseTime: validatorResult.responseTime,
            tokensUsed: validatorResult.usage
        });

        const totalTime = Date.now() - startTime;

        // Prepare final response
        res.json({
            success: true,
            task,
            pipeline: {
                step1_generator: {
                    agent: AGENTS.generator,
                    result: generatorResult,
                    output: generatorResult.parsedContent
                },
                step2_validator: {
                    agent: AGENTS.validator,
                    result: validatorResult,
                    validation: validatorResult.parsedValidation
                }
            },
            summary: {
                totalExecutionTime: totalTime,
                totalTokensUsed: {
                    input: (generatorResult.usage?.input_tokens || 0) + (validatorResult.usage?.input_tokens || 0),
                    output: (generatorResult.usage?.output_tokens || 0) + (validatorResult.usage?.output_tokens || 0)
                },
                validationStatus: validatorResult.parsedValidation?.validation_status || 'unknown',
                qualityScore: validatorResult.parsedValidation?.quality_score || null
            },
            executionLog,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in agent pipeline:', error);
        res.status(500).json({
            error: 'Failed to run agent pipeline',
            details: error.message
        });
    }
});

// Get agent configurations
app.get('/api/agents', (req, res) => {
    res.json({
        agents: AGENTS,
        workflow: {
            description: 'Two-agent validation pipeline',
            steps: [
                {
                    step: 1,
                    agent: 'generator',
                    action: 'Generate content based on user task',
                    output: 'Structured JSON content with title, body, and metadata'
                },
                {
                    step: 2,
                    agent: 'validator',
                    action: 'Validate and refine the generated content',
                    input: 'Output from generator agent',
                    output: 'Validation report with quality score and refined content'
                }
            ]
        }
    });
});

// Example tasks
app.get('/api/example-tasks', (req, res) => {
    const examples = [
        {
            category: 'Creative Writing',
            tasks: [
                'Write a short story about a time traveler who gets stuck in the year 1850',
                'Create a product description for a smart coffee mug that keeps drinks at perfect temperature',
                'Write a motivational speech for aspiring entrepreneurs'
            ]
        },
        {
            category: 'Technical Content',
            tasks: [
                'Explain how blockchain technology works to a 10-year-old',
                'Write a tutorial on setting up a Node.js REST API',
                'Describe the benefits of microservices architecture'
            ]
        },
        {
            category: 'Business',
            tasks: [
                'Write an email announcing a new product launch to customers',
                'Create a job description for a Senior Software Engineer',
                'Draft a press release about a company reaching 1 million users'
            ]
        },
        {
            category: 'Educational',
            tasks: [
                'Explain photosynthesis in simple terms for middle school students',
                'Write a lesson plan for teaching basic Python programming',
                'Create a quiz about world geography with 5 questions'
            ]
        }
    ];

    res.json(examples);
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        hasApiKey: !!ANTHROPIC_API_KEY,
        agents: Object.keys(AGENTS),
        rateLimits: {
            maxRequestsPerMinute: RATE_LIMITS.maxRequestsPerMinute,
            minDelayBetweenRequests: RATE_LIMITS.minDelayBetweenRequests,
            currentRequestsInLastMinute: RATE_LIMITS.requestTimestamps.filter(
                ts => ts > Date.now() - 60000
            ).length
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Day 6 - Subagent Interaction running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to test agent collaboration`);
    console.log(`API Key configured: ${!!ANTHROPIC_API_KEY}`);
    console.log(`\nAgent Pipeline:`);
    console.log(`  1. ${AGENTS.generator.name} (${AGENTS.generator.model})`);
    console.log(`  2. ${AGENTS.validator.name} (${AGENTS.validator.model})`);
    console.log(`\nRate Limits:`);
    console.log(`  - Max requests per minute: ${RATE_LIMITS.maxRequestsPerMinute}`);
    console.log(`  - Min delay between requests: ${RATE_LIMITS.minDelayBetweenRequests}ms`);
});

