#!/usr/bin/env node

const { RAGAgent } = require('./rag-agent');

/**
 * Simple RAG Demo - Shows clear advantages with minimal output
 */
async function runSimpleDemo() {
    console.log('🚀 RAG vs Direct LLM Demo\n');
    
    // Initialize RAG agent with minimal output and suppress all internal logging
    const originalLog = console.log;
    console.log = () => {}; // Suppress all logging during RAG operations
    
    const ragAgent = new RAGAgent({ verbose: false });
    
    // Questions with specific facts that only exist in our documents
    const questions = [
        "What is Project Quantum's total budget?",
        "Who leads Project Quantum at TechCorp?", 
        "How many vacation days do TechCorp employees get?",
        "What is TechCorp's Q3 2024 revenue?"
    ];
    
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        // Restore console.log temporarily for our output
        console.log = originalLog;
        console.log(`Q${i + 1}: ${question}`);
        
        // Suppress logging again for RAG operations
        console.log = () => {};
        
        try {
            // Get both answers (with suppressed internal logging)
            const [ragResult, directResult] = await Promise.all([
                ragAgent.answerWithRAG(question),
                ragAgent.answerWithoutRAG(question)
            ]);
            
            // Restore logging for our comparison output
            console.log = originalLog;
            
            // Extract key facts for comparison
            const ragFacts = extractKey(ragResult.answer);
            const directFacts = extractKey(directResult.answer);
            
            console.log(`📚 RAG: ${ragFacts}`);
            console.log(`🤖 Direct: ${directFacts}`);
            
            // Quick comparison
            const ragHasFactualData = ragResult.chunks && ragResult.chunks.length > 0 && 
                (ragFacts.includes('$') || ragFacts.includes('Dr.') || ragFacts.includes('25 vacation') || ragFacts.match(/\d+\s+days/));
            const ragSaysNoInfo = ragResult.answer.toLowerCase().includes("unfortunately") || 
                ragResult.answer.toLowerCase().includes("don't have") || 
                ragResult.answer.toLowerCase().includes("no information");
            const directSaysNoInfo = directResult.answer.toLowerCase().includes("don't have") || 
                directResult.answer.toLowerCase().includes("no information") || 
                directResult.answer.toLowerCase().includes("i'm afraid");
            
            if (ragHasFactualData && directSaysNoInfo && !ragSaysNoInfo) {
                console.log('✅ RAG Win: Found specific facts');
            } else if (ragResult.chunks.length === 0 || ragSaysNoInfo) {
                console.log('❌ RAG Miss: Search failed to find relevant content');
            } else {
                console.log('🔄 Mixed: Both gave general answers');
            }
            
        } catch (error) {
            console.log = originalLog; // Restore for error output
            console.error(`❌ Error: ${error.message}`);
        }
        
        console.log('─'.repeat(50));
    }

    // Restore console.log permanently
    console.log = originalLog;
    
    await ragAgent.close();
    
    console.log('\n🎯 Demo Summary:');
    console.log('✅ RAG wins when search finds the right documents (vacation days)');
    console.log('❌ RAG fails when search misses relevant content (even though data exists)');
    console.log('📊 Example: Q3 revenue ($847.2M) is in documents but search can\'t find it');
    console.log('🔧 Root issue: TF-IDF embeddings are too weak for semantic search');
}

function extractKey(text) {
    // Extract the most important part of the answer (first sentence or key facts)
    const sentences = text.split('.')[0];
    return sentences.length > 120 ? sentences.substring(0, 120) + '...' : sentences;
}

// Run if called directly
if (require.main === module) {
    runSimpleDemo().catch(console.error);
}

module.exports = { runSimpleDemo };