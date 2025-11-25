#!/usr/bin/env node

require('dotenv').config();
const { SearchDocsTool } = require('./tools/search-docs-tool.js');
const { SummarizeTool } = require('./tools/summarize-tool.js');
const { SaveToFileTool } = require('./tools/save-to-file-tool.js');

/**
 * Day 10 - MCP Tools Composition Server
 * 
 * This MCP server registers multiple tools for composition:
 * - SearchDocs: Search through documentation
 * - Summarize: Summarize text content
 * - SaveToFile: Save content to files
 */

class ToolsCompositionServer {
    constructor() {
        this.tools = new Map();
        this.registerAllTools();
    }

    /**
     * Register all available tools
     */
    registerAllTools() {
        console.log('📦 Registering MCP tools...');

        // Initialize tools
        const searchTool = new SearchDocsTool();
        const summarizeTool = new SummarizeTool();
        const saveToFileTool = new SaveToFileTool();

        // Register tools
        this.registerTool(searchTool);
        this.registerTool(summarizeTool);
        this.registerTool(saveToFileTool);

        console.log(`✅ Registered ${this.tools.size} tools successfully`);
    }

    /**
     * Register a single tool
     */
    registerTool(toolInstance) {
        const schema = toolInstance.getToolSchema();
        this.tools.set(schema.name, {
            schema: schema,
            executor: toolInstance
        });
        console.log(`  ✓ ${schema.name}: ${schema.description}`);
    }

    /**
     * Handle tools/list request
     */
    async handleToolsList() {
        const toolSchemas = Array.from(this.tools.values()).map(tool => tool.schema);
        
        console.log(`🔍 Tools list requested - returning ${toolSchemas.length} tools`);
        
        return {
            tools: toolSchemas
        };
    }

    /**
     * Handle tools/call request
     */
    async handleToolCall(request) {
        const { name, arguments: args } = request.params;
        
        console.log(`🛠️ Tool call: ${name} with arguments:`, Object.keys(args));

        if (!this.tools.has(name)) {
            throw new Error(`Tool '${name}' not found`);
        }

        const tool = this.tools.get(name);
        
        try {
            const startTime = Date.now();
            const result = await tool.executor.execute(args);
            const executionTime = Date.now() - startTime;
            
            console.log(`✅ Tool '${name}' executed successfully in ${executionTime}ms`);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }
                ],
                isError: result.success === false,
                executionTime: executionTime
            };
        } catch (error) {
            console.error(`❌ Tool '${name}' execution failed:`, error.message);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error.message,
                            tool: name,
                            arguments: args,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    /**
     * Simulate MCP server for testing
     */
    async simulateServer() {
        console.log('🚀 MCP Tools Composition Server starting...');
        console.log('📋 Server Info:');
        console.log('  Name: tools-composition-server');
        console.log('  Version: 1.0.0');
        console.log('  Capabilities: tools, pipelines');
        console.log(`  Registered Tools: ${this.tools.size}`);
        
        // List available tools
        const toolsList = await this.handleToolsList();
        console.log('\\n🛠️ Available Tools:');
        toolsList.tools.forEach((tool, index) => {
            console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
        });
        
        return {
            name: 'tools-composition-server',
            version: '1.0.0',
            capabilities: {
                tools: true,
                resources: false,
                prompts: false,
                pipelines: true
            },
            toolsCount: this.tools.size,
            tools: toolsList.tools
        };
    }

    /**
     * Get server information
     */
    getServerInfo() {
        return {
            name: 'tools-composition-server',
            version: '1.0.0',
            capabilities: {
                tools: true,
                resources: false,
                prompts: false,
                pipelines: true
            },
            tools: Array.from(this.tools.values()).map(tool => ({
                name: tool.schema.name,
                description: tool.schema.description,
                inputSchema: tool.schema.inputSchema
            })),
            toolsCount: this.tools.size
        };
    }

    /**
     * Execute a pipeline of tools
     */
    async executePipeline(pipelineSteps) {
        console.log(`🔄 Executing pipeline with ${pipelineSteps.length} steps`);
        
        const pipelineResults = [];
        let previousResult = null;
        
        for (let i = 0; i < pipelineSteps.length; i++) {
            const step = pipelineSteps[i];
            console.log(`\\n📍 Pipeline Step ${i + 1}: ${step.tool}`);
            
            try {
                // Merge step arguments with previous result if needed
                let stepArgs = { ...step.arguments };
                
                // Handle data flow between steps
                if (previousResult && step.useOutputFrom) {
                    const outputField = step.useOutputFrom;
                    if (previousResult[outputField]) {
                        stepArgs = { ...stepArgs, ...previousResult[outputField] };
                    }
                } else if (previousResult && step.inputMapping) {
                    // Custom input mapping
                    Object.entries(step.inputMapping).forEach(([argKey, resultKey]) => {
                        if (previousResult[resultKey] !== undefined) {
                            stepArgs[argKey] = previousResult[resultKey];
                        }
                    });
                }

                // Execute the tool
                const toolResult = await this.handleToolCall({
                    params: {
                        name: step.tool,
                        arguments: stepArgs
                    }
                });

                // Parse result
                const parsedResult = JSON.parse(toolResult.content[0].text);
                
                pipelineResults.push({
                    step: i + 1,
                    tool: step.tool,
                    success: !toolResult.isError,
                    executionTime: toolResult.executionTime,
                    result: parsedResult,
                    timestamp: new Date().toISOString()
                });

                // Set up for next step
                previousResult = parsedResult;
                
                if (toolResult.isError) {
                    throw new Error(`Pipeline failed at step ${i + 1}: ${parsedResult.error}`);
                }

                console.log(`  ✅ Step ${i + 1} completed successfully`);
                
            } catch (error) {
                console.error(`  ❌ Step ${i + 1} failed:`, error.message);
                
                pipelineResults.push({
                    step: i + 1,
                    tool: step.tool,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                // Stop pipeline on error
                break;
            }
        }

        const totalTime = pipelineResults.reduce((sum, step) => sum + (step.executionTime || 0), 0);
        const successfulSteps = pipelineResults.filter(step => step.success).length;
        
        console.log(`\\n🏁 Pipeline completed: ${successfulSteps}/${pipelineSteps.length} steps successful`);
        
        return {
            success: successfulSteps === pipelineSteps.length,
            totalSteps: pipelineSteps.length,
            successfulSteps: successfulSteps,
            totalExecutionTime: totalTime,
            results: pipelineResults,
            finalResult: previousResult,
            executedAt: new Date().toISOString()
        };
    }

    /**
     * Process MCP requests (simulation)
     */
    async processRequest(method, params = {}) {
        console.log(`📨 Processing request: ${method}`);
        
        switch (method) {
            case 'tools/list':
                return this.handleToolsList();
            
            case 'tools/call':
                return this.handleToolCall({ params });
            
            case 'pipeline/execute':
                return this.executePipeline(params.steps || []);
            
            case 'server/info':
                return this.getServerInfo();
            
            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    /**
     * Get tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }

    /**
     * Get all registered tool names
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }
}

/**
 * Demo function to test the tools and composition
 */
async function runDemo() {
    console.log('🔧 Day 10 - MCP Tools Composition Demo');
    console.log('======================================\\n');

    const server = new ToolsCompositionServer();
    
    try {
        // Start server
        const serverInfo = await server.simulateServer();
        console.log(`\\n✅ Server started successfully!`);
        
        // Test individual tools
        console.log('\\n🧪 Testing Individual Tools...\\n');
        
        // Test 1: Search for MCP documentation
        console.log('📍 Test 1: Search for MCP documentation');
        const searchResult = await server.processRequest('tools/call', {
            name: 'search_docs',
            arguments: {
                query: 'MCP protocol features',
                searchType: 'keyword',
                maxResults: 2,
                includeContent: true
            }
        });
        console.log('✅ Search completed\\n');

        // Test 2: Summarize search results
        const searchData = JSON.parse(searchResult.content[0].text);
        if (searchData.success && searchData.results.length > 0) {
            console.log('📍 Test 2: Summarize search results');
            const contentToSummarize = searchData.results[0].content;
            
            const summarizeResult = await server.processRequest('tools/call', {
                name: 'summarize',
                arguments: {
                    content: contentToSummarize,
                    summaryType: 'bullet_points',
                    length: 'medium',
                    includeKeywords: true
                }
            });
            console.log('✅ Summarization completed\\n');

            // Test 3: Save summary to file
            const summaryData = JSON.parse(summarizeResult.content[0].text);
            if (summaryData.success) {
                console.log('📍 Test 3: Save summary to file');
                
                const saveResult = await server.processRequest('tools/call', {
                    name: 'save_to_file',
                    arguments: {
                        content: summaryData.summary,
                        filename: 'mcp_protocol_summary',
                        format: 'md',
                        metadata: {
                            title: 'MCP Protocol Summary',
                            description: 'Summary of MCP protocol features',
                            createdBy: 'MCP Pipeline',
                            tags: ['mcp', 'protocol', 'summary']
                        }
                    }
                });
                console.log('✅ File save completed\\n');
            }
        }

        // Test 4: Pipeline execution (search → summarize → save)
        console.log('🔄 Testing Automated Pipeline Execution...\\n');
        
        const pipelineSteps = [
            {
                tool: 'search_docs',
                arguments: {
                    query: 'JavaScript programming best practices',
                    searchType: 'keyword',
                    maxResults: 1,
                    includeContent: true
                }
            },
            {
                tool: 'summarize',
                arguments: {
                    summaryType: 'key_insights',
                    length: 'medium',
                    includeKeywords: true
                },
                inputMapping: {
                    content: 'results' // Map search results to summarize content
                }
            },
            {
                tool: 'save_to_file',
                arguments: {
                    filename: 'javascript_insights',
                    format: 'md',
                    metadata: {
                        title: 'JavaScript Programming Insights',
                        description: 'Key insights from JavaScript documentation',
                        createdBy: 'MCP Pipeline'
                    }
                },
                inputMapping: {
                    content: 'summary' // Map summary to file content
                }
            }
        ];

        const pipelineResult = await server.processRequest('pipeline/execute', {
            steps: pipelineSteps
        });

        if (pipelineResult.success) {
            console.log(`🎉 Pipeline executed successfully!`);
            console.log(`   Total time: ${pipelineResult.totalExecutionTime}ms`);
            console.log(`   Steps: ${pipelineResult.successfulSteps}/${pipelineResult.totalSteps}`);
        } else {
            console.log(`❌ Pipeline failed after ${pipelineResult.successfulSteps} steps`);
        }

        console.log('\\n🎯 Demo completed successfully!');
        console.log('💡 MCP Tools Composition is working with automated pipelines!');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

// Export for use as a module
module.exports = { ToolsCompositionServer };

// Run demo if executed directly
if (require.main === module) {
    runDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}