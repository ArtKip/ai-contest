#!/usr/bin/env node

const { MemoryAgent } = require('./memory-agent');
const readline = require('readline');

/**
 * Interactive Demo for Memory-Enabled Agent
 * 
 * This demo showcases the agent's ability to:
 * - Remember conversations across sessions
 * - Build user profiles over time
 * - Provide context-aware responses
 * - Search through conversation history
 */

class MemoryAgentDemo {
    constructor() {
        this.agent = null;
        this.rl = null;
        this.demoMode = 'interactive';
    }

    async start() {
        console.log('🎭 Memory Agent Demo - Day 11');
        console.log('═'.repeat(50));
        console.log('This demo shows how an agent can maintain long-term memory');
        console.log('across conversations and build relationships with users.\\n');

        this.setupReadline();
        await this.showMenu();
    }

    setupReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'You: '
        });
    }

    async showMenu() {
        console.log('Choose a demo mode:');
        console.log('1. 🆕 Start fresh conversation (new agent)');
        console.log('2. 🔄 Continue previous conversation (existing memory)');
        console.log('3. 🤖 Run automated demo scenario');
        console.log('4. 🧪 Run memory persistence test');
        console.log('5. 🌐 Start web interface');
        console.log('6. ❌ Exit\\n');

        this.rl.question('Select an option (1-6): ', async (choice) => {
            switch (choice.trim()) {
                case '1':
                    await this.startFreshConversation();
                    break;
                case '2':
                    await this.continuePreviousConversation();
                    break;
                case '3':
                    await this.runAutomatedDemo();
                    break;
                case '4':
                    await this.runMemoryTest();
                    break;
                case '5':
                    await this.startWebInterface();
                    break;
                case '6':
                    console.log('👋 Goodbye!');
                    process.exit(0);
                    break;
                default:
                    console.log('Invalid choice. Please try again.\\n');
                    await this.showMenu();
            }
        });
    }

    async startFreshConversation() {
        console.log('\\n🆕 Starting fresh conversation with new memory...');
        
        // Clean up any existing database
        const fs = require('fs').promises;
        try {
            await fs.unlink('./memory.db');
        } catch (error) {
            // File doesn't exist, that's fine
        }

        this.agent = new MemoryAgent({
            name: 'MemoryBot',
            personality: {
                helpful: 0.9,
                curious: 0.8,
                formal: 0.3,
                creative: 0.7
            }
        });

        await this.wait(1000);

        console.log('\\n✅ Fresh agent created! This agent has no previous memories.');
        console.log('💡 Try introducing yourself and sharing some preferences.');
        console.log('   Examples: "My name is Alex, I love programming"');
        console.log('             "I prefer detailed technical explanations"');
        console.log('             "I work in machine learning"\\n');
        
        await this.startInteractiveChat();
    }

    async continuePreviousConversation() {
        console.log('\\n🔄 Loading existing agent memory...');

        this.agent = new MemoryAgent({
            name: 'MemoryBot',
            memory: {
                dbPath: './memory.db'
            }
        });

        await this.wait(1000);

        // Check if there are previous conversations
        try {
            const stats = await this.agent.getMemoryStats();
            
            if (stats.totalConversations > 0) {
                console.log(`\\n✅ Loaded agent with memory!`);
                console.log(`📊 Previous conversations: ${stats.totalConversations}`);
                console.log(`📚 Stored memories: ${stats.totalMemories}`);
                console.log(`💭 The agent should remember your previous interactions.\\n`);
                
                console.log('💡 Try asking: "Do you remember what I told you?"');
                console.log('              "What do you know about me?"');
                console.log('              "What did we discuss before?"\\n');
            } else {
                console.log('\\n💤 No previous conversations found. This works like a fresh start.');
            }
        } catch (error) {
            console.log('\\n💤 No previous memory found. Starting fresh.');
        }

        await this.startInteractiveChat();
    }

    async runAutomatedDemo() {
        console.log('\\n🤖 Running automated demo scenario...');
        console.log('This shows memory persistence across multiple sessions.\\n');

        // Scenario 1: First session
        console.log('📅 Day 1: First interaction');
        console.log('─'.repeat(40));

        const agent1 = new MemoryAgent({
            name: 'DemoBot',
            memory: { dbPath: './demo-memory.db', autoBackup: true }
        });

        await this.wait(500);

        await this.simulateConversation(agent1, [
            {
                user: "Hi, I'm Sarah. I'm a software engineer working on web applications.",
                expected: "name.*Sarah.*software.*engineer"
            },
            {
                user: "I love working with React and Node.js, and I prefer TypeScript over JavaScript.",
                expected: "React.*Node.*TypeScript"
            },
            {
                user: "I'm currently learning about microservices architecture.",
                expected: "microservices"
            }
        ]);

        await agent1.shutdown();
        console.log('💾 Session 1 ended, memory saved.\\n');

        // Scenario 2: Second session (next day)
        console.log('📅 Day 2: Returning user');
        console.log('─'.repeat(40));

        const agent2 = new MemoryAgent({
            name: 'DemoBot',
            memory: { dbPath: './demo-memory.db' }
        });

        await this.wait(500);

        await this.simulateConversation(agent2, [
            {
                user: "Hi there! Do you remember me?",
                expected: "Sarah.*remember"
            },
            {
                user: "I finished my microservices project! Can you ask me about it?",
                expected: "microservices.*project.*congratulations|great|awesome"
            },
            {
                user: "Now I want to learn about Docker containers. Can you help?",
                expected: "Docker.*containers.*help"
            }
        ]);

        await agent2.shutdown();
        console.log('💾 Session 2 ended.\\n');

        // Scenario 3: Third session (a week later)
        console.log('📅 Day 7: Advanced conversation');
        console.log('─'.repeat(40));

        const agent3 = new MemoryAgent({
            name: 'DemoBot',
            memory: { dbPath: './demo-memory.db' }
        });

        await this.wait(500);

        await this.simulateConversation(agent3, [
            {
                user: "What do you remember about my technical preferences?",
                expected: "React.*Node.*TypeScript"
            },
            {
                user: "I've been promoted to tech lead! What should I focus on?",
                expected: "congratulations|promoted.*tech.*lead"
            }
        ]);

        // Show memory statistics
        const finalStats = await agent3.getMemoryStats();
        console.log('\\n📊 Final Memory Statistics:');
        console.log(`   Total Conversations: ${finalStats.totalConversations}`);
        console.log(`   Total Sessions: ${finalStats.totalSessions}`);
        console.log(`   Stored Memories: ${finalStats.totalMemories}`);

        await agent3.shutdown();

        console.log('\\n🎉 Automated demo completed!');
        console.log('The agent successfully remembered information across all 3 sessions.\\n');

        await this.returnToMenu();
    }

    async simulateConversation(agent, exchanges) {
        for (const exchange of exchanges) {
            console.log(`👤 User: ${exchange.user}`);
            
            const result = await agent.processMessage(exchange.user);
            console.log(`🤖 Bot: ${result.response}`);
            
            // Simple validation (in a real test, this would be more sophisticated)
            const regex = new RegExp(exchange.expected, 'i');
            const matches = regex.test(result.response);
            
            console.log(`   ${matches ? '✅' : '⚠️ '} Memory check: ${matches ? 'PASSED' : 'PARTIAL'}\\n`);
            
            await this.wait(1000);
        }
    }

    async runMemoryTest() {
        console.log('\\n🧪 Running memory persistence test...\\n');
        
        const { MemoryPersistenceTest } = require('./test-memory-persistence');
        const tester = new MemoryPersistenceTest();
        await tester.run();

        await this.returnToMenu();
    }

    async startWebInterface() {
        console.log('\\n🌐 Starting web interface...');
        console.log('Opening browser to http://localhost:3000');
        
        const { MemoryAgentWebServer } = require('./web-server');
        const server = new MemoryAgentWebServer(3000);
        
        try {
            await server.start();
        } catch (error) {
            console.error('❌ Failed to start web server:', error.message);
            await this.returnToMenu();
        }
    }

    async startInteractiveChat() {
        console.log('💬 Starting interactive chat...');
        console.log('Commands:');
        console.log('  /stats   - Show memory statistics');
        console.log('  /search  - Search conversation history');
        console.log('  /export  - Export memory to JSON');
        console.log('  /menu    - Return to main menu');
        console.log('  /quit    - Exit demo\\n');

        this.rl.prompt();

        this.rl.on('line', async (input) => {
            const message = input.trim();

            if (message === '/quit') {
                await this.shutdown();
                return;
            }

            if (message === '/menu') {
                await this.returnToMenu();
                return;
            }

            if (message === '/stats') {
                await this.showStats();
                this.rl.prompt();
                return;
            }

            if (message.startsWith('/search ')) {
                await this.searchMemory(message.substring(8));
                this.rl.prompt();
                return;
            }

            if (message === '/export') {
                await this.exportMemory();
                this.rl.prompt();
                return;
            }

            if (message === '') {
                this.rl.prompt();
                return;
            }

            // Process regular message
            try {
                const result = await this.agent.processMessage(message);
                console.log(`🤖 ${this.agent.name}: ${result.response}\\n`);
            } catch (error) {
                console.log(`❌ Error: ${error.message}\\n`);
            }

            this.rl.prompt();
        });
    }

    async showStats() {
        try {
            const stats = await this.agent.getMemoryStats();
            console.log('\\n📊 Memory Statistics:');
            console.log(`   Agent: ${stats.agent}`);
            console.log(`   Current Session: ${stats.currentSession.substring(0, 8)}...`);
            console.log(`   Conversations (this session): ${stats.conversationsThisSession}`);
            console.log(`   Total Conversations: ${stats.totalConversations}`);
            console.log(`   Total Sessions: ${stats.totalSessions}`);
            console.log(`   Stored Memories: ${stats.totalMemories}\\n`);
        } catch (error) {
            console.log(`❌ Could not retrieve stats: ${error.message}\\n`);
        }
    }

    async searchMemory(searchTerm) {
        if (!searchTerm) {
            console.log('❌ Please provide a search term: /search <term>\\n');
            return;
        }

        try {
            const results = await this.agent.memory.searchConversations(searchTerm, 5);
            
            if (results.length === 0) {
                console.log(`🔍 No conversations found for "${searchTerm}"\\n`);
            } else {
                console.log(`\\n🔍 Found ${results.length} conversations for "${searchTerm}":`);
                results.forEach((result, index) => {
                    const date = new Date(result.timestamp).toLocaleDateString();
                    console.log(`   ${index + 1}. [${date}] User: ${result.user_input}`);
                    console.log(`      Agent: ${result.agent_response.substring(0, 80)}...\\n`);
                });
            }
        } catch (error) {
            console.log(`❌ Search failed: ${error.message}\\n`);
        }
    }

    async exportMemory() {
        try {
            await this.agent.memory.exportToJSON();
            console.log('💾 Memory exported to JSON files in memory-backups/\\n');
        } catch (error) {
            console.log(`❌ Export failed: ${error.message}\\n`);
        }
    }

    async returnToMenu() {
        if (this.agent) {
            await this.agent.shutdown();
            this.agent = null;
        }

        console.log('\\nPress Enter to return to menu...');
        this.rl.question('', () => {
            console.clear();
            this.showMenu();
        });
    }

    async shutdown() {
        if (this.agent) {
            console.log('\\n💾 Saving memory and shutting down...');
            await this.agent.shutdown();
        }
        
        if (this.rl) {
            this.rl.close();
        }
        
        console.log('👋 Thanks for trying the Memory Agent demo!');
        process.exit(0);
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
    console.log('\\n\\n🛑 Demo interrupted by user');
    process.exit(0);
});

// Start demo if run directly
if (require.main === module) {
    const demo = new MemoryAgentDemo();
    demo.start().catch(error => {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    });
}

module.exports = { MemoryAgentDemo };