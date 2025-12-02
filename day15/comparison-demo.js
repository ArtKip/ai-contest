#!/usr/bin/env node

const { RerankedRAG } = require('./reranked-rag');

/**
 * Comprehensive Comparison Demo
 * 
 * Tests all three filtering approaches on multiple questions
 * to demonstrate the improvements from filtering and reranking.
 */

async function runComparisonDemo() {
    console.log('🔄 RAG Filtering & Reranking Comparison Demo\n');
    
    // Test questions from Day 14 that had mixed results
    const testQuestions = [
        "What is Project Quantum's total budget?", // Should find $847,231 with better filtering
        "Who leads Project Quantum at TechCorp?",  // Should find Dr. Sarah Chen
        "How many vacation days do TechCorp employees get?", // Already works, should remain good
        "What is TechCorp's Q3 2024 revenue?", // Should find $847.2 million
        "How much does the Enterprise DataVault plan cost?", // Should find $2,499/month
        "What is the CloudSync Pro file size limit?" // Should find 50GB limit
    ];
    
    console.log(`Testing ${testQuestions.length} questions with all filtering approaches...\n`);
    
    // Suppress verbose output for cleaner comparison
    const originalLog = console.log;
    
    const rag = new RerankedRAG({
        verbose: false, // Clean output for comparison
        enableAdaptiveThreshold: true,
        maxChunksAfterFiltering: 3
    });
    
    let totalResults = {};
    
    for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        
        // Restore logging for our output
        console.log = originalLog;
        console.log(`Question ${i + 1}: ${question}`);
        console.log('─'.repeat(60));
        
        // Suppress internal logging
        console.log = () => {};
        
        try {
            // Test all three approaches
            const approaches = [
                { name: 'No Filter', mode: 'none', emoji: '📋' },
                { name: 'Threshold', mode: 'threshold', emoji: '🔧' },
                { name: 'Reranking', mode: 'rerank', emoji: '🎯' }
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
            
            // Restore logging for comparison output
            console.log = originalLog;
            
            // Display results for this question
            displayQuestionResults(question, results);
            
            // Store for summary
            totalResults[question] = results;
            
        } catch (error) {
            console.log = originalLog;
            console.error(`❌ Error processing question: ${error.message}`);
        }
        
        console.log('═'.repeat(60) + '\n');
    }
    
    // Display overall summary
    displayOverallSummary(totalResults);
    
    await rag.close();
}

function displayQuestionResults(question, results) {
    const modes = ['none', 'threshold', 'rerank'];
    
    for (const mode of modes) {
        const result = results[mode];
        const success = assessAnswerQuality(result.answer, question);
        const chunks = result.chunks?.length || 0;
        const time = result.totalTime || 0;
        
        const statusIcon = success.score >= 0.7 ? '✅' : success.score >= 0.4 ? '🟨' : '❌';
        const answer = extractKeyAnswer(result.answer);
        
        console.log(`${result.emoji} ${result.approachName}:`);
        console.log(`   ${statusIcon} ${answer}`);
        console.log(`   📊 ${chunks} chunks, ${time}ms, Quality: ${(success.score * 100).toFixed(0)}%`);
        
        if (result.chunks && result.chunks.length > 0 && mode === 'rerank') {
            const topChunk = result.chunks[0];
            const score = topChunk.combinedScore ? `${(topChunk.combinedScore * 100).toFixed(0)}%` : `${(topChunk.similarity * 100).toFixed(0)}%`;
            console.log(`   📄 Top source: ${topChunk.document?.filename} (${score})`);
        }
        console.log('');
    }
}

function extractKeyAnswer(answer) {
    // Extract the most important part of the answer (first sentence or key fact)
    if (answer.toLowerCase().includes('unfortunately') || 
        answer.toLowerCase().includes("don't have") || 
        answer.toLowerCase().includes("no information")) {
        return "No relevant information found";
    }
    
    // Look for specific facts
    const moneyMatch = answer.match(/\$[\d,.]+(?: million|M|K)?/);
    if (moneyMatch) return moneyMatch[0];
    
    const daysMatch = answer.match(/(\d+)\s+(?:vacation\s+)?days?/i);
    if (daysMatch) return `${daysMatch[1]} days`;
    
    const nameMatch = answer.match(/Dr\.\s+\w+\s+\w+|[A-Z][a-z]+\s+[A-Z][a-z]+/);
    if (nameMatch) return nameMatch[0];
    
    const sizeMatch = answer.match(/(\d+)\s*GB/i);
    if (sizeMatch) return `${sizeMatch[1]}GB limit`;
    
    // Return first sentence
    const sentences = answer.split('.')[0];
    return sentences.length > 100 ? sentences.substring(0, 100) + '...' : sentences;
}

function assessAnswerQuality(answer, question) {
    let score = 0;
    const lowerAnswer = answer.toLowerCase();
    const lowerQuestion = question.toLowerCase();
    
    // Penalty for "don't know" responses
    if (lowerAnswer.includes('unfortunately') || 
        lowerAnswer.includes("don't have") || 
        lowerAnswer.includes("no information") ||
        lowerAnswer.includes("cannot find")) {
        return { score: 0, reason: 'No information found' };
    }
    
    // Check for specific data types based on question
    if (lowerQuestion.includes('budget') || lowerQuestion.includes('cost') || lowerQuestion.includes('revenue')) {
        if (/\$[\d,.]+(?: million|M|K)?/.test(answer)) {
            score += 0.8;
        }
    }
    
    if (lowerQuestion.includes('vacation days')) {
        if (/\d+\s+(?:vacation\s+)?days?/i.test(answer)) {
            score += 0.8;
        }
    }
    
    if (lowerQuestion.includes('who') || lowerQuestion.includes('leads')) {
        if (/Dr\.\s+\w+\s+\w+|[A-Z][a-z]+\s+[A-Z][a-z]+/.test(answer)) {
            score += 0.8;
        }
    }
    
    if (lowerQuestion.includes('file size') || lowerQuestion.includes('limit')) {
        if (/\d+\s*GB/i.test(answer)) {
            score += 0.8;
        }
    }
    
    // Bonus for specific details
    if (answer.length > 50 && score > 0) {
        score += 0.2;
    }
    
    // Base score for any substantive answer
    if (score === 0 && answer.length > 30 && !lowerAnswer.includes('unfortunately')) {
        score = 0.3;
    }
    
    return { score: Math.min(1, score), reason: score > 0.7 ? 'Good answer' : score > 0.4 ? 'Partial answer' : 'Poor answer' };
}

function displayOverallSummary(totalResults) {
    console.log('🎯 Overall Performance Summary');
    console.log('═'.repeat(60));
    
    const approaches = ['none', 'threshold', 'rerank'];
    const approachNames = ['No Filter', 'Threshold', 'Reranking'];
    
    console.log('\nSuccess Rate by Approach:');
    
    for (let i = 0; i < approaches.length; i++) {
        const mode = approaches[i];
        const name = approachNames[i];
        
        let successes = 0;
        let totalTime = 0;
        let totalChunks = 0;
        let questionCount = 0;
        
        for (const [question, results] of Object.entries(totalResults)) {
            const result = results[mode];
            if (result) {
                const quality = assessAnswerQuality(result.answer, question);
                if (quality.score >= 0.7) successes++;
                totalTime += result.totalTime || 0;
                totalChunks += result.chunks?.length || 0;
                questionCount++;
            }
        }
        
        const successRate = questionCount > 0 ? (successes / questionCount * 100).toFixed(0) : '0';
        const avgTime = questionCount > 0 ? Math.round(totalTime / questionCount) : 0;
        const avgChunks = questionCount > 0 ? (totalChunks / questionCount).toFixed(1) : '0';
        
        console.log(`${name.padEnd(12)}: ${successRate}% success (${successes}/${questionCount}), ${avgTime}ms avg, ${avgChunks} chunks avg`);
    }
    
    console.log('\n📈 Key Improvements:');
    
    const baselineSuccesses = Object.values(totalResults).filter(results => 
        assessAnswerQuality(results.none?.answer || '', '').score >= 0.7
    ).length;
    
    const thresholdSuccesses = Object.values(totalResults).filter(results => 
        assessAnswerQuality(results.threshold?.answer || '', '').score >= 0.7
    ).length;
    
    const rerankSuccesses = Object.values(totalResults).filter(results => 
        assessAnswerQuality(results.rerank?.answer || '', '').score >= 0.7
    ).length;
    
    console.log(`• Threshold filtering improved success rate by ${thresholdSuccesses - baselineSuccesses} questions`);
    console.log(`• Semantic reranking improved success rate by ${rerankSuccesses - baselineSuccesses} questions`);
    console.log(`• Overall improvement: ${baselineSuccesses}→${rerankSuccesses} successful answers`);
    
    if (rerankSuccesses > baselineSuccesses) {
        const improvement = ((rerankSuccesses - baselineSuccesses) / Math.max(1, baselineSuccesses) * 100).toFixed(0);
        console.log(`• Relative improvement: ${improvement}% better with reranking`);
    }
    
    console.log('\n🎯 Conclusion:');
    if (rerankSuccesses > thresholdSuccesses && thresholdSuccesses >= baselineSuccesses) {
        console.log('✅ Semantic reranking provides the best results');
        console.log('✅ Threshold filtering provides modest improvements');
        console.log('✅ Both approaches reduce noise and improve answer quality');
    } else if (thresholdSuccesses > baselineSuccesses || rerankSuccesses > baselineSuccesses) {
        console.log('🟨 Filtering approaches show some improvement over baseline');
        console.log('🔧 Further tuning may be needed for optimal performance');
    } else {
        console.log('🔧 Current filtering settings may need adjustment');
        console.log('📊 Consider tuning thresholds or improving reranking algorithm');
    }
}

// Run if called directly
if (require.main === module) {
    runComparisonDemo().catch(console.error);
}

module.exports = { runComparisonDemo };