#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

/**
 * Utility script to start all MCP servers at once
 */

const servers = [
    { name: 'SearchDocs', script: 'search-mcp-server.js', port: 3001 },
    { name: 'Summarize', script: 'summarize-mcp-server.js', port: 3002 },
    { name: 'SaveToFile', script: 'savetofile-mcp-server.js', port: 3003 }
];

const processes = [];

console.log('🚀 Starting all MCP servers...\n');

function startServer(server) {
    const serverPath = path.join(__dirname, 'servers', server.script);
    console.log(`Starting ${server.name} on port ${server.port}...`);
    
    const child = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
    });

    child.stdout.on('data', (data) => {
        console.log(`[${server.name}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`[${server.name}] ERROR: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
        console.log(`[${server.name}] Process exited with code ${code}`);
    });

    child.on('error', (err) => {
        console.error(`[${server.name}] Failed to start: ${err.message}`);
    });

    processes.push({ child, name: server.name });
    return child;
}

// Start all servers
servers.forEach(server => {
    setTimeout(() => startServer(server), servers.indexOf(server) * 1000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down all servers...');
    processes.forEach(({ child, name }) => {
        console.log(`Stopping ${name}...`);
        child.kill('SIGTERM');
    });
    
    setTimeout(() => {
        console.log('All servers stopped.');
        process.exit(0);
    }, 2000);
});

console.log('\n📋 Started all servers. Press Ctrl+C to stop all servers.');
console.log('🔗 To test: node real-mcp-client.js');
console.log('🏥 Health check: curl http://localhost:3001/health');

// Keep the process alive
if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
}
process.stdin.resume();