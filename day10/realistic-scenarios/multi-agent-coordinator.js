#!/usr/bin/env node

const axios = require('axios');

/**
 * Realistic MCP Scenario: Multiple AI Agents discovering and using shared tools
 * 
 * This simulates how multiple LLMs/agents would discover and use MCP tools
 * independently for their own tasks
 */

class AIAgent {
    constructor(name, personality, mcpServers) {
        this.name = name;
        this.personality = personality;
        this.mcpServers = mcpServers;
        this.discoveredTools = new Map();
    }

    async discoverTools() {
        console.log(`🤖 ${this.name}: Discovering available MCP tools...`);
        
        for (const [toolType, serverUrl] of Object.entries(this.mcpServers)) {
            try {
                const response = await axios.get(`${serverUrl}/mcp/tools/list`);
                const tools = response.data.tools;
                
                tools.forEach(tool => {
                    this.discoveredTools.set(tool.name, { 
                        tool, 
                        serverUrl,
                        lastUsed: null,
                        usageCount: 0 
                    });
                });
                
                console.log(`   ✅ Found ${tools.length} tool(s) on ${serverUrl}`);
            } catch (error) {
                console.log(`   ❌ Failed to connect to ${serverUrl}`);
            }
        }
        
        console.log(`🧠 ${this.name}: Discovered ${this.discoveredTools.size} total tools\n`);
    }

    async useTool(toolName, args) {
        const toolInfo = this.discoveredTools.get(toolName);
        if (!toolInfo) {
            throw new Error(`Tool ${toolName} not available to agent ${this.name}`);
        }

        console.log(`🛠️ ${this.name}: Using tool '${toolName}'`);
        
        const response = await axios.post(`${toolInfo.serverUrl}/mcp/tools/call`, {
            name: toolName,
            arguments: args
        });

        toolInfo.lastUsed = new Date();
        toolInfo.usageCount++;

        return JSON.parse(response.data.content[0].text);
    }

    async performTask(taskDescription) {
        console.log(`🎯 ${this.name}: Starting task - ${taskDescription}`);
        console.log(`💭 Personality: ${this.personality}\n`);
        
        const taskResult = {
            agent: this.name,
            task: taskDescription,
            steps: [],
            startTime: Date.now(),
            success: false
        };

        try {
            // Each agent uses tools based on their personality
            const result = await this.executeTaskBasedOnPersonality(taskDescription);
            taskResult.steps = result.steps;
            taskResult.success = true;
            taskResult.output = result.output;
        } catch (error) {
            taskResult.error = error.message;
        }

        taskResult.endTime = Date.now();
        taskResult.duration = taskResult.endTime - taskResult.startTime;
        
        console.log(`${taskResult.success ? '✅' : '❌'} ${this.name}: Task ${taskResult.success ? 'completed' : 'failed'} in ${taskResult.duration}ms\n`);
        return taskResult;
    }

    async executeTaskBasedOnPersonality(task) {
        const steps = [];
        let output = {};

        if (this.personality.includes('research')) {
            // Research agent: thorough search + detailed summary
            console.log(`📚 ${this.name}: Research approach - thorough analysis`);
            
            const searchResult = await this.useTool('search_docs', {
                query: task,
                searchType: 'semantic',
                maxResults: 3,
                includeContent: true
            });
            steps.push({ tool: 'search_docs', result: 'Found comprehensive research' });

            const content = searchResult.results.map(r => r.content).join('\n\n');
            
            const summary = await this.useTool('summarize', {
                content,
                summaryType: 'executive',
                length: 'detailed',
                includeKeywords: true
            });
            steps.push({ tool: 'summarize', result: 'Created detailed executive summary' });

            const saved = await this.useTool('save_to_file', {
                content: summary.summary,
                filename: `research_${task.replace(/\\s+/g, '_').toLowerCase()}`,
                format: 'html',
                metadata: {
                    agent: this.name,
                    approach: 'thorough_research',
                    keywords: summary.keywords
                }
            });
            steps.push({ tool: 'save_to_file', result: `Saved to ${saved.filename}` });
            
            output = { type: 'research', summary, file: saved.filename };

        } else if (this.personality.includes('quick')) {
            // Quick agent: fast search + brief summary  
            console.log(`⚡ ${this.name}: Quick approach - rapid insights`);
            
            const searchResult = await this.useTool('search_docs', {
                query: task,
                searchType: 'keyword', 
                maxResults: 1,
                includeContent: true
            });
            steps.push({ tool: 'search_docs', result: 'Found key information quickly' });

            const content = searchResult.results[0]?.content || '';
            
            const summary = await this.useTool('summarize', {
                content,
                summaryType: 'bullet_points',
                length: 'brief'
            });
            steps.push({ tool: 'summarize', result: 'Created quick bullet points' });

            const saved = await this.useTool('save_to_file', {
                content: summary.summary,
                filename: `quick_${task.replace(/\\s+/g, '_').toLowerCase()}`,
                format: 'txt',
                metadata: { agent: this.name, approach: 'rapid_summary' }
            });
            steps.push({ tool: 'save_to_file', result: `Saved to ${saved.filename}` });
            
            output = { type: 'quick', summary, file: saved.filename };

        } else if (this.personality.includes('analytical')) {
            // Analytical agent: focused search + key insights
            console.log(`🔍 ${this.name}: Analytical approach - deep insights`);
            
            const searchResult = await this.useTool('search_docs', {
                query: task,
                searchType: 'keyword',
                maxResults: 2,
                includeContent: true
            });
            steps.push({ tool: 'search_docs', result: 'Found focused information' });

            const content = searchResult.results.map(r => r.content).join('\n');
            
            const summary = await this.useTool('summarize', {
                content,
                summaryType: 'key_insights',
                length: 'medium',
                includeKeywords: true
            });
            steps.push({ tool: 'summarize', result: 'Extracted key insights' });

            const saved = await this.useTool('save_to_file', {
                content: summary.summary,
                filename: `analysis_${task.replace(/\\s+/g, '_').toLowerCase()}`,
                format: 'md',
                metadata: { 
                    agent: this.name, 
                    approach: 'analytical_insights',
                    insights: summary.keywords
                }
            });
            steps.push({ tool: 'save_to_file', result: `Saved to ${saved.filename}` });
            
            output = { type: 'analysis', summary, file: saved.filename };
        }

        return { steps, output };
    }

    getToolUsageStats() {
        const stats = {};
        this.discoveredTools.forEach((info, toolName) => {
            stats[toolName] = {
                usageCount: info.usageCount,
                lastUsed: info.lastUsed
            };
        });
        return stats;
    }
}

class MultiAgentCoordinator {
    constructor() {
        this.agents = [];
        this.mcpServers = {
            search: 'http://localhost:3001',
            summarize: 'http://localhost:3002',
            save: 'http://localhost:3003'
        };
    }

    async initializeAgents() {
        console.log('🤖 Initializing AI Agents...\n');

        // Create agents with different personalities
        this.agents = [
            new AIAgent('ResearchBot', 'thorough research specialist', this.mcpServers),
            new AIAgent('QuickScan', 'rapid information processor', this.mcpServers),  
            new AIAgent('DeepThinker', 'analytical insight generator', this.mcpServers)
        ];

        // Each agent discovers tools independently
        for (const agent of this.agents) {
            await agent.discoverTools();
        }
    }

    async runConcurrentTasks() {
        console.log('🚀 Running concurrent tasks across multiple agents...\n');
        console.log('=' * 60);

        // Different agents work on different aspects simultaneously
        const tasks = [
            { agent: 0, task: 'JavaScript best practices' },
            { agent: 1, task: 'API security fundamentals' },
            { agent: 2, task: 'database optimization techniques' }
        ];

        // Run all tasks concurrently (this is the key MCP benefit!)
        const promises = tasks.map(({ agent, task }) => 
            this.agents[agent].performTask(task)
        );

        const results = await Promise.all(promises);
        
        console.log('📊 Concurrent Task Results:\n');
        results.forEach(result => {
            console.log(`${result.agent}: ${result.success ? '✅' : '❌'} ${result.task} (${result.duration}ms)`);
            console.log(`   Steps: ${result.steps.map(s => s.tool).join(' → ')}`);
            if (result.output) {
                console.log(`   Output: ${result.output.type} → ${result.output.file}`);
            }
            console.log();
        });

        return results;
    }

    async showToolUsageAnalytics() {
        console.log('📈 Tool Usage Analytics Across All Agents:\n');

        const globalUsage = new Map();
        
        this.agents.forEach(agent => {
            console.log(`${agent.name} (${agent.personality}):`);
            const stats = agent.getToolUsageStats();
            
            Object.entries(stats).forEach(([tool, data]) => {
                console.log(`   ${tool}: used ${data.usageCount} times`);
                
                if (!globalUsage.has(tool)) {
                    globalUsage.set(tool, 0);
                }
                globalUsage.set(tool, globalUsage.get(tool) + data.usageCount);
            });
            console.log();
        });

        console.log('🌍 Global Tool Usage:');
        globalUsage.forEach((count, tool) => {
            console.log(`   ${tool}: ${count} total uses across all agents`);
        });
    }

    async demonstrateServiceDiscovery() {
        console.log('\\n🔍 Demonstrating Service Discovery...');
        console.log('=' * 50);
        
        // Show how agents can discover new services dynamically
        console.log('Simulating new tool server coming online...');
        
        // Each agent re-discovers tools
        for (const agent of this.agents) {
            const beforeCount = agent.discoveredTools.size;
            await agent.discoverTools();
            const afterCount = agent.discoveredTools.size;
            
            if (afterCount > beforeCount) {
                console.log(`✨ ${agent.name}: Discovered ${afterCount - beforeCount} new tools!`);
            }
        }
    }

    async checkServerHealth() {
        console.log('🏥 Checking MCP Server Health...\n');
        
        for (const [name, url] of Object.entries(this.mcpServers)) {
            try {
                await axios.get(`${url}/health`, { timeout: 1000 });
                console.log(`✅ ${name} server (${url}): healthy`);
            } catch (error) {
                console.log(`❌ ${name} server (${url}): down`);
            }
        }
        console.log();
    }
}

/**
 * Run realistic MCP scenario demo
 */
async function runRealisticMCPDemo() {
    console.log('🎯 REALISTIC MCP SCENARIO: Multi-Agent Tool Discovery & Usage');
    console.log('=' * 70);
    console.log('This demonstrates how multiple AI agents independently discover');
    console.log('and use the same MCP tools for different purposes.\n');

    const coordinator = new MultiAgentCoordinator();
    
    // Check if servers are running
    await coordinator.checkServerHealth();
    
    // Initialize agents (they discover tools independently)  
    await coordinator.initializeAgents();
    
    // Run concurrent tasks (key MCP benefit!)
    await coordinator.runConcurrentTasks();
    
    // Show analytics
    await coordinator.showToolUsageAnalytics();
    
    // Demonstrate dynamic service discovery
    await coordinator.demonstrateServiceDiscovery();
    
    console.log('\\n🎉 Realistic MCP Demo Complete!');
    console.log('💡 This shows how MCP enables:');
    console.log('   • Multiple agents discovering same tools');
    console.log('   • Concurrent tool usage by different agents');
    console.log('   • Agent specialization using same infrastructure');
    console.log('   • Dynamic service discovery');
    console.log('   • Tool usage analytics and monitoring');
}

// Export for use as module
module.exports = { AIAgent, MultiAgentCoordinator };

// Run demo if executed directly
if (require.main === module) {
    runRealisticMCPDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}