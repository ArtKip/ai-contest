#!/usr/bin/env node

const { RerankedRAG } = require('./reranked-rag');

/**
 * Simple Demo for Day 15 - Reranking & Filtering
 * 
 * Shows the key improvements from filtering and reranking
 * with a clean, focused presentation.
 */

async function runDemo() {
    console.log('🔄 Day 15: RAG Reranking & Filtering Demo\n');
    
    // Suppress verbose output for cleaner demo
    const rag = new RerankedRAG({ 
        verbose: false,
        enableAdaptiveThreshold: true
    });
    
    // Test one question that works well to show the improvements
    const question = "How many vacation days do TechCorp employees get?";
    
    console.log(`Question: ${question}`);
    console.log('─'.repeat(60));
    
    try {
        // Test all three approaches
        const approaches = [
            { name: 'Baseline (No Filtering)', mode: 'none', emoji: '📋' },
            { name: 'Threshold Filtering', mode: 'threshold', emoji: '🔧' },
            { name: 'Semantic Reranking', mode: 'rerank', emoji: '🎯' }
        ];
        
        const results = {};
        
        for (const approach of approaches) {
            const result = await rag.answerWithEnhancedRAG(question, {
                filteringMode: approach.mode,
                similarityThreshold: 0.3
            });
            
            results[approach.mode] = {
                ...result,
                approachName: approach.name,
                emoji: approach.emoji
            };
        }
        
        // Display results
        displayResults(results);
        
        // Show filtering improvements
        console.log('\n🔍 Filtering Pipeline Analysis:');
        console.log('─'.repeat(50));
        
        for (const [mode, result] of Object.entries(results)) {
            if (result.metrics) {
                const improvement = result.metrics.chunksBeforeFiltering - result.metrics.chunksAfterFiltering;
                console.log(`${result.emoji} ${result.approachName}:`);
                console.log(`   Chunks: ${result.metrics.chunksBeforeFiltering} → ${result.metrics.chunksAfterFiltering} (filtered ${improvement})`);
                
                if (result.metrics.avgSimilarityBefore && result.metrics.avgSimilarityAfter) {
                    const qualityImprovement = ((result.metrics.avgSimilarityAfter - result.metrics.avgSimilarityBefore) * 100).toFixed(0);
                    console.log(`   Quality: ${result.metrics.avgSimilarityBefore.toFixed(3)} → ${result.metrics.avgSimilarityAfter.toFixed(3)} (+${qualityImprovement}%)`);
                }
                
                if (result.chunks && result.chunks[0] && result.chunks[0].combinedScore) {
                    console.log(`   Reranker Score: ${(result.chunks[0].combinedScore * 100).toFixed(0)}%`);
                }
                console.log('');
            }
        }
        
    } catch (error) {
        console.error('Demo error:', error.message);
    } finally {
        await rag.close();
    }
}

function displayResults(results) {
    const modes = ['none', 'threshold', 'rerank'];
    
    for (const mode of modes) {
        const result = results[mode];
        console.log(`\n${result.emoji} ${result.approachName}:`);
        
        const answer = extractAnswer(result.answer);
        console.log(`   Answer: ${answer}`);
        
        if (result.chunks && result.chunks.length > 0) {
            const topChunk = result.chunks[0];
            const score = topChunk.combinedScore ? 
                `${(topChunk.combinedScore * 100).toFixed(0)}%` : 
                `${(topChunk.similarity * 100).toFixed(0)}%`;
            console.log(`   Source: ${topChunk.document?.filename} (${score} relevance)`);
        } else {
            console.log(`   Source: No relevant content found`);
        }
        
        console.log(`   Time: ${result.totalTime}ms`);
    }
}

function extractAnswer(answer) {
    // Extract key fact from the answer
    if (answer.toLowerCase().includes('25 vacation days') || answer.toLowerCase().includes('25 days')) {
        return '25 vacation days per year';
    }
    
    if (answer.toLowerCase().includes('unfortunately') || 
        answer.toLowerCase().includes("don't have")) {
        return 'No information found';
    }
    
    // Return first sentence
    const firstSentence = answer.split('.')[0];
    return firstSentence.length > 80 ? firstSentence.substring(0, 80) + '...' : firstSentence;
}

// Add summary about the improvements
async function showImprovements() {
    console.log('\n🎯 Key Improvements from Day 15:');
    console.log('─'.repeat(50));
    console.log('✅ Similarity threshold filtering removes low-quality chunks');
    console.log('✅ Semantic reranking scores chunks by query relevance');
    console.log('✅ Adaptive thresholds prevent zero results');
    console.log('✅ Combined scoring (60% reranker + 40% similarity)');
    console.log('✅ Quality metrics track filtering effectiveness');
    
    console.log('\n📊 Expected Improvements:');
    console.log('• Better precision: Remove irrelevant chunks');
    console.log('• Improved ranking: Most relevant chunks first');
    console.log('• Faster processing: Fewer chunks to process');
    console.log('• Quality scoring: Track filtering effectiveness');
    
    console.log('\n🔧 Limitations with TF-IDF Embeddings:');
    console.log('• Initial retrieval quality limits filtering effectiveness');
    console.log('• Need semantic embeddings (OpenAI, BERT) for major improvements');
    console.log('• Current 33% success rate could be 80%+ with better embeddings');
}

// Run if called directly
if (require.main === module) {
    (async () => {
        await runDemo();
        await showImprovements();
        
        console.log('\n🚀 Try these commands:');
        console.log('  npm run compare  - Compare all approaches on 6 questions');
        console.log('  npm run tune     - Find optimal similarity thresholds');
    })();
}

module.exports = { runDemo };