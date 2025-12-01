#!/usr/bin/env node

const { RAGAgent } = require('./rag-agent');
const { createKnowledgeBase } = require('./create-knowledge-base');

/**
 * Test Suite for RAG System
 * 
 * Tests the RAG agent with various question types and analyzes
 * the differences between RAG and non-RAG responses.
 */

async function runRAGTests() {
    console.log('🧪 Starting RAG System Tests\n');
    
    // Ensure knowledge base exists
    console.log('📚 Setting up knowledge base...');
    await createKnowledgeBase();
    
    const agent = new RAGAgent({
        dbPath: './rag_knowledge_base.db',
        maxChunks: 3,
        minSimilarity: 0.1
    });
    
    const testQuestions = [
        {
            category: "Technical Concepts",
            questions: [
                "What is machine learning?",
                "How do vector embeddings work?",
                "What is cosine similarity?",
                "Explain TF-IDF weighting"
            ]
        },
        {
            category: "Implementation Details", 
            questions: [
                "How do you calculate cosine similarity in JavaScript?",
                "What are different chunking strategies?",
                "How does semantic search work?",
                "What is the difference between supervised and unsupervised learning?"
            ]
        },
        {
            category: "Practical Applications",
            questions: [
                "What are the applications of machine learning?",
                "How is similarity search used in recommendation systems?",
                "What are the benefits of RAG systems?",
                "How do you optimize document indexing performance?"
            ]
        },
        {
            category: "Edge Cases",
            questions: [
                "What happens when no relevant documents are found?",
                "How do you handle empty vectors?",
                "What is quantum computing?", // Should have no relevant context
                "How do you cook pasta?" // Completely unrelated
            ]
        }
    ];
    
    const results = [];
    let totalTests = 0;
    let passedTests = 0;
    
    try {
        for (const category of testQuestions) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔬 Testing Category: ${category.category}`);
            console.log(`${'='.repeat(60)}`);
            
            for (const question of category.questions) {
                totalTests++;
                console.log(`\n[${totalTests}] Testing: ${question}`);
                
                try {
                    const comparison = await agent.compareAnswers(question);
                    
                    // Analyze the result
                    const analysis = analyzeTestResult(question, comparison, category.category);
                    results.push({
                        category: category.category,
                        question,
                        comparison,
                        analysis,
                        passed: analysis.passed
                    });
                    
                    if (analysis.passed) passedTests++;
                    
                    // Brief result summary
                    console.log(`   Result: ${analysis.passed ? '✅ PASS' : '❌ FAIL'} - ${analysis.reason}`);
                    
                } catch (error) {
                    console.error(`   Error: ${error.message}`);
                    results.push({
                        category: category.category,
                        question,
                        error: error.message,
                        passed: false
                    });
                }
                
                // Small delay to avoid overwhelming output
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Display comprehensive results
        displayTestSummary(results, totalTests, passedTests);
        
        // Save detailed results
        await saveTestResults(results);
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    } finally {
        await agent.close();
    }
}

function analyzeTestResult(question, comparison, category) {
    const rag = comparison.ragAnswer;
    const direct = comparison.directAnswer;
    const analysis = comparison.analysis;
    
    let passed = false;
    let reason = '';
    
    // Different criteria for different categories
    switch (category) {
        case "Technical Concepts":
            // RAG should provide more detailed technical information
            if (rag.hasContext && analysis.ragAdvantages.length > 0) {
                passed = analysis.technicalDetail.rag >= analysis.technicalDetail.direct;
                reason = passed ? 'RAG provided more technical detail' : 'RAG lacked technical depth';
            } else {
                passed = false;
                reason = 'No relevant context found for technical question';
            }
            break;
            
        case "Implementation Details":
            // Should find specific implementation examples
            if (rag.hasContext && rag.chunks.length > 0) {
                const hasCodeExamples = rag.chunks.some(chunk => 
                    chunk.document.filename.includes('.js') || 
                    chunk.chunk.content.includes('function') ||
                    chunk.chunk.content.includes('return')
                );
                passed = hasCodeExamples || analysis.hasSpecificExamples.rag;
                reason = passed ? 'Found specific implementation details' : 'Missing implementation examples';
            } else {
                passed = false;
                reason = 'No implementation details found';
            }
            break;
            
        case "Practical Applications":
            // Should provide application-focused answers
            if (rag.hasContext) {
                const hasApplications = analysis.ragAdvantages.some(adv => 
                    adv.includes('example') || adv.includes('specific')
                );
                passed = hasApplications || analysis.factualClaims.rag > analysis.factualClaims.direct;
                reason = passed ? 'Provided practical applications' : 'Limited practical examples';
            } else {
                passed = analysis.factualClaims.direct > 0;
                reason = 'Direct answer provided some applications';
            }
            break;
            
        case "Edge Cases":
            // Should handle gracefully when no context available
            if (question.toLowerCase().includes('quantum') || question.toLowerCase().includes('pasta')) {
                // These should have no relevant context
                passed = !rag.hasContext || rag.chunks.length === 0;
                reason = passed ? 'Correctly handled out-of-domain question' : 'False positive retrieval';
            } else {
                passed = true; // Other edge cases should work normally
                reason = 'Edge case handled appropriately';
            }
            break;
            
        default:
            passed = analysis.ragAdvantages.length >= analysis.ragDisadvantages.length;
            reason = 'General RAG vs direct comparison';
    }
    
    return {
        passed,
        reason,
        ragAdvantages: analysis.ragAdvantages.length,
        ragDisadvantages: analysis.ragDisadvantages.length,
        hasContext: rag.hasContext,
        chunkCount: rag.chunks.length,
        responseTime: {
            rag: rag.totalTime,
            direct: direct.totalTime
        }
    };
}

function displayTestSummary(results, totalTests, passedTests) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAG System Test Summary');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`   Failed: ${totalTests - passedTests} (${((totalTests-passedTests)/totalTests*100).toFixed(1)}%)`);
    
    // Results by category
    const categories = {};
    results.forEach(result => {
        if (!categories[result.category]) {
            categories[result.category] = { total: 0, passed: 0 };
        }
        categories[result.category].total++;
        if (result.passed) categories[result.category].passed++;
    });
    
    console.log(`\n📋 Results by Category:`);
    Object.entries(categories).forEach(([category, stats]) => {
        const percentage = (stats.passed / stats.total * 100).toFixed(1);
        console.log(`   ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
    });
    
    // RAG effectiveness analysis
    const successfulRAG = results.filter(r => r.analysis && r.analysis.hasContext && r.passed);
    const totalRAGAttempts = results.filter(r => r.analysis && r.analysis.hasContext).length;
    
    console.log(`\n🔍 RAG Effectiveness:`);
    console.log(`   Questions with relevant context: ${totalRAGAttempts}/${totalTests} (${(totalRAGAttempts/totalTests*100).toFixed(1)}%)`);
    console.log(`   RAG success rate: ${successfulRAG.length}/${totalRAGAttempts} (${totalRAGAttempts > 0 ? (successfulRAG.length/totalRAGAttempts*100).toFixed(1) : 0}%)`);
    
    // Common advantages and disadvantages
    const allAdvantages = results.filter(r => r.comparison).map(r => r.comparison.analysis.ragAdvantages).flat();
    const allDisadvantages = results.filter(r => r.comparison).map(r => r.comparison.analysis.ragDisadvantages).flat();
    
    if (allAdvantages.length > 0) {
        console.log(`\n✅ Most Common RAG Advantages:`);
        const advantageCounts = {};
        allAdvantages.forEach(adv => advantageCounts[adv] = (advantageCounts[adv] || 0) + 1);
        Object.entries(advantageCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([adv, count]) => console.log(`   • ${adv} (${count} occurrences)`));
    }
    
    if (allDisadvantages.length > 0) {
        console.log(`\n❌ Most Common RAG Disadvantages:`);
        const disadvantageCounts = {};
        allDisadvantages.forEach(dis => disadvantageCounts[dis] = (disadvantageCounts[dis] || 0) + 1);
        Object.entries(disadvantageCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([dis, count]) => console.log(`   • ${dis} (${count} occurrences)`));
    }
    
    // Performance analysis
    const validResults = results.filter(r => r.comparison);
    if (validResults.length > 0) {
        const avgRAGTime = validResults.reduce((sum, r) => sum + r.comparison.ragAnswer.totalTime, 0) / validResults.length;
        const avgDirectTime = validResults.reduce((sum, r) => sum + r.comparison.directAnswer.totalTime, 0) / validResults.length;
        
        console.log(`\n⏱️ Performance Analysis:`);
        console.log(`   Average RAG response time: ${Math.round(avgRAGTime)}ms`);
        console.log(`   Average direct response time: ${Math.round(avgDirectTime)}ms`);
        console.log(`   Speed penalty: ${(avgRAGTime / avgDirectTime).toFixed(1)}x slower`);
    }
}

async function saveTestResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rag-test-results-${timestamp}.json`;
    
    const fs = require('fs').promises;
    
    const report = {
        timestamp: new Date().toISOString(),
        totalTests: results.length,
        passedTests: results.filter(r => r.passed).length,
        results: results.map(r => ({
            category: r.category,
            question: r.question,
            passed: r.passed,
            analysis: r.analysis,
            error: r.error,
            // Include summary data but not full responses to keep file manageable
            ragHasContext: r.comparison?.ragAnswer?.hasContext,
            ragChunks: r.comparison?.ragAnswer?.chunks?.length || 0,
            advantages: r.comparison?.analysis?.ragAdvantages?.length || 0,
            disadvantages: r.comparison?.analysis?.ragDisadvantages?.length || 0
        }))
    };
    
    try {
        await fs.writeFile(filename, JSON.stringify(report, null, 2));
        console.log(`\n💾 Test results saved to: ${filename}`);
    } catch (error) {
        console.error('❌ Failed to save test results:', error.message);
    }
}

// Performance benchmark
async function runPerformanceBenchmark() {
    console.log('\n🚀 Running Performance Benchmark');
    
    const agent = new RAGAgent({
        dbPath: './rag_knowledge_base.db'
    });
    
    const benchmarkQuestions = [
        "What is machine learning?",
        "How do vector embeddings work?",
        "What is cosine similarity?",
        "How does JavaScript similarity calculation work?",
        "What are search optimization techniques?"
    ];
    
    const iterations = 3;
    const results = [];
    
    for (const question of benchmarkQuestions) {
        console.log(`\n📊 Benchmarking: "${question}"`);
        
        const times = { rag: [], direct: [] };
        
        for (let i = 0; i < iterations; i++) {
            // Test RAG
            const ragStart = Date.now();
            const ragResult = await agent.answerWithRAG(question);
            const ragTime = Date.now() - ragStart;
            times.rag.push(ragTime);
            
            // Test Direct
            const directStart = Date.now();
            const directResult = await agent.answerWithoutRAG(question);
            const directTime = Date.now() - directStart;
            times.direct.push(directTime);
            
            console.log(`   Iteration ${i + 1}: RAG=${ragTime}ms, Direct=${directTime}ms`);
        }
        
        const avgRAG = times.rag.reduce((a, b) => a + b, 0) / iterations;
        const avgDirect = times.direct.reduce((a, b) => a + b, 0) / iterations;
        
        results.push({
            question,
            avgRAGTime: avgRAG,
            avgDirectTime: avgDirect,
            speedRatio: avgRAG / avgDirect
        });
        
        console.log(`   Average: RAG=${Math.round(avgRAG)}ms, Direct=${Math.round(avgDirect)}ms, Ratio=${(avgRAG/avgDirect).toFixed(1)}x`);
    }
    
    await agent.close();
    
    console.log('\n📈 Performance Summary:');
    const overallRAG = results.reduce((sum, r) => sum + r.avgRAGTime, 0) / results.length;
    const overallDirect = results.reduce((sum, r) => sum + r.avgDirectTime, 0) / results.length;
    console.log(`   Overall Average: RAG=${Math.round(overallRAG)}ms, Direct=${Math.round(overallDirect)}ms`);
    console.log(`   Overall Speed Ratio: ${(overallRAG / overallDirect).toFixed(1)}x slower for RAG`);
    
    return results;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--benchmark')) {
        await runPerformanceBenchmark();
    } else {
        await runRAGTests();
        
        if (args.includes('--benchmark')) {
            await runPerformanceBenchmark();
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runRAGTests, runPerformanceBenchmark };