#!/usr/bin/env node

const { CitedRAG } = require('./cited-rag');

/**
 * Simple Demo for Day 16 - Citations & Sources
 * 
 * Quick demonstration of the citation-enforced RAG system
 */

async function runDemo() {
    console.log('📚 Day 16: Citations & Sources Demo\n');
    
    const rag = new CitedRAG({ 
        verbose: false,
        citationStyle: 'numbered',
        requireCitations: true
    });
    
    const question = "What is the company's vacation policy?";
    
    console.log(`Question: ${question}`);
    console.log('─'.repeat(50));
    
    try {
        const result = await rag.answerWithCitations(question);
        
        console.log('\n📝 ANSWER WITH CITATIONS:');
        console.log(result.answer);
        
        console.log('\n📊 CITATION ANALYSIS:');
        console.log(`   Citations found: ${result.citationCount}`);
        console.log(`   Valid citations: ${result.hasValidCitations ? 'Yes' : 'No'}`);
        console.log(`   Sources referenced: ${result.sourceReferences.length}`);
        
        if (result.sourceReferences.length > 0) {
            console.log('\n📎 SOURCES:');
            result.sourceReferences.forEach((source, index) => {
                console.log(`   [${index + 1}] ${source.title} (${source.filename})`);
            });
        }
        
        if (result.validationDetails) {
            const quality = Math.round(result.validationDetails.qualityScore * 100);
            console.log(`\n✅ Citation Quality Score: ${quality}%`);
        }
        
    } catch (error) {
        console.error('❌ Demo error:', error.message);
    } finally {
        await rag.close();
    }
}

if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { runDemo };