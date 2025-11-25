#!/usr/bin/env node

const { spawn } = require('child_process');
const { WebUIServer } = require('./web-ui/server.js');

/**
 * Simple Web UI starter that works reliably
 */

async function startQuickUI() {
    console.log('🎯 Quick Start - LLM-Driven MCP Web UI');
    console.log('═'.repeat(50));

    try {
        // Start MCP servers in detached mode
        console.log('🚀 Starting MCP servers...');
        
        const mcpProcess = spawn('node', ['start-all-servers.js'], {
            detached: true,
            stdio: 'pipe'
        });

        // Log MCP server output
        mcpProcess.stdout.on('data', (data) => {
            console.log(`[MCP] ${data.toString().trim()}`);
        });

        mcpProcess.stderr.on('data', (data) => {
            console.log(`[MCP ERROR] ${data.toString().trim()}`);
        });

        // Wait for MCP servers to start
        console.log('⏱️  Waiting for MCP servers to initialize...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Start Web UI server
        console.log('🌐 Starting Web UI server...');
        const webServer = new WebUIServer(4000);
        webServer.start();

        console.log('\n✅ All services started!');
        console.log('🌐 Open: http://localhost:4000');
        console.log('\nPress Ctrl+C to stop everything\n');

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping all services...');
            
            try {
                process.kill(-mcpProcess.pid, 'SIGTERM');
                console.log('✅ MCP servers stopped');
            } catch (e) {
                console.log('⚠️  MCP servers may still be running');
            }
            
            process.exit(0);
        });

        // Keep alive
        process.stdin.resume();

    } catch (error) {
        console.error('❌ Failed to start:', error.message);
        console.log('\n🔧 Try manual start instead:');
        console.log('   Terminal 1: node start-all-servers.js');
        console.log('   Terminal 2: node web-ui/server.js');
        process.exit(1);
    }
}

// Check for help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Quick Start Web UI for LLM-Driven MCP Testing\n');
    console.log('Usage:');
    console.log('  node quick-start-ui.js     Start everything');
    console.log('  node quick-start-ui.js -h  Show help\n');
    console.log('Alternative manual start:');
    console.log('  Terminal 1: node start-all-servers.js');
    console.log('  Terminal 2: node web-ui/server.js');
    process.exit(0);
}

startQuickUI();