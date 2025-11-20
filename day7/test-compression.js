/**
 * Test script for Day 7 - Dialogue Compression
 *
 * This script tests the compression mechanism by simulating a conversation
 * and verifying that compression occurs correctly.
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3007';
const API_KEY = process.env.ANTHROPIC_API_KEY;

// Test messages to simulate a conversation
const TEST_MESSAGES = [
    "Hi, I'm planning a trip to Japan. Can you help me?",
    "What's the best time to visit Tokyo?",
    "What are the must-see attractions in Tokyo?",
    "How much does a typical meal cost in Japan?",
    "Should I get a JR Pass?",
    "What are some good day trips from Tokyo?",
    "How do I navigate the subway system?",
    "What's the etiquette for visiting temples?",
    "Are credit cards widely accepted?",
    "What should I pack for a spring visit?",
    // These messages should trigger compression
    "Can you summarize the key points about my trip planning so far?",
    "What else should I know before my trip?"
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompressionSystem() {
    console.log('🧪 Starting Dialogue Compression Test\n');
    console.log('=' .repeat(60));

    if (!API_KEY) {
        console.error('❌ Error: ANTHROPIC_API_KEY not set');
        console.log('\nPlease set your API key:');
        console.log('  export ANTHROPIC_API_KEY="your_key_here"');
        console.log('Or create a .env file with:');
        console.log('  ANTHROPIC_API_KEY=your_key_here');
        return;
    }

    try {
        // Step 1: Check server health
        console.log('\n📡 Step 1: Checking server status...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`);

        if (!healthResponse.data.hasApiKey) {
            console.error('❌ Server has no API key configured');
            return;
        }

        console.log('✅ Server is healthy');
        console.log(`   Active sessions: ${healthResponse.data.activeSessions}`);
        console.log(`   Compression threshold: ${healthResponse.data.compressionConfig.messagesBeforeCompression} messages`);

        // Step 2: Create a session
        console.log('\n📝 Step 2: Creating conversation session...');
        const sessionResponse = await axios.post(`${BASE_URL}/api/session/create`);
        const sessionId = sessionResponse.data.sessionId;
        console.log(`✅ Session created: ${sessionId}`);

        // Step 3: Send messages and track compression
        console.log('\n💬 Step 3: Sending test messages...');
        console.log(`   Sending ${TEST_MESSAGES.length} messages to test compression\n`);

        let compressionOccurred = false;
        let totalTokensSaved = 0;
        const stats = {
            messagesSent: 0,
            compressions: 0,
            totalResponseTime: 0
        };

        for (let i = 0; i < TEST_MESSAGES.length; i++) {
            const message = TEST_MESSAGES[i];
            console.log(`   [${i + 1}/${TEST_MESSAGES.length}] Sending: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

            try {
                const chatResponse = await axios.post(`${BASE_URL}/api/chat`, {
                    sessionId: sessionId,
                    message: message,
                    useCompression: true
                });

                stats.messagesSent++;
                stats.totalResponseTime += chatResponse.data.responseTime;

                // Check if compression occurred
                if (chatResponse.data.compressionOccurred) {
                    compressionOccurred = true;
                    stats.compressions++;
                    const info = chatResponse.data.compressionInfo;

                    console.log('\n   🗜️  COMPRESSION TRIGGERED!');
                    console.log(`       Messages compressed: ${info.messagesCompressed}`);
                    console.log(`       Tokens before: ${info.tokensBeforeCompression}`);
                    console.log(`       Tokens after: ${info.tokensAfterCompression}`);
                    console.log(`       Tokens saved: ${info.tokensSaved}`);
                    console.log(`       Reduction: ${Math.round((info.tokensSaved / info.tokensBeforeCompression) * 100)}%\n`);

                    totalTokensSaved += info.tokensSaved;
                }

                // Brief pause between messages to avoid rate limiting
                await sleep(500);

            } catch (error) {
                console.error(`   ❌ Failed to send message: ${error.message}`);
                if (error.response?.data) {
                    console.error(`      Server error: ${JSON.stringify(error.response.data)}`);
                }
            }
        }

        // Step 4: Get final session stats
        console.log('\n📊 Step 4: Retrieving final statistics...');
        const sessionInfoResponse = await axios.get(`${BASE_URL}/api/session/${sessionId}`);
        const sessionInfo = sessionInfoResponse.data.session;

        console.log('✅ Session statistics:');
        console.log(`   Total messages: ${sessionInfo.stats.totalMessages}`);
        console.log(`   Compressions: ${sessionInfo.stats.totalCompressions}`);
        console.log(`   Tokens saved: ${sessionInfo.stats.tokensSaved}`);
        console.log(`   Avg response time: ${Math.round(stats.totalResponseTime / stats.messagesSent)}ms`);

        // Step 5: Compare compressed vs full history
        console.log('\n📈 Step 5: Comparing compressed vs full history...');
        const compareResponse = await axios.get(`${BASE_URL}/api/session/${sessionId}/compare`);
        const comparison = compareResponse.data.comparison;

        console.log('✅ Comparison results:');
        console.log('\n   Full History:');
        console.log(`     Messages: ${comparison.full.messageCount}`);
        console.log(`     Characters: ${comparison.full.characterCount}`);
        console.log(`     Estimated tokens: ${comparison.full.estimatedTokens}`);

        console.log('\n   Compressed History:');
        console.log(`     Messages: ${comparison.compressed.messageCount}`);
        console.log(`     Characters: ${comparison.compressed.characterCount}`);
        console.log(`     Estimated tokens: ${comparison.compressed.estimatedTokens}`);

        console.log('\n   Savings:');
        console.log(`     Messages reduced: ${comparison.savings.messageReduction}`);
        console.log(`     Characters reduced: ${comparison.savings.characterReduction}`);
        console.log(`     Tokens saved: ${comparison.savings.estimatedTokenReduction}`);
        console.log(`     Percentage saved: ${comparison.savings.percentageSaved}%`);

        // Step 6: Summary
        console.log('\n' + '=' .repeat(60));
        console.log('📋 TEST SUMMARY');
        console.log('=' .repeat(60));

        if (compressionOccurred) {
            console.log('✅ SUCCESS: Compression system working correctly!');
            console.log(`   • ${stats.compressions} compression(s) occurred`);
            console.log(`   • ${totalTokensSaved} total tokens saved`);
            console.log(`   • ${comparison.savings.percentageSaved}% token reduction achieved`);
        } else {
            console.log('⚠️  WARNING: No compression occurred');
            console.log(`   • Sent ${stats.messagesSent} messages (threshold: 10)`);
            console.log('   • May need to send more messages to trigger compression');
        }

        console.log('\n🎉 Test completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('   1. Open http://localhost:3007 in your browser');
        console.log('   2. Start a conversation and watch compression in action');
        console.log('   3. Toggle compression on/off to compare behavior');
        console.log('   4. View the Analytics panel for real-time stats');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Server not running. Start it with:');
            console.log('   npm start');
        } else if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

// Run the test
console.log('🚀 Day 7 - Dialogue Compression Test Suite');
console.log('Testing compression mechanism with simulated conversation\n');

testCompressionSystem().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

