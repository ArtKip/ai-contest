#!/usr/bin/env node

require('dotenv').config({ path: '../day1/.env' });
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Import Day 13's document indexer for retrieval
const { DocumentIndexer } = require('../day13/document-indexer');

/**
 * RAG (Retrieval Augmented Generation) Agent
 * 
 * Implements the complete RAG pipeline:
 * 1. Question → Search for relevant chunks
 * 2. Merge chunks with question 
 * 3. Send to LLM
 * 4. Compare with non-RAG answer
 */

class RAGAgent {
    constructor(options = {}) {
        // Use Day 13's indexer for document retrieval
        this.indexer = new DocumentIndexer({
            storage: { dbPath: options.dbPath || './rag_knowledge_base.db' }
        });
        
        this.maxChunks = options.maxChunks || 3;
        this.minSimilarity = options.minSimilarity || 0.1;
        this.maxContextLength = options.maxContextLength || 2000;
        this.verbose = options.verbose !== false;
        
        // Use real Anthropic API or mock LLM
        this.useMockLLM = options.useMockLLM !== false && !process.env.ANTHROPIC_API_KEY;
        this.anthropicKey = process.env.ANTHROPIC_API_KEY;
        
        if (this.verbose) {
            console.log('🤖 RAG Agent initialized');
            console.log(`   Max chunks: ${this.maxChunks}`);
            console.log(`   Min similarity: ${this.minSimilarity}`);
            console.log(`   Using mock LLM: ${this.useMockLLM}`);
        }
    }

    /**
     * Main RAG pipeline: Question → Retrieve → Generate
     */
    async answerWithRAG(question, options = {}) {
        if (this.verbose) console.log(`\n🔍 RAG Pipeline for: "${question}"`);
        
        const startTime = Date.now();
        
        try {
            // Step 1: Search for relevant chunks
            if (this.verbose) console.log('📚 Step 1: Searching for relevant document chunks...');
            const relevantChunks = await this.retrieveRelevantChunks(question, {
                topK: options.maxChunks || this.maxChunks,
                minSimilarity: options.minSimilarity || this.minSimilarity
            });
            
            if (relevantChunks.length === 0) {
                console.log('⚠️ No relevant chunks found in knowledge base');
                return {
                    answer: "I don't have enough information in my knowledge base to answer this question.",
                    chunks: [],
                    context: '',
                    retrievalTime: Date.now() - startTime,
                    generationTime: 0,
                    totalTime: Date.now() - startTime,
                    hasContext: false
                };
            }
            
            console.log(`📖 Found ${relevantChunks.length} relevant chunks`);
            relevantChunks.forEach((chunk, i) => {
                console.log(`   ${i + 1}. ${chunk.document.filename} (${(chunk.similarity * 100).toFixed(1)}% match)`);
            });
            
            const retrievalTime = Date.now() - startTime;
            
            // Step 2: Merge chunks with question to create context
            console.log('\n🔗 Step 2: Merging chunks with question...');
            const context = this.mergeChunksWithQuestion(question, relevantChunks);
            
            console.log(`📝 Created context: ${context.length} characters`);
            
            // Step 3: Send to LLM
            console.log('\n🧠 Step 3: Generating answer with LLM...');
            const generationStart = Date.now();
            
            const answer = await this.generateAnswerWithContext(question, context);
            const generationTime = Date.now() - generationStart;
            
            const totalTime = Date.now() - startTime;
            
            console.log(`✅ RAG answer generated (${totalTime}ms total)`);
            
            return {
                answer,
                chunks: relevantChunks,
                context,
                retrievalTime,
                generationTime,
                totalTime,
                hasContext: true
            };
            
        } catch (error) {
            console.error('❌ RAG pipeline failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate answer without RAG (direct LLM)
     */
    async answerWithoutRAG(question) {
        console.log(`\n🤔 Direct LLM answer for: "${question}"`);
        
        const startTime = Date.now();
        
        const answer = await this.generateAnswerDirect(question);
        const totalTime = Date.now() - startTime;
        
        console.log(`✅ Direct answer generated (${totalTime}ms)`);
        
        return {
            answer,
            chunks: [],
            context: '',
            retrievalTime: 0,
            generationTime: totalTime,
            totalTime,
            hasContext: false
        };
    }

    /**
     * Compare answers with and without RAG
     */
    async compareAnswers(question, options = {}) {
        console.log(`\n🆚 Comparing RAG vs No-RAG for: "${question}"`);
        
        const startTime = Date.now();
        
        // Get both answers
        const [ragResult, directResult] = await Promise.all([
            this.answerWithRAG(question, options),
            this.answerWithoutRAG(question)
        ]);
        
        const totalComparisonTime = Date.now() - startTime;
        
        // Analyze differences
        const analysis = this.analyzeAnswers(question, ragResult, directResult);
        
        const comparison = {
            question,
            ragAnswer: ragResult,
            directAnswer: directResult,
            analysis,
            comparisonTime: totalComparisonTime,
            timestamp: new Date().toISOString()
        };
        
        this.displayComparison(comparison);
        
        return comparison;
    }

    /**
     * Retrieve relevant document chunks
     */
    async retrieveRelevantChunks(question, options = {}) {
        const topK = options.topK || this.maxChunks;
        const minSimilarity = options.minSimilarity || this.minSimilarity;
        
        try {
            const results = await this.indexer.searchDocuments(question, {
                topK,
                minSimilarity
            });
            
            return results.map(result => ({
                similarity: result.similarity,
                chunk: {
                    id: result.chunk.id,
                    content: result.chunk.content,
                    metadata: result.chunk.metadata
                },
                document: result.document
            }));
            
        } catch (error) {
            console.error('Failed to retrieve chunks:', error.message);
            return [];
        }
    }

    /**
     * Merge chunks with question to create context
     */
    mergeChunksWithQuestion(question, relevantChunks) {
        let context = `Question: ${question}\n\nRelevant Information:\n\n`;
        
        let currentLength = context.length;
        
        for (let i = 0; i < relevantChunks.length; i++) {
            const chunk = relevantChunks[i];
            const chunkText = `Source ${i + 1} (${chunk.document.filename}):\n${chunk.chunk.content}\n\n`;
            
            // Check if adding this chunk would exceed max context length
            if (currentLength + chunkText.length > this.maxContextLength) {
                console.log(`⚠️ Context limit reached, using ${i} chunks`);
                break;
            }
            
            context += chunkText;
            currentLength += chunkText.length;
        }
        
        context += `Based on the above information, please answer the question.`;
        
        return context;
    }

    /**
     * Generate answer with context (RAG)
     */
    async generateAnswerWithContext(question, context) {
        if (this.useMockLLM) {
            return this.mockLLMWithContext(question, context);
        }
        
        const prompt = `Based on this context information:

${context}

Please answer the following question: ${question}

Provide a clear, informative answer based on the provided context.`;

        return await this.callAnthropicAPI(prompt);
    }

    /**
     * Generate answer without context (direct)
     */
    async generateAnswerDirect(question) {
        if (this.useMockLLM) {
            return this.mockLLMDirect(question);
        }
        
        return await this.callAnthropicAPI(question);
    }

    /**
     * Call Anthropic Claude API
     */
    async callAnthropicAPI(prompt) {
        if (!this.anthropicKey) {
            throw new Error('ANTHROPIC_API_KEY not found in environment variables');
        }

        try {
            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 300,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.anthropicKey,
                        'anthropic-version': '2023-06-01'
                    }
                }
            );

            return response.data.content[0].text;
        } catch (error) {
            console.error('Anthropic API error:', error.message);
            // Fallback to mock if API fails
            return this.useMockLLM ? 
                this.mockLLMWithContext(prompt, '') : 
                'Error: Could not generate answer';
        }
    }

    /**
     * Mock LLM with context for demonstration
     */
    mockLLMWithContext(question, context) {
        // Simulate processing time
        const delay = Math.random() * 500 + 200;
        return new Promise(resolve => {
            setTimeout(() => {
                // Extract key information from context
                const contextInfo = context.toLowerCase();
                
                let answer = "";
                
                if (question.toLowerCase().includes('machine learning')) {
                    if (contextInfo.includes('machine learning')) {
                        answer = "Based on the provided information, machine learning is a revolutionary technology that has transformed how we process and understand text. Modern ML systems can perform tasks like translation, summarization, and semantic search with remarkable accuracy. The documents indicate that ML uses vector embeddings and similarity techniques to understand and process data effectively.";
                    } else {
                        answer = "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed.";
                    }
                } else if (question.toLowerCase().includes('vector') || question.toLowerCase().includes('embedding')) {
                    if (contextInfo.includes('vector') || contextInfo.includes('embedding')) {
                        answer = "According to the documentation, vector embeddings are mathematical representations that capture semantic meaning in numerical form. They enable computers to understand and compare the meaning of different pieces of text, allowing for semantic similarity searches and document clustering. These vectors represent text as numerical arrays that can be efficiently compared using similarity metrics.";
                    } else {
                        answer = "Vector embeddings are numerical representations of data that capture semantic relationships.";
                    }
                } else if (question.toLowerCase().includes('similarity') || question.toLowerCase().includes('search')) {
                    if (contextInfo.includes('similarity') || contextInfo.includes('search')) {
                        answer = "Based on the provided context, similarity search enables finding documents that are related in meaning rather than just by keywords. The system uses cosine similarity calculations to compare vector embeddings, allowing for semantic understanding and contextual search capabilities. This approach provides more relevant results than traditional keyword matching.";
                    } else {
                        answer = "Similarity search involves finding items that are similar to a given query item.";
                    }
                } else if (question.toLowerCase().includes('javascript') || question.toLowerCase().includes('function')) {
                    if (contextInfo.includes('javascript') || contextInfo.includes('function')) {
                        answer = "The documentation shows JavaScript functions for calculating similarity between vectors. The example demonstrates how to compute cosine similarity by calculating dot products and magnitudes of vectors, which is essential for comparing document embeddings and determining semantic similarity.";
                    } else {
                        answer = "JavaScript is a programming language commonly used for web development and various applications.";
                    }
                } else {
                    if (context.length > question.length + 100) {
                        answer = "Based on the relevant information provided, I can give you a contextual answer. The documents contain specific details that help address your question more accurately than general knowledge alone.";
                    } else {
                        answer = "I don't have specific information about this topic in my current knowledge base.";
                    }
                }
                
                resolve(answer);
            }, delay);
        });
    }

    /**
     * Mock LLM without context for demonstration
     */
    mockLLMDirect(question) {
        // Simulate processing time
        const delay = Math.random() * 300 + 100;
        return new Promise(resolve => {
            setTimeout(() => {
                let answer = "";
                
                if (question.toLowerCase().includes('machine learning')) {
                    answer = "Machine learning is a branch of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience. It involves training models on data to make predictions or decisions without being explicitly programmed for every scenario.";
                } else if (question.toLowerCase().includes('vector') || question.toLowerCase().includes('embedding')) {
                    answer = "Vector embeddings are dense numerical representations of data (like words, sentences, or documents) in a continuous vector space. They capture semantic relationships and allow machine learning models to process and understand textual or other types of data mathematically.";
                } else if (question.toLowerCase().includes('similarity') || question.toLowerCase().includes('search')) {
                    answer = "Similarity search refers to finding items in a dataset that are most similar to a given query item. This is typically done by measuring distances or similarities between vector representations of the items, often using metrics like cosine similarity or Euclidean distance.";
                } else if (question.toLowerCase().includes('javascript') || question.toLowerCase().includes('function')) {
                    answer = "JavaScript is a versatile programming language primarily used for web development. Functions in JavaScript are reusable blocks of code that perform specific tasks and can accept parameters and return values. They can be declared using function declarations, function expressions, or arrow functions.";
                } else {
                    answer = "I can provide a general answer based on my training knowledge, but I don't have access to specific documents or context that might contain more detailed or accurate information about your particular question.";
                }
                
                resolve(answer);
            }, delay);
        });
    }

    /**
     * Analyze differences between RAG and direct answers
     */
    analyzeAnswers(question, ragResult, directResult) {
        const ragAnswer = ragResult.answer.toLowerCase();
        const directAnswer = directResult.answer.toLowerCase();
        
        const analysis = {
            lengthDifference: ragResult.answer.length - directResult.answer.length,
            hasSpecificExamples: {
                rag: this.containsSpecificExamples(ragResult.answer),
                direct: this.containsSpecificExamples(directResult.answer)
            },
            mentionsDocuments: {
                rag: ragAnswer.includes('based on') || ragAnswer.includes('according to') || ragAnswer.includes('documentation'),
                direct: directAnswer.includes('based on') || directAnswer.includes('according to') || directAnswer.includes('documentation')
            },
            technicalDetail: {
                rag: this.assessTechnicalDetail(ragResult.answer),
                direct: this.assessTechnicalDetail(directResult.answer)
            },
            factualClaims: {
                rag: this.countFactualClaims(ragResult.answer),
                direct: this.countFactualClaims(directResult.answer)
            },
            confidence: {
                rag: this.assessConfidence(ragResult.answer),
                direct: this.assessConfidence(directResult.answer)
            }
        };
        
        // Determine where RAG helped
        analysis.ragAdvantages = [];
        analysis.ragDisadvantages = [];
        
        if (ragResult.hasContext && ragResult.chunks.length > 0) {
            if (analysis.hasSpecificExamples.rag && !analysis.hasSpecificExamples.direct) {
                analysis.ragAdvantages.push('Provided specific examples from documents');
            }
            
            if (analysis.technicalDetail.rag > analysis.technicalDetail.direct) {
                analysis.ragAdvantages.push('More technical detail and accuracy');
            }
            
            if (analysis.factualClaims.rag > analysis.factualClaims.direct) {
                analysis.ragAdvantages.push('More factual claims with document backing');
            }
            
            if (analysis.mentionsDocuments.rag) {
                analysis.ragAdvantages.push('Clear attribution to source documents');
            }
            
            if (analysis.lengthDifference > 50) {
                analysis.ragAdvantages.push('More comprehensive and detailed answer');
            }
        } else {
            analysis.ragDisadvantages.push('No relevant context found in knowledge base');
        }
        
        if (ragResult.totalTime > directResult.totalTime * 2) {
            analysis.ragDisadvantages.push('Significantly slower response time');
        }
        
        if (analysis.confidence.direct > analysis.confidence.rag) {
            analysis.ragDisadvantages.push('Lower confidence due to limited context');
        }
        
        return analysis;
    }

    containsSpecificExamples(text) {
        const examples = ['for example', 'such as', 'including', 'like', 'demonstrates', 'shows'];
        return examples.some(phrase => text.toLowerCase().includes(phrase));
    }

    assessTechnicalDetail(text) {
        const technicalTerms = ['algorithm', 'implementation', 'function', 'method', 'calculation', 'process', 'technique'];
        return technicalTerms.filter(term => text.toLowerCase().includes(term)).length;
    }

    countFactualClaims(text) {
        // Simple heuristic: count sentences with definitive statements
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const factualIndicators = ['is', 'are', 'can', 'enables', 'allows', 'provides', 'uses'];
        
        return sentences.filter(sentence => {
            const words = sentence.toLowerCase().split(' ');
            return factualIndicators.some(indicator => words.includes(indicator));
        }).length;
    }

    assessConfidence(text) {
        const uncertainPhrases = ['might', 'could', 'possibly', 'perhaps', 'may', "don't have", 'unclear'];
        const confidentPhrases = ['is', 'are', 'definitely', 'clearly', 'specifically', 'exactly'];
        
        const uncertainCount = uncertainPhrases.filter(phrase => text.toLowerCase().includes(phrase)).length;
        const confidentCount = confidentPhrases.filter(phrase => text.toLowerCase().includes(phrase)).length;
        
        return Math.max(0, confidentCount - uncertainCount);
    }

    /**
     * Close the RAG agent and cleanup resources
     */
    async close() {
        if (this.indexer && this.indexer.close) {
            await this.indexer.close();
        }
    }

    /**
     * Display comparison results
     */
    displayComparison(comparison) {
        console.log('\n' + '='.repeat(80));
        console.log('🆚 RAG vs Direct LLM Comparison');
        console.log('='.repeat(80));
        
        console.log(`\n❓ Question: ${comparison.question}`);
        
        console.log('\n📚 RAG Answer (with document retrieval):');
        console.log('─'.repeat(50));
        console.log(comparison.ragAnswer.answer);
        
        if (comparison.ragAnswer.chunks.length > 0) {
            console.log(`\n🔍 Retrieved ${comparison.ragAnswer.chunks.length} chunks:`);
            comparison.ragAnswer.chunks.forEach((chunk, i) => {
                console.log(`   ${i + 1}. ${chunk.document.filename} (${(chunk.similarity * 100).toFixed(1)}% match)`);
            });
        } else {
            console.log('\n⚠️ No relevant chunks found');
        }
        
        console.log('\n🤖 Direct LLM Answer (no retrieval):');
        console.log('─'.repeat(50));
        console.log(comparison.directAnswer.answer);
        
        console.log('\n📊 Analysis:');
        console.log('─'.repeat(50));
        
        if (comparison.analysis.ragAdvantages.length > 0) {
            console.log('✅ RAG Advantages:');
            comparison.analysis.ragAdvantages.forEach(advantage => {
                console.log(`   • ${advantage}`);
            });
        }
        
        if (comparison.analysis.ragDisadvantages.length > 0) {
            console.log('❌ RAG Disadvantages:');
            comparison.analysis.ragDisadvantages.forEach(disadvantage => {
                console.log(`   • ${disadvantage}`);
            });
        }
        
        console.log('\n⏱️ Performance:');
        console.log(`   RAG Total Time: ${comparison.ragAnswer.totalTime}ms (${comparison.ragAnswer.retrievalTime}ms retrieval + ${comparison.ragAnswer.generationTime}ms generation)`);
        console.log(`   Direct Time: ${comparison.directAnswer.totalTime}ms`);
        
        console.log('\n📏 Response Details:');
        console.log(`   RAG Answer Length: ${comparison.ragAnswer.answer.length} chars`);
        console.log(`   Direct Answer Length: ${comparison.directAnswer.answer.length} chars`);
        console.log(`   Technical Detail Score: RAG=${comparison.analysis.technicalDetail.rag}, Direct=${comparison.analysis.technicalDetail.direct}`);
        console.log(`   Factual Claims: RAG=${comparison.analysis.factualClaims.rag}, Direct=${comparison.analysis.factualClaims.direct}`);
        
        console.log('\n' + '='.repeat(80));
    }

    /**
     * Batch evaluation with multiple questions
     */
    async batchEvaluation(questions) {
        console.log(`\n🔬 Running batch evaluation with ${questions.length} questions`);
        
        const results = [];
        
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            console.log(`\n[${i + 1}/${questions.length}] Processing: ${question}`);
            
            try {
                const comparison = await this.compareAnswers(question);
                results.push(comparison);
                
                // Brief summary
                const advantages = comparison.analysis.ragAdvantages.length;
                const disadvantages = comparison.analysis.ragDisadvantages.length;
                console.log(`   Summary: ${advantages} advantages, ${disadvantages} disadvantages`);
                
            } catch (error) {
                console.error(`   Error: ${error.message}`);
                results.push({
                    question,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        this.displayBatchSummary(results);
        return results;
    }

    displayBatchSummary(results) {
        console.log('\n' + '='.repeat(80));
        console.log('📊 Batch Evaluation Summary');
        console.log('='.repeat(80));
        
        const successful = results.filter(r => !r.error);
        const failed = results.filter(r => r.error);
        
        console.log(`\n✅ Successful evaluations: ${successful.length}`);
        console.log(`❌ Failed evaluations: ${failed.length}`);
        
        if (successful.length > 0) {
            const totalAdvantages = successful.reduce((sum, r) => sum + r.analysis.ragAdvantages.length, 0);
            const totalDisadvantages = successful.reduce((sum, r) => sum + r.analysis.ragDisadvantages.length, 0);
            const avgRagTime = successful.reduce((sum, r) => sum + r.ragAnswer.totalTime, 0) / successful.length;
            const avgDirectTime = successful.reduce((sum, r) => sum + r.directAnswer.totalTime, 0) / successful.length;
            
            console.log(`\n📈 Overall Statistics:`);
            console.log(`   Total RAG advantages identified: ${totalAdvantages}`);
            console.log(`   Total RAG disadvantages identified: ${totalDisadvantages}`);
            console.log(`   Average RAG response time: ${Math.round(avgRagTime)}ms`);
            console.log(`   Average direct response time: ${Math.round(avgDirectTime)}ms`);
            console.log(`   Speed ratio: ${(avgRagTime / avgDirectTime).toFixed(1)}x slower`);
            
            // Most common advantages/disadvantages
            const allAdvantages = successful.flatMap(r => r.analysis.ragAdvantages);
            const allDisadvantages = successful.flatMap(r => r.analysis.ragDisadvantages);
            
            if (allAdvantages.length > 0) {
                console.log(`\n🏆 Most common RAG advantages:`);
                const advantageCounts = {};
                allAdvantages.forEach(adv => advantageCounts[adv] = (advantageCounts[adv] || 0) + 1);
                Object.entries(advantageCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .forEach(([adv, count]) => console.log(`   • ${adv} (${count} times)`));
            }
            
            if (allDisadvantages.length > 0) {
                console.log(`\n⚠️ Most common RAG disadvantages:`);
                const disadvantageCounts = {};
                allDisadvantages.forEach(dis => disadvantageCounts[dis] = (disadvantageCounts[dis] || 0) + 1);
                Object.entries(disadvantageCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .forEach(([dis, count]) => console.log(`   • ${dis} (${count} times)`));
            }
        }
    }

    async close() {
        await this.indexer.close();
    }
}

module.exports = { RAGAgent };

// CLI Interface
async function main() {
    const args = parseArgs();
    
    if (args.help) {
        printUsage();
        return;
    }
    
    const agent = new RAGAgent({
        dbPath: args.dbPath || './rag_knowledge_base.db',
        maxChunks: args.maxChunks || 3,
        minSimilarity: args.minSimilarity || 0.1
    });
    
    try {
        if (args.question) {
            // Single question comparison
            await agent.compareAnswers(args.question);
        } else if (args.batch) {
            // Batch evaluation
            const questions = [
                "What is machine learning?",
                "How do vector embeddings work?",
                "What is cosine similarity?", 
                "How do you calculate similarity in JavaScript?",
                "What are the benefits of semantic search?",
                "How does document indexing work?"
            ];
            
            await agent.batchEvaluation(questions);
        } else {
            // Interactive mode
            await interactiveMode(agent);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await agent.close();
    }
}

function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);
    
    for (let i = 0; i < argv.length; i++) {
        switch (argv[i]) {
            case '--question':
            case '-q':
                args.question = argv[++i];
                break;
            case '--batch':
            case '-b':
                args.batch = true;
                break;
            case '--max-chunks':
                args.maxChunks = parseInt(argv[++i]);
                break;
            case '--min-similarity':
                args.minSimilarity = parseFloat(argv[++i]);
                break;
            case '--db-path':
                args.dbPath = argv[++i];
                break;
            case '--help':
            case '-h':
                args.help = true;
                break;
        }
    }
    
    return args;
}

function printUsage() {
    console.log(`
🤖 RAG Agent - Compare answers with and without retrieval

Usage:
  node rag-agent.js [options]

Options:
  -q, --question <text>     Ask a specific question
  -b, --batch              Run batch evaluation with predefined questions  
  --max-chunks <num>       Maximum chunks to retrieve (default: 3)
  --min-similarity <f>     Minimum similarity threshold (default: 0.1)
  --db-path <path>         Path to knowledge base database
  -h, --help               Show this help

Examples:
  node rag-agent.js -q "What is machine learning?"
  node rag-agent.js --batch
  node rag-agent.js -q "How does vector search work?" --max-chunks 5
`);
}

async function interactiveMode(agent) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('\n🤖 Interactive RAG Comparison Mode');
    console.log('Ask questions to compare RAG vs direct LLM answers');
    console.log('Type "quit" to exit\n');
    
    const askQuestion = () => {
        rl.question('❓ Your question: ', async (question) => {
            if (question.toLowerCase() === 'quit') {
                rl.close();
                return;
            }
            
            if (question.trim()) {
                try {
                    await agent.compareAnswers(question);
                } catch (error) {
                    console.error('❌ Error:', error.message);
                }
            }
            
            console.log('\n' + '─'.repeat(50));
            askQuestion();
        });
    };
    
    askQuestion();
}

if (require.main === module) {
    main().catch(console.error);
}