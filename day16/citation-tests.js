#!/usr/bin/env node

const { CitedRAG } = require('./cited-rag');

/**
 * Citation Tests - Evaluate citation compliance and hallucination reduction
 * 
 * Tests the Day 16 citation system on 5 questions to verify:
 * 1. Citations are included in every response
 * 2. Hallucinations are reduced through source grounding
 * 3. Source transparency is maintained
 */

const TEST_QUESTIONS = [
    {
        id: 'vacation',
        question: "What is the company's vacation policy?",
        expectedSources: ['employee-handbook.md'],
        category: 'policy'
    },
    {
        id: 'embeddings',
        question: "How do vector embeddings work in search systems?",
        expectedSources: ['vector-embeddings.md', 'ai-search-integration.md'],
        category: 'technical'
    },
    {
        id: 'similarity',
        question: "What are the different similarity metrics used in information retrieval?",
        expectedSources: ['similarity-search.md', 'vector-embeddings.md'],
        category: 'technical'
    },
    {
        id: 'revenue',
        question: "What was TechCorp's financial performance in Q3 2024?",
        expectedSources: ['company-quarterly-report.md', 'mixed-metrics-report.md'],
        category: 'financial'
    },
    {
        id: 'ml_applications',
        question: "What are the main applications of machine learning mentioned in the documents?",
        expectedSources: ['machine-learning.md', 'ai-search-integration.md'],
        category: 'technical'
    }
];

class CitationTester {
    constructor() {
        this.results = [];
        this.metrics = {
            totalQuestions: 0,
            questionsWithCitations: 0,
            averageCitationsPerQuestion: 0,
            hallucinations: 0,
            sourceComplianceRate: 0
        };
    }
    
    async runAllTests() {
        console.log('🧪 Day 16: Citation & Sources Testing');
        console.log('─'.repeat(50));
        console.log('Testing 5 questions for citation compliance and hallucination reduction\n');
        
        const rag = new CitedRAG({ 
            verbose: false,
            requireCitations: true,
            enforceValidation: true
        });
        
        try {
            for (let i = 0; i < TEST_QUESTIONS.length; i++) {
                const testCase = TEST_QUESTIONS[i];
                console.log(`\n${i + 1}. Testing: ${testCase.question}`);
                console.log('   Category:', testCase.category);
                
                const result = await this.testQuestion(rag, testCase);
                this.results.push(result);
                
                // Display immediate results
                this.displayTestResult(result, i + 1);
            }
            
            // Generate overall analysis
            this.analyzeResults();
            this.displayOverallResults(rag);
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
        } finally {
            await rag.close();
        }
    }
    
    async testQuestion(rag, testCase) {
        try {
            // Test both cited and uncited versions
            const comparison = await rag.compareWithAndWithoutCitations(testCase.question, {
                maxChunks: 3,
                similarityThreshold: 0.15
            });
            
            const citedResult = comparison.cited;
            const regularResult = comparison.regular;
            
            // Analyze citation quality
            const citationAnalysis = this.analyzeCitationQuality(citedResult);
            
            // Check source compliance
            const sourceCompliance = this.checkSourceCompliance(
                citedResult.sourceReferences, 
                testCase.expectedSources
            );
            
            return {
                testCase,
                cited: citedResult,
                regular: regularResult,
                comparison: comparison.comparison,
                citationAnalysis,
                sourceCompliance,
                success: citedResult.hasValidCitations && citationAnalysis.qualityScore > 0.6
            };
            
        } catch (error) {
            return {
                testCase,
                error: error.message,
                success: false
            };
        }
    }
    
    analyzeCitationQuality(result) {
        if (!result.validationDetails) {
            return { qualityScore: 0, issues: ['No validation data available'] };
        }
        
        const validation = result.validationDetails;
        const issues = [];
        
        if (validation.citationCount === 0) {
            issues.push('No citations found');
        }
        
        if (validation.invalidCitations.length > 0) {
            issues.push(`${validation.invalidCitations.length} invalid citation(s)`);
        }
        
        if (!validation.hasSourcesSection) {
            issues.push('No Sources section found');
        }
        
        if (validation.citationCoverage < 0.3) {
            issues.push('Low citation coverage of facts');
        }
        
        return {
            qualityScore: validation.qualityScore,
            citationCount: validation.citationCount,
            coverage: validation.citationCoverage,
            hasSourcesSection: validation.hasSourcesSection,
            issues
        };
    }
    
    checkSourceCompliance(actualSources, expectedSources) {
        const actualFilenames = actualSources.map(s => s.filename);
        const foundExpected = expectedSources.filter(expected => 
            actualFilenames.some(actual => actual.includes(expected.replace('.md', '')))
        );
        
        return {
            expectedCount: expectedSources.length,
            foundCount: foundExpected.length,
            compliance: foundExpected.length / expectedSources.length,
            foundSources: foundExpected,
            actualSources: actualFilenames
        };
    }
    
    displayTestResult(result, number) {
        const { testCase, cited, citationAnalysis, sourceCompliance } = result;
        
        if (result.error) {
            console.log(`   ❌ Test failed: ${result.error}`);
            return;
        }
        
        const status = result.success ? '✅' : '⚠️';
        console.log(`   ${status} Citations: ${cited.citationCount} | Quality: ${Math.round(citationAnalysis.qualityScore * 100)}%`);
        console.log(`   📄 Sources: ${cited.sourceReferences.length} referenced`);
        
        if (citationAnalysis.issues.length > 0) {
            console.log(`   ⚠️ Issues: ${citationAnalysis.issues.join(', ')}`);
        }
        
        // Show answer preview
        const preview = cited.answer.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   💬 Answer: ${preview}...`);
    }
    
    analyzeResults() {
        this.metrics.totalQuestions = this.results.length;
        this.metrics.questionsWithCitations = this.results.filter(r => 
            r.cited && r.cited.citationCount > 0
        ).length;
        
        const totalCitations = this.results.reduce((sum, r) => 
            sum + (r.cited ? r.cited.citationCount : 0), 0
        );
        this.metrics.averageCitationsPerQuestion = totalCitations / this.metrics.totalQuestions;
        
        const totalCompliance = this.results.reduce((sum, r) => 
            sum + (r.sourceCompliance ? r.sourceCompliance.compliance : 0), 0
        );
        this.metrics.sourceComplianceRate = totalCompliance / this.metrics.totalQuestions;
        
        this.metrics.hallucinations = this.results.filter(r => 
            r.comparison && r.comparison.hallucinations && r.comparison.hallucinations.suspected
        ).length;
    }
    
    displayOverallResults(rag) {
        console.log('\n📊 OVERALL CITATION TEST RESULTS');
        console.log('═'.repeat(50));
        
        const successRate = (this.results.filter(r => r.success).length / this.metrics.totalQuestions) * 100;
        const citationCompliance = (this.metrics.questionsWithCitations / this.metrics.totalQuestions) * 100;
        
        console.log(`✅ Success Rate: ${Math.round(successRate)}% (${this.results.filter(r => r.success).length}/${this.metrics.totalQuestions})`);
        console.log(`📚 Citation Compliance: ${Math.round(citationCompliance)}% of responses included citations`);
        console.log(`🔗 Average Citations per Answer: ${Math.round(this.metrics.averageCitationsPerQuestion * 10) / 10}`);
        console.log(`📄 Source Compliance: ${Math.round(this.metrics.sourceComplianceRate * 100)}% expected sources found`);
        console.log(`🚨 Suspected Hallucinations: ${this.metrics.hallucinations} responses`);
        
        // Detailed analysis
        console.log('\n📋 DETAILED ANALYSIS:');
        
        // Citation patterns by category
        const categories = {};
        this.results.forEach(result => {
            const category = result.testCase.category;
            if (!categories[category]) {
                categories[category] = { count: 0, citations: 0, success: 0 };
            }
            categories[category].count++;
            categories[category].citations += result.cited ? result.cited.citationCount : 0;
            categories[category].success += result.success ? 1 : 0;
        });
        
        Object.entries(categories).forEach(([category, stats]) => {
            const avgCitations = stats.citations / stats.count;
            const successRate = (stats.success / stats.count) * 100;
            console.log(`   ${category}: ${Math.round(avgCitations * 10) / 10} avg citations, ${Math.round(successRate)}% success`);
        });
        
        // RAG system metrics
        const ragMetrics = rag.getCitationMetrics();
        console.log('\n🔧 SYSTEM METRICS:');
        console.log(`   Citation compliance: ${Math.round(ragMetrics.citationCompliance)}%`);
        console.log(`   Validation failures: ${ragMetrics.validationFailures}`);
        console.log(`   Average citations per response: ${ragMetrics.avgCitations}`);
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (citationCompliance < 100) {
            console.log('   • Strengthen citation enforcement in prompts');
        }
        if (this.metrics.sourceComplianceRate < 0.8) {
            console.log('   • Improve document retrieval relevance');
        }
        if (this.metrics.hallucinations > 0) {
            console.log('   • Add stricter hallucination prevention');
        }
        if (successRate >= 80) {
            console.log('   ✅ Citation system performing well!');
        }
    }
}

// Run if called directly
if (require.main === module) {
    (async () => {
        const tester = new CitationTester();
        await tester.runAllTests();
    })();
}

module.exports = { CitationTester, TEST_QUESTIONS };