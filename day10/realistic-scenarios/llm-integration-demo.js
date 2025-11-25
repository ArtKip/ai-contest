#!/usr/bin/env node

const axios = require('axios');

/**
 * Realistic MCP Scenario: LLM Integration Demo
 * 
 * This simulates how real LLMs would discover and use MCP tools
 * to enhance their capabilities dynamically
 */

class MockLLM {
    constructor(name, capabilities, mcpServers) {
        this.name = name;
        this.capabilities = capabilities;
        this.mcpServers = mcpServers;
        this.availableTools = new Map();
        this.conversationHistory = [];
    }

    async discoverMCPTools() {
        console.log(`🧠 ${this.name}: Discovering MCP tools to enhance my capabilities...`);
        
        for (const [category, serverUrl] of Object.entries(this.mcpServers)) {
            try {
                const response = await axios.get(`${serverUrl}/mcp/tools/list`, { timeout: 3000 });
                const tools = response.data.tools;
                
                tools.forEach(tool => {
                    this.availableTools.set(tool.name, {
                        ...tool,
                        serverUrl,
                        category,
                        enhanced: this.analyzeToolEnhancement(tool)
                    });
                });
                
                console.log(`   ✅ Enhanced with ${tools.length} tool(s) from ${category} server`);
            } catch (error) {
                console.log(`   ❌ Could not connect to ${category} server at ${serverUrl}`);
            }
        }
        
        console.log(`🚀 ${this.name}: Now enhanced with ${this.availableTools.size} external tools!\\n`);
    }

    analyzeToolEnhancement(tool) {
        // Simulate how LLM analyzes what each tool adds to its capabilities
        const enhancements = [];
        
        if (tool.name === 'search_docs') {
            enhancements.push('Access to external knowledge bases');
            enhancements.push('Real-time information retrieval');
        } else if (tool.name === 'summarize') {
            enhancements.push('Advanced text summarization algorithms');
            enhancements.push('Multiple summarization strategies');
        } else if (tool.name === 'save_to_file') {
            enhancements.push('Persistent file storage capabilities');
            enhancements.push('Multiple output format support');
        }
        
        return enhancements;
    }

    async processUserQuery(userQuery, useTools = true) {
        console.log(`💬 User Query: "${userQuery}"`);
        console.log(`🧠 ${this.name}: Processing query...`);
        
        const response = {
            query: userQuery,
            llm: this.name,
            timestamp: new Date().toISOString(),
            toolsUsed: [],
            response: '',
            enhanced: useTools
        };

        try {
            if (useTools) {
                // LLM decides which tools to use based on query analysis
                const toolPlan = this.analyzeQueryAndPlanTools(userQuery);
                console.log(`🎯 ${this.name}: Planning to use tools: ${toolPlan.map(p => p.tool).join(' → ')}`);
                
                let context = '';
                
                for (const step of toolPlan) {
                    console.log(`   🛠️ Using ${step.tool} for: ${step.purpose}`);
                    
                    const toolResult = await this.executeToolCall(step.tool, step.args);
                    response.toolsUsed.push({
                        tool: step.tool,
                        purpose: step.purpose,
                        success: toolResult.success
                    });
                    
                    if (toolResult.success) {
                        context += this.extractRelevantData(step.tool, toolResult.data);
                    }
                }
                
                // Generate enhanced response using tool results
                response.response = this.generateEnhancedResponse(userQuery, context);
                
            } else {
                // Generate response without tools (baseline)
                response.response = this.generateBasicResponse(userQuery);
            }
            
        } catch (error) {
            response.response = `I apologize, but I encountered an error: ${error.message}`;
            response.error = error.message;
        }

        this.conversationHistory.push(response);
        this.displayResponse(response);
        return response;
    }

    analyzeQueryAndPlanTools(query) {
        const plan = [];
        
        // Simple query analysis (in real LLM this would be much more sophisticated)
        if (query.toLowerCase().includes('find') || query.toLowerCase().includes('search') || 
            query.toLowerCase().includes('information about') || query.toLowerCase().includes('what is')) {
            plan.push({
                tool: 'search_docs',
                purpose: 'Find relevant information',
                args: {
                    query: this.extractSearchTerms(query),
                    maxResults: 2,
                    includeContent: true
                }
            });
        }
        
        if (query.toLowerCase().includes('summarize') || query.toLowerCase().includes('brief') ||
            query.toLowerCase().includes('overview') || plan.length > 0) {
            plan.push({
                tool: 'summarize',
                purpose: 'Create digestible summary',
                args: {
                    summaryType: query.toLowerCase().includes('brief') ? 'bullet_points' : 'key_insights',
                    length: 'medium',
                    includeKeywords: true
                }
            });
        }
        
        if (query.toLowerCase().includes('save') || query.toLowerCase().includes('report') ||
            query.toLowerCase().includes('document')) {
            plan.push({
                tool: 'save_to_file',
                purpose: 'Save results for user',
                args: {
                    format: 'md',
                    metadata: {
                        llm: this.name,
                        query: query,
                        generatedBy: 'LLM with MCP enhancement'
                    }
                }
            });
        }
        
        return plan;
    }

    extractSearchTerms(query) {
        // Extract key search terms from user query
        const terms = query.replace(/\\b(find|search|information about|what is|tell me about)\\b/gi, '')
            .replace(/[?.,!]/g, '')
            .trim();
        return terms || query;
    }

    async executeToolCall(toolName, args) {
        const toolInfo = this.availableTools.get(toolName);
        if (!toolInfo) {
            throw new Error(`Tool ${toolName} not available`);
        }

        try {
            const response = await axios.post(`${toolInfo.serverUrl}/mcp/tools/call`, {
                name: toolName,
                arguments: args
            });

            const result = JSON.parse(response.data.content[0].text);
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    extractRelevantData(toolName, toolResult) {
        let extracted = '';
        
        if (toolName === 'search_docs' && toolResult.results) {
            extracted += `Found information: ${toolResult.results.map(r => r.excerpt || r.title).join('. ')}. `;
        } else if (toolName === 'summarize' && toolResult.summary) {
            extracted += `Summary: ${toolResult.summary}. `;
        } else if (toolName === 'save_to_file' && toolResult.filename) {
            extracted += `Saved to file: ${toolResult.filename}. `;
        }
        
        return extracted;
    }

    generateEnhancedResponse(query, toolContext) {
        // Simulate enhanced response using tool results
        return `Based on my analysis using external tools, here's what I found regarding "${query}": \\n\\n${toolContext}\\n\\nThis response was enhanced using MCP tools to provide you with more comprehensive and up-to-date information than my base knowledge alone.`;
    }

    generateBasicResponse(query) {
        // Simulate basic LLM response without tools
        return `Based on my training data, I can provide some general information about "${query}". However, my response is limited to my training cutoff and I cannot access external sources or save results for you.`;
    }

    displayResponse(response) {
        console.log(`\\n💭 ${this.name} Response:`);
        console.log(`📝 ${response.response}`);
        
        if (response.toolsUsed.length > 0) {
            console.log(`\\n🔧 Tools Enhancement:`);
            response.toolsUsed.forEach(tool => {
                console.log(`   • ${tool.tool}: ${tool.purpose} ${tool.success ? '✅' : '❌'}`);
            });
        }
        console.log('\\n' + '─'.repeat(80) + '\\n');
    }

    getCapabilitiesSummary() {
        const base = this.capabilities.join(', ');
        const enhanced = Array.from(this.availableTools.values())
            .flatMap(tool => tool.enhanced)
            .join(', ');
        
        return {
            baseCapabilities: base,
            mcpEnhanced: enhanced,
            toolsAvailable: this.availableTools.size
        };
    }
}

class LLMIntegrationDemo {
    constructor() {
        this.mcpServers = {
            knowledge: 'http://localhost:3001',
            processing: 'http://localhost:3002',
            storage: 'http://localhost:3003'
        };
        this.llms = [];
    }

    async initializeLLMs() {
        console.log('🚀 Initializing LLMs with MCP Integration...\\n');

        this.llms = [
            new MockLLM('CodeAssistantGPT', [
                'Code generation',
                'Programming advice',
                'Technical documentation'
            ], this.mcpServers),
            
            new MockLLM('ResearchHelper', [
                'Information synthesis',
                'Academic writing',
                'Data analysis'
            ], this.mcpServers),
            
            new MockLLM('GeneralKnowledge', [
                'General conversation',
                'Question answering',
                'Creative writing'
            ], this.mcpServers)
        ];

        // Each LLM discovers available MCP tools
        for (const llm of this.llms) {
            await llm.discoverMCPTools();
            
            const capabilities = llm.getCapabilitiesSummary();
            console.log(`📋 ${llm.name} Capabilities:`);
            console.log(`   Base: ${capabilities.baseCapabilities}`);
            console.log(`   Enhanced: ${capabilities.mcpEnhanced}`);
            console.log(`   Tools: ${capabilities.toolsAvailable} available\\n`);
        }
    }

    async demonstrateEnhancementComparison() {
        console.log('🔄 Demonstrating LLM Enhancement with MCP Tools...\\n');
        console.log('=' * 70);

        const testQueries = [
            'Find information about JavaScript security best practices',
            'What are the key principles of REST API design?',
            'Summarize database optimization techniques and save a report'
        ];

        for (const query of testQueries) {
            console.log(`\\n🎯 Test Query: "${query}"`);
            console.log('=' * 50);
            
            const llm = this.llms[0]; // Use first LLM for comparison
            
            console.log('\\n📊 Without MCP Tools:');
            await llm.processUserQuery(query, false);
            
            console.log('\\n📊 With MCP Tools:');
            await llm.processUserQuery(query, true);
            
            console.log('\\n' + '═'.repeat(70) + '\\n');
        }
    }

    async demonstrateConcurrentUsage() {
        console.log('🔄 Demonstrating Concurrent LLM Tool Usage...\\n');
        
        // Multiple LLMs using tools simultaneously
        const queries = [
            { llm: 0, query: 'Research modern authentication methods' },
            { llm: 1, query: 'Find database performance optimization tips' },
            { llm: 2, query: 'Search for JavaScript framework comparisons' }
        ];

        console.log('🚀 Running concurrent queries across different LLMs...\\n');
        
        const promises = queries.map(({ llm, query }) => 
            this.llms[llm].processUserQuery(query, true)
        );

        const results = await Promise.all(promises);
        
        console.log('📈 Concurrent Usage Summary:');
        results.forEach((result, index) => {
            console.log(`${result.llm}: ${result.toolsUsed.length} tools used for "${result.query.substring(0, 40)}..."`);
        });
    }

    async showToolUsageAnalytics() {
        console.log('\\n📊 MCP Tool Usage Analytics Across All LLMs:\\n');
        
        const globalUsage = new Map();
        
        this.llms.forEach(llm => {
            console.log(`${llm.name}:`);
            console.log(`   Conversations: ${llm.conversationHistory.length}`);
            
            const toolUsage = {};
            llm.conversationHistory.forEach(conv => {
                conv.toolsUsed?.forEach(tool => {
                    toolUsage[tool.tool] = (toolUsage[tool.tool] || 0) + 1;
                    globalUsage.set(tool.tool, (globalUsage.get(tool.tool) || 0) + 1);
                });
            });
            
            Object.entries(toolUsage).forEach(([tool, count]) => {
                console.log(`   ${tool}: ${count} uses`);
            });
            console.log();
        });

        console.log('🌍 Global Tool Usage Across All LLMs:');
        globalUsage.forEach((count, tool) => {
            console.log(`   ${tool}: ${count} total uses`);
        });
    }
}

/**
 * Run realistic LLM integration demo
 */
async function runLLMIntegrationDemo() {
    console.log('🤖 REALISTIC MCP SCENARIO: LLM Tool Integration');
    console.log('=' * 60);
    console.log('This demonstrates how LLMs discover and use MCP tools');
    console.log('to enhance their capabilities dynamically.\\n');

    const demo = new LLMIntegrationDemo();
    
    try {
        // Initialize LLMs with MCP tool discovery
        await demo.initializeLLMs();
        
        // Show enhancement comparison
        await demo.demonstrateEnhancementComparison();
        
        // Show concurrent usage
        await demo.demonstrateConcurrentUsage();
        
        // Show analytics
        await demo.showToolUsageAnalytics();
        
        console.log('\\n🎉 LLM Integration Demo Complete!');
        console.log('💡 This demonstrates how MCP enables:');
        console.log('   • LLMs discovering available tools dynamically');
        console.log('   • Enhanced responses using external capabilities');
        console.log('   • Multiple LLMs sharing the same tool infrastructure');
        console.log('   • Real-time capability enhancement');
        
    } catch (error) {
        console.error('\\n❌ Demo failed. Make sure MCP servers are running:');
        console.error('   node start-all-servers.js');
        console.error(`\\nError: ${error.message}`);
    }
}

// Export for use as module
module.exports = { MockLLM, LLMIntegrationDemo };

// Run demo if executed directly
if (require.main === module) {
    runLLMIntegrationDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}