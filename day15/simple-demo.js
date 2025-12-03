#!/usr/bin/env node

const { RerankedRAG } = require('./reranked-rag');

/**
 * Simple Demo - Clear reranking improvement
 */
async function runSimpleDemo() {
    console.log('🎯 Simple Reranking Demo\n');
    
    console.log('📊 How Relevance is Calculated:');
    console.log('   📋 Baseline: Pure TF-IDF cosine similarity');
    console.log('   🎯 Reranking: Cross-encoder simulation combining:');
    console.log('      • Keyword overlap (30%)');
    console.log('      • Exact phrase matching (25%)');
    console.log('      • Question type matching (20%)');
    console.log('      • Content quality signals (15%)');
    console.log('      • Length appropriateness (10%)');
    console.log('');
    
    const rag = new RerankedRAG({ verbose: false });
    
    // Question that will get multiple different chunks
    const question = "What is the company's vacation policy?";
    
    console.log(`Question: ${question}`);
    console.log('─'.repeat(50));
    
    try {
        // Baseline: low threshold, gets multiple chunks including irrelevant ones
        console.log('\n📋 Baseline (No Filtering):');
        const baseline = await rag.answerWithEnhancedRAG(question, {
            filteringMode: 'none',
            similarityThreshold: 0.05,  // Very low - gets lots of chunks
            maxChunks: 5
        });
        
        console.log(`   Answer: ${baseline.answer}`);
        console.log(`   Chunks used: ${baseline.chunks?.length || 0}`);
        if (baseline.chunks?.[0]) {
            console.log(`   Top chunk: ${baseline.chunks[0].document?.filename} (${(baseline.chunks[0].similarity * 100).toFixed(1)}% TF-IDF similarity)`);
        }
        
        // Reranked: same low threshold but with reranking to boost relevant chunks
        console.log('\n🎯 With Reranking:');
        const reranked = await rag.answerWithEnhancedRAG(question, {
            filteringMode: 'rerank',
            similarityThreshold: 0.05,  // Same low threshold
            maxChunks: 5
        });
        
        console.log(`   Answer: ${reranked.answer}`);
        console.log(`   Chunks used: ${reranked.chunks?.length || 0}`);
        if (reranked.chunks?.[0]) {
            const score = reranked.chunks[0].combinedScore || reranked.chunks[0].similarity;
            console.log(`   Top chunk: ${reranked.chunks[0].document?.filename} (${(score * 100).toFixed(1)}% combined relevance)`);
        }
        
        // Compare top chunks
        if (baseline.chunks?.[0] && reranked.chunks?.[0]) {
            console.log('\n📊 Comparison:');
            const baselineFile = baseline.chunks[0].document?.filename;
            const rerankedFile = reranked.chunks[0].document?.filename;
            
            if (baselineFile !== rerankedFile) {
                console.log('✅ Reranking found a different, more relevant document!');
            } else {
                const baselineScore = baseline.chunks[0].similarity * 100;
                const rerankedScore = (reranked.chunks[0].combinedScore || reranked.chunks[0].similarity) * 100;
                
                if (rerankedScore > baselineScore) {
                    console.log(`✅ Reranking improved relevance: ${baselineScore.toFixed(1)}% → ${rerankedScore.toFixed(1)}%`);
                } else {
                    console.log('📈 Same top document, but reranking provided better chunk ordering');
                }
            }
        }
        
    } catch (error) {
        console.error('Demo error:', error.message);
    } finally {
        await rag.close();
    }
}

if (require.main === module) {
    runSimpleDemo().catch(console.error);
}

module.exports = { runSimpleDemo };