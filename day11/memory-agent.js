#!/usr/bin/env node

const { MemoryManager } = require('./memory-manager');

/**
 * Memory-Enabled Agent
 * 
 * An intelligent agent that maintains long-term memory across conversations
 * and can build upon previous interactions to provide better responses.
 */

class MemoryAgent {
    constructor(options = {}) {
        this.name = options.name || 'MemoryBot';
        this.memory = new MemoryManager(options.memory || {});
        this.currentSessionId = null;
        this.conversationCount = 0;
        this.personalityTraits = options.personality || {
            helpful: 0.9,
            curious: 0.7,
            formal: 0.3,
            creative: 0.8
        };
        
        // Track user preferences and patterns
        this.userProfile = {
            preferredTopics: [],
            communicationStyle: 'balanced',
            frequentQuestions: [],
            learningGoals: []
        };

        this.init();
    }

    async init() {
        console.log(`🤖 Initializing ${this.name}...`);
        
        // Start a new session
        this.startNewSession();
        
        // Load user profile from memory if available
        await this.loadUserProfile();
        
        console.log(`✅ ${this.name} ready with memory-enabled conversations`);
        console.log(`📍 Session ID: ${this.currentSessionId}`);
    }

    startNewSession() {
        this.currentSessionId = uuid();
        this.conversationCount = 0;
        console.log(`🆕 Started new session: ${this.currentSessionId}`);
    }

    async loadUserProfile() {
        try {
            // Load user preferences from memory
            const userMemories = await this.memory.db.all(`
                SELECT content, context FROM memories 
                WHERE type IN ('preference', 'fact') 
                AND relevance_score > 0.6
                ORDER BY relevance_score DESC
                LIMIT 10
            `);

            if (userMemories.length > 0) {
                console.log(`🧠 Loaded ${userMemories.length} user preferences from memory`);
                // Parse and apply user preferences
                this.applyUserPreferences(userMemories);
            }
        } catch (error) {
            console.log('ℹ️ No previous user profile found (starting fresh)');
        }
    }

    applyUserPreferences(memories) {
        memories.forEach(memory => {
            try {
                const data = JSON.parse(memory.context);
                if (data.preferredTopic) {
                    this.userProfile.preferredTopics.push(data.preferredTopic);
                }
                if (data.communicationStyle) {
                    this.userProfile.communicationStyle = data.communicationStyle;
                }
            } catch (error) {
                // Non-JSON memory, extract key information differently
                if (memory.content.toLowerCase().includes('prefer')) {
                    this.userProfile.preferredTopics.push(memory.content);
                }
            }
        });
    }

    /**
     * Process a user message and generate a contextually-aware response
     */
    async processMessage(userInput, metadata = {}) {
        const startTime = Date.now();
        this.conversationCount++;

        console.log(`\n💬 Processing message ${this.conversationCount}...`);
        console.log(`📝 User: "${userInput}"`);

        try {
            // Get relevant context from memory
            const context = await this.memory.getRelevantContext(
                userInput, 
                this.currentSessionId, 
                3
            );

            // Analyze the input and determine response strategy
            const analysis = this.analyzeInput(userInput);
            
            // Generate response using memory and context
            const response = await this.generateContextualResponse(
                userInput, 
                context, 
                analysis
            );

            // Calculate response time
            const responseTime = Date.now() - startTime;
            
            // Store the conversation
            const conversationMetadata = {
                ...metadata,
                tokensUsed: this.estimateTokens(userInput + response),
                responseTime,
                analysis,
                contextUsed: context.recentConversations.length + context.relevantMemories.length
            };

            await this.memory.storeConversation(
                this.currentSessionId,
                userInput,
                response,
                conversationMetadata
            );

            // Extract and store any new memories from the conversation
            await this.extractAndStoreMemories(userInput, response, analysis);

            // Update session summary
            await this.updateSessionSummary();

            console.log(`🤖 Agent: "${response}"`);
            console.log(`⏱️ Response time: ${responseTime}ms`);

            return {
                response,
                metadata: conversationMetadata,
                sessionId: this.currentSessionId,
                conversationId: this.conversationCount
            };

        } catch (error) {
            console.error('❌ Error processing message:', error.message);
            return {
                response: "I apologize, but I encountered an error while processing your message. Please try again.",
                error: error.message,
                sessionId: this.currentSessionId
            };
        }
    }

    analyzeInput(input) {
        const analysis = {
            intent: 'general',
            topics: [],
            sentiment: 'neutral',
            complexity: 'medium',
            requiresMemory: false,
            isQuestion: input.includes('?'),
            isInstruction: false,
            personalInfo: false
        };

        const lowerInput = input.toLowerCase();

        // Detect intent
        if (lowerInput.includes('remember') || lowerInput.includes('recall')) {
            analysis.intent = 'memory_query';
            analysis.requiresMemory = true;
        } else if (lowerInput.includes('my name is') || lowerInput.includes('i am') || lowerInput.includes('i like')) {
            analysis.intent = 'personal_info';
            analysis.personalInfo = true;
        } else if (lowerInput.includes('explain') || lowerInput.includes('how') || lowerInput.includes('what')) {
            analysis.intent = 'information_request';
        } else if (lowerInput.includes('help') || lowerInput.includes('assist')) {
            analysis.intent = 'assistance_request';
        }

        // Extract topics (simple keyword extraction)
        const topics = [];
        const topicKeywords = ['programming', 'code', 'javascript', 'python', 'ai', 'machine learning', 'web development', 'database', 'algorithm', 'design', 'business', 'science', 'technology'];
        
        topicKeywords.forEach(keyword => {
            if (lowerInput.includes(keyword)) {
                topics.push(keyword);
            }
        });
        analysis.topics = topics;

        // Basic sentiment analysis
        const positiveWords = ['good', 'great', 'excellent', 'love', 'like', 'amazing', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'hate', 'dislike', 'awful', 'horrible'];
        
        const hasPositive = positiveWords.some(word => lowerInput.includes(word));
        const hasNegative = negativeWords.some(word => lowerInput.includes(word));
        
        if (hasPositive && !hasNegative) analysis.sentiment = 'positive';
        else if (hasNegative && !hasPositive) analysis.sentiment = 'negative';

        // Complexity assessment
        if (input.length > 200 || input.split(' ').length > 30) {
            analysis.complexity = 'high';
        } else if (input.length < 50) {
            analysis.complexity = 'low';
        }

        return analysis;
    }

    async generateContextualResponse(userInput, context, analysis) {
        // Build context string for response generation
        let contextString = '';
        
        // Add recent conversation context
        if (context.recentConversations.length > 0) {
            contextString += `\nRecent conversation context:\n`;
            context.recentConversations.slice(-2).forEach(conv => {
                contextString += `User: ${conv.user_input}\nAgent: ${conv.agent_response}\n`;
            });
        }

        // Add relevant memories
        if (context.relevantMemories.length > 0) {
            contextString += `\nRelevant memories:\n`;
            context.relevantMemories.forEach(memory => {
                contextString += `- ${memory.content} (${memory.type})\n`;
            });
        }

        // Generate response based on intent and context
        let response;

        switch (analysis.intent) {
            case 'memory_query':
                response = await this.handleMemoryQuery(userInput, context);
                break;
            case 'personal_info':
                response = await this.handlePersonalInfo(userInput, analysis);
                break;
            case 'information_request':
                response = this.handleInformationRequest(userInput, analysis, context);
                break;
            case 'assistance_request':
                response = this.handleAssistanceRequest(userInput, analysis, context);
                break;
            default:
                response = this.generateGeneralResponse(userInput, analysis, context);
        }

        // Add personality-based adjustments
        response = this.applyPersonalityToResponse(response, analysis);

        return response;
    }

    async handleMemoryQuery(userInput, context) {
        const searchTerm = userInput.replace(/remember|recall|what did|when did/gi, '').trim();
        
        // First, check if we have relevant memories from context
        if (context.relevantMemories.length > 0) {
            let response = "Based on what I remember about you: ";
            context.relevantMemories.slice(0, 3).forEach((memory, index) => {
                response += `${memory.content}. `;
            });
            return response;
        }
        
        // Then search conversations if we have a search term
        if (searchTerm.length > 3) {
            const searchResults = await this.memory.searchConversations(searchTerm, 5);
            
            if (searchResults.length > 0) {
                let response = "I found these relevant memories:\n\n";
                searchResults.slice(0, 3).forEach((result, index) => {
                    response += `${index + 1}. From ${new Date(result.timestamp).toLocaleDateString()}: `;
                    response += `"${result.user_input}" - ${result.agent_response.substring(0, 100)}...\n\n`;
                });
                return response;
            }
        }
        
        return "I searched my memory but couldn't find anything specific about that. Could you provide more details?";
    }

    async handlePersonalInfo(userInput, analysis) {
        // Extract personal information and store as memory
        let response = "Thank you for sharing that information with me. ";

        if (userInput.toLowerCase().includes('my name is')) {
            const name = userInput.match(/my name is (\w+)/i)?.[1];
            if (name) {
                await this.memory.storeMemory(
                    'fact',
                    `User's name is ${name}`,
                    JSON.stringify({ type: 'personal_info', name }),
                    0.9,
                    this.currentSessionId
                );
                response += `I'll remember that your name is ${name}. `;
            }
        }

        if (userInput.toLowerCase().includes('i like') || userInput.toLowerCase().includes('i love')) {
            const preference = userInput.match(/i (?:like|love) (.+)/i)?.[1];
            if (preference) {
                await this.memory.storeMemory(
                    'preference',
                    `User likes ${preference}`,
                    JSON.stringify({ type: 'preference', item: preference }),
                    0.7,
                    this.currentSessionId
                );
                response += `I've noted that you like ${preference}. `;
            }
        }

        response += "I'll keep this in mind for our future conversations.";
        return response;
    }

    handleInformationRequest(userInput, analysis, context) {
        let response = "I'd be happy to help you with that information. ";

        // Check if we have relevant context
        if (context.relevantMemories.length > 0) {
            const relevantMemory = context.relevantMemories.find(m => 
                analysis.topics.some(topic => m.content.toLowerCase().includes(topic))
            );
            
            if (relevantMemory) {
                response += `Based on our previous discussions, ${relevantMemory.content}. `;
            }
        }

        // Simulate providing information based on the question
        if (analysis.topics.length > 0) {
            response += `Regarding ${analysis.topics.join(' and ')}, `;
            response += "here's what I can share: This is a complex topic with many aspects to consider. ";
            response += "Would you like me to focus on any particular aspect?";
        } else {
            response += "Could you be more specific about what information you're looking for? ";
            response += "This will help me provide you with the most relevant and useful response.";
        }

        return response;
    }

    handleAssistanceRequest(userInput, analysis, context) {
        let response = "I'm here to help! ";

        // Check for past assistance patterns
        if (context.recentConversations.length > 0) {
            const recentHelp = context.recentConversations.find(conv => 
                conv.user_input.toLowerCase().includes('help') || 
                conv.agent_response.toLowerCase().includes('assist')
            );
            
            if (recentHelp) {
                response += "Continuing from our previous discussion, ";
            }
        }

        response += "Based on what you've asked, I can assist you with several approaches. ";
        response += "Let me know if you'd like me to provide step-by-step guidance, ";
        response += "examples, or if you have specific requirements I should consider.";

        return response;
    }

    generateGeneralResponse(userInput, analysis, context) {
        let response = "";

        // Use context if available
        if (context.recentConversations.length > 0) {
            response += "Continuing our conversation, ";
        }

        // Adjust response based on sentiment
        if (analysis.sentiment === 'positive') {
            response += "I'm glad to hear that! ";
        } else if (analysis.sentiment === 'negative') {
            response += "I understand your concern. ";
        }

        // Add topic-relevant response
        if (analysis.topics.length > 0) {
            response += `Regarding ${analysis.topics.join(' and ')}, that's an interesting area. `;
        }

        response += "I'm here to have a meaningful conversation with you. ";
        response += "Feel free to share more details or ask any questions you might have.";

        return response;
    }

    applyPersonalityToResponse(response, analysis) {
        // Adjust formality based on personality
        if (this.personalityTraits.formal < 0.4) {
            response = response.replace(/I would/g, "I'd").replace(/I am/g, "I'm");
        }

        // Add curiosity if high curiosity trait
        if (this.personalityTraits.curious > 0.7 && analysis.isQuestion) {
            response += " That's a fascinating question! ";
        }

        // Add creativity elements if high creativity
        if (this.personalityTraits.creative > 0.7) {
            const creativeAddons = [
                " Here's an interesting perspective: ",
                " Let me think about this creatively... ",
                " That reminds me of an interesting connection: "
            ];
            
            if (Math.random() > 0.7) {
                response += creativeAddons[Math.floor(Math.random() * creativeAddons.length)];
            }
        }

        return response;
    }

    async extractAndStoreMemories(userInput, agentResponse, analysis) {
        // Store important facts or preferences mentioned
        if (analysis.personalInfo) {
            // Already handled in handlePersonalInfo
            return;
        }

        // Store significant topics discussed
        if (analysis.topics.length > 0) {
            await this.memory.storeMemory(
                'fact',
                `Discussed ${analysis.topics.join(', ')} in session`,
                JSON.stringify({ topics: analysis.topics, session: this.currentSessionId }),
                0.5,
                this.currentSessionId
            );
        }

        // Store patterns for future reference
        if (analysis.intent === 'information_request' && userInput.length > 50) {
            await this.memory.storeMemory(
                'instruction',
                `User asked detailed question about: ${userInput.substring(0, 100)}`,
                JSON.stringify({ intent: analysis.intent, complexity: analysis.complexity }),
                0.4,
                this.currentSessionId
            );
        }
    }

    async updateSessionSummary() {
        // Generate session summary every few conversations
        if (this.conversationCount % 5 === 0) {
            const history = await this.memory.getSessionHistory(this.currentSessionId, 10);
            
            const topics = new Set();
            history.forEach(conv => {
                if (conv.metadata) {
                    try {
                        const meta = typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : conv.metadata;
                        if (meta.analysis && meta.analysis.topics) {
                            meta.analysis.topics.forEach(topic => topics.add(topic));
                        }
                    } catch (error) {
                        // Skip invalid metadata
                    }
                }
            });

            const summary = `Session with ${this.conversationCount} interactions covering: ${Array.from(topics).join(', ')}`;
            const tags = Array.from(topics).join(',');

            await this.memory.updateSession(this.currentSessionId, {
                summary,
                tags,
                totalInteractions: this.conversationCount,
                totalTokens: history.reduce((sum, conv) => sum + (conv.tokens_used || 0), 0)
            });
        }
    }

    estimateTokens(text) {
        // Rough token estimation (actual tokenization would be more accurate)
        return Math.ceil(text.length / 4);
    }

    async getMemoryStats() {
        const stats = await this.memory.getMemoryStats();
        return {
            agent: this.name,
            currentSession: this.currentSessionId,
            conversationsThisSession: this.conversationCount,
            ...stats
        };
    }

    async endSession() {
        console.log(`📝 Ending session ${this.currentSessionId}...`);
        
        // Final session update
        await this.updateSessionSummary();
        
        // Export to JSON
        await this.memory.exportToJSON();
        
        console.log(`✅ Session ended with ${this.conversationCount} conversations`);
    }

    async shutdown() {
        await this.endSession();
        await this.memory.close();
        console.log(`👋 ${this.name} shutting down`);
    }
}

// Simple UUID v4 implementation
const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

module.exports = { MemoryAgent };

// Command line interface
if (require.main === module) {
    const readline = require('readline');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    async function runCLI() {
        console.log('🚀 Starting Memory Agent CLI...\n');

        const agent = new MemoryAgent({
            name: 'MemoryBot CLI',
            personality: {
                helpful: 0.9,
                curious: 0.8,
                formal: 0.4,
                creative: 0.7
            }
        });

        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n💬 Start chatting! (type "exit" to quit, "stats" for memory stats)\n');

        const chat = () => {
            rl.question('You: ', async (input) => {
                if (input.toLowerCase() === 'exit') {
                    await agent.shutdown();
                    rl.close();
                    return;
                }

                if (input.toLowerCase() === 'stats') {
                    const stats = await agent.getMemoryStats();
                    console.log('\n📊 Memory Statistics:');
                    console.log(JSON.stringify(stats, null, 2));
                    console.log('');
                    chat();
                    return;
                }

                if (input.trim() === '') {
                    chat();
                    return;
                }

                const result = await agent.processMessage(input);
                console.log(`Bot: ${result.response}\n`);
                
                chat();
            });
        };

        chat();
    }

    runCLI().catch(error => {
        console.error('❌ CLI error:', error.message);
        process.exit(1);
    });
}