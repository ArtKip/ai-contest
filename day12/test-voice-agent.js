#!/usr/bin/env node

const { VoiceAgent } = require('./voice-agent');

/**
 * Test Suite for Voice Agent
 * 
 * Tests the speech-to-text → LLM → text response pipeline
 * with various query types and scenarios.
 */

class VoiceAgentTester {
    constructor() {
        this.agent = new VoiceAgent({
            name: 'TestVoiceAgent',
            personality: {
                helpful: 0.9,
                conversational: 0.8,
                precise: 0.7,
                friendly: 0.9
            }
        });
        
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Voice Agent Test Suite');
        console.log('═'.repeat(50));
        
        try {
            // Test different query types
            await this.testCalculations();
            await this.testDefinitions();
            await this.testJokes();
            await this.testQuestions();
            await this.testCommands();
            await this.testGeneralConversation();
            
            // Test edge cases
            await this.testEdgeCases();
            
            // Performance test
            await this.testPerformance();
            
            // Display results
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        }
    }

    async testCalculations() {
        console.log('\\n🧮 Testing Mathematical Calculations...');
        
        const testCases = [
            {
                input: "Calculate 25 times 37",
                expectContains: ["925", "answer"],
                description: "Basic multiplication"
            },
            {
                input: "What's the square root of 144?",
                expectContains: ["12", "square root"],
                description: "Square root calculation"
            },
            {
                input: "Add 123 and 456",
                expectContains: ["579", "answer"],
                description: "Addition"
            },
            {
                input: "What is 100 divided by 5?",
                expectContains: ["20", "answer"],
                description: "Division"
            },
            {
                input: "15 plus 28 equals what?",
                expectContains: ["43"],
                description: "Natural language math"
            }
        ];

        await this.runTestCases(testCases, 'calculation');
    }

    async testDefinitions() {
        console.log('\\n📚 Testing Definitions and Explanations...');
        
        const testCases = [
            {
                input: "Define artificial intelligence",
                expectContains: ["artificial", "intelligence", "simulation"],
                description: "AI definition"
            },
            {
                input: "What is machine learning?",
                expectContains: ["machine", "learning", "computer"],
                description: "ML definition"
            },
            {
                input: "Explain quantum computing",
                expectContains: ["quantum", "computing"],
                description: "Quantum computing explanation"
            },
            {
                input: "Tell me about blockchain",
                expectContains: ["blockchain", "distributed"],
                description: "Blockchain explanation"
            },
            {
                input: "What does API mean?",
                expectContains: ["API", "interface"],
                description: "API definition"
            }
        ];

        await this.runTestCases(testCases, 'definition');
    }

    async testJokes() {
        console.log('\\n😄 Testing Jokes and Entertainment...');
        
        const testCases = [
            {
                input: "Tell me a joke",
                expectContains: ["?", "!"],
                description: "Basic joke request"
            },
            {
                input: "Make me laugh",
                expectContains: ["program", "bug", "code"],
                description: "Humor request"
            },
            {
                input: "Give me something funny",
                expectContains: ["program", "Java", "C#"],
                description: "Programming humor"
            }
        ];

        await this.runTestCases(testCases, 'entertainment');
    }

    async testQuestions() {
        console.log('\\n❓ Testing Questions and Inquiries...');
        
        const testCases = [
            {
                input: "How are you today?",
                expectContains: ["great", "help", "ready"],
                description: "Greeting question"
            },
            {
                input: "What can you do?",
                expectContains: ["calculations", "definitions", "jokes"],
                description: "Capability inquiry"
            },
            {
                input: "What time is it?",
                expectContains: ["time", "date"],
                description: "Time inquiry"
            },
            {
                input: "Can you help me?",
                expectContains: ["help", "assist"],
                description: "Help request"
            }
        ];

        await this.runTestCases(testCases, 'question');
    }

    async testCommands() {
        console.log('\\n🎛️ Testing Commands...');
        
        const testCases = [
            {
                input: "Help",
                expectContains: ["VoiceAgent", "calculations", "definitions"],
                description: "Help command"
            },
            {
                input: "Clear history",
                expectContains: ["cleared", "talk"],
                description: "Clear command"
            },
            {
                input: "Show me history",
                expectContains: ["conversation", "history"],
                description: "History command"
            }
        ];

        await this.runTestCases(testCases, 'command');
    }

    async testGeneralConversation() {
        console.log('\\n💬 Testing General Conversation...');
        
        const testCases = [
            {
                input: "Hello there",
                expectContains: ["help", "conversation"],
                description: "General greeting"
            },
            {
                input: "That's interesting",
                expectContains: ["interesting", "more"],
                description: "Conversational response"
            },
            {
                input: "I'm working on a project",
                expectContains: ["help", "assist"],
                description: "Context sharing"
            }
        ];

        await this.runTestCases(testCases, 'general');
    }

    async testEdgeCases() {
        console.log('\\n🔍 Testing Edge Cases...');
        
        const testCases = [
            {
                input: "",
                expectContains: ["help", "assist"],
                description: "Empty input"
            },
            {
                input: "sdlkfjslkdfj random nonsense",
                expectContains: ["conversation", "help"],
                description: "Random nonsense"
            },
            {
                input: "Calculate impossible math equation",
                expectContains: ["calculation", "help"],
                description: "Invalid math"
            }
        ];

        await this.runTestCases(testCases, 'edge_case');
    }

    async testPerformance() {
        console.log('\\n⚡ Testing Performance...');
        
        const testInput = "Calculate 15 times 8";
        const iterations = 10;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            await this.agent.processVoiceInput(testInput);
            const endTime = Date.now();
            times.push(endTime - startTime);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);
        
        console.log(`   ⏱️ Average response time: ${Math.round(avgTime)}ms`);
        console.log(`   📊 Min: ${minTime}ms, Max: ${maxTime}ms`);
        
        this.testResults.push({
            category: 'performance',
            test: 'Response time performance',
            status: avgTime < 100 ? 'PASS' : 'SLOW',
            details: `Average: ${Math.round(avgTime)}ms`
        });
    }

    async runTestCases(testCases, category) {
        for (const testCase of testCases) {
            try {
                const result = await this.agent.processVoiceInput(testCase.input);
                
                if (result.success) {
                    const response = result.response.toLowerCase();
                    const hasExpectedContent = testCase.expectContains.some(term => 
                        response.includes(term.toLowerCase())
                    );
                    
                    const status = hasExpectedContent ? 'PASS' : 'PARTIAL';
                    console.log(`   ${status === 'PASS' ? '✅' : '⚠️ '} ${testCase.description}: ${status}`);
                    
                    this.testResults.push({
                        category,
                        test: testCase.description,
                        input: testCase.input,
                        response: result.response,
                        intent: result.analysis?.intent,
                        status,
                        processingTime: result.processingTime
                    });
                } else {
                    console.log(`   ❌ ${testCase.description}: FAIL - ${result.error}`);
                    this.testResults.push({
                        category,
                        test: testCase.description,
                        status: 'FAIL',
                        error: result.error
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ ${testCase.description}: ERROR - ${error.message}`);
                this.testResults.push({
                    category,
                    test: testCase.description,
                    status: 'ERROR',
                    error: error.message
                });
            }
        }
    }

    displayResults() {
        console.log('\\n📊 Test Results Summary');
        console.log('═'.repeat(50));
        
        const categories = {};
        let totalTests = 0;
        let passedTests = 0;
        let partialTests = 0;
        let failedTests = 0;
        
        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { pass: 0, partial: 0, fail: 0, total: 0 };
            }
            
            categories[result.category].total++;
            totalTests++;
            
            switch (result.status) {
                case 'PASS':
                    categories[result.category].pass++;
                    passedTests++;
                    break;
                case 'PARTIAL':
                    categories[result.category].partial++;
                    partialTests++;
                    break;
                default:
                    categories[result.category].fail++;
                    failedTests++;
                    break;
            }
        });
        
        // Display by category
        Object.entries(categories).forEach(([category, stats]) => {
            console.log(`\\n📂 ${category.toUpperCase()}:`);
            console.log(`   ✅ Pass: ${stats.pass}/${stats.total}`);
            console.log(`   ⚠️ Partial: ${stats.partial}/${stats.total}`);
            console.log(`   ❌ Fail: ${stats.fail}/${stats.total}`);
        });
        
        // Overall summary
        console.log('\\n🎯 Overall Results:');
        console.log(`   ✅ Passed: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
        console.log(`   ⚠️ Partial: ${partialTests}/${totalTests} (${Math.round(partialTests/totalTests*100)}%)`);
        console.log(`   ❌ Failed: ${failedTests}/${totalTests} (${Math.round(failedTests/totalTests*100)}%)`);
        
        // Agent statistics
        const agentStats = this.agent.getStats();
        console.log('\\n📈 Agent Statistics:');
        console.log(`   Total conversations: ${agentStats.totalConversations}`);
        console.log(`   Average processing time: ${agentStats.averageProcessingTime}ms`);
        console.log(`   Intent breakdown:`);
        Object.entries(agentStats.intentBreakdown).forEach(([intent, count]) => {
            console.log(`     ${intent}: ${count}`);
        });
        
        if (failedTests === 0 && partialTests < totalTests * 0.2) {
            console.log('\\n🎉 Voice Agent is working excellently!');
        } else if (failedTests < totalTests * 0.1) {
            console.log('\\n✅ Voice Agent is working well with minor issues.');
        } else {
            console.log('\\n⚠️ Voice Agent needs attention - some functionality may not be working correctly.');
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new VoiceAgentTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

module.exports = { VoiceAgentTester };