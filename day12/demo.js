#!/usr/bin/env node

const { VoiceAgent } = require('./voice-agent');
const readline = require('readline');

/**
 * Voice Agent Demo
 * 
 * Interactive demo showcasing the speech-to-text → LLM → text pipeline
 * with various query types and real-world scenarios.
 */

class VoiceAgentDemo {
    constructor() {
        this.agent = new VoiceAgent({
            name: 'DemoVoiceBot',
            personality: {
                helpful: 0.9,
                conversational: 0.8,
                precise: 0.7,
                friendly: 0.9
            }
        });
        
        this.rl = null;
        this.demoMode = 'interactive';
    }

    async start() {
        console.log('🎤 Voice Agent Demo - Day 12');
        console.log('═'.repeat(50));
        console.log('Showcasing Speech → LLM → Text Response Pipeline');
        console.log('Test various voice commands and see intelligent responses!\\n');

        this.setupReadline();
        await this.showMenu();
    }

    setupReadline() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async showMenu() {
        console.log('Choose a demo mode:');
        console.log('1. 🎯 Run automated demo scenarios');
        console.log('2. 💬 Interactive text simulation (simulates voice input)');
        console.log('3. 🧪 Run comprehensive tests');
        console.log('4. 🌐 Start web interface');
        console.log('5. 📊 Show example responses');
        console.log('6. ❌ Exit\\n');

        this.rl.question('Select an option (1-6): ', async (choice) => {
            switch (choice.trim()) {
                case '1':
                    await this.runAutomatedDemo();
                    break;
                case '2':
                    await this.runInteractiveDemo();
                    break;
                case '3':
                    await this.runComprehensiveTests();
                    break;
                case '4':
                    await this.startWebInterface();
                    break;
                case '5':
                    await this.showExampleResponses();
                    break;
                case '6':
                    console.log('👋 Thanks for trying the Voice Agent demo!');
                    process.exit(0);
                    break;
                default:
                    console.log('Invalid choice. Please try again.\\n');
                    await this.showMenu();
            }
        });
    }

    async runAutomatedDemo() {
        console.log('\\n🎯 Automated Voice Agent Demo');
        console.log('═'.repeat(50));
        console.log('Simulating various voice commands and showing responses...\\n');

        const demoScenarios = [
            {
                category: '🧮 Mathematical Calculations',
                commands: [
                    "Calculate 25 times 37",
                    "What's the square root of 144?",
                    "Add 123 and 456",
                    "What is 15 plus 28?"
                ]
            },
            {
                category: '📚 Definitions and Knowledge',
                commands: [
                    "Define artificial intelligence",
                    "What is machine learning?",
                    "Explain quantum computing",
                    "Tell me about blockchain"
                ]
            },
            {
                category: '😄 Entertainment and Jokes',
                commands: [
                    "Tell me a joke",
                    "Make me laugh",
                    "Give me something funny"
                ]
            },
            {
                category: '❓ Questions and Conversation',
                commands: [
                    "How are you today?",
                    "What can you do?",
                    "What time is it?",
                    "Can you help me?"
                ]
            },
            {
                category: '🎛️ Commands and Control',
                commands: [
                    "Help",
                    "Show me history",
                    "What are your capabilities?"
                ]
            }
        ];

        for (const scenario of demoScenarios) {
            console.log(`${scenario.category}`);
            console.log('─'.repeat(40));
            
            for (const command of scenario.commands) {
                console.log(`\\n🎙️ Voice Input: "${command}"`);
                
                try {
                    const result = await this.agent.processVoiceInput(command);
                    
                    if (result.success) {
                        console.log(`🤖 Response: ${result.response}`);
                        console.log(`   📊 Intent: ${result.analysis?.intent} | Confidence: ${Math.round((result.analysis?.confidence || 0) * 100)}% | Time: ${result.processingTime}ms`);
                    } else {
                        console.log(`❌ Error: ${result.error}`);
                    }
                    
                    await this.wait(1500);
                } catch (error) {
                    console.log(`❌ Processing failed: ${error.message}`);
                }
            }
            
            console.log('\\n');
        }

        // Show final statistics
        const stats = this.agent.getStats();
        console.log('📈 Demo Statistics:');
        console.log(`   Total voice commands processed: ${stats.totalConversations}`);
        console.log(`   Average response time: ${stats.averageProcessingTime}ms`);
        console.log(`   Intent breakdown:`);
        Object.entries(stats.intentBreakdown).forEach(([intent, count]) => {
            console.log(`     ${intent}: ${count}`);
        });

        await this.returnToMenu();
    }

    async runInteractiveDemo() {
        console.log('\\n💬 Interactive Voice Simulation');
        console.log('═'.repeat(50));
        console.log('Type commands as if you were speaking them to the voice agent.');
        console.log('The agent will process them through the LLM pipeline.\\n');
        
        console.log('💡 Try these examples:');
        console.log('   • "Calculate 15 times 8"');
        console.log('   • "Define machine learning"');
        console.log('   • "Tell me a joke"');
        console.log('   • "What can you do?"');
        console.log('   • "What time is it?"');
        console.log('\\nType "menu" to return to main menu, "quit" to exit\\n');

        await this.startInteractiveChat();
    }

    async startInteractiveChat() {
        this.rl.question('🎙️ Voice Input: ', async (input) => {
            const command = input.trim();

            if (command.toLowerCase() === 'quit') {
                console.log('👋 Voice Agent demo ended!');
                process.exit(0);
            }

            if (command.toLowerCase() === 'menu') {
                console.clear();
                await this.showMenu();
                return;
            }

            if (command === '') {
                await this.startInteractiveChat();
                return;
            }

            try {
                const startTime = Date.now();
                console.log('🤖 Processing...');
                
                const result = await this.agent.processVoiceInput(command);
                const endTime = Date.now();
                
                if (result.success) {
                    console.log(`\\n🤖 Voice Agent: ${result.response}`);
                    console.log(`   📊 Analysis: ${result.analysis?.intent} | Confidence: ${Math.round((result.analysis?.confidence || 0) * 100)}% | Time: ${endTime - startTime}ms\\n`);
                } else {
                    console.log(`\\n❌ Error: ${result.error}\\n`);
                }
            } catch (error) {
                console.log(`\\n❌ Processing failed: ${error.message}\\n`);
            }

            await this.startInteractiveChat();
        });
    }

    async runComprehensiveTests() {
        console.log('\\n🧪 Running Comprehensive Voice Agent Tests');
        console.log('═'.repeat(50));
        
        const { VoiceAgentTester } = require('./test-voice-agent');
        const tester = new VoiceAgentTester();
        await tester.runAllTests();
        
        await this.returnToMenu();
    }

    async startWebInterface() {
        console.log('\\n🌐 Starting Voice Agent Web Interface...');
        console.log('═'.repeat(50));
        
        const { VoiceAgentServer } = require('./server');
        const server = new VoiceAgentServer(3000);
        
        console.log('🚀 Web interface will open on http://localhost:3000');
        console.log('🎤 Features available:');
        console.log('   • Real browser microphone input');
        console.log('   • Speech-to-text processing');
        console.log('   • Live audio visualization');
        console.log('   • Conversation history');
        console.log('   • Voice command examples');
        console.log('\\nPress Ctrl+C to stop the server and return to demo\\n');
        
        try {
            server.start();
        } catch (error) {
            console.error('❌ Failed to start web server:', error.message);
            await this.returnToMenu();
        }
    }

    async showExampleResponses() {
        console.log('\\n📊 Example Voice Agent Responses');
        console.log('═'.repeat(50));
        console.log('Here are examples of how the agent responds to different types of voice input:\\n');

        const examples = [
            {
                category: 'Calculations',
                input: 'Calculate 15 times 8',
                expectedType: 'Precise mathematical answer'
            },
            {
                category: 'Definitions',
                input: 'Define machine learning',
                expectedType: 'Educational explanation'
            },
            {
                category: 'Entertainment',
                input: 'Tell me a joke',
                expectedType: 'Programming humor'
            },
            {
                category: 'Time Query',
                input: 'What time is it?',
                expectedType: 'Current time and date'
            },
            {
                category: 'Capabilities',
                input: 'What can you do?',
                expectedType: 'Feature overview'
            }
        ];

        for (const example of examples) {
            console.log(`📂 ${example.category}`);
            console.log(`🎙️ Input: "${example.input}"`);
            console.log(`🎯 Expected: ${example.expectedType}`);
            
            try {
                const result = await this.agent.processVoiceInput(example.input);
                
                if (result.success) {
                    console.log(`🤖 Actual Response: "${result.response}"`);
                    console.log(`📊 Analysis: ${result.analysis?.intent} | Confidence: ${Math.round((result.analysis?.confidence || 0) * 100)}%`);
                } else {
                    console.log(`❌ Error: ${result.error}`);
                }
            } catch (error) {
                console.log(`❌ Failed: ${error.message}`);
            }
            
            console.log('─'.repeat(50));
            console.log('');
            
            await this.wait(1000);
        }

        await this.returnToMenu();
    }

    async returnToMenu() {
        console.log('\\nPress Enter to return to main menu...');
        this.rl.question('', () => {
            console.clear();
            this.showMenu();
        });
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\\n\\n🛑 Demo interrupted');
    console.log('👋 Thanks for trying the Voice Agent!');
    process.exit(0);
});

// Start demo if run directly
if (require.main === module) {
    const demo = new VoiceAgentDemo();
    demo.start().catch(error => {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    });
}

module.exports = { VoiceAgentDemo };