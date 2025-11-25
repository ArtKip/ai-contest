#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

/**
 * Complete Web UI launcher that starts everything needed for testing
 */

async function checkMCPServers() {
    console.log('🏥 Checking MCP servers...');
    
    const servers = [
        { name: 'SearchDocs', url: 'http://localhost:3001/health' },
        { name: 'Summarize', url: 'http://localhost:3002/health' },
        { name: 'SaveToFile', url: 'http://localhost:3003/health' }
    ];

    const results = [];
    
    for (const server of servers) {
        try {
            await axios.get(server.url, { timeout: 2000 });
            console.log(`✅ ${server.name}: Ready`);
            results.push(true);
        } catch (error) {
            console.log(`❌ ${server.name}: Not running`);
            results.push(false);
        }
    }

    return results.every(status => status);
}

async function startMCPServers() {
    console.log('🚀 Starting MCP servers...');
    
    const serverProcess = spawn('node', ['start-all-servers.js'], {
        stdio: 'inherit',
        detached: true
    });

    // Give servers time to start
    console.log('⏱️ Waiting for servers to initialize...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    return serverProcess;
}

async function startWebUI() {
    console.log('🌐 Starting Web UI server...');
    
    const webUIProcess = spawn('node', ['web-ui/server.js'], {
        stdio: 'inherit'
    });

    // Give Web UI time to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    return webUIProcess;
}

async function openBrowser() {
    const open = await import('open');
    console.log('🌏 Opening browser...');
    
    try {
        await open.default('http://localhost:4000');
        console.log('✅ Browser opened successfully');
    } catch (error) {
        console.log('⚠️ Could not open browser automatically');
        console.log('   Please open: http://localhost:4000');
    }
}

async function main() {
    console.log('🎯 LLM-Driven MCP Web UI Launcher');
    console.log('═'.repeat(50));
    console.log('This will start everything needed for testing:');
    console.log('• MCP servers (ports 3001, 3002, 3003)');
    console.log('• Web UI server (port 4000)');
    console.log('• Browser interface');
    console.log('═'.repeat(50) + '\n');

    let mcpProcess = null;
    let webUIProcess = null;

    try {
        // Check if MCP servers are already running
        const serversRunning = await checkMCPServers();
        
        if (!serversRunning) {
            console.log('🔧 Starting MCP servers...');
            mcpProcess = await startMCPServers();
            
            // Re-check after starting
            const serversReady = await checkMCPServers();
            if (!serversReady) {
                throw new Error('MCP servers failed to start properly');
            }
        } else {
            console.log('✅ MCP servers already running\n');
        }

        // Start Web UI
        webUIProcess = await startWebUI();

        // Open browser
        await openBrowser();

        console.log('\n🎉 Everything is ready!');
        console.log('═'.repeat(40));
        console.log('🌐 Web UI: http://localhost:4000');
        console.log('🧠 Test LLM-driven MCP orchestration');
        console.log('🔄 Compare Intelligent vs Adaptive modes');
        console.log('📊 Real-time decision visualization');
        console.log('═'.repeat(40));
        console.log('\n💡 Usage Guide:');
        console.log('1. Enter a request in the text area');
        console.log('2. Choose Intelligent or Adaptive mode');
        console.log('3. Click "Run Test" to see LLM decisions');
        console.log('4. Watch the real-time execution log');
        console.log('\n🔧 Example requests:');
        console.log('• "Find comprehensive API security information"');
        console.log('• "Quick database optimization overview"'); 
        console.log('• "Research microservices and create detailed report"');
        console.log('\nPress Ctrl+C to stop all servers\n');

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down all services...');
            
            if (webUIProcess) {
                webUIProcess.kill('SIGTERM');
                console.log('✅ Web UI server stopped');
            }
            
            if (mcpProcess) {
                process.kill(-mcpProcess.pid, 'SIGTERM'); // Kill process group
                console.log('✅ MCP servers stopped');
            }
            
            console.log('🎯 All services stopped. Goodbye!');
            process.exit(0);
        });

        // Keep process alive
        process.stdin.setRawMode(true);
        process.stdin.resume();

    } catch (error) {
        console.error('\n❌ Failed to start services:', error.message);
        console.error('\n🔧 Troubleshooting:');
        console.error('1. Make sure ports 3001, 3002, 3003, 4000 are available');
        console.error('2. Check if Node.js dependencies are installed');
        console.error('3. Try running components separately:');
        console.error('   • node start-all-servers.js');
        console.error('   • node web-ui/server.js');
        
        // Cleanup on error
        if (webUIProcess) webUIProcess.kill();
        if (mcpProcess) process.kill(-mcpProcess.pid, 'SIGTERM');
        
        process.exit(1);
    }
}

// Add usage info
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🎯 LLM-Driven MCP Web UI Launcher');
    console.log('\nUsage:');
    console.log('  node start-web-ui.js          Start everything');
    console.log('  node start-web-ui.js --help   Show this help');
    console.log('\nWhat this does:');
    console.log('  1. Starts MCP servers (search, summarize, save)');
    console.log('  2. Starts Web UI server');
    console.log('  3. Opens browser to http://localhost:4000');
    console.log('  4. Provides interactive testing interface');
    console.log('\nFeatures:');
    console.log('  • Real-time LLM decision visualization');
    console.log('  • Intelligent vs Adaptive mode testing');
    console.log('  • Server status monitoring');
    console.log('  • Interactive execution logs');
    process.exit(0);
}

// Start everything
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});