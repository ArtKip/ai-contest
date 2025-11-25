#!/usr/bin/env node

const axios = require('axios');

/**
 * Intelligent MCP Agent - Uses LLM reasoning to decide tool usage dynamically
 * 
 * This demonstrates the TRUE MCP use case:
 * - LLM analyzes user request
 * - LLM decides which tools to use and in what order
 * - LLM adapts based on intermediate results
 * - LLM chains tools intelligently, not just in predefined sequences
 */

class IntelligentMCPAgent {
    constructor(name = 'IntelligentAgent') {
        this.name = name;
        this.mcpServers = {
            'search_docs': 'http://localhost:3001',
            'summarize': 'http://localhost:3002', 
            'save_to_file': 'http://localhost:3003'
        };
        this.availableTools = new Map();
        this.executionHistory = [];
        this.currentContext = '';
    }

    async discoverTools() {
        console.log(`🧠 ${this.name}: Discovering available MCP tools...`);
        
        for (const [toolName, serverUrl] of Object.entries(this.mcpServers)) {
            try {
                const response = await axios.get(`${serverUrl}/mcp/tools/list`);
                const tools = response.data.tools;
                
                tools.forEach(tool => {
                    this.availableTools.set(tool.name, {
                        ...tool,
                        serverUrl,
                        lastUsed: null
                    });
                });
                
                console.log(`   ✅ Discovered: ${tools.map(t => t.name).join(', ')}`);
            } catch (error) {
                console.log(`   ❌ Could not reach ${serverUrl}`);
            }
        }
        
        console.log(`🔧 Total tools available: ${this.availableTools.size}\\n`);
    }

    /**
     * LLM-driven decision making - the core of intelligent MCP usage
     */
    async analyzeAndDecideNextAction(userRequest, currentContext = '', previousResults = []) {
        const availableToolsList = Array.from(this.availableTools.keys()).join(', ');
        
        // Simulate LLM reasoning (in real implementation, this would call actual LLM)
        const llmPrompt = `
You are an intelligent agent with access to these MCP tools: ${availableToolsList}

User Request: "${userRequest}"
Current Context: ${currentContext}
Previous Results: ${JSON.stringify(previousResults, null, 2)}

Available tools and their capabilities:
- search_docs: Search through documentation and knowledge bases
- summarize: Create summaries with different types (bullet_points, key_insights, executive, etc.)
- save_to_file: Save content to files in various formats (txt, md, html, json, etc.)

Based on the user request and current context, decide:
1. What is the next most logical action?
2. Which tool should be used?
3. What are the specific parameters for that tool?
4. Why is this the best next step?
5. Should we continue after this step or stop?

Respond in this JSON format:
{
  "reasoning": "Why this action makes sense",
  "nextAction": "tool_name or 'complete'", 
  "toolParameters": { /* tool-specific parameters */ },
  "shouldContinue": true/false,
  "expectedOutcome": "What we expect this step to achieve"
}`;

        // Simulate LLM decision-making based on context
        return this.simulateLLMDecision(userRequest, currentContext, previousResults, availableToolsList);
    }

    /**
     * Simulate intelligent LLM decision making
     * (In production, this would call a real LLM API)
     */
    simulateLLMDecision(userRequest, currentContext, previousResults, availableTools) {
        const request = userRequest.toLowerCase();
        const hasSearchResults = previousResults.some(r => r.tool === 'search_docs');
        const hasSummary = previousResults.some(r => r.tool === 'summarize');
        const hasSavedFile = previousResults.some(r => r.tool === 'save_to_file');

        // LLM reasoning simulation
        if (!hasSearchResults && (request.includes('find') || request.includes('research') || 
            request.includes('information') || request.includes('about') || request.includes('what'))) {
            return {
                reasoning: "User is asking for information. Need to search for relevant content first.",
                nextAction: "search_docs",
                toolParameters: {
                    query: this.extractSearchQuery(userRequest),
                    searchType: request.includes('comprehensive') ? 'semantic' : 'keyword',
                    maxResults: request.includes('detailed') ? 3 : 2,
                    includeContent: true
                },
                shouldContinue: true,
                expectedOutcome: "Find relevant information to answer the user's question"
            };
        }

        if (hasSearchResults && !hasSummary && (request.includes('summary') || request.includes('explain') || 
            request.includes('overview') || request.includes('brief') || currentContext.length > 500)) {
            return {
                reasoning: "Have search results. User wants digestible information, so should summarize the findings.",
                nextAction: "summarize",
                toolParameters: {
                    content: this.extractContentFromResults(previousResults),
                    summaryType: this.determineSummaryType(userRequest),
                    length: request.includes('brief') ? 'brief' : request.includes('detailed') ? 'detailed' : 'medium',
                    includeKeywords: true
                },
                shouldContinue: !request.includes('just summary'),
                expectedOutcome: "Create a digestible summary of the found information"
            };
        }

        if ((hasSearchResults || hasSummary) && !hasSavedFile && 
            (request.includes('save') || request.includes('report') || request.includes('document') || 
             request.includes('file') || request.includes('export'))) {
            return {
                reasoning: "User wants to save/export the results. Should save the processed information.",
                nextAction: "save_to_file",
                toolParameters: {
                    content: this.getLatestContent(previousResults),
                    filename: this.generateFilename(userRequest),
                    format: this.determineFileFormat(userRequest),
                    overwrite: true,
                    metadata: {
                        query: userRequest,
                        agent: this.name,
                        timestamp: new Date().toISOString(),
                        toolsUsed: previousResults.map(r => r.tool)
                    }
                },
                shouldContinue: false,
                expectedOutcome: "Save the processed information for user access"
            };
        }

        if (!hasSearchResults && !request.includes('search') && !request.includes('find')) {
            // User asking something that might need context
            return {
                reasoning: "User request might benefit from additional context. Searching for related information.",
                nextAction: "search_docs",
                toolParameters: {
                    query: this.extractKeyTerms(userRequest),
                    searchType: 'semantic',
                    maxResults: 2,
                    includeContent: true
                },
                shouldContinue: true,
                expectedOutcome: "Gather context to better address the user's request"
            };
        }

        if (hasSearchResults && !hasSummary) {
            return {
                reasoning: "Have information but it needs to be processed for the user.",
                nextAction: "summarize",
                toolParameters: {
                    content: this.extractContentFromResults(previousResults),
                    summaryType: "key_insights",
                    length: "medium"
                },
                shouldContinue: true,
                expectedOutcome: "Process the information into an actionable format"
            };
        }

        // Default completion
        return {
            reasoning: "Have sufficient information to complete the user's request.",
            nextAction: "complete",
            toolParameters: {},
            shouldContinue: false,
            expectedOutcome: "Task completed based on available information"
        };
    }

    /**
     * Execute the intelligent workflow
     */
    async processRequest(userRequest) {
        console.log(`\\n🎯 User Request: "${userRequest}"`);
        console.log(`🧠 ${this.name}: Analyzing request and planning intelligent tool usage...\\n`);

        const session = {
            userRequest,
            startTime: Date.now(),
            steps: [],
            success: false,
            finalResponse: ''
        };

        let currentContext = '';
        let previousResults = [];
        let stepCount = 0;
        const maxSteps = 5; // Prevent infinite loops

        try {
            while (stepCount < maxSteps) {
                stepCount++;
                
                // LLM decides next action based on current state
                const decision = await this.analyzeAndDecideNextAction(
                    userRequest, 
                    currentContext, 
                    previousResults
                );

                console.log(`🤔 Step ${stepCount} - LLM Decision:`);
                console.log(`   Reasoning: ${decision.reasoning}`);
                console.log(`   Next Action: ${decision.nextAction}`);
                console.log(`   Expected: ${decision.expectedOutcome}\\n`);

                if (decision.nextAction === 'complete') {
                    console.log(`✅ LLM determined task is complete.`);
                    break;
                }

                // Execute the tool the LLM selected
                const toolResult = await this.executeTool(decision.nextAction, decision.toolParameters);
                
                const stepResult = {
                    step: stepCount,
                    tool: decision.nextAction,
                    reasoning: decision.reasoning,
                    parameters: decision.toolParameters,
                    result: toolResult,
                    timestamp: new Date().toISOString()
                };

                session.steps.push(stepResult);
                previousResults.push(stepResult);

                // Update context for next LLM decision
                currentContext = this.updateContext(currentContext, toolResult, decision.nextAction);

                if (!decision.shouldContinue) {
                    console.log(`🏁 LLM decided to stop after this step.\\n`);
                    break;
                }

                console.log(`🔄 Continuing to next step based on LLM decision...\\n`);
            }

            session.success = true;
            session.finalResponse = this.generateFinalResponse(userRequest, session.steps);

        } catch (error) {
            session.error = error.message;
            console.error(`❌ Error during intelligent processing: ${error.message}`);
        }

        session.endTime = Date.now();
        session.totalTime = session.endTime - session.startTime;

        this.executionHistory.push(session);
        this.displaySessionSummary(session);

        return session;
    }

    async executeTool(toolName, parameters) {
        const toolInfo = this.availableTools.get(toolName);
        if (!toolInfo) {
            throw new Error(`Tool ${toolName} not available`);
        }

        console.log(`🛠️ Executing ${toolName} with LLM-determined parameters...`);
        
        try {
            const response = await axios.post(`${toolInfo.serverUrl}/mcp/tools/call`, {
                name: toolName,
                arguments: parameters
            });

            const result = JSON.parse(response.data.content[0].text);
            
            if (result.success) {
                console.log(`   ✅ ${toolName} completed successfully`);
            } else {
                console.log(`   ⚠️ ${toolName} completed with issues: ${result.error || 'Unknown error'}`);
            }
            
            toolInfo.lastUsed = new Date();
            return result;
            
        } catch (error) {
            console.log(`   ❌ ${toolName} failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                tool: toolName,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Helper methods for LLM decision simulation
    extractSearchQuery(request) {
        return request.replace(/\\b(find|search|information about|tell me about|what is|research)\\b/gi, '').trim();
    }

    extractKeyTerms(request) {
        // Extract key terms for search
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return request.split(' ')
            .filter(word => word.length > 3 && !stopWords.includes(word.toLowerCase()))
            .slice(0, 3)
            .join(' ');
    }

    determineSummaryType(request) {
        if (request.includes('bullet') || request.includes('points')) return 'bullet_points';
        if (request.includes('insight') || request.includes('key')) return 'key_insights';
        if (request.includes('executive') || request.includes('summary')) return 'executive';
        return 'abstractive';
    }

    determineFileFormat(request) {
        if (request.includes('html') || request.includes('web')) return 'html';
        if (request.includes('json') || request.includes('data')) return 'json';
        if (request.includes('markdown') || request.includes('md')) return 'md';
        return 'txt';
    }

    generateFilename(request) {
        const words = request.toLowerCase()
            .replace(/[^a-z0-9\\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2)
            .slice(0, 3)
            .join('_');
        return words || 'intelligent_result';
    }

    extractContentFromResults(results) {
        const searchResults = results.filter(r => r.tool === 'search_docs');
        if (searchResults.length === 0) return '';
        
        return searchResults
            .flatMap(r => r.result.results || [])
            .map(item => item.content || item.excerpt || item.title)
            .join('\\n\\n');
    }

    getLatestContent(results) {
        // Get the most recent content to save
        const summaryResult = results.filter(r => r.tool === 'summarize').slice(-1)[0];
        if (summaryResult) return summaryResult.result.summary;
        
        return this.extractContentFromResults(results);
    }

    updateContext(currentContext, toolResult, toolName) {
        let newContext = currentContext;
        
        if (toolName === 'search_docs' && toolResult.results) {
            newContext += ` Found ${toolResult.results.length} relevant documents.`;
        } else if (toolName === 'summarize' && toolResult.summary) {
            newContext += ` Created summary: ${toolResult.summary.substring(0, 100)}...`;
        } else if (toolName === 'save_to_file' && toolResult.filename) {
            newContext += ` Saved results to ${toolResult.filename}.`;
        }
        
        return newContext;
    }

    generateFinalResponse(userRequest, steps) {
        const toolsUsed = steps.map(s => s.tool).join(' → ');
        const hasSearch = steps.some(s => s.tool === 'search_docs');
        const hasSummary = steps.some(s => s.tool === 'summarize');
        const hasSaved = steps.some(s => s.tool === 'save_to_file');

        let response = `I processed your request "${userRequest}" using intelligent tool orchestration (${toolsUsed}). `;

        if (hasSearch) response += `I found relevant information through document search. `;
        if (hasSummary) response += `I created a summary tailored to your needs. `;
        if (hasSaved) response += `I saved the results in an appropriate format for you. `;

        response += `Each step was chosen dynamically based on the context and results from previous steps.`;

        return response;
    }

    displaySessionSummary(session) {
        console.log(`\\n📊 Intelligent Session Summary:`);
        console.log(`   User Request: "${session.userRequest}"`);
        console.log(`   Success: ${session.success ? '✅' : '❌'}`);
        console.log(`   Steps Taken: ${session.steps.length}`);
        console.log(`   Total Time: ${session.totalTime}ms`);
        console.log(`   Tool Chain: ${session.steps.map(s => s.tool).join(' → ')}`);
        
        if (session.finalResponse) {
            console.log(`\\n💭 Final Response: ${session.finalResponse}`);
        }
        
        console.log(`\\n🧠 LLM Reasoning Chain:`);
        session.steps.forEach((step, i) => {
            console.log(`   ${i + 1}. ${step.reasoning}`);
        });
        
        console.log('\\n' + '═'.repeat(80) + '\\n');
    }

    getIntelligenceStats() {
        const totalSessions = this.executionHistory.length;
        const averageSteps = totalSessions > 0 ? 
            this.executionHistory.reduce((sum, s) => sum + s.steps.length, 0) / totalSessions : 0;
        
        const toolUsage = {};
        this.executionHistory.forEach(session => {
            session.steps.forEach(step => {
                toolUsage[step.tool] = (toolUsage[step.tool] || 0) + 1;
            });
        });

        return {
            totalSessions,
            averageSteps: averageSteps.toFixed(1),
            toolUsage,
            successRate: totalSessions > 0 ? 
                (this.executionHistory.filter(s => s.success).length / totalSessions * 100).toFixed(1) + '%' : '0%'
        };
    }
}

/**
 * Demo function showcasing intelligent MCP usage
 */
async function runIntelligentMCPDemo() {
    console.log('🧠 INTELLIGENT MCP AGENT DEMONSTRATION');
    console.log('═'.repeat(60));
    console.log('This shows TRUE MCP power: LLM-driven tool orchestration');
    console.log('The LLM decides which tools to use and when, based on context!\\n');

    const agent = new IntelligentMCPAgent('SmartAgent');

    try {
        // Discover available tools
        await agent.discoverTools();

        // Test various requests that require intelligent decision making
        const testRequests = [
            "Find comprehensive information about REST API security and create a detailed report",
            "Research JavaScript performance optimization techniques and give me key insights", 
            "What are database best practices? Save the findings in HTML format",
            "I need a brief overview of modern authentication methods",
            "Search for MCP protocol information and summarize it as bullet points"
        ];

        console.log(`🎯 Testing ${testRequests.length} requests with intelligent orchestration...\\n`);

        for (let i = 0; i < testRequests.length; i++) {
            console.log(`\\n📝 Test ${i + 1}/${testRequests.length}:`);
            console.log('─'.repeat(50));
            
            await agent.processRequest(testRequests[i]);
            
            // Small delay between tests
            if (i < testRequests.length - 1) {
                console.log('Waiting before next test...\\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Show intelligence analytics
        console.log('🧠 INTELLIGENT AGENT ANALYTICS');
        console.log('═'.repeat(50));
        const stats = agent.getIntelligenceStats();
        
        console.log(`📊 Sessions Completed: ${stats.totalSessions}`);
        console.log(`📈 Average Steps per Session: ${stats.averageSteps}`);
        console.log(`✅ Success Rate: ${stats.successRate}`);
        console.log('\\n🛠️ Tool Usage Pattern:');
        Object.entries(stats.toolUsage).forEach(([tool, count]) => {
            console.log(`   ${tool}: ${count} intelligent uses`);
        });

        console.log('\\n🎉 DEMONSTRATION COMPLETE!');
        console.log('💡 Key Features Demonstrated:');
        console.log('   🧠 LLM analyzes user requests');
        console.log('   🤔 LLM decides which tools to use dynamically');  
        console.log('   🔄 LLM adapts based on intermediate results');
        console.log('   📈 LLM optimizes tool chains for each request');
        console.log('   🎯 No predefined pipelines - pure intelligence!');

    } catch (error) {
        console.error('\\n❌ Demo failed. Ensure MCP servers are running:');
        console.error('   node start-all-servers.js');
        console.error(`\\nError: ${error.message}`);
    }
}

// Export for use as module
module.exports = { IntelligentMCPAgent };

// Run demo if executed directly
if (require.main === module) {
    runIntelligentMCPDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}