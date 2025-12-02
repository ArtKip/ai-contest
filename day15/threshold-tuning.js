#!/usr/bin/env node

const { RerankedRAG } = require('./reranked-rag');

/**
 * Threshold Tuning System
 * 
 * Automatically tests different similarity thresholds to find
 * the optimal cutoff points for best answer quality.
 */

class ThresholdTuner {
    constructor(options = {}) {
        this.rag = new RerankedRAG({
            verbose: false, // Suppress logs during tuning
            enableAdaptiveThreshold: false // We want to test exact thresholds
        });
        
        this.testQuestions = options.testQuestions || [
            "What is Project Quantum's total budget?",
            "Who leads Project Quantum at TechCorp?", 
            "How many vacation days do TechCorp employees get?",
            "What is TechCorp's Q3 2024 revenue?",
            "How much does the Enterprise DataVault plan cost?",
            "What is the CloudSync Pro file size limit?"
        ];
        
        this.thresholdRange = {
            min: options.minThreshold || 0.1,
            max: options.maxThreshold || 0.8,
            step: options.step || 0.05
        };
        
        // Expected answers for quality assessment
        this.expectedAnswers = {
            "What is Project Quantum's total budget?": { pattern: /\$847,231/, type: 'budget' },
            "Who leads Project Quantum at TechCorp?": { pattern: /Dr\.?\s*Sarah\s+Chen/i, type: 'person' },
            "How many vacation days do TechCorp employees get?": { pattern: /25\s+(?:vacation\s+)?days/i, type: 'days' },
            "What is TechCorp's Q3 2024 revenue?": { pattern: /\$847\.2\s*million/i, type: 'revenue' },
            "How much does the Enterprise DataVault plan cost?": { pattern: /\$2,499/i, type: 'cost' },
            "What is the CloudSync Pro file size limit?": { pattern: /50\s*GB/i, type: 'size' }
        };
    }
    
    /**
     * Run comprehensive threshold tuning
     */
    async runTuning() {
        console.log('🔧 Starting Threshold Tuning Analysis\n');
        console.log(`Testing thresholds from ${this.thresholdRange.min} to ${this.thresholdRange.max} (step: ${this.thresholdRange.step})`);
        console.log(`Questions: ${this.testQuestions.length}`);
        console.log('─'.repeat(60));
        
        const results = {};
        const thresholds = this.generateThresholds();
        
        console.log(`\n📊 Testing ${thresholds.length} different thresholds...\n`);
        
        for (let i = 0; i < thresholds.length; i++) {
            const threshold = thresholds[i];
            
            process.stdout.write(`Progress: [${i + 1}/${thresholds.length}] Threshold ${threshold.toFixed(2)}...`);
            
            const thresholdResults = await this.testThreshold(threshold);
            results[threshold] = thresholdResults;
            
            const successRate = this.calculateSuccessRate(thresholdResults);
            process.stdout.write(` ${successRate.toFixed(0)}% success\n`);
        }
        
        // Analyze results
        const analysis = this.analyzeResults(results);
        this.displayTuningResults(analysis);
        
        return analysis;
    }
    
    /**
     * Generate array of thresholds to test
     */
    generateThresholds() {
        const thresholds = [];
        for (let t = this.thresholdRange.min; t <= this.thresholdRange.max; t += this.thresholdRange.step) {
            thresholds.push(Math.round(t * 100) / 100); // Round to 2 decimal places
        }
        return thresholds;
    }
    
    /**
     * Test a specific threshold value
     */
    async testThreshold(threshold) {
        const results = {};
        
        for (const question of this.testQuestions) {
            try {
                const result = await this.rag.answerWithEnhancedRAG(question, {
                    filteringMode: 'threshold',
                    similarityThreshold: threshold,
                    maxChunks: 3
                });
                
                const quality = this.assessAnswerQuality(result.answer, question);
                
                results[question] = {
                    answer: result.answer,
                    chunks: result.chunks?.length || 0,
                    totalTime: result.totalTime || 0,
                    processingTime: result.processingTime || 0,
                    avgSimilarity: result.metrics?.avgSimilarityAfter || 0,
                    quality: quality.score,
                    hasExpectedContent: quality.hasExpectedContent,
                    isCorrect: quality.score >= 0.8
                };
                
            } catch (error) {
                results[question] = {
                    answer: '',
                    chunks: 0,
                    totalTime: 0,
                    quality: 0,
                    hasExpectedContent: false,
                    isCorrect: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }
    
    /**
     * Assess answer quality against expected content
     */
    assessAnswerQuality(answer, question) {
        const expected = this.expectedAnswers[question];
        let score = 0;
        let hasExpectedContent = false;
        
        if (!expected) {
            // Generic quality assessment
            const lowerAnswer = answer.toLowerCase();
            if (lowerAnswer.includes('unfortunately') || 
                lowerAnswer.includes("don't have") || 
                lowerAnswer.includes("no information")) {
                return { score: 0, hasExpectedContent: false };
            }
            
            return { score: 0.5, hasExpectedContent: false }; // Unknown expectation
        }
        
        // Check for expected pattern
        if (expected.pattern.test(answer)) {
            score = 1.0;
            hasExpectedContent = true;
        } else {
            // Check for partial content based on type
            switch (expected.type) {
                case 'budget':
                case 'cost':
                case 'revenue':
                    if (/\$[\d,.]+(?: million|M|K)?/.test(answer)) score = 0.6;
                    break;
                case 'person':
                    if (/Dr\.\s*\w+\s+\w+|[A-Z][a-z]+\s+[A-Z][a-z]+/.test(answer)) score = 0.6;
                    break;
                case 'days':
                    if (/\d+\s+(?:vacation\s+)?days?/i.test(answer)) score = 0.6;
                    break;
                case 'size':
                    if (/\d+\s*GB/i.test(answer)) score = 0.6;
                    break;
            }
            
            // Penalty for "don't know" responses
            const lowerAnswer = answer.toLowerCase();
            if (lowerAnswer.includes('unfortunately') || 
                lowerAnswer.includes("don't have") || 
                lowerAnswer.includes("no information")) {
                score = 0;
            }
        }
        
        return { score, hasExpectedContent };
    }
    
    /**
     * Calculate success rate for a threshold's results
     */
    calculateSuccessRate(results) {
        const questions = Object.keys(results);
        const successes = questions.filter(q => results[q].isCorrect).length;
        return questions.length > 0 ? (successes / questions.length) * 100 : 0;
    }
    
    /**
     * Analyze all threshold results to find optimal values
     */
    analyzeResults(results) {
        const analysis = {
            thresholds: [],
            optimal: null,
            recommendations: []
        };
        
        // Calculate metrics for each threshold
        for (const [threshold, thresholdResults] of Object.entries(results)) {
            const t = parseFloat(threshold);
            const questions = Object.keys(thresholdResults);
            
            let totalCorrect = 0;
            let totalChunks = 0;
            let totalTime = 0;
            let totalQuality = 0;
            let questionsWithChunks = 0;
            let avgSimilarity = 0;
            
            for (const question of questions) {
                const result = thresholdResults[question];
                if (result.isCorrect) totalCorrect++;
                totalChunks += result.chunks;
                totalTime += result.totalTime;
                totalQuality += result.quality;
                if (result.chunks > 0) {
                    questionsWithChunks++;
                    avgSimilarity += result.avgSimilarity;
                }
            }
            
            const metrics = {
                threshold: t,
                successRate: (totalCorrect / questions.length) * 100,
                avgChunks: totalChunks / questions.length,
                avgTime: totalTime / questions.length,
                avgQuality: totalQuality / questions.length,
                avgSimilarity: questionsWithChunks > 0 ? avgSimilarity / questionsWithChunks : 0,
                questionsAnswered: questionsWithChunks,
                efficiency: questionsWithChunks > 0 ? (totalCorrect / questionsWithChunks) * 100 : 0
            };
            
            analysis.thresholds.push(metrics);
        }
        
        // Sort by success rate, then by efficiency
        analysis.thresholds.sort((a, b) => {
            if (Math.abs(a.successRate - b.successRate) < 5) {
                return b.efficiency - a.efficiency; // Higher efficiency if success rates are close
            }
            return b.successRate - a.successRate; // Higher success rate
        });
        
        // Find optimal threshold
        analysis.optimal = analysis.thresholds[0];
        
        // Generate recommendations
        this.generateRecommendations(analysis);
        
        return analysis;
    }
    
    /**
     * Generate threshold recommendations
     */
    generateRecommendations(analysis) {
        const optimal = analysis.optimal;
        const thresholds = analysis.thresholds;
        
        // High precision recommendation
        const highPrecision = thresholds.find(t => t.questionsAnswered <= 2 && t.successRate >= 80);
        
        // Balanced recommendation
        const balanced = thresholds.find(t => t.questionsAnswered >= 3 && t.successRate >= 50);
        
        // High recall recommendation
        const highRecall = thresholds.find(t => t.questionsAnswered >= 4);
        
        analysis.recommendations = [
            {
                type: 'Optimal Overall',
                threshold: optimal.threshold,
                description: `Best balance of success rate (${optimal.successRate.toFixed(0)}%) and coverage`,
                useCase: 'General purpose RAG applications'
            }
        ];
        
        if (highPrecision && highPrecision.threshold !== optimal.threshold) {
            analysis.recommendations.push({
                type: 'High Precision',
                threshold: highPrecision.threshold,
                description: `Maximum accuracy (${highPrecision.successRate.toFixed(0)}%) with fewer answers`,
                useCase: 'When accuracy is more important than coverage'
            });
        }
        
        if (balanced && balanced.threshold !== optimal.threshold) {
            analysis.recommendations.push({
                type: 'Balanced',
                threshold: balanced.threshold,
                description: `Good balance of accuracy (${balanced.successRate.toFixed(0)}%) and coverage (${balanced.questionsAnswered} questions)`,
                useCase: 'Production systems requiring consistent responses'
            });
        }
        
        if (highRecall && highRecall.threshold !== optimal.threshold) {
            analysis.recommendations.push({
                type: 'High Recall',
                threshold: highRecall.threshold,
                description: `Maximum coverage (${highRecall.questionsAnswered} questions) with ${highRecall.successRate.toFixed(0)}% accuracy`,
                useCase: 'When providing some answer is better than no answer'
            });
        }
    }
    
    /**
     * Display comprehensive tuning results
     */
    displayTuningResults(analysis) {
        console.log('\n🎯 Threshold Tuning Results');
        console.log('═'.repeat(70));
        
        // Top 5 thresholds
        console.log('\n📊 Top 5 Threshold Values:');
        console.log('Threshold | Success% | Avg Chunks | Efficiency | Questions Answered');
        console.log('─'.repeat(65));
        
        const top5 = analysis.thresholds.slice(0, 5);
        for (const metrics of top5) {
            const line = `${metrics.threshold.toFixed(2).padStart(9)} | ${metrics.successRate.toFixed(0).padStart(7)}% | ${metrics.avgChunks.toFixed(1).padStart(10)} | ${metrics.efficiency.toFixed(0).padStart(9)}% | ${metrics.questionsAnswered.toString().padStart(17)}`;
            console.log(line);
        }
        
        // Recommendations
        console.log('\n🎯 Threshold Recommendations:');
        console.log('─'.repeat(50));
        
        for (const rec of analysis.recommendations) {
            console.log(`\n${rec.type}: ${rec.threshold}`);
            console.log(`   ${rec.description}`);
            console.log(`   Use case: ${rec.useCase}`);
        }
        
        // Performance curve insights
        console.log('\n📈 Performance Insights:');
        const optimalThreshold = analysis.optimal.threshold;
        const maxSuccess = Math.max(...analysis.thresholds.map(t => t.successRate));
        const minThreshold = Math.min(...analysis.thresholds.map(t => t.threshold));
        const maxThreshold = Math.max(...analysis.thresholds.map(t => t.threshold));
        
        console.log(`   • Optimal threshold: ${optimalThreshold} (${analysis.optimal.successRate.toFixed(0)}% success)`);
        console.log(`   • Maximum success rate achieved: ${maxSuccess.toFixed(0)}%`);
        console.log(`   • Threshold range tested: ${minThreshold} - ${maxThreshold}`);
        
        const lowThresholdPerf = analysis.thresholds.find(t => t.threshold <= 0.2);
        const highThresholdPerf = analysis.thresholds.find(t => t.threshold >= 0.6);
        
        if (lowThresholdPerf && highThresholdPerf) {
            console.log(`   • Low threshold (${lowThresholdPerf.threshold}): ${lowThresholdPerf.successRate.toFixed(0)}% success, ${lowThresholdPerf.avgChunks.toFixed(1)} chunks`);
            console.log(`   • High threshold (${highThresholdPerf.threshold}): ${highThresholdPerf.successRate.toFixed(0)}% success, ${highThresholdPerf.avgChunks.toFixed(1)} chunks`);
        }
        
        // Quality vs Quantity trade-off
        console.log('\n⚖️ Quality vs Quantity Trade-off:');
        const sortedByRecall = [...analysis.thresholds].sort((a, b) => b.questionsAnswered - a.questionsAnswered);
        const highRecall = sortedByRecall[0];
        const sortedByPrecision = [...analysis.thresholds].sort((a, b) => b.successRate - a.successRate);
        const highPrecision = sortedByPrecision[0];
        
        console.log(`   • Maximum recall: ${highRecall.questionsAnswered} questions at threshold ${highRecall.threshold} (${highRecall.successRate.toFixed(0)}% accuracy)`);
        console.log(`   • Maximum precision: ${highPrecision.successRate.toFixed(0)}% accuracy at threshold ${highPrecision.threshold} (${highPrecision.questionsAnswered} questions)`);
        
        console.log('\n✅ Tuning Complete! Use the optimal threshold in your RAG system.');
    }
    
    async close() {
        await this.rag.close();
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
🔧 Threshold Tuning - Find optimal similarity cutoffs for RAG filtering

Usage:
  node threshold-tuning.js [options]

Options:
  --min <num>      Minimum threshold to test (default: 0.1)
  --max <num>      Maximum threshold to test (default: 0.8)
  --step <num>     Step size between thresholds (default: 0.05)
  --questions <n>  Number of test questions to use (default: all)
  --help           Show this help message

Examples:
  node threshold-tuning.js
  node threshold-tuning.js --min 0.2 --max 0.6 --step 0.02
        `);
        process.exit(0);
    }
    
    (async () => {
        const minIndex = args.indexOf('--min');
        const minThreshold = minIndex !== -1 ? parseFloat(args[minIndex + 1]) : 0.1;
        
        const maxIndex = args.indexOf('--max');
        const maxThreshold = maxIndex !== -1 ? parseFloat(args[maxIndex + 1]) : 0.8;
        
        const stepIndex = args.indexOf('--step');
        const step = stepIndex !== -1 ? parseFloat(args[stepIndex + 1]) : 0.05;
        
        const tuner = new ThresholdTuner({
            minThreshold,
            maxThreshold,
            step
        });
        
        try {
            await tuner.runTuning();
        } catch (error) {
            console.error('Tuning failed:', error.message);
        } finally {
            await tuner.close();
        }
    })();
}

module.exports = { ThresholdTuner };