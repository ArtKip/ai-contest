#!/usr/bin/env node

const axios = require('axios');

/**
 * Adaptive Workflow Agent - Shows LLM adapting workflow based on intermediate results
 * 
 * This demonstrates advanced MCP usage where the LLM:
 * - Starts with one plan but adapts based on what it finds
 * - Makes conditional decisions based on tool results
 * - Handles unexpected scenarios intelligently
 * - Optimizes the workflow dynamically
 */

class AdaptiveWorkflowAgent {
    constructor(name = 'AdaptiveAgent') {
        this.name = name;
        this.mcpServers = {
            'search_docs': 'http://localhost:3001',
            'summarize': 'http://localhost:3002', 
            'save_to_file': 'http://localhost:3003'
        };
        this.availableTools = new Map();
        this.currentWorkflow = [];
        this.adaptationHistory = [];
    }

    async discoverTools() {
        console.log(`🔧 ${this.name}: Discovering tools for adaptive workflows...`);
        
        for (const [toolName, serverUrl] of Object.entries(this.mcpServers)) {
            try {
                const response = await axios.get(`${serverUrl}/mcp/tools/list`);
                const tools = response.data.tools;
                
                tools.forEach(tool => {
                    this.availableTools.set(tool.name, { ...tool, serverUrl });
                });
            } catch (error) {
                console.log(`   ⚠️ Could not reach ${serverUrl}`);
            }
        }
        
        console.log(`✅ Adaptive agent ready with ${this.availableTools.size} tools\\n`);
    }

    /**
     * LLM creates initial plan but adapts based on results
     */
    async createInitialPlan(userRequest) {
        console.log(`🎯 Creating initial plan for: "${userRequest}"`);
        
        // Simulate LLM creating initial workflow plan
        const plan = {
            goal: userRequest,
            strategy: this.determineInitialStrategy(userRequest),
            estimatedSteps: [],
            adaptationPoints: [],
            confidence: 0.7 // Initial confidence before execution
        };

        // LLM plans initial steps
        plan.estimatedSteps = this.planInitialSteps(userRequest);
        plan.adaptationPoints = this.identifyAdaptationPoints(plan.estimatedSteps);

        console.log(`📋 Initial Strategy: ${plan.strategy}`);
        console.log(`🎲 Estimated Steps: ${plan.estimatedSteps.map(s => s.action).join(' → ')}`);
        console.log(`🔄 Adaptation Points: ${plan.adaptationPoints.join(', ')}`);
        console.log(`🎯 Initial Confidence: ${(plan.confidence * 100).toFixed(0)}%\\n`);

        return plan;
    }

    /**
     * Execute workflow with dynamic adaptation
     */
    async executeAdaptiveWorkflow(userRequest) {
        console.log(`\\n🚀 Starting Adaptive Workflow Execution`);
        console.log('═'.repeat(60));

        const session = {
            userRequest,
            initialPlan: await this.createInitialPlan(userRequest),
            executionSteps: [],
            adaptations: [],
            startTime: Date.now(),
            success: false
        };

        let currentStep = 0;
        let workflowContext = { findings: [], confidence: session.initialPlan.confidence };
        
        try {
            while (currentStep < 10) { // Max 10 steps to prevent infinite loops
                const stepResult = await this.executeAdaptiveStep(
                    session.initialPlan, 
                    workflowContext, 
                    currentStep
                );

                session.executionSteps.push(stepResult);

                if (stepResult.adaptationMade) {
                    session.adaptations.push(stepResult.adaptation);
                    console.log(`🔄 ADAPTATION: ${stepResult.adaptation.reasoning}\\n`);
                }

                // Update context with results
                workflowContext = this.updateWorkflowContext(workflowContext, stepResult);

                if (stepResult.shouldStop) {
                    console.log(`🏁 Workflow completed: ${stepResult.stopReason}\\n`);
                    break;
                }

                currentStep++;
            }

            session.success = true;
            session.finalConfidence = workflowContext.confidence;

        } catch (error) {
            session.error = error.message;
            console.error(`❌ Adaptive workflow failed: ${error.message}`);
        }

        session.endTime = Date.now();
        session.totalTime = session.endTime - session.startTime;

        this.displayAdaptiveResults(session);
        return session;
    }

    async executeAdaptiveStep(plan, context, stepNumber) {
        console.log(`\\n📍 Adaptive Step ${stepNumber + 1}:`);
        
        // LLM decides next action based on current context
        const decision = await this.makeAdaptiveDecision(plan, context, stepNumber);
        
        console.log(`🧠 LLM Decision: ${decision.action} - ${decision.reasoning}`);

        if (decision.action === 'complete') {
            return {
                stepNumber: stepNumber + 1,
                action: 'complete',
                reasoning: decision.reasoning,
                shouldStop: true,
                stopReason: 'LLM determined task is complete'
            };
        }

        // Check if this differs from initial plan (adaptation)
        const adaptation = this.checkForAdaptation(plan, decision, stepNumber);
        
        // Execute the decided tool
        const toolResult = await this.executeTool(decision.tool, decision.parameters);

        // LLM evaluates results and updates confidence
        const evaluation = this.evaluateStepResult(toolResult, decision.expectedOutcome, context);

        return {
            stepNumber: stepNumber + 1,
            action: decision.action,
            tool: decision.tool,
            parameters: decision.parameters,
            reasoning: decision.reasoning,
            result: toolResult,
            evaluation: evaluation,
            adaptationMade: !!adaptation,
            adaptation: adaptation,
            confidenceChange: evaluation.confidenceChange,
            shouldStop: evaluation.shouldStop
        };
    }

    /**
     * LLM makes adaptive decisions based on current state
     */
    async makeAdaptiveDecision(plan, context, stepNumber) {
        const hasSearchResults = context.findings.some(f => f.type === 'search');
        const hasSummary = context.findings.some(f => f.type === 'summary');
        const lowConfidence = context.confidence < 0.6;
        const noResults = context.findings.length === 0;

        // Adaptive decision logic - LLM analyzes current situation
        
        if (stepNumber === 0 || noResults) {
            // First step or need information
            return {
                action: 'search',
                tool: 'search_docs', 
                parameters: {
                    query: this.extractSearchTerms(plan.goal),
                    searchType: lowConfidence ? 'semantic' : 'keyword',
                    maxResults: lowConfidence ? 3 : 2,
                    includeContent: true
                },
                reasoning: noResults ? 'Need initial information' : 'Starting information gathering',
                expectedOutcome: 'Relevant documents found'
            };
        }

        if (hasSearchResults && !hasSummary) {
            // Decide summary approach based on what was found
            const searchFindings = context.findings.filter(f => f.type === 'search');
            const totalResults = searchFindings.reduce((sum, f) => sum + f.count, 0);
            
            return {
                action: 'summarize',
                tool: 'summarize',
                parameters: {
                    content: this.extractLatestContent(context),
                    summaryType: totalResults > 2 ? 'executive' : 'key_insights',
                    length: context.confidence > 0.8 ? 'brief' : 'detailed',
                    includeKeywords: true
                },
                reasoning: `Adapting summary approach: found ${totalResults} results, confidence: ${(context.confidence * 100).toFixed(0)}%`,
                expectedOutcome: 'Processed, digestible information'
            };
        }

        if (hasSummary && context.confidence > 0.7) {
            // High confidence - save results
            return {
                action: 'save',
                tool: 'save_to_file',
                parameters: {
                    content: this.getLatestSummary(context),
                    filename: this.generateAdaptiveFilename(plan.goal, context),
                    format: this.chooseAdaptiveFormat(context),
                    overwrite: true,
                    metadata: {
                        confidence: context.confidence,
                        adaptations: this.adaptationHistory.length,
                        strategy: plan.strategy
                    }
                },
                reasoning: `High confidence (${(context.confidence * 100).toFixed(0)}%) - saving results`,
                expectedOutcome: 'Results saved for user'
            };
        }

        if (hasSummary && context.confidence <= 0.7) {
            // Low confidence - gather more information
            return {
                action: 'research_more',
                tool: 'search_docs',
                parameters: {
                    query: this.generateFollowupQuery(context),
                    searchType: 'semantic',
                    maxResults: 2,
                    includeContent: true
                },
                reasoning: `Low confidence (${(context.confidence * 100).toFixed(0)}%) - gathering additional information`,
                expectedOutcome: 'Additional context to improve confidence'
            };
        }

        // Default completion
        return {
            action: 'complete',
            reasoning: 'Workflow objectives achieved'
        };
    }

    checkForAdaptation(originalPlan, currentDecision, stepNumber) {
        // Check if current decision differs from original plan
        if (stepNumber < originalPlan.estimatedSteps.length) {
            const plannedStep = originalPlan.estimatedSteps[stepNumber];
            
            if (plannedStep.action !== currentDecision.action) {
                return {
                    type: 'strategy_change',
                    original: plannedStep.action,
                    adapted: currentDecision.action,
                    reasoning: `Changed from ${plannedStep.action} to ${currentDecision.action}: ${currentDecision.reasoning}`
                };
            }
        } else {
            // Unplanned step
            return {
                type: 'unplanned_step',
                action: currentDecision.action,
                reasoning: `Added unplanned step: ${currentDecision.reasoning}`
            };
        }

        return null;
    }

    evaluateStepResult(toolResult, expectedOutcome, context) {
        let confidenceChange = 0;
        let shouldStop = false;
        let evaluation = 'neutral';

        if (toolResult.success) {
            if (toolResult.results && toolResult.results.length > 0) {
                confidenceChange = +0.2; // Found good results
                evaluation = 'positive';
            } else if (toolResult.summary) {
                confidenceChange = +0.1; // Successfully processed
                evaluation = 'positive';
            } else if (toolResult.filename) {
                confidenceChange = +0.1; // Successfully saved
                evaluation = 'positive';
                shouldStop = true; // Usually the final step
            }
        } else {
            confidenceChange = -0.1; // Tool failed
            evaluation = 'negative';
        }

        // Adjust confidence
        const newConfidence = Math.max(0.1, Math.min(1.0, context.confidence + confidenceChange));

        return {
            evaluation,
            confidenceChange,
            newConfidence,
            shouldStop,
            outcome: toolResult.success ? 'achieved' : 'failed'
        };
    }

    updateWorkflowContext(context, stepResult) {
        const newContext = { ...context };
        
        // Update confidence
        if (stepResult.evaluation) {
            newContext.confidence = stepResult.evaluation.newConfidence;
        }

        // Add findings
        if (stepResult.result && stepResult.result.success) {
            if (stepResult.tool === 'search_docs') {
                newContext.findings.push({
                    type: 'search',
                    count: stepResult.result.results ? stepResult.result.results.length : 0,
                    content: stepResult.result.results
                });
            } else if (stepResult.tool === 'summarize') {
                newContext.findings.push({
                    type: 'summary',
                    summary: stepResult.result.summary,
                    keywords: stepResult.result.keywords
                });
            } else if (stepResult.tool === 'save_to_file') {
                newContext.findings.push({
                    type: 'saved',
                    filename: stepResult.result.filename,
                    path: stepResult.result.filePath
                });
            }
        }

        return newContext;
    }

    // Helper methods
    determineInitialStrategy(request) {
        if (request.toLowerCase().includes('comprehensive') || request.toLowerCase().includes('detailed')) {
            return 'thorough_research';
        } else if (request.toLowerCase().includes('quick') || request.toLowerCase().includes('brief')) {
            return 'rapid_overview';
        } else if (request.toLowerCase().includes('compare') || request.toLowerCase().includes('analysis')) {
            return 'comparative_analysis';
        }
        return 'adaptive_discovery';
    }

    planInitialSteps(request) {
        // Initial plan that might change during execution
        return [
            { action: 'search', confidence: 0.8 },
            { action: 'summarize', confidence: 0.7 },
            { action: 'save', confidence: 0.6 }
        ];
    }

    identifyAdaptationPoints(steps) {
        return ['after_search', 'after_summary', 'before_completion'];
    }

    extractSearchTerms(goal) {
        return goal.replace(/\\b(find|create|make|get|research)\\b/gi, '').trim();
    }

    extractLatestContent(context) {
        const searchFindings = context.findings.filter(f => f.type === 'search');
        return searchFindings
            .flatMap(f => f.content || [])
            .map(item => item.content || item.excerpt || item.title)
            .join('\\n\\n');
    }

    getLatestSummary(context) {
        const summaryFindings = context.findings.filter(f => f.type === 'summary');
        return summaryFindings.length > 0 ? summaryFindings[summaryFindings.length - 1].summary : '';
    }

    generateFollowupQuery(context) {
        const summaryFindings = context.findings.filter(f => f.type === 'summary');
        if (summaryFindings.length > 0 && summaryFindings[0].keywords) {
            return summaryFindings[0].keywords.slice(0, 3).map(k => k.word).join(' ');
        }
        return 'additional context information';
    }

    generateAdaptiveFilename(goal, context) {
        const words = goal.toLowerCase().split(' ').slice(0, 2).join('_');
        const confidence = Math.round(context.confidence * 100);
        return `adaptive_${words}_${confidence}pct`;
    }

    chooseAdaptiveFormat(context) {
        if (context.confidence > 0.8) return 'html'; // High confidence - rich format
        if (context.confidence > 0.6) return 'md';   // Medium confidence - structured
        return 'txt'; // Low confidence - simple format
    }

    async executeTool(toolName, parameters) {
        const toolInfo = this.availableTools.get(toolName);
        if (!toolInfo) {
            throw new Error(`Tool ${toolName} not available`);
        }

        try {
            const response = await axios.post(`${toolInfo.serverUrl}/mcp/tools/call`, {
                name: toolName,
                arguments: parameters
            });

            return JSON.parse(response.data.content[0].text);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    displayAdaptiveResults(session) {
        console.log(`\\n📊 ADAPTIVE WORKFLOW RESULTS`);
        console.log('═'.repeat(50));
        console.log(`🎯 Goal: "${session.userRequest}"`);
        console.log(`📈 Initial Confidence: ${(session.initialPlan.confidence * 100).toFixed(0)}%`);
        console.log(`📊 Final Confidence: ${(session.finalConfidence * 100).toFixed(0)}%`);
        console.log(`🔄 Adaptations Made: ${session.adaptations.length}`);
        console.log(`📝 Steps Executed: ${session.executionSteps.length}`);
        console.log(`⏱️ Total Time: ${session.totalTime}ms`);

        if (session.adaptations.length > 0) {
            console.log(`\\n🔄 Adaptations Made:`);
            session.adaptations.forEach((adaptation, i) => {
                console.log(`   ${i + 1}. ${adaptation.type}: ${adaptation.reasoning}`);
            });
        }

        console.log(`\\n🛠️ Execution Path:`);
        session.executionSteps.forEach((step, i) => {
            const emoji = step.adaptationMade ? '🔄' : '➡️';
            console.log(`   ${emoji} ${step.action} (confidence: ${step.evaluation ? (step.evaluation.newConfidence * 100).toFixed(0) + '%' : 'N/A'})`);
        });

        console.log('\\n' + '═'.repeat(60));
    }
}

/**
 * Demo showing adaptive workflow capabilities
 */
async function runAdaptiveWorkflowDemo() {
    console.log('🔄 ADAPTIVE WORKFLOW AGENT DEMONSTRATION');
    console.log('═'.repeat(60));
    console.log('Shows how LLM adapts workflow based on intermediate results!\\n');

    const agent = new AdaptiveWorkflowAgent('SmartAdaptiveAgent');

    try {
        await agent.discoverTools();

        // Test requests that will likely require adaptation
        const adaptiveTests = [
            "Find information about a topic that might not exist in our database",
            "Research quantum computing applications - give me comprehensive details", 
            "Quick overview of blockchain technology",
            "Compare different approaches to API authentication and create a detailed analysis"
        ];

        for (let i = 0; i < adaptiveTests.length; i++) {
            console.log(`\\n🧪 Adaptive Test ${i + 1}/${adaptiveTests.length}:`);
            console.log('─'.repeat(50));
            
            await agent.executeAdaptiveWorkflow(adaptiveTests[i]);
            
            if (i < adaptiveTests.length - 1) {
                console.log('\\nPreparing next adaptive test...\\n');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('\\n🎉 ADAPTIVE DEMONSTRATION COMPLETE!');
        console.log('💡 Key Adaptive Features Shown:');
        console.log('   🧠 LLM creates initial plan but adapts during execution');
        console.log('   📊 Confidence tracking influences decisions');  
        console.log('   🔄 Workflow changes based on intermediate results');
        console.log('   🎯 Dynamic strategy adjustment');
        console.log('   📈 Self-correcting behavior');

    } catch (error) {
        console.error('\\n❌ Demo failed:', error.message);
    }
}

// Export for use as module
module.exports = { AdaptiveWorkflowAgent };

// Run demo if executed directly
if (require.main === module) {
    runAdaptiveWorkflowDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}