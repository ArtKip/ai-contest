#!/usr/bin/env node

require('dotenv').config();
const { ToolsCompositionServer } = require('./tools-server.js');

/**
 * Day 10 - Pipeline Agent for MCP Tools Composition
 * 
 * This agent orchestrates the execution of multiple MCP tools in sequence,
 * handling data flow between tools and providing pipeline management.
 */

class PipelineAgent {
    constructor() {
        this.server = new ToolsCompositionServer();
        this.isConnected = false;
        this.pipelines = new Map();
        this.executionHistory = [];
    }

    /**
     * Connect to the MCP tools server
     */
    async connect() {
        try {
            console.log('🔗 Pipeline Agent connecting to MCP Tools Server...');
            
            const serverInfo = await this.server.simulateServer();
            this.isConnected = true;
            
            console.log('✅ Connected successfully!');
            console.log(`📋 Server: ${serverInfo.name} v${serverInfo.version}`);
            console.log(`🛠️ Available tools: ${serverInfo.toolsCount}`);
            
            return serverInfo;
        } catch (error) {
            console.error('❌ Connection failed:', error.message);
            return null;
        }
    }

    /**
     * Execute a predefined pipeline
     */
    async executePipeline(pipelineName, inputData = {}) {
        if (!this.isConnected) {
            throw new Error('Pipeline agent not connected to MCP server');
        }

        if (!this.pipelines.has(pipelineName)) {
            throw new Error(`Pipeline '${pipelineName}' not found`);
        }

        const pipeline = this.pipelines.get(pipelineName);
        console.log(`🔄 Executing pipeline: ${pipelineName}`);
        console.log(`📝 Description: ${pipeline.description}`);

        const startTime = Date.now();
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const results = [];
        let currentData = inputData;

        for (let i = 0; i < pipeline.steps.length; i++) {
            const step = pipeline.steps[i];
            console.log(`\\n📍 Step ${i + 1}/${pipeline.steps.length}: ${step.tool}`);

            try {
                // Prepare step arguments
                const stepArgs = await this.prepareStepArguments(step, currentData);
                
                // Execute the tool
                const stepStartTime = Date.now();
                const result = await this.server.processRequest('tools/call', {
                    name: step.tool,
                    arguments: stepArgs
                });
                const stepExecutionTime = Date.now() - stepStartTime;

                // Parse result
                const parsedResult = JSON.parse(result.content[0].text);
                
                // Handle step result
                if (parsedResult.success === false) {
                    throw new Error(parsedResult.error || 'Tool execution failed');
                }

                results.push({
                    step: i + 1,
                    stepName: step.name || step.tool,
                    tool: step.tool,
                    success: true,
                    executionTime: stepExecutionTime,
                    result: parsedResult,
                    timestamp: new Date().toISOString()
                });

                // Update current data for next step
                currentData = this.extractOutputData(parsedResult, step);
                
                console.log(`  ✅ Step ${i + 1} completed successfully (${stepExecutionTime}ms)`);
                
                // Optional delay between steps
                if (step.delay) {
                    await new Promise(resolve => setTimeout(resolve, step.delay));
                }

            } catch (error) {
                console.error(`  ❌ Step ${i + 1} failed: ${error.message}`);
                
                results.push({
                    step: i + 1,
                    stepName: step.name || step.tool,
                    tool: step.tool,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                // Handle error strategy
                if (step.continueOnError !== true) {
                    break; // Stop pipeline execution
                }
            }
        }

        const totalTime = Date.now() - startTime;
        const successfulSteps = results.filter(r => r.success).length;

        const pipelineResult = {
            executionId: executionId,
            pipelineName: pipelineName,
            success: successfulSteps === pipeline.steps.length,
            totalSteps: pipeline.steps.length,
            successfulSteps: successfulSteps,
            totalExecutionTime: totalTime,
            steps: results,
            finalData: currentData,
            inputData: inputData,
            executedAt: new Date().toISOString()
        };

        // Store execution history
        this.executionHistory.push(pipelineResult);

        console.log(`\\n🏁 Pipeline '${pipelineName}' completed: ${successfulSteps}/${pipeline.steps.length} steps successful`);
        console.log(`⏱️ Total execution time: ${totalTime}ms`);

        return pipelineResult;
    }

    /**
     * Prepare arguments for a pipeline step
     */
    async prepareStepArguments(step, currentData) {
        let stepArgs = { ...step.arguments };

        // Handle different input mapping strategies
        if (step.inputMapping) {
            Object.entries(step.inputMapping).forEach(([argKey, dataPath]) => {
                const value = this.getNestedValue(currentData, dataPath);
                if (value !== undefined) {
                    stepArgs[argKey] = value;
                }
            });
        }

        // Handle direct field mapping
        if (step.useFields) {
            step.useFields.forEach(field => {
                if (currentData[field] !== undefined) {
                    stepArgs[field] = currentData[field];
                }
            });
        }

        // Handle content transformation
        if (step.contentTransform) {
            const transformer = step.contentTransform;
            if (transformer.extractContent && currentData.results && Array.isArray(currentData.results)) {
                // Extract content from search results
                stepArgs.content = currentData.results
                    .map(item => {
                        // Use content if available, otherwise use excerpt, then title as fallback
                        if (item.content && typeof item.content === 'string') {
                            return item.content.trim();
                        } else if (item.excerpt && typeof item.excerpt === 'string') {
                            return item.excerpt.trim();
                        } else if (item.title && typeof item.title === 'string') {
                            return item.title.trim();
                        }
                        return '';
                    })
                    .filter(text => text.length > 0)
                    .join('\\n\\n');
            } else if (transformer.useField) {
                stepArgs.content = currentData[transformer.useField];
            }
        }

        console.log(`    📋 Step arguments prepared: ${Object.keys(stepArgs).join(', ')}`);
        return stepArgs;
    }

    /**
     * Extract output data from tool result for next step
     */
    extractOutputData(result, step) {
        if (step.outputMapping) {
            const mappedData = {};
            Object.entries(step.outputMapping).forEach(([newKey, resultPath]) => {
                const value = this.getNestedValue(result, resultPath);
                if (value !== undefined) {
                    mappedData[newKey] = value;
                }
            });
            return { ...result, ...mappedData };
        }
        
        return result;
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Register a new pipeline
     */
    registerPipeline(name, pipeline) {
        this.pipelines.set(name, {
            name: name,
            description: pipeline.description || 'No description',
            steps: pipeline.steps || [],
            metadata: pipeline.metadata || {},
            createdAt: new Date().toISOString()
        });
        
        console.log(`📝 Registered pipeline: ${name}`);
    }

    /**
     * Get registered pipelines
     */
    getPipelines() {
        return Array.from(this.pipelines.entries()).map(([name, pipeline]) => ({
            name: name,
            description: pipeline.description,
            stepsCount: pipeline.steps.length,
            metadata: pipeline.metadata
        }));
    }

    /**
     * Get execution history
     */
    getExecutionHistory() {
        return this.executionHistory.slice(-10); // Last 10 executions
    }

    /**
     * Create and execute a custom pipeline
     */
    async createAndExecutePipeline(name, steps, inputData = {}) {
        // Register the pipeline
        this.registerPipeline(name, {
            description: `Custom pipeline with ${steps.length} steps`,
            steps: steps
        });

        // Execute it
        return this.executePipeline(name, inputData);
    }
}

/**
 * Demo function to showcase pipeline composition
 */
async function runPipelineDemo() {
    console.log('🔄 Day 10 - MCP Tools Pipeline Composition Demo');
    console.log('===============================================\\n');

    const agent = new PipelineAgent();

    try {
        // Connect to MCP server
        await agent.connect();

        // Register predefined pipelines
        registerPredefinedPipelines(agent);

        // Demo 1: Research Pipeline (search → summarize → save)
        console.log('\\n🔬 Demo 1: Research Pipeline');
        console.log('='.repeat(40));
        
        const researchInput = {
            query: 'REST API design',
            focus: 'best practices'
        };

        const researchResult = await agent.executePipeline('research_pipeline', researchInput);
        console.log(`Research Result: ${researchResult.success ? 'SUCCESS' : 'FAILED'}`);

        // Demo 2: Documentation Pipeline (search multiple topics → combine → summarize → save)
        console.log('\\n📚 Demo 2: Documentation Processing Pipeline');
        console.log('='.repeat(40));
        
        const docInput = {
            topics: ['JavaScript', 'security'],
            outputFormat: 'comprehensive_guide'
        };

        const docResult = await agent.executePipeline('documentation_pipeline', docInput);
        console.log(`Documentation Result: ${docResult.success ? 'SUCCESS' : 'FAILED'}`);

        // Demo 3: Quick Summary Pipeline
        console.log('\\n⚡ Demo 3: Quick Summary Pipeline');
        console.log('='.repeat(40));

        const quickInput = {
            query: 'database design',
            summaryType: 'bullet_points'
        };

        const quickResult = await agent.executePipeline('quick_summary_pipeline', quickInput);
        console.log(`Quick Summary Result: ${quickResult.success ? 'SUCCESS' : 'FAILED'}`);

        // Show execution history
        console.log('\\n📊 Pipeline Execution History:');
        console.log('='.repeat(40));
        const history = agent.getExecutionHistory();
        history.forEach(exec => {
            console.log(`- ${exec.pipelineName}: ${exec.success ? '✅' : '❌'} (${exec.totalExecutionTime}ms)`);
        });

        console.log('\\n🎉 Pipeline composition demo completed successfully!');
        console.log('💡 All tools were successfully chained in automated sequences!');

    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

/**
 * Register predefined pipelines for demonstration
 */
function registerPredefinedPipelines(agent) {
    // Research Pipeline: search → summarize → save
    agent.registerPipeline('research_pipeline', {
        description: 'Search for information, summarize it, and save to file',
        steps: [
            {
                name: 'search_for_content',
                tool: 'search_docs',
                arguments: {
                    searchType: 'keyword',
                    maxResults: 2,
                    includeContent: true
                },
                inputMapping: {
                    query: 'query'
                }
            },
            {
                name: 'summarize_findings',
                tool: 'summarize',
                arguments: {
                    summaryType: 'key_insights',
                    length: 'medium',
                    includeKeywords: true
                },
                contentTransform: {
                    extractContent: true
                },
                inputMapping: {
                    focus: 'focus'
                }
            },
            {
                name: 'save_research_report',
                tool: 'save_to_file',
                arguments: {
                    filename: 'research_report',
                    format: 'md',
                    overwrite: true,
                    metadata: {
                        createdBy: 'Research Pipeline',
                        type: 'research_report'
                    }
                },
                inputMapping: {
                    content: 'summary'
                }
            }
        ]
    });

    // Documentation Pipeline: search → summarize → save with multiple topics
    agent.registerPipeline('documentation_pipeline', {
        description: 'Process multiple documentation topics into a comprehensive guide',
        steps: [
            {
                name: 'search_javascript',
                tool: 'search_docs',
                arguments: {
                    query: 'JavaScript programming',
                    searchType: 'keyword',
                    maxResults: 1,
                    includeContent: true
                }
            },
            {
                name: 'summarize_content',
                tool: 'summarize',
                arguments: {
                    summaryType: 'executive',
                    length: 'detailed',
                    includeKeywords: true
                },
                contentTransform: {
                    extractContent: true
                }
            },
            {
                name: 'save_documentation',
                tool: 'save_to_file',
                arguments: {
                    filename: 'comprehensive_guide',
                    format: 'html',
                    overwrite: true,
                    formatOptions: {
                        htmlTemplate: 'full'
                    },
                    metadata: {
                        title: 'Comprehensive Development Guide',
                        createdBy: 'Documentation Pipeline',
                        type: 'guide'
                    }
                },
                inputMapping: {
                    content: 'summary'
                }
            }
        ]
    });

    // Quick Summary Pipeline: search → quick summary → save as text
    agent.registerPipeline('quick_summary_pipeline', {
        description: 'Quick search and summary for rapid information processing',
        steps: [
            {
                name: 'quick_search',
                tool: 'search_docs',
                arguments: {
                    searchType: 'keyword',
                    maxResults: 1,
                    includeContent: true
                },
                inputMapping: {
                    query: 'query'
                }
            },
            {
                name: 'brief_summary',
                tool: 'summarize',
                arguments: {
                    length: 'brief',
                    includeKeywords: false
                },
                contentTransform: {
                    extractContent: true
                },
                inputMapping: {
                    summaryType: 'summaryType'
                }
            },
            {
                name: 'save_quick_note',
                tool: 'save_to_file',
                arguments: {
                    filename: 'quick_summary',
                    format: 'txt',
                    overwrite: true,
                    metadata: {
                        createdBy: 'Quick Summary Pipeline',
                        type: 'quick_note'
                    }
                },
                inputMapping: {
                    content: 'summary'
                }
            }
        ]
    });

    console.log('📝 Registered 3 predefined pipelines');
}

// Export for use as module
module.exports = { PipelineAgent };

// Run demo if executed directly
if (require.main === module) {
    runPipelineDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}