/**
 * Demo script comparing compressed vs non-compressed dialogue
 *
 * This script runs the same conversation twice:
 * 1. With compression enabled
 * 2. Without compression
 *
 * Then compares the results to show the benefits of compression.
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3007';

// Conversation to test with
const CONVERSATION = [
    "What is artificial intelligence?",
    "What are the main types of AI?",
    "Explain machine learning in simple terms",
    "What's the difference between supervised and unsupervised learning?",
    "What are neural networks?",
    "How do deep learning models work?",
    "What is natural language processing?",
    "What are transformers in AI?",
    "Explain what GPT models do",
    "What are the ethical concerns with AI?",
    "How can AI be used in healthcare?",
    "What is the future of AI?",
    "Can you summarize what we've discussed about AI?",
    "What should someone learn first if they want to study AI?"
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runConversation(useCompression) {
    const mode = useCompression ? 'COMPRESSED' : 'FULL';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running conversation in ${mode} mode`);
    console.log('='.repeat(60));

    // Create session
    const sessionResponse = await axios.post(`${BASE_URL}/api/session/create`);
    const sessionId = sessionResponse.data.sessionId;
    console.log(`Session created: ${sessionId}`);

    const results = {
        mode: mode,
        sessionId: sessionId,
        messagesProcessed: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalResponseTime: 0,
        compressionEvents: 0,
        tokensSaved: 0
    };

    // Send messages
    for (let i = 0; i < CONVERSATION.length; i++) {
        const message = CONVERSATION[i];
        process.stdout.write(`\r[${i + 1}/${CONVERSATION.length}] Processing messages...`);

        try {
            const response = await axios.post(`${BASE_URL}/api/chat`, {
                sessionId: sessionId,
                message: message,
                useCompression: useCompression
            });

            results.messagesProcessed++;
            results.totalInputTokens += response.data.usage.input_tokens;
            results.totalOutputTokens += response.data.usage.output_tokens;
            results.totalResponseTime += response.data.responseTime;

            if (response.data.compressionOccurred) {
                results.compressionEvents++;
                results.tokensSaved += response.data.compressionInfo.tokensSaved;
            }

            await sleep(500); // Rate limiting
        } catch (error) {
            console.error(`\n❌ Error processing message ${i + 1}:`, error.message);
        }
    }

    console.log('\r' + ' '.repeat(50) + '\r'); // Clear progress line

    // Get final comparison
    const compareResponse = await axios.get(`${BASE_URL}/api/session/${sessionId}/compare`);
    results.comparison = compareResponse.data.comparison;

    return results;
}

async function main() {
    console.log('🔬 Dialogue Compression Comparison Demo');
    console.log('=' .repeat(60));
    console.log(`Testing with ${CONVERSATION.length} messages`);

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('\n❌ Error: ANTHROPIC_API_KEY not set');
        console.log('Please set your API key in .env file or environment variable');
        return;
    }

    try {
        // Check server
        await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Server is ready\n');
    } catch (error) {
        console.error('❌ Server not available. Please start it with: npm start');
        return;
    }

    try {
        // Run both modes
        console.log('\n🔄 Phase 1: Running with COMPRESSION enabled...');
        const compressedResults = await runConversation(true);

        console.log('\n🔄 Phase 2: Running WITHOUT compression...');
        const fullResults = await runConversation(false);

        // Display comparison
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 COMPARISON RESULTS');
        console.log('='.repeat(60));

        console.log('\n📈 Message Processing:');
        console.log(`   Compressed Mode: ${compressedResults.messagesProcessed} messages`);
        console.log(`   Full Mode:       ${fullResults.messagesProcessed} messages`);

        console.log('\n🪙 Token Usage:');
        const compressedTotal = compressedResults.totalInputTokens + compressedResults.totalOutputTokens;
        const fullTotal = fullResults.totalInputTokens + fullResults.totalOutputTokens;
        const tokenSavings = fullTotal - compressedTotal;
        const percentSaved = ((tokenSavings / fullTotal) * 100).toFixed(2);

        console.log(`   Compressed Mode:`);
        console.log(`     Input tokens:  ${compressedResults.totalInputTokens}`);
        console.log(`     Output tokens: ${compressedResults.totalOutputTokens}`);
        console.log(`     Total tokens:  ${compressedTotal}`);

        console.log(`   Full Mode:`);
        console.log(`     Input tokens:  ${fullResults.totalInputTokens}`);
        console.log(`     Output tokens: ${fullResults.totalOutputTokens}`);
        console.log(`     Total tokens:  ${fullTotal}`);

        console.log(`\n   💰 Savings:`);
        console.log(`     Tokens saved:  ${tokenSavings}`);
        console.log(`     Percentage:    ${percentSaved}%`);

        // Cost estimation (using Haiku pricing as example)
        const inputCostPer1M = 0.25;  // $0.25 per 1M input tokens
        const outputCostPer1M = 1.25; // $1.25 per 1M output tokens

        const compressedCost = (
            (compressedResults.totalInputTokens / 1000000) * inputCostPer1M +
            (compressedResults.totalOutputTokens / 1000000) * outputCostPer1M
        );

        const fullCost = (
            (fullResults.totalInputTokens / 1000000) * inputCostPer1M +
            (fullResults.totalOutputTokens / 1000000) * outputCostPer1M
        );

        console.log(`\n💵 Estimated Cost (Claude Haiku rates):`);
        console.log(`   Compressed Mode: $${compressedCost.toFixed(4)}`);
        console.log(`   Full Mode:       $${fullCost.toFixed(4)}`);
        console.log(`   Cost Savings:    $${(fullCost - compressedCost).toFixed(4)} (${percentSaved}%)`);

        console.log('\n⏱️  Performance:');
        const compressedAvg = Math.round(compressedResults.totalResponseTime / compressedResults.messagesProcessed);
        const fullAvg = Math.round(fullResults.totalResponseTime / fullResults.messagesProcessed);

        console.log(`   Compressed Mode:`);
        console.log(`     Total time:    ${compressedResults.totalResponseTime}ms`);
        console.log(`     Avg per msg:   ${compressedAvg}ms`);

        console.log(`   Full Mode:`);
        console.log(`     Total time:    ${fullResults.totalResponseTime}ms`);
        console.log(`     Avg per msg:   ${fullAvg}ms`);

        if (compressedAvg < fullAvg) {
            console.log(`\n     ⚡ Compressed is ${fullAvg - compressedAvg}ms faster per message`);
        } else {
            console.log(`\n     ⚡ Full is ${compressedAvg - fullAvg}ms faster per message`);
        }

        console.log('\n🗜️  Compression Events:');
        console.log(`   Compressions triggered: ${compressedResults.compressionEvents}`);
        console.log(`   Tokens saved directly:  ${compressedResults.tokensSaved}`);

        console.log('\n📦 History Size:');
        if (compressedResults.comparison && fullResults.comparison) {
            console.log(`   Compressed History:`);
            console.log(`     Messages:    ${compressedResults.comparison.compressed.messageCount}`);
            console.log(`     Est. Tokens: ${compressedResults.comparison.compressed.estimatedTokens}`);

            console.log(`   Full History:`);
            console.log(`     Messages:    ${fullResults.comparison.full.messageCount}`);
            console.log(`     Est. Tokens: ${fullResults.comparison.full.estimatedTokens}`);
        }

        // Quality note
        console.log('\n💡 Quality Assessment:');
        console.log('   Both conversations received the same messages.');
        console.log('   The compressed version maintained context through summaries.');
        console.log('   Check the web UI to review actual responses and verify quality.');

        // Recommendations
        console.log('\n✨ Recommendations:');
        if (tokenSavings > 0) {
            console.log('   ✅ Compression is EFFECTIVE for this conversation length');
            console.log(`   ✅ Saved ${percentSaved}% of tokens`);
            console.log(`   ✅ Recommended for conversations > 10 messages`);
        } else {
            console.log('   ⚠️  Compression overhead was higher than savings');
            console.log('   ℹ️  This can happen with shorter conversations');
            console.log('   💡 Try increasing the compression threshold');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Comparison completed successfully!');
        console.log('\n🌐 View detailed results in the web UI:');
        console.log('   http://localhost:3007');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Comparison failed:', error.message);
        if (error.response) {
            console.error('Server response:', error.response.data);
        }
    }
}

main().catch(console.error);

