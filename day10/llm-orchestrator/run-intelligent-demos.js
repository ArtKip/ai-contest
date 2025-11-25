#!/usr/bin/env node

const { IntelligentMCPAgent } = require('./intelligent-mcp-agent.js');
const { AdaptiveWorkflowAgent } = require('./adaptive-workflow-agent.js');
const axios = require('axios');

/**
 * Comprehensive demo of LLM-driven MCP orchestration
 */

async function checkServerHealth() {
    console.log('🏥 Checking MCP Servers...');
    
    const servers = [
        { name: 'SearchDocs', url: 'http://localhost:3001' },
        { name: 'Summarize', url: 'http://localhost:3002' },  
        { name: 'SaveToFile', url: 'http://localhost:3003' }
    ];
    
    const healthResults = [];
    
    for (const server of servers) {
        try {
            await axios.get(`${server.url}/health`, { timeout: 2000 });
            console.log(`✅ ${server.name}: Ready`);
            healthResults.push(true);
        } catch (error) {
            console.log(`❌ ${server.name}: Not reachable`);
            healthResults.push(false);
        }
    }
    
    const allHealthy = healthResults.every(status => status);
    
    if (!allHealthy) {
        console.log('\\n⚠️  Start servers first: node start-all-servers.js\\n');
    }
    
    return allHealthy;
}

async function runIntelligentMCPComparison() {
    console.log('🧠 LLM-DRIVEN MCP ORCHESTRATION DEMONSTRATION');
    console.log('═'.repeat(70));
    console.log('This shows the TRUE power of MCP:');
    console.log('🎯 LLM decides which tools to use and when');
    console.log('🔄 LLM adapts based on intermediate results');  
    console.log('🧠 NO predefined pipelines - pure intelligence!');
    console.log('═'.repeat(70) + '\\n');

    const serversReady = await checkServerHealth();
    if (!serversReady) return;

    // Demo 1: Intelligent Agent
    console.log('\\n🤖 DEMO 1: Intelligent Tool Selection');
    console.log('─'.repeat(50));
    console.log('LLM analyzes request and intelligently selects tools\\n');

    const intelligentAgent = new IntelligentMCPAgent('IntelligentOrchestrator');
    await intelligentAgent.discoverTools();

    // Test intelligent decision making
    const intelligentTests = [
        "Find information about microservices architecture and create a comprehensive report",
        "What are the key security considerations for APIs? Give me bullet points",
        "Research database sharding techniques - I need detailed analysis saved as HTML"
    ];

    for (const test of intelligentTests) {
        await intelligentAgent.processRequest(test);
    }

    console.log('\\n' + '═'.repeat(70) + '\\n');

    // Demo 2: Adaptive Workflow Agent  
    console.log('🔄 DEMO 2: Adaptive Workflow Execution');
    console.log('─'.repeat(50));
    console.log('LLM adapts workflow based on intermediate results\\n');

    const adaptiveAgent = new AdaptiveWorkflowAgent('AdaptiveOrchestrator');
    await adaptiveAgent.discoverTools();

    // Test adaptive behavior
    const adaptiveTests = [
        "Research cloud computing trends and provide strategic insights",
        "Find best practices for containerization - comprehensive analysis needed"
    ];

    for (const test of adaptiveTests) {
        await adaptiveAgent.executeAdaptiveWorkflow(test);
    }

    console.log('\\n' + '═'.repeat(70) + '\\n');

    // Comparison Summary
    console.log('📊 INTELLIGENT vs TRADITIONAL MCP COMPARISON');
    console.log('═'.repeat(60));
    
    console.log('\\n🤖 INTELLIGENT MCP (LLM-Driven):');
    const intelligentStats = intelligentAgent.getIntelligenceStats();
    console.log(`   📈 Average steps per task: ${intelligentStats.averageSteps}`);
    console.log(`   ✅ Success rate: ${intelligentStats.successRate}`);
    console.log(`   🧠 Decision-making: Dynamic LLM analysis`);
    console.log(`   🔄 Adaptation: Based on context and results`);
    console.log(`   🎯 Tool selection: Intelligent, purpose-driven`);

    console.log('\\n🔧 TRADITIONAL MCP (Predefined Pipelines):');
    console.log('   📈 Average steps per task: Fixed (usually 3)');
    console.log('   ✅ Success rate: Depends on predefined logic');
    console.log('   🤖 Decision-making: Static, rule-based');
    console.log('   🔄 Adaptation: Limited or none');
    console.log('   🎯 Tool selection: Predefined sequences');

    console.log('\\n🏆 KEY ADVANTAGES OF LLM-DRIVEN MCP:');
    console.log('   🧠 Context-aware tool selection');
    console.log('   🔄 Dynamic workflow adaptation'); 
    console.log('   🎯 Goal-oriented optimization');
    console.log('   📊 Confidence-based decision making');
    console.log('   🚀 No need to predefine all possible workflows');

    console.log('\\n💡 REAL-WORLD APPLICATIONS:');
    console.log('   🔍 Research assistants that adapt to findings');
    console.log('   📝 Content generators that adjust based on sources');
    console.log('   🛠️ Code assistants that select appropriate tools');
    console.log('   📊 Data analysts that pivot based on data quality');
    console.log('   🎯 Personal assistants that optimize for user needs');

    // Show generated files
    console.log('\\n📁 Files Generated by Intelligent Orchestration:');
    const fs = require('fs');
    const path = require('path');
    
    try {
        const outputDir = path.join(__dirname, '..', 'outputs');
        const files = fs.readdirSync(outputDir);
        
        const intelligentFiles = files.filter(file => 
            file.includes('intelligent_') || 
            file.includes('adaptive_') ||
            file.includes('microservices') ||
            file.includes('security') ||
            file.includes('database') ||
            file.includes('cloud')
        );

        intelligentFiles.forEach(file => {
            const stats = fs.statSync(path.join(outputDir, file));
            console.log(`   📄 ${file} (${stats.size} bytes)`);
        });
        
        if (intelligentFiles.length === 0) {
            console.log('   (Check outputs/ directory for generated files)');
        }
        
    } catch (error) {
        console.log('   (Output directory not accessible)');
    }

    console.log('\\n🎉 INTELLIGENT MCP DEMONSTRATION COMPLETE!');
    console.log('\\nThis showcases how LLMs can truly leverage MCP:');
    console.log('• Dynamic tool selection based on request analysis');
    console.log('• Adaptive workflows that change based on results');  
    console.log('• Intelligent optimization without predefined rules');
    console.log('• Context-aware decision making throughout execution');
    console.log('\\nThis is the FUTURE of AI tool orchestration! 🚀');
}

async function showUsageGuide() {
    console.log('\\n📚 LLM-DRIVEN MCP USAGE GUIDE');
    console.log('═'.repeat(50));
    console.log();
    console.log('🚀 Prerequisites:');
    console.log('   1. Start MCP servers: node start-all-servers.js');
    console.log('   2. Wait for all 3 servers to be ready');
    console.log();
    console.log('🧠 Run Intelligent Orchestration:');
    console.log('   node llm-orchestrator/run-intelligent-demos.js');
    console.log();
    console.log('🤖 Individual Demos:');
    console.log('   node llm-orchestrator/intelligent-mcp-agent.js');
    console.log('   node llm-orchestrator/adaptive-workflow-agent.js');
    console.log();
    console.log('🔍 What to Look For:');
    console.log('   • LLM analyzing user requests');
    console.log('   • Dynamic tool selection decisions');
    console.log('   • Workflow adaptations based on results');
    console.log('   • Confidence tracking and optimization');
    console.log();
    console.log('🎯 This demonstrates TRUE MCP power:');
    console.log('   LLMs intelligently orchestrating tool usage!');
}

// Check if this script is run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showUsageGuide();
    } else {
        runIntelligentMCPComparison().catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
    }
}

module.exports = { runIntelligentMCPComparison };