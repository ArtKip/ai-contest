require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large prompts
app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY environment variable not set');
}

// Model context limits (approximate)
const MODEL_LIMITS = {
    'claude-3-haiku-20240307': {
        contextWindow: 200000,
        maxOutput: 4096,
        name: 'Claude 3 Haiku'
    },
    'claude-3-5-sonnet-20240620': {
        contextWindow: 200000,
        maxOutput: 8192,
        name: 'Claude 3.5 Sonnet'
    }
};

// Simple token estimation function
function estimateTokens(text) {
    // Rough approximation: 1 token ≈ 4 characters for English text
    // This is simplified - real tokenization is more complex
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

// More accurate token estimation for different content types
function detailedTokenEstimate(text) {
    if (!text) return { estimated: 0, characters: 0, words: 0 };
    
    const characters = text.length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    
    // Different estimation methods
    const estimates = {
        simple: Math.ceil(characters / 4),           // 4 chars per token
        conservative: Math.ceil(characters / 3),     // 3 chars per token (safer)
        wordBased: Math.ceil(words * 1.3),          // ~1.3 tokens per word
        punctuationAware: Math.ceil(characters / 4) + (text.match(/[.,!?;:]/g) || []).length
    };
    
    // Use conservative estimate as primary
    const estimated = estimates.conservative;
    
    return {
        estimated,
        characters,
        words,
        estimates,
        tokensPerChar: (estimated / characters).toFixed(3),
        tokensPerWord: (estimated / words).toFixed(2)
    };
}

async function makeClaudeRequest(prompt, model = 'claude-3-haiku-20240307', maxTokens = 1000) {
    const inputTokenEstimate = detailedTokenEstimate(prompt);
    
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: model,
                max_tokens: maxTokens,
                messages: [
                    {
                        role: 'user',
                        content: prompt
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
        
        const responseText = response.data.content[0].text;
        const outputTokenEstimate = detailedTokenEstimate(responseText);
        const actualUsage = response.data.usage;
        
        return {
            success: true,
            response: responseText,
            tokenAnalysis: {
                input: {
                    estimated: inputTokenEstimate,
                    actual: actualUsage.input_tokens
                },
                output: {
                    estimated: outputTokenEstimate,
                    actual: actualUsage.output_tokens
                },
                total: {
                    estimated: inputTokenEstimate.estimated + outputTokenEstimate.estimated,
                    actual: actualUsage.input_tokens + actualUsage.output_tokens
                },
                accuracy: {
                    inputAccuracy: ((inputTokenEstimate.estimated / actualUsage.input_tokens) * 100).toFixed(1),
                    outputAccuracy: ((outputTokenEstimate.estimated / actualUsage.output_tokens) * 100).toFixed(1)
                }
            },
            usage: actualUsage,
            model: model,
            modelLimits: MODEL_LIMITS[model]
        };
    } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);
        
        // Handle specific token limit errors
        if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('tokens')) {
            return {
                success: false,
                error: 'Token limit exceeded',
                details: error.response.data.error.message,
                tokenAnalysis: {
                    input: {
                        estimated: inputTokenEstimate,
                        actual: null
                    },
                    exceedsLimit: true
                }
            };
        }
        
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message,
            tokenAnalysis: {
                input: {
                    estimated: inputTokenEstimate,
                    actual: null
                }
            }
        };
    }
}

// Generate test prompts of different lengths
function generateTestPrompts() {
    return {
        short: {
            name: "Short Prompt",
            description: "Minimal input to test baseline token usage",
            prompt: "Hello! How are you?",
            expectedBehavior: "Normal response, minimal token usage"
        },
        medium: {
            name: "Medium Prompt",
            description: "Moderate length with context",
            prompt: "I'm working on a software project that involves building a web application for managing tasks. The application should allow users to create, edit, and delete tasks, organize them into projects, set priorities and due dates, and collaborate with team members. I'm considering using React for the frontend and Node.js with Express for the backend. What are some best practices I should follow for this type of application? Please provide specific recommendations for architecture, database design, user authentication, and API structure.",
            expectedBehavior: "Detailed response with architectural advice"
        },
        long: {
            name: "Long Prompt",
            description: "Extended context with detailed requirements",
            prompt: generateLongPrompt(),
            expectedBehavior: "Comprehensive response, higher token usage"
        },
        veryLong: {
            name: "Very Long Prompt",
            description: "Extremely long prompt to test context limits",
            prompt: generateVeryLongPrompt(),
            expectedBehavior: "May hit context limits, possible truncation"
        }
    };
}

function generateLongPrompt() {
    return `I am the CTO of a rapidly growing technology startup that has recently secured Series B funding of $50 million. Our company specializes in artificial intelligence and machine learning solutions for enterprise clients, with a focus on predictive analytics, natural language processing, and computer vision applications.

Our current technical infrastructure consists of a microservices architecture deployed on AWS, using Docker containers orchestrated with Kubernetes. We have a React-based frontend application, multiple Node.js backend services, Python-based ML models deployed with FastAPI, and a data pipeline built with Apache Airflow. Our databases include PostgreSQL for transactional data, MongoDB for document storage, Redis for caching, and Elasticsearch for search functionality.

However, we're facing several critical challenges as we scale:

1. Performance Issues: Our API response times have increased significantly as our user base has grown from 10,000 to 100,000+ active users. Some endpoints are taking 3-5 seconds to respond during peak hours.

2. Data Management: We're processing 10TB+ of data daily, and our current ETL processes are becoming bottlenecks. Data inconsistencies are appearing across different services.

3. ML Pipeline Scalability: Our machine learning models need to be retrained frequently with new data, but the current pipeline takes 8-12 hours to complete, which is impacting our ability to serve fresh predictions.

4. Security Concerns: With enterprise clients, we need to implement SOC 2 compliance, end-to-end encryption, and advanced threat detection.

5. Development Velocity: Our engineering team has grown to 45 developers, and we're experiencing coordination issues, slower deployment cycles, and increasing technical debt.

6. Cost Optimization: Our AWS costs have tripled in the last six months, and we need to optimize our cloud spending while maintaining performance.

Given this context, I need comprehensive recommendations for:

A) Architectural improvements to handle our scale
B) Database optimization and data architecture strategy
C) ML infrastructure modernization
D) Security and compliance implementation roadmap
E) Development process improvements and tooling
F) Cost optimization strategies
G) Monitoring and observability solutions
H) Team structure and technical leadership organization

Please provide detailed technical recommendations with specific technologies, implementation approaches, timelines, and potential risks for each area. Consider both immediate improvements we can implement in the next 3 months and longer-term strategic changes for the next 12-18 months.`;
}

function generateVeryLongPrompt() {
    const sections = [];
    
    // Generate a very long prompt by repeating and expanding content
    for (let i = 1; i <= 20; i++) {
        sections.push(`
SECTION ${i}: DETAILED REQUIREMENTS AND SPECIFICATIONS

This section contains detailed requirements for component ${i} of our comprehensive software system. Each component must be thoroughly analyzed and implemented according to enterprise-grade standards and best practices.

Component ${i} Overview:
This component handles critical business logic related to user management, data processing, security protocols, and integration with external APIs. The implementation requires careful consideration of scalability, performance, reliability, and maintainability.

Technical Requirements for Component ${i}:
- Must handle concurrent users: 10,000+ simultaneous connections
- Database operations: Support for ACID transactions with millisecond response times
- API endpoints: RESTful design with comprehensive error handling and rate limiting
- Security: End-to-end encryption, OAuth 2.0 integration, role-based access control
- Monitoring: Real-time metrics, logging, alerting, and performance dashboards
- Testing: Unit tests (90%+ coverage), integration tests, load tests, security tests

Architecture Considerations for Component ${i}:
The component should follow microservices architecture principles with proper service boundaries, loose coupling, and high cohesion. Implementation should consider event-driven architecture patterns, CQRS where appropriate, and proper caching strategies.

Data Models for Component ${i}:
Define comprehensive data schemas with proper relationships, indexes, and constraints. Consider data migration strategies, backup and recovery procedures, and compliance with data protection regulations.

Integration Requirements for Component ${i}:
This component must integrate with multiple external services including payment processors, email services, analytics platforms, and third-party APIs. Each integration requires proper error handling, retry logic, and fallback mechanisms.

Performance Requirements for Component ${i}:
- API response time: < 200ms for 95th percentile
- Database query time: < 50ms average
- Memory usage: Optimized for containerized deployment
- CPU utilization: Efficient algorithms and proper resource management

Security Requirements for Component ${i}:
Implement comprehensive security measures including input validation, SQL injection prevention, XSS protection, CSRF tokens, secure session management, and regular security audits.

Testing Strategy for Component ${i}:
Comprehensive testing approach including unit tests, integration tests, contract tests, load tests, security tests, and end-to-end tests. Automated testing pipeline with continuous integration and deployment.

Documentation Requirements for Component ${i}:
Complete documentation including API documentation, architecture diagrams, deployment guides, troubleshooting guides, and user manuals.

Please provide detailed implementation guidance for each aspect of Component ${i}, including specific technologies, frameworks, libraries, deployment strategies, monitoring approaches, and maintenance procedures.`);
    }
    
    return `COMPREHENSIVE SYSTEM ANALYSIS AND IMPLEMENTATION GUIDE

I need a complete analysis and implementation strategy for a large-scale enterprise software system. This system will serve millions of users globally and must meet the highest standards of performance, security, and reliability.

EXECUTIVE SUMMARY:
Our organization is building a next-generation platform that combines artificial intelligence, blockchain technology, IoT integration, real-time analytics, and advanced user interfaces. The system must handle massive scale, provide real-time responses, ensure data security, and offer seamless user experiences across web, mobile, and embedded devices.

SYSTEM OVERVIEW:
The platform consists of multiple interconnected components, each requiring sophisticated implementation approaches. The system must integrate with hundreds of external APIs, process petabytes of data, support millions of concurrent users, and provide 99.99% uptime.

${sections.join('\n')}

ADDITIONAL CONSIDERATIONS:

Global Deployment Strategy:
The system must be deployed across multiple geographic regions with proper data localization, compliance with regional regulations, and optimized content delivery networks.

Disaster Recovery and Business Continuity:
Comprehensive backup strategies, failover mechanisms, disaster recovery procedures, and business continuity planning.

Performance Optimization:
Advanced caching strategies, database optimization, code profiling, resource management, and performance monitoring.

Scalability Planning:
Horizontal and vertical scaling strategies, load balancing, auto-scaling policies, and capacity planning.

Please provide an exhaustive analysis and implementation plan covering all aspects mentioned above, with specific recommendations, timelines, resource requirements, risk assessments, and success metrics.`;
}

app.post('/api/test-tokens', async (req, res) => {
    try {
        const { promptType, customPrompt, model = 'claude-3-haiku-20240307', maxTokens = 1000 } = req.body;
        
        let prompt;
        let testInfo;
        
        if (promptType === 'custom' && customPrompt) {
            prompt = customPrompt;
            testInfo = {
                name: "Custom Prompt",
                description: "User-provided prompt",
                expectedBehavior: "Varies based on content"
            };
        } else {
            const testPrompts = generateTestPrompts();
            testInfo = testPrompts[promptType];
            prompt = testInfo?.prompt;
        }
        
        if (!prompt) {
            return res.status(400).json({ error: 'Invalid prompt type or missing custom prompt' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ 
                error: 'Anthropic API key not configured' 
            });
        }

        const result = await makeClaudeRequest(prompt, model, maxTokens);
        
        res.json({
            testInfo,
            prompt,
            promptLength: prompt.length,
            model,
            maxTokens,
            result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in token test:', error);
        res.status(500).json({ error: 'Failed to test tokens' });
    }
});

app.get('/api/prompt-examples', (req, res) => {
    const testPrompts = generateTestPrompts();
    
    // Add token estimates for each prompt
    Object.keys(testPrompts).forEach(key => {
        const prompt = testPrompts[key];
        prompt.tokenEstimate = detailedTokenEstimate(prompt.prompt);
    });
    
    res.json({
        prompts: testPrompts,
        modelLimits: MODEL_LIMITS,
        estimationInfo: {
            method: "Conservative estimation: ~3 characters per token",
            accuracy: "Estimates within 20-30% of actual usage",
            note: "Actual tokenization depends on content type and language"
        }
    });
});

app.post('/api/compare-prompts', async (req, res) => {
    try {
        const { model = 'claude-3-haiku-20240307', maxTokens = 1000 } = req.body;

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ 
                error: 'Anthropic API key not configured' 
            });
        }

        const testPrompts = generateTestPrompts();
        const results = {};
        
        // Test each prompt type
        for (const [key, testInfo] of Object.entries(testPrompts)) {
            console.log(`Testing ${key} prompt...`);
            try {
                const result = await makeClaudeRequest(testInfo.prompt, model, maxTokens);
                results[key] = {
                    testInfo,
                    result,
                    promptLength: testInfo.prompt.length
                };
                
                // Add delay between requests to be respectful to API
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results[key] = {
                    testInfo,
                    result: { 
                        success: false, 
                        error: error.message 
                    },
                    promptLength: testInfo.prompt.length
                };
            }
        }
        
        res.json({
            model,
            maxTokens,
            results,
            modelLimits: MODEL_LIMITS[model],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in prompt comparison:', error);
        res.status(500).json({ error: 'Failed to compare prompts' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        hasApiKey: !!ANTHROPIC_API_KEY,
        modelLimits: MODEL_LIMITS,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Day 5 - Token Analysis running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to explore token behavior`);
    console.log(`API Key configured: ${!!ANTHROPIC_API_KEY}`);
});