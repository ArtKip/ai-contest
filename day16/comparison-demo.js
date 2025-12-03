#!/usr/bin/env node

const { CitedRAG } = require('./cited-rag');

/**
 * Comparison Demo - Show before/after citation enforcement
 * 
 * Demonstrates the impact of citation requirements on:
 * 1. Answer accuracy and source transparency
 * 2. Hallucination reduction
 * 3. User trust through verifiable information
 */

async function runComparisonDemo() {
    console.log('📚 Day 16: Citation Enforcement Comparison Demo');
    console.log('═'.repeat(60));
    console.log('Comparing regular RAG vs citation-enforced RAG responses\n');
    
    const rag = new CitedRAG({ 
        verbose: false,
        requireCitations: true,
        sourceBaseUrl: 'https://docs.company.com/'
    });
    
    const testQuestions = [
        "What is the company vacation policy?",
        "How do vector embeddings work?",
        "What are the main applications of machine learning?"
    ];
    
    try {
        for (let i = 0; i < testQuestions.length; i++) {
            const question = testQuestions[i];
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📝 QUESTION ${i + 1}: ${question}`);
            console.log('='.repeat(60));
            
            const comparison = await rag.compareWithAndWithoutCitations(question, {
                maxChunks: 3,
                similarityThreshold: 0.2
            });
            
            displayComparison(comparison);
        }
        
        // Show overall system metrics
        console.log('\n📊 CITATION SYSTEM METRICS');
        console.log('═'.repeat(60));
        const metrics = rag.getCitationMetrics();
        console.log(`✅ Citation compliance: ${Math.round(metrics.citationCompliance)}%`);
        console.log(`📚 Average citations per response: ${metrics.avgCitations}`);
        console.log(`⚠️ Validation failures: ${metrics.validationFailures}`);
        console.log(`📝 Total responses generated: ${metrics.responsesGenerated}`);
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    } finally {
        await rag.close();
    }
}

function displayComparison(comparison) {
    const { regular, cited, comparison: comp } = comparison;
    
    // Regular Response (without citation enforcement)
    console.log('\n📋 REGULAR RAG RESPONSE:');
    console.log('─'.repeat(40));
    console.log(regular.answer);
    console.log(`\n📊 Analysis:`);
    console.log(`   • Length: ${regular.answer.length} characters`);
    console.log(`   • Citations found: ${regular.hasExplicitCitations ? 'Yes' : 'No'}`);
    console.log(`   • Sources used: ${regular.chunks ? regular.chunks.length : 0}`);
    
    // Cited Response (with citation enforcement)
    console.log('\n\n📚 CITATION-ENFORCED RAG RESPONSE:');
    console.log('─'.repeat(40));
    console.log(cited.answer);
    console.log(`\n📊 Analysis:`);
    console.log(`   • Length: ${cited.answer.length} characters`);
    console.log(`   • Citations: ${cited.citationCount} found`);
    console.log(`   • Valid citations: ${cited.hasValidCitations ? 'Yes' : 'No'}`);
    console.log(`   • Sources referenced: ${cited.sourceReferences.length}`);
    if (cited.validationDetails) {
        console.log(`   • Citation coverage: ${Math.round(cited.validationDetails.citationCoverage * 100)}%`);
        console.log(`   • Sources section: ${cited.validationDetails.hasSourcesSection ? 'Yes' : 'No'}`);
    }
    
    // Source References
    if (cited.sourceReferences.length > 0) {
        console.log('\n📎 SOURCE REFERENCES:');
        cited.sourceReferences.forEach((source, index) => {
            console.log(`   [${index + 1}] ${source.title}`);
            console.log(`       File: ${source.filename}`);
            console.log(`       URL: ${source.url}`);
        });
    }
    
    // Comparison Analysis
    console.log('\n🔍 COMPARISON ANALYSIS:');
    console.log('─'.repeat(40));
    
    if (comp.citedVersion) {
        console.log('✅ Citation enforcement: Successfully implemented');
    } else {
        console.log('⚠️ Citation enforcement: Failed to add proper citations');
    }
    
    console.log(`📏 Length difference: ${comp.lengthDifference > 0 ? '+' : ''}${comp.lengthDifference} characters`);
    console.log(`🔗 Source transparency: ${comp.sourceTransparency} source(s) with full references`);
    
    if (comp.hallucinations) {
        const hall = comp.hallucinations;
        console.log(`🚨 Hallucination analysis: ${hall.analysis}`);
        if (hall.suspected) {
            console.log('   ⚠️ Regular response may contain unsupported information');
        } else {
            console.log('   ✅ No significant hallucination indicators detected');
        }
    }
    
    // Trust and Verifiability Score
    const trustScore = calculateTrustScore(cited, regular);
    console.log(`\n🛡️ TRUST & VERIFIABILITY SCORE: ${trustScore.score}/10`);
    console.log(`   Reasoning: ${trustScore.reasoning}`);
}

function calculateTrustScore(cited, regular) {
    let score = 0;
    const factors = [];
    
    // Citations present (3 points max)
    if (cited.citationCount > 0) {
        score += Math.min(3, cited.citationCount);
        factors.push(`+${Math.min(3, cited.citationCount)} for citations`);
    }
    
    // Valid citations (2 points)
    if (cited.hasValidCitations) {
        score += 2;
        factors.push('+2 for valid citations');
    }
    
    // Sources section (1 point)
    if (cited.validationDetails && cited.validationDetails.hasSourcesSection) {
        score += 1;
        factors.push('+1 for sources section');
    }
    
    // Source transparency (2 points)
    if (cited.sourceReferences.length > 0) {
        score += Math.min(2, cited.sourceReferences.length);
        factors.push(`+${Math.min(2, cited.sourceReferences.length)} for source transparency`);
    }
    
    // Citation coverage (2 points max)
    if (cited.validationDetails && cited.validationDetails.citationCoverage > 0.5) {
        const coveragePoints = Math.round(cited.validationDetails.citationCoverage * 2);
        score += coveragePoints;
        factors.push(`+${coveragePoints} for citation coverage`);
    }
    
    const reasoning = factors.length > 0 ? factors.join(', ') : 'No citation benefits found';
    
    return {
        score: Math.min(10, score),
        reasoning
    };
}

// Run if called directly
if (require.main === module) {
    runComparisonDemo().catch(console.error);
}

module.exports = { runComparisonDemo };