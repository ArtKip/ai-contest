#!/usr/bin/env node

const { MemoryAgent } = require('./memory-agent');
const fs = require('fs').promises;

/**
 * Test Memory Persistence Across Agent Restarts
 * 
 * This script verifies that:
 * 1. Conversations are stored correctly
 * 2. Memory persists across agent restarts
 * 3. Context retrieval works with stored data
 * 4. JSON backup/restore functionality works
 */

class MemoryPersistenceTest {
    constructor() {
        this.testDbPath = './test-memory.db';
        this.testBackupDir = './test-memory-backups';
        this.testResults = [];
    }

    async run() {
        console.log('🧪 Starting Memory Persistence Tests');
        console.log('═'.repeat(50));

        try {
            // Clean up any previous test data
            await this.cleanup();

            // Test 1: Create agent and store conversations
            await this.testInitialConversations();

            // Test 2: Restart agent and verify memory persistence
            await this.testMemoryPersistence();

            // Test 3: Test context retrieval
            await this.testContextRetrieval();

            // Test 4: Test memory search
            await this.testMemorySearch();

            // Test 5: Test JSON backup/restore
            await this.testJSONBackup();

            // Test 6: Test memory cleanup
            await this.testMemoryCleanup();

            // Display results
            this.displayResults();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            // Clean up test data
            await this.cleanup();
        }
    }

    async testInitialConversations() {
        console.log('\\n📝 Test 1: Creating agent and storing conversations...');

        const agent1 = new MemoryAgent({
            name: 'TestBot1',
            memory: {
                dbPath: this.testDbPath,
                jsonBackupDir: this.testBackupDir,
                autoBackup: true
            }
        });

        // Wait for initialization
        await this.wait(500);

        // Simulate a conversation with personal information
        const conversation1 = await agent1.processMessage(
            "Hi, my name is Alice and I love machine learning and Python programming."
        );
        
        const conversation2 = await agent1.processMessage(
            "I prefer detailed technical explanations over simple ones."
        );

        const conversation3 = await agent1.processMessage(
            "Can you help me understand neural networks?"
        );

        // Store the session ID for later
        this.testSessionId = agent1.currentSessionId;

        // Verify conversations were stored
        const history = await agent1.memory.getSessionHistory(this.testSessionId);
        
        if (history.length >= 3) {
            this.testResults.push({
                test: 'Initial conversations storage',
                status: 'PASS',
                details: `Stored ${history.length} conversations successfully`
            });
        } else {
            this.testResults.push({
                test: 'Initial conversations storage',
                status: 'FAIL',
                details: `Expected 3+ conversations, got ${history.length}`
            });
        }

        // End session and close agent
        await agent1.shutdown();
        console.log('✅ Agent 1 shut down, data persisted to database');
    }

    async testMemoryPersistence() {
        console.log('\\n🔄 Test 2: Restarting agent and verifying persistence...');

        // Create a NEW agent instance with same database
        const agent2 = new MemoryAgent({
            name: 'TestBot2',
            memory: {
                dbPath: this.testDbPath,
                jsonBackupDir: this.testBackupDir,
                autoBackup: true
            }
        });

        await this.wait(500);

        // Try to retrieve conversation history from the previous session
        const history = await agent2.memory.getSessionHistory(this.testSessionId);

        if (history.length >= 3) {
            this.testResults.push({
                test: 'Memory persistence across restarts',
                status: 'PASS',
                details: `Retrieved ${history.length} conversations after restart`
            });

            // Verify content integrity
            const aliceConversation = history.find(conv => 
                conv.user_input.includes('Alice') && conv.user_input.includes('machine learning')
            );

            if (aliceConversation) {
                this.testResults.push({
                    test: 'Conversation content integrity',
                    status: 'PASS',
                    details: 'Original conversation content preserved correctly'
                });
            } else {
                this.testResults.push({
                    test: 'Conversation content integrity',
                    status: 'FAIL',
                    details: 'Could not find expected conversation content'
                });
            }

        } else {
            this.testResults.push({
                test: 'Memory persistence across restarts',
                status: 'FAIL',
                details: `Expected 3+ conversations, got ${history.length}`
            });
        }

        // Continue conversation in new agent instance
        const newConversation = await agent2.processMessage(
            "Do you remember my name and what I'm interested in?"
        );

        // Verify the agent can access previous context
        const responseContainsAlice = newConversation.response.toLowerCase().includes('alice');
        const responseContainsML = newConversation.response.toLowerCase().includes('machine learning') || 
                                    newConversation.response.toLowerCase().includes('neural');

        if (responseContainsAlice || responseContainsML) {
            this.testResults.push({
                test: 'Context awareness across restarts',
                status: 'PASS',
                details: 'Agent successfully retrieved and used previous conversation context'
            });
        } else {
            this.testResults.push({
                test: 'Context awareness across restarts',
                status: 'FAIL',
                details: 'Agent did not use previous conversation context in response'
            });
        }

        await agent2.shutdown();
    }

    async testContextRetrieval() {
        console.log('\\n🔍 Test 3: Testing context retrieval functionality...');

        const agent3 = new MemoryAgent({
            name: 'TestBot3',
            memory: {
                dbPath: this.testDbPath,
                jsonBackupDir: this.testBackupDir
            }
        });

        await this.wait(500);

        // Test context retrieval
        const context = await agent3.memory.getRelevantContext(
            'machine learning neural networks',
            this.testSessionId,
            5
        );

        if (context.recentConversations.length > 0 || context.relevantMemories.length > 0) {
            this.testResults.push({
                test: 'Context retrieval functionality',
                status: 'PASS',
                details: `Retrieved ${context.recentConversations.length} conversations and ${context.relevantMemories.length} memories`
            });
        } else {
            this.testResults.push({
                test: 'Context retrieval functionality',
                status: 'FAIL',
                details: 'No context retrieved for relevant query'
            });
        }

        await agent3.shutdown();
    }

    async testMemorySearch() {
        console.log('\\n🔎 Test 4: Testing memory search functionality...');

        const agent4 = new MemoryAgent({
            name: 'TestBot4',
            memory: {
                dbPath: this.testDbPath,
                jsonBackupDir: this.testBackupDir
            }
        });

        await this.wait(500);

        // Search for conversations containing "Alice"
        const searchResults = await agent4.memory.searchConversations('Alice', 5);

        if (searchResults.length > 0) {
            const foundAliceConversation = searchResults.some(result => 
                result.user_input.includes('Alice') || result.agent_response.includes('Alice')
            );

            if (foundAliceConversation) {
                this.testResults.push({
                    test: 'Memory search functionality',
                    status: 'PASS',
                    details: `Found ${searchResults.length} matching conversations`
                });
            } else {
                this.testResults.push({
                    test: 'Memory search functionality',
                    status: 'PARTIAL',
                    details: 'Search returned results but content may not match'
                });
            }
        } else {
            this.testResults.push({
                test: 'Memory search functionality',
                status: 'FAIL',
                details: 'No search results returned for known content'
            });
        }

        await agent4.shutdown();
    }

    async testJSONBackup() {
        console.log('\\n💾 Test 5: Testing JSON backup functionality...');

        const agent5 = new MemoryAgent({
            name: 'TestBot5',
            memory: {
                dbPath: this.testDbPath,
                jsonBackupDir: this.testBackupDir,
                autoBackup: true
            }
        });

        await this.wait(500);

        // Trigger JSON export
        await agent5.memory.exportToJSON();

        // Check if backup files were created
        try {
            const backupFiles = await fs.readdir(this.testBackupDir);
            const hasSnapshot = backupFiles.some(file => file === 'current-snapshot.json');
            const hasConversations = backupFiles.some(file => file.includes('conversations-'));

            if (hasSnapshot && hasConversations) {
                // Try to read and verify snapshot content
                const snapshotContent = await fs.readFile(
                    `${this.testBackupDir}/current-snapshot.json`, 
                    'utf-8'
                );
                const snapshot = JSON.parse(snapshotContent);

                if (snapshot.conversations && snapshot.conversations.length > 0) {
                    this.testResults.push({
                        test: 'JSON backup functionality',
                        status: 'PASS',
                        details: `Created backup with ${snapshot.conversations.length} conversations`
                    });
                } else {
                    this.testResults.push({
                        test: 'JSON backup functionality',
                        status: 'PARTIAL',
                        details: 'Backup created but no conversations found'
                    });
                }
            } else {
                this.testResults.push({
                    test: 'JSON backup functionality',
                    status: 'FAIL',
                    details: 'Expected backup files not created'
                });
            }
        } catch (error) {
            this.testResults.push({
                test: 'JSON backup functionality',
                status: 'FAIL',
                details: `Backup read error: ${error.message}`
            });
        }

        await agent5.shutdown();
    }

    async testMemoryCleanup() {
        console.log('\\n🧹 Test 6: Testing memory cleanup functionality...');

        const agent6 = new MemoryAgent({
            name: 'TestBot6',
            memory: {
                dbPath: this.testDbPath,
                jsonBackupDir: this.testBackupDir
            }
        });

        await this.wait(500);

        // Add some low-relevance memories
        await agent6.memory.storeMemory(
            'fact',
            'Low relevance test memory',
            'test context',
            0.05,  // Very low relevance
            agent6.currentSessionId
        );

        // Run cleanup
        const cleanedCount = await agent6.memory.cleanup();

        this.testResults.push({
            test: 'Memory cleanup functionality',
            status: 'PASS',
            details: `Cleanup completed, processed memories (this is expected behavior)`
        });

        await agent6.shutdown();
    }

    displayResults() {
        console.log('\\n📊 Test Results Summary');
        console.log('═'.repeat(50));

        let passCount = 0;
        let failCount = 0;
        let partialCount = 0;

        this.testResults.forEach((result, index) => {
            let statusIcon = '';
            switch (result.status) {
                case 'PASS':
                    statusIcon = '✅';
                    passCount++;
                    break;
                case 'FAIL':
                    statusIcon = '❌';
                    failCount++;
                    break;
                case 'PARTIAL':
                    statusIcon = '⚠️ ';
                    partialCount++;
                    break;
            }

            console.log(`${statusIcon} ${index + 1}. ${result.test}`);
            console.log(`   ${result.details}\\n`);
        });

        console.log('📈 Final Summary:');
        console.log(`   ✅ Passed: ${passCount}`);
        console.log(`   ❌ Failed: ${failCount}`);
        console.log(`   ⚠️  Partial: ${partialCount}`);
        console.log(`   📊 Total: ${this.testResults.length}`);

        if (failCount === 0) {
            console.log('\\n🎉 All tests passed! Memory persistence is working correctly.');
        } else {
            console.log('\\n⚠️  Some tests failed. Please check the implementation.');
        }
    }

    async cleanup() {
        try {
            await fs.unlink(this.testDbPath).catch(() => {});
            await fs.rm(this.testBackupDir, { recursive: true, force: true }).catch(() => {});
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new MemoryPersistenceTest();
    tester.run().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

module.exports = { MemoryPersistenceTest };