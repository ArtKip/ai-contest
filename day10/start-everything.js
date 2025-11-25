#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

/**
 * Start all 4 servers and stop them all with Ctrl+C
 */

class AllServersManager {
    constructor() {
        this.processes = [];
        this.setupSignalHandlers();
    }

    startServer(name, script, port, color = '\x1b[36m') {
        console.log(`🚀 Starting ${name} on port ${port}...`);
        
        const serverPath = path.join(__dirname, script);
        const process = spawn('node', [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });

        process.stdout.on('data', (data) => {
            console.log(`${color}[${name}]\x1b[0m ${data.toString().trim()}`);
        });

        process.stderr.on('data', (data) => {
            console.log(`${color}[${name} ERROR]\x1b[0m ${data.toString().trim()}`);
        });

        process.on('close', (code) => {
            console.log(`${color}[${name}]\x1b[0m Process exited with code ${code}`);
        });

        process.on('error', (err) => {
            console.error(`${color}[${name}]\x1b[0m Failed to start: ${err.message}`);
        });

        this.processes.push({ name, process, port });
        return process;
    }

    async startAll() {
        console.log('🎯 Starting All MCP + Web UI Servers');
        console.log('═'.repeat(60));

        try {
            // Kill any existing processes first
            await this.killExistingProcesses();

            // Start all 4 servers
            this.startServer('SearchDocs', 'servers/search-mcp-server.js', 3001, '\x1b[32m');
            await this.delay(2000);

            this.startServer('Summarize', 'servers/summarize-mcp-server.js', 3002, '\x1b[33m');
            await this.delay(2000);

            this.startServer('SaveToFile', 'servers/savetofile-mcp-server.js', 3003, '\x1b[35m');
            await this.delay(2000);

            this.startServer('Web UI', 'web-ui/server.js', 4000, '\x1b[36m');
            await this.delay(3000);

            console.log();
            console.log('✅ All servers started successfully!');
            console.log('═'.repeat(60));
            console.log('🌐 Web UI: \x1b[1mhttp://localhost:4000\x1b[0m');
            console.log('🔧 MCP Servers:');
            console.log('   • SearchDocs: http://localhost:3001');
            console.log('   • Summarize: http://localhost:3002');
            console.log('   • SaveToFile: http://localhost:3003');
            console.log('═'.repeat(60));
            console.log('💡 Test the LLM-driven MCP orchestration!');
            console.log('🛑 Press Ctrl+C to stop ALL servers');
            console.log();

            // Keep process alive
            process.stdin.resume();

        } catch (error) {
            console.error('❌ Failed to start servers:', error.message);
            this.stopAll();
            process.exit(1);
        }
    }

    async killExistingProcesses() {
        console.log('🛑 Killing any existing processes...');
        
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        try {
            // Kill processes by name
            await execAsync('pkill -f "search-mcp-server" || true');
            await execAsync('pkill -f "summarize-mcp-server" || true');
            await execAsync('pkill -f "savetofile-mcp-server" || true');
            await execAsync('pkill -f "web-ui/server" || true');
            await execAsync('pkill -f "start-all-servers" || true');
            
            // Kill processes by port
            await execAsync('lsof -ti:3001 | xargs kill -9 || true');
            await execAsync('lsof -ti:3002 | xargs kill -9 || true');
            await execAsync('lsof -ti:3003 | xargs kill -9 || true');
            await execAsync('lsof -ti:4000 | xargs kill -9 || true');
            
            await this.delay(2000);
            console.log('✅ Cleanup complete');
        } catch (error) {
            console.log('⚠️ Cleanup completed (some processes may not have existed)');
        }
    }

    stopAll() {
        console.log('\n🛑 Stopping all servers...');
        
        this.processes.forEach(({ name, process }) => {
            try {
                console.log(`   Stopping ${name}...`);
                process.kill('SIGTERM');
                
                // Force kill after 3 seconds if needed
                setTimeout(() => {
                    if (!process.killed) {
                        process.kill('SIGKILL');
                    }
                }, 3000);
                
            } catch (error) {
                console.log(`   ⚠️ ${name} may already be stopped`);
            }
        });

        setTimeout(() => {
            console.log('✅ All servers stopped');
            console.log('👋 Goodbye!');
            process.exit(0);
        }, 4000);
    }

    setupSignalHandlers() {
        // Handle Ctrl+C
        process.on('SIGINT', () => {
            console.log('\n📥 Received Ctrl+C signal...');
            this.stopAll();
        });

        // Handle other termination signals
        process.on('SIGTERM', () => {
            console.log('\n📥 Received SIGTERM signal...');
            this.stopAll();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('\n💥 Uncaught exception:', error.message);
            this.stopAll();
        });

        // Handle process exit
        process.on('exit', () => {
            console.log('🎯 Process exiting...');
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Start everything
 */
async function main() {
    const manager = new AllServersManager();
    await manager.startAll();
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('🎯 All-in-One MCP + Web UI Server Starter');
    console.log();
    console.log('Usage:');
    console.log('  node start-everything.js          Start all 4 servers');
    console.log('  node start-everything.js --help   Show this help');
    console.log();
    console.log('What this starts:');
    console.log('  • SearchDocs MCP Server (port 3001)');
    console.log('  • Summarize MCP Server (port 3002)');
    console.log('  • SaveToFile MCP Server (port 3003)');
    console.log('  • Web UI Server (port 4000)');
    console.log();
    console.log('Features:');
    console.log('  ✅ Automatic cleanup of existing processes');
    console.log('  ✅ Color-coded server logs');
    console.log('  ✅ Proper shutdown with Ctrl+C');
    console.log('  ✅ All servers stop together');
    console.log();
    console.log('Open: http://localhost:4000 when ready!');
    process.exit(0);
}

// Start everything
main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
});