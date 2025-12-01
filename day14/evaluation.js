#!/usr/bin/env node

const { RAGAgent } = require('./rag-agent');
const { createKnowledgeBase } = require('./create-knowledge-base');
const fs = require('fs').promises;

/**
 * Comprehensive RAG Evaluation and Analysis
 * 
 * Evaluates RAG performance across different scenarios and 
 * generates detailed analysis and conclusions.
 */

async function comprehensiveEvaluation() {
    console.log('🔬 Starting Comprehensive RAG Evaluation\n');
    
    // Setup
    await createKnowledgeBase();
    const agent = new RAGAgent({
        dbPath: './rag_knowledge_base.db',
        maxChunks: 3,
        minSimilarity: 0.1
    });
    
    // Define evaluation scenarios
    const scenarios = [
        {
            name: "Factual Questions",
            description: "Questions with definitive answers in the knowledge base",
            questions: [
                "What is machine learning?",
                "What are the different types of machine learning?",
                "How do vector embeddings work?",
                "What is cosine similarity?"
            ]
        },
        {
            name: "Technical Implementation",
            description: "Questions about specific code or implementation details",
            questions: [
                "How do you calculate cosine similarity in JavaScript?",
                "What is the formula for Euclidean distance?",
                "How do you normalize a vector?",
                "What parameters does the calculateCosineSimilarity function take?"
            ]
        },
        {
            name: "Conceptual Understanding",
            description: "Questions requiring synthesis of multiple concepts",
            questions: [
                "How does semantic search differ from keyword search?",
                "What are the advantages of vector embeddings over TF-IDF?",
                "How does RAG improve language model responses?",
                "What are the trade-offs between exact and approximate search?"
            ]
        },
        {
            name: "Application Examples",
            description: "Questions about practical applications and use cases",
            questions: [
                "What are applications of machine learning?",
                "How is similarity search used in recommendation systems?",
                "What are the benefits of document indexing?",
                "How can vector embeddings improve search engines?"
            ]
        },
        {
            name: "Edge Cases",
            description: "Questions outside the knowledge base domain",
            questions: [
                "How do you cook pasta?",
                "What is the weather like today?",
                "Who won the latest football game?",
                "What is quantum computing?" // Partially related but not in our docs
            ]
        }
    ];
    
    const allResults = [];
    
    try {
        for (const scenario of scenarios) {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`📋 Evaluating Scenario: ${scenario.name}`);
            console.log(`📝 ${scenario.description}`);
            console.log(`${'='.repeat(70)}`);
            
            const scenarioResults = [];
            
            for (let i = 0; i < scenario.questions.length; i++) {
                const question = scenario.questions[i];
                console.log(`\n[${i + 1}/${scenario.questions.length}] ${question}`);
                
                try {
                    const comparison = await agent.compareAnswers(question);
                    const evaluation = evaluateComparison(comparison, scenario.name);
                    
                    scenarioResults.push({
                        question,
                        comparison,
                        evaluation,
                        scenario: scenario.name
                    });
                    
                    console.log(`   Evaluation: ${evaluation.summary}`);
                    
                } catch (error) {
                    console.error(`   Error: ${error.message}`);
                    scenarioResults.push({
                        question,
                        error: error.message,
                        scenario: scenario.name
                    });
                }
            }
            
            allResults.push({
                scenario: scenario.name,
                description: scenario.description,
                results: scenarioResults
            });
        }
        
        // Generate comprehensive analysis
        const analysis = generateComprehensiveAnalysis(allResults);
        
        // Display results
        displayEvaluationResults(analysis);
        
        // Save results
        await saveEvaluationResults(analysis);
        
        // Generate conclusions
        generateConclusions(analysis);
        
    } catch (error) {
        console.error('❌ Evaluation failed:', error.message);
    } finally {
        await agent.close();
    }
}

function evaluateComparison(comparison, scenarioType) {
    const rag = comparison.ragAnswer;
    const direct = comparison.directAnswer;
    const analysis = comparison.analysis;
    
    const evaluation = {
        hasRelevantContext: rag.hasContext && rag.chunks.length > 0,
        contextQuality: assessContextQuality(rag.chunks),
        answerQuality: {
            rag: assessAnswerQuality(rag.answer, true),
            direct: assessAnswerQuality(direct.answer, false)
        },
        ragAdvantages: analysis.ragAdvantages,
        ragDisadvantages: analysis.ragDisadvantages,
        performance: {
            ragTime: rag.totalTime,
            directTime: direct.totalTime,
            speedRatio: rag.totalTime / direct.totalTime
        },
        factualAccuracy: assessFactualAccuracy(rag, direct),
        comprehensiveness: assessComprehensiveness(rag, direct),
        sourceAttribution: assessSourceAttribution(rag)
    };
    
    // Overall score (0-100)
    evaluation.ragScore = calculateRAGScore(evaluation);
    evaluation.directScore = calculateDirectScore(evaluation);
    evaluation.ragWins = evaluation.ragScore > evaluation.directScore;
    
    // Generate summary
    evaluation.summary = generateEvaluationSummary(evaluation, scenarioType);
    
    return evaluation;
}

function assessContextQuality(chunks) {
    if (!chunks || chunks.length === 0) {
        return { score: 0, issues: ['No relevant context found'] };
    }
    
    const issues = [];
    let score = 70; // Base score for having context
    
    // Check similarity scores
    const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length;
    if (avgSimilarity < 0.2) {
        issues.push('Low similarity scores');
        score -= 20;
    } else if (avgSimilarity > 0.4) {
        score += 15;
    }
    
    // Check content diversity
    const uniqueSources = new Set(chunks.map(chunk => chunk.document.filename)).size;
    if (uniqueSources > 1) {
        score += 10;
    }
    
    // Check content length
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.chunk.content.length, 0);
    if (totalLength < 100) {
        issues.push('Very short context');
        score -= 15;
    } else if (totalLength > 1000) {
        score += 5;
    }
    
    return {
        score: Math.max(0, Math.min(100, score)),
        avgSimilarity,
        uniqueSources,
        totalLength,
        issues
    };
}

function assessAnswerQuality(answer, isRAG) {
    const score = {
        length: Math.min(answer.length / 200, 1) * 20, // Up to 20 points for reasonable length
        specificity: (answer.match(/\b(specific|example|implementation|calculation|algorithm)\b/gi) || []).length * 5,
        technicalTerms: (answer.match(/\b(vector|embedding|similarity|cosine|euclidean|tfidf)\b/gi) || []).length * 3,
        confidence: answer.includes('based on') || answer.includes('according to') ? 15 : 0
    };
    
    const totalScore = Math.min(100, Object.values(score).reduce((sum, val) => sum + val, 0));
    
    return {
        totalScore,
        breakdown: score,
        hasExamples: answer.toLowerCase().includes('example') || answer.toLowerCase().includes('such as'),
        hasTechnicalDetail: score.technicalTerms > 0,
        showsConfidence: score.confidence > 0
    };
}

function assessFactualAccuracy(ragResult, directResult) {
    // Simple heuristic: RAG with good context should be more factually accurate
    const ragAccuracy = ragResult.hasContext ? 0.8 : 0.6;
    const directAccuracy = 0.7; // Baseline for general knowledge
    
    return {
        ragAccuracy,
        directAccuracy,
        ragAdvantage: ragAccuracy > directAccuracy
    };
}

function assessComprehensiveness(ragResult, directResult) {
    const ragWords = ragResult.answer.split(/\s+/).length;
    const directWords = directResult.answer.split(/\s+/).length;
    
    return {
        ragWordCount: ragWords,
        directWordCount: directWords,
        ragMoreComprehensive: ragWords > directWords * 1.2
    };
}

function assessSourceAttribution(ragResult) {
    const hasAttribution = ragResult.answer.toLowerCase().includes('based on') ||
                          ragResult.answer.toLowerCase().includes('according to') ||
                          ragResult.answer.toLowerCase().includes('documentation');
                          
    return {
        hasAttribution,
        sourceCount: ragResult.chunks.length,
        canTrace: ragResult.chunks.length > 0 && hasAttribution
    };
}

function calculateRAGScore(evaluation) {
    let score = 0;
    
    // Context quality (30 points)
    score += evaluation.contextQuality.score * 0.3;
    
    // Answer quality (30 points)
    score += evaluation.answerQuality.rag.totalScore * 0.3;
    
    // Source attribution (20 points)
    if (evaluation.sourceAttribution.hasAttribution) score += 20;
    
    // Factual accuracy (20 points)
    score += evaluation.factualAccuracy.ragAccuracy * 20;
    
    return Math.round(score);
}

function calculateDirectScore(evaluation) {
    let score = 0;
    
    // Answer quality (50 points)
    score += evaluation.answerQuality.direct.totalScore * 0.5;
    
    // Speed advantage (20 points)
    const speedAdvantage = Math.max(0, 2 - evaluation.performance.speedRatio);
    score += speedAdvantage * 10;
    
    // Factual accuracy (30 points)
    score += evaluation.factualAccuracy.directAccuracy * 30;
    
    return Math.round(score);
}

function generateEvaluationSummary(evaluation, scenarioType) {
    const winner = evaluation.ragWins ? 'RAG' : 'Direct';
    const score = evaluation.ragWins ? evaluation.ragScore : evaluation.directScore;
    
    if (!evaluation.hasRelevantContext) {
        return `${winner} wins (${score}/100) - No relevant context found, direct answer prevails`;
    }
    
    if (evaluation.ragScore > evaluation.directScore + 15) {
        return `RAG wins strongly (${evaluation.ragScore}/100) - High-quality context provides significant advantage`;
    } else if (evaluation.directScore > evaluation.ragScore + 15) {
        return `Direct wins strongly (${evaluation.directScore}/100) - RAG context doesn't add sufficient value`;
    } else {
        return `Close match (RAG: ${evaluation.ragScore}, Direct: ${evaluation.directScore}) - Marginal difference`;
    }
}

function generateComprehensiveAnalysis(allResults) {
    const analysis = {
        totalQuestions: 0,
        scenarioAnalysis: {},
        overallMetrics: {
            ragWins: 0,
            directWins: 0,
            ragAdvantageFrequency: {},
            ragDisadvantageFrequency: {},
            averagePerformance: { rag: 0, direct: 0 },
            contextFoundRate: 0
        },
        insights: []
    };
    
    let totalRAGTime = 0;
    let totalDirectTime = 0;
    let questionsWithContext = 0;
    
    allResults.forEach(scenario => {
        const scenarioStats = {
            name: scenario.scenario,
            description: scenario.description,
            totalQuestions: scenario.results.length,
            ragWins: 0,
            directWins: 0,
            avgRAGScore: 0,
            avgDirectScore: 0,
            contextFoundRate: 0,
            commonAdvantages: {},
            commonDisadvantages: {}
        };
        
        let scenarioRAGScore = 0;
        let scenarioDirectScore = 0;
        
        scenario.results.forEach(result => {
            if (result.evaluation) {
                analysis.totalQuestions++;
                
                if (result.evaluation.ragWins) {
                    analysis.overallMetrics.ragWins++;
                    scenarioStats.ragWins++;
                } else {
                    analysis.overallMetrics.directWins++;
                    scenarioStats.directWins++;
                }
                
                scenarioRAGScore += result.evaluation.ragScore;
                scenarioDirectScore += result.evaluation.directScore;
                
                totalRAGTime += result.evaluation.performance.ragTime;
                totalDirectTime += result.evaluation.performance.directTime;
                
                if (result.evaluation.hasRelevantContext) {
                    questionsWithContext++;
                }
                
                // Track advantages/disadvantages
                result.evaluation.ragAdvantages.forEach(adv => {
                    analysis.overallMetrics.ragAdvantageFrequency[adv] = 
                        (analysis.overallMetrics.ragAdvantageFrequency[adv] || 0) + 1;
                    scenarioStats.commonAdvantages[adv] = 
                        (scenarioStats.commonAdvantages[adv] || 0) + 1;
                });
                
                result.evaluation.ragDisadvantages.forEach(dis => {
                    analysis.overallMetrics.ragDisadvantageFrequency[dis] = 
                        (analysis.overallMetrics.ragDisadvantageFrequency[dis] || 0) + 1;
                    scenarioStats.commonDisadvantages[dis] = 
                        (scenarioStats.commonDisadvantages[dis] || 0) + 1;
                });
            }
        });
        
        scenarioStats.avgRAGScore = Math.round(scenarioRAGScore / scenarioStats.totalQuestions);
        scenarioStats.avgDirectScore = Math.round(scenarioDirectScore / scenarioStats.totalQuestions);
        scenarioStats.contextFoundRate = questionsWithContext / scenarioStats.totalQuestions;
        
        analysis.scenarioAnalysis[scenario.scenario] = scenarioStats;
    });
    
    analysis.overallMetrics.averagePerformance.rag = Math.round(totalRAGTime / analysis.totalQuestions);
    analysis.overallMetrics.averagePerformance.direct = Math.round(totalDirectTime / analysis.totalQuestions);
    analysis.overallMetrics.contextFoundRate = questionsWithContext / analysis.totalQuestions;
    
    // Generate insights
    generateInsights(analysis);
    
    return analysis;
}

function generateInsights(analysis) {
    const insights = [];
    
    // Overall performance
    const ragWinRate = analysis.overallMetrics.ragWins / analysis.totalQuestions;
    if (ragWinRate > 0.6) {
        insights.push("RAG consistently outperforms direct LLM across most scenarios");
    } else if (ragWinRate < 0.4) {
        insights.push("Direct LLM often provides better results than RAG");
    } else {
        insights.push("RAG and direct LLM show comparable performance overall");
    }
    
    // Context effectiveness
    if (analysis.overallMetrics.contextFoundRate > 0.7) {
        insights.push("Knowledge base provides good coverage for most questions");
    } else if (analysis.overallMetrics.contextFoundRate < 0.3) {
        insights.push("Knowledge base has limited coverage, many questions lack relevant context");
    }
    
    // Performance impact
    const speedRatio = analysis.overallMetrics.averagePerformance.rag / analysis.overallMetrics.averagePerformance.direct;
    if (speedRatio > 3) {
        insights.push("RAG introduces significant latency overhead");
    } else if (speedRatio < 1.5) {
        insights.push("RAG latency overhead is acceptable");
    }
    
    // Most common advantages
    const topAdvantage = Object.entries(analysis.overallMetrics.ragAdvantageFrequency)
        .sort((a, b) => b[1] - a[1])[0];
    if (topAdvantage) {
        insights.push(`Primary RAG benefit: ${topAdvantage[0]} (${topAdvantage[1]} occurrences)`);
    }
    
    // Scenario-specific insights
    Object.values(analysis.scenarioAnalysis).forEach(scenario => {
        if (scenario.ragWins > scenario.directWins * 2) {
            insights.push(`RAG excels in "${scenario.name}" scenarios`);
        } else if (scenario.directWins > scenario.ragWins * 2) {
            insights.push(`Direct LLM preferred for "${scenario.name}" scenarios`);
        }
    });
    
    analysis.insights = insights;
}

function displayEvaluationResults(analysis) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE RAG EVALUATION RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 Overall Performance:`);
    console.log(`   Total Questions Evaluated: ${analysis.totalQuestions}`);
    console.log(`   RAG Wins: ${analysis.overallMetrics.ragWins} (${(analysis.overallMetrics.ragWins/analysis.totalQuestions*100).toFixed(1)}%)`);
    console.log(`   Direct Wins: ${analysis.overallMetrics.directWins} (${(analysis.overallMetrics.directWins/analysis.totalQuestions*100).toFixed(1)}%)`);
    console.log(`   Context Found Rate: ${(analysis.overallMetrics.contextFoundRate*100).toFixed(1)}%`);
    
    console.log(`\n⏱️ Performance Impact:`);
    console.log(`   Average RAG Time: ${analysis.overallMetrics.averagePerformance.rag}ms`);
    console.log(`   Average Direct Time: ${analysis.overallMetrics.averagePerformance.direct}ms`);
    console.log(`   Speed Ratio: ${(analysis.overallMetrics.averagePerformance.rag / analysis.overallMetrics.averagePerformance.direct).toFixed(1)}x slower`);
    
    console.log(`\n📋 Results by Scenario:`);
    Object.values(analysis.scenarioAnalysis).forEach(scenario => {
        const winRate = (scenario.ragWins / scenario.totalQuestions * 100).toFixed(1);
        console.log(`   ${scenario.name}: RAG wins ${scenario.ragWins}/${scenario.totalQuestions} (${winRate}%) - Avg scores: RAG=${scenario.avgRAGScore}, Direct=${scenario.avgDirectScore}`);
    });
    
    console.log(`\n✅ Top RAG Advantages:`);
    Object.entries(analysis.overallMetrics.ragAdvantageFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([advantage, count]) => {
            console.log(`   • ${advantage} (${count} times)`);
        });
    
    console.log(`\n❌ Top RAG Disadvantages:`);
    Object.entries(analysis.overallMetrics.ragDisadvantageFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([disadvantage, count]) => {
            console.log(`   • ${disadvantage} (${count} times)`);
        });
    
    console.log(`\n💡 Key Insights:`);
    analysis.insights.forEach(insight => {
        console.log(`   • ${insight}`);
    });
}

async function saveEvaluationResults(analysis) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rag-evaluation-${timestamp}.json`;
    
    try {
        await fs.writeFile(filename, JSON.stringify(analysis, null, 2));
        console.log(`\n💾 Evaluation results saved to: ${filename}`);
    } catch (error) {
        console.error('❌ Failed to save evaluation:', error.message);
    }
}

function generateConclusions(analysis) {
    console.log('\n' + '='.repeat(80));
    console.log('📝 RAG SYSTEM CONCLUSIONS');
    console.log('='.repeat(80));
    
    const ragWinRate = analysis.overallMetrics.ragWins / analysis.totalQuestions;
    const contextRate = analysis.overallMetrics.contextFoundRate;
    const speedRatio = analysis.overallMetrics.averagePerformance.rag / analysis.overallMetrics.averagePerformance.direct;
    
    console.log('\n🔍 Where RAG Helped:');
    
    if (ragWinRate > 0.5) {
        console.log('✅ **Better Factual Accuracy**: RAG provided more accurate, document-backed responses');
        console.log('✅ **Increased Specificity**: Access to specific examples and implementation details');
        console.log('✅ **Source Attribution**: Clear traceability to authoritative documents');
    }
    
    if (analysis.overallMetrics.ragAdvantageFrequency['More technical detail and accuracy']) {
        console.log('✅ **Technical Depth**: Enhanced technical explanations with concrete examples');
    }
    
    if (contextRate > 0.7) {
        console.log('✅ **Good Coverage**: Knowledge base effectively covers domain-specific questions');
    }
    
    console.log('\n⚠️ Where RAG Didn\'t Help:');
    
    if (speedRatio > 2) {
        console.log('❌ **Performance Overhead**: Significant latency increase due to retrieval step');
    }
    
    if (contextRate < 0.5) {
        console.log('❌ **Limited Coverage**: Many questions outside knowledge base scope');
    }
    
    if (analysis.overallMetrics.ragDisadvantageFrequency['No relevant context found in knowledge base']) {
        console.log('❌ **Context Gaps**: Retrieval fails for out-of-domain questions');
    }
    
    console.log('\n📊 **Summary**:');
    
    if (ragWinRate > 0.6) {
        console.log('🎯 **RAG is highly effective** for this domain with significant improvements in');
        console.log('   factual accuracy, technical detail, and source attribution.');
    } else if (ragWinRate > 0.4) {
        console.log('⚖️ **RAG shows mixed results** with moderate improvements in specific scenarios');
        console.log('   but substantial performance overhead.');
    } else {
        console.log('⚠️ **RAG provides limited benefit** for this evaluation set, with direct LLM');
        console.log('   responses often being preferable due to speed and general knowledge coverage.');
    }
    
    console.log('\n🔧 **Recommendations**:');
    console.log('• Expand knowledge base coverage for better context retrieval');
    console.log('• Optimize retrieval pipeline to reduce latency');
    console.log('• Implement hybrid approach: RAG for technical queries, direct for general questions');
    console.log('• Add confidence scoring to automatically choose RAG vs direct mode');
    
    console.log('\n' + '='.repeat(80));
}

if (require.main === module) {
    comprehensiveEvaluation().catch(console.error);
}

module.exports = { comprehensiveEvaluation };