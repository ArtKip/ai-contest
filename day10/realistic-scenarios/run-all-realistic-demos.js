#!/usr/bin/env node

const { MultiAgentCoordinator } = require('./multi-agent-coordinator.js');
const { LLMIntegrationDemo } = require('./llm-integration-demo.js');
const axios = require('axios');

/**
 * Master demo script that runs all realistic MCP scenarios
 */

async function checkServersHealth() {
    console.log('🏥 Checking MCP Server Health...');
    
    const servers = [
        { name: 'SearchDocs', url: 'http://localhost:3001' },
        { name: 'Summarize', url: 'http://localhost:3002' },  
        { name: 'SaveToFile', url: 'http://localhost:3003' }
    ];
    
    const healthStatus = [];
    
    for (const server of servers) {
        try {
            await axios.get(`${server.url}/health`, { timeout: 2000 });
            console.log(`✅ ${server.name}: healthy`);
            healthStatus.push(true);
        } catch (error) {
            console.log(`❌ ${server.name}: down`);
            healthStatus.push(false);
        }
    }
    
    const allHealthy = healthStatus.every(status => status);
    
    if (!allHealthy) {
        console.log('\\n⚠️  Some servers are down. Starting servers first:');
        console.log('   node start-all-servers.js');
        console.log('\\nWaiting 10 seconds for servers to start...');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    return allHealthy;
}

async function runCompleteDemo() {
    console.log('🎯 COMPLETE REALISTIC MCP DEMONSTRATION');
    console.log('═'.repeat(80));
    console.log('This demonstrates the REAL power of MCP:');
    console.log('• Multiple agents/LLMs discovering shared tools');
    console.log('• Concurrent tool usage by different systems');  
    console.log('• Dynamic capability enhancement');
    console.log('• Tool usage analytics and monitoring');
    console.log('═'.repeat(80) + '\\n');

    // Check server health
    const serversHealthy = await checkServersHealth();
    console.log();

    if (!serversHealthy) {
        console.log('❌ Cannot run demos without healthy servers');
        return;
    }

    try {
        // Demo 1: Multi-Agent Tool Coordination
        console.log('🤖 DEMO 1: Multi-Agent Tool Coordination');
        console.log('─'.repeat(50));
        console.log('Shows multiple AI agents discovering and using the same tools\\n');
        
        const coordinator = new MultiAgentCoordinator();
        await coordinator.initializeAgents();
        await coordinator.runConcurrentTasks();
        await coordinator.showToolUsageAnalytics();
        
        console.log('\\n' + '═'.repeat(80) + '\\n');
        
        // Demo 2: LLM Integration  
        console.log('🧠 DEMO 2: LLM Tool Integration');
        console.log('─'.repeat(50));
        console.log('Shows how LLMs enhance capabilities using MCP tools\\n');
        
        const llmDemo = new LLMIntegrationDemo();
        await llmDemo.initializeLLMs();
        await llmDemo.demonstrateEnhancementComparison();
        await llmDemo.demonstrateConcurrentUsage();
        await llmDemo.showToolUsageAnalytics();
        
        console.log('\\n' + '═'.repeat(80) + '\\n');
        
        // Summary
        console.log('🎉 COMPLETE DEMONSTRATION FINISHED');
        console.log('═'.repeat(80));
        console.log('✅ Multi-Agent coordination demonstrated');
        console.log('✅ LLM capability enhancement shown');
        console.log('✅ Concurrent tool usage validated');
        console.log('✅ Service discovery mechanisms tested');
        console.log('✅ Analytics and monitoring displayed');
        console.log();
        console.log('💡 KEY MCP BENEFITS DEMONSTRATED:');
        console.log('   🔧 Tool Reusability: Same tools used by different agents');
        console.log('   🚀 Scalability: Multiple concurrent users supported');
        console.log('   🎯 Specialization: Agents use same tools differently');
        console.log('   📊 Observability: Usage analytics and monitoring');
        console.log('   🔍 Discovery: Dynamic tool discovery and registration');
        console.log('   🌐 Distribution: Tools run as separate services');
        console.log();
        console.log('This is the REAL power of MCP - shared, discoverable,');
        console.log('reusable tools that multiple AI systems can leverage!');

        // Display output files created
        console.log('\\n📁 Files Created During Demos:');
        const fs = require('fs');
        const path = require('path');
        const outputDir = path.join(__dirname, '..', 'outputs');
        
        try {
            const files = fs.readdirSync(outputDir);
            files.forEach(file => {
                if (file.includes('research_') || file.includes('quick_') || 
                    file.includes('analysis_') || file.includes('real_mcp_')) {
                    console.log(`   📄 ${file}`);
                }
            });
        } catch (e) {
            console.log('   (Output directory not accessible)');
        }
        
    } catch (error) {
        console.error('\\n❌ Demo failed:', error.message);
        console.error('\\nTroubleshooting:');
        console.error('1. Ensure all servers are running: node start-all-servers.js');
        console.error('2. Wait 10 seconds after starting servers');
        console.error('3. Check ports 3001, 3002, 3003 are available');
        console.error('4. Run individual demos separately to isolate issues');
    }
}

async function showQuickStart() {
    console.log('\\n📚 QUICK START GUIDE FOR REALISTIC MCP TESTING');
    console.log('═'.repeat(60));
    console.log();
    console.log('1️⃣ Start all MCP servers:');
    console.log('   node start-all-servers.js');
    console.log();
    console.log('2️⃣ Run complete demonstration:');  
    console.log('   node realistic-scenarios/run-all-realistic-demos.js');
    console.log();
    console.log('3️⃣ Run individual demos:');
    console.log('   node realistic-scenarios/multi-agent-coordinator.js');
    console.log('   node realistic-scenarios/llm-integration-demo.js');
    console.log();
    console.log('4️⃣ Test individual servers:');
    console.log('   curl http://localhost:3001/health');
    console.log('   curl http://localhost:3002/mcp/info');
    console.log('   curl http://localhost:3003/mcp/tools/list');
    console.log();
    console.log('🎯 The realistic demos show the TRUE purpose of MCP:');
    console.log('   Multiple AI systems sharing discoverable tools!');
}

// Check if this script is run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showQuickStart();
    } else {
        runCompleteDemo().catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
    }
}