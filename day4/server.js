require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
    console.warn('Warning: ANTHROPIC_API_KEY environment variable not set');
}

// Temperature configurations to test
const TEMPERATURE_CONFIGS = [
    { value: 0, name: 'Conservative', description: 'Focused and deterministic' },
    { value: 0.7, name: 'Balanced', description: 'Good balance of creativity and accuracy' },
    { value: 1.0, name: 'Creative', description: 'Maximum creativity and variation' }
];

async function makeClaudeRequest(prompt, temperature, maxTokens = 300) {
    console.log(`Making request with temperature: ${temperature}`);
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-haiku-20240307',
                max_tokens: maxTokens,
                temperature: temperature,
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
        return {
            success: true,
            text: response.data.content[0].text,
            usage: response.data.usage
        };
    } catch (error) {
        console.error('Claude API error:', error.response?.data || error.message);
        console.error('Full error:', error);
        return {
            success: false,
            error: error.response?.data?.error?.message || error.message
        };
    }
}

function analyzeResponse(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = sentences > 0 ? (words / sentences).toFixed(1) : 0;
    
    // Better creativity metrics
    const uniqueWords = new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const lexicalDiversity = uniqueWords.size / words;
    
    // Check if it's just a word list (like "word1, word2, word3")
    const isWordList = sentences <= 1 && text.includes(',') && words < 20;
    
    // Count creative indicators
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const adjectives = text.match(/\b(amazing|incredible|fantastic|wonderful|brilliant|excellent|outstanding|remarkable|stunning|beautiful|creative|innovative|unique|special|extraordinary|magnificent|spectacular|wondrous|vibrant|vivacious|whimsical)\b/gi) || [];
    const metaphors = text.match(/\b(like|as|metaphor|symbol|represents|reminds|evokes)\b/gi) || [];
    
    // Better creativity calculation
    let creativityScore = 0;
    
    if (isWordList) {
        // Penalize simple word lists
        creativityScore = Math.min(lexicalDiversity * 3, 4);
    } else {
        // Reward proper creative writing
        const lengthBonus = Math.min(words / 20, 3); // Bonus for substantive content
        const structureBonus = sentences > 2 ? 1 : 0; // Bonus for multiple sentences  
        const diversityBonus = lexicalDiversity * 4; // Reduced weight for diversity
        const languageBonus = (adjectives.length * 0.3) + (metaphors.length * 0.5);
        const expressionBonus = (exclamationCount * 0.2) + (questionCount * 0.2);
        
        creativityScore = lengthBonus + structureBonus + diversityBonus + languageBonus + expressionBonus;
    }
    
    return {
        wordCount: words,
        sentenceCount: sentences,
        avgWordsPerSentence: parseFloat(avgWordsPerSentence),
        lexicalDiversity: parseFloat(lexicalDiversity.toFixed(3)),
        exclamationCount,
        questionCount,
        adjectiveCount: adjectives.length,
        isWordList,
        creativityScore: parseFloat(creativityScore.toFixed(2))
    };
}

app.post('/api/compare-temperatures', async (req, res) => {
    try {
        const { prompt, maxTokens = 300, runs = 1 } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ 
                error: 'Anthropic API key not configured' 
            });
        }

        // Run multiple iterations for each temperature to show variance
        const allResults = [];
        
        for (let run = 0; run < Math.min(runs, 3); run++) {
            const results = await Promise.all(
                TEMPERATURE_CONFIGS.map(async (config) => {
                    const response = await makeClaudeRequest(prompt, config.value, maxTokens);
                    
                    if (!response.success) {
                        return {
                            temperature: config.value,
                            name: config.name,
                            description: config.description,
                            run: run + 1,
                            error: response.error
                        };
                    }

                    const analysis = analyzeResponse(response.text);
                    
                    return {
                        temperature: config.value,
                        name: config.name,
                        description: config.description,
                        run: run + 1,
                        response: response.text,
                        analysis,
                        usage: response.usage
                    };
                })
            );
            allResults.push(...results);
        }

        // Group results by temperature for variance analysis
        const groupedResults = {};
        allResults.forEach(result => {
            if (!result.error) {
                if (!groupedResults[result.temperature]) {
                    groupedResults[result.temperature] = [];
                }
                groupedResults[result.temperature].push(result);
            }
        });

        // Calculate variance statistics
        const varianceAnalysis = {};
        Object.entries(groupedResults).forEach(([temp, results]) => {
            if (results.length > 1) {
                const wordCounts = results.map(r => r.analysis.wordCount);
                const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
                const variance = wordCounts.reduce((sum, count) => sum + Math.pow(count - avgWords, 2), 0) / wordCounts.length;
                
                varianceAnalysis[temp] = {
                    avgWordCount: Math.round(avgWords),
                    wordCountVariance: Math.round(variance),
                    responses: results.length,
                    consistency: variance < 50 ? 'High' : variance < 150 ? 'Medium' : 'Low'
                };
            }
        });

        // Create comparison using all results
        const validResults = allResults.filter(r => !r.error);
        const comparison = {
            mostWordy: validResults.reduce((a, b) => (a.analysis?.wordCount || 0) > (b.analysis?.wordCount || 0) ? a : b),
            mostCreative: validResults.reduce((a, b) => (a.analysis?.creativityScore || 0) > (b.analysis?.creativityScore || 0) ? a : b),
            mostDiverse: validResults.reduce((a, b) => (a.analysis?.lexicalDiversity || 0) > (b.analysis?.lexicalDiversity || 0) ? a : b),
            mostConcise: validResults.reduce((a, b) => (a.analysis?.avgWordsPerSentence || Infinity) < (b.analysis?.avgWordsPerSentence || Infinity) ? a : b)
        };

        res.json({
            prompt,
            results: allResults,
            varianceAnalysis,
            comparison,
            totalRuns: runs,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in temperature comparison:', error);
        res.status(500).json({ error: 'Failed to compare temperatures' });
    }
});

app.get('/api/prompt-suggestions', (req, res) => {
    const suggestions = [
        {
            category: 'High Variance Prompts (More likely to show differences)',
            prompts: [
                'Write exactly 10 unusual ways to use a paperclip',
                'Complete this sentence in 5 different ways: "The strangest thing about humans is..."',
                'Invent 3 completely new sports that could only exist in zero gravity',
                'Write a product review for an imaginary device that reads minds'
            ]
        },
        {
            category: 'Word Choice Sensitivity',
            prompts: [
                'Describe the color blue without using common color words',
                'Explain happiness using only food metaphors',
                'Write instructions for making a sandwich, but make it sound like an epic adventure'
            ]
        },
        {
            category: 'Multiple Valid Answers',
            prompts: [
                'List 7 things you could do with a million dollars',
                'What are 5 possible explanations for why cats purr?',
                'Name 6 creative uses for old smartphones'
            ]
        },
        {
            category: 'Low Variance (Minimal differences expected)',
            prompts: [
                'What is the capital of France?',
                'Explain how to change a car tire',
                'List the planets in our solar system',
                'How do you play football?' // User's example!
            ]
        },
        {
            category: 'Technical (Usually low variance)',
            prompts: [
                'Explain how machine learning works in simple terms',
                'Describe the difference between REST and GraphQL APIs',
                'What are the benefits of using TypeScript over JavaScript?'
            ]
        }
    ];
    
    res.json(suggestions);
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        hasApiKey: !!ANTHROPIC_API_KEY,
        temperatureConfigs: TEMPERATURE_CONFIGS,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Day 4 - Temperature Comparison running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to test different temperatures`);
    console.log(`API Key configured: ${!!ANTHROPIC_API_KEY}`);
});