#!/usr/bin/env node

require('dotenv').config({ path: '../day1/.env' });
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Import Day 14's RAG system as baseline
const { RAGAgent } = require('../day14/rag-agent');

/**
 * Enhanced RAG System with Reranking & Filtering
 * 
 * Adds second-stage processing after initial retrieval:
 * 1. Similarity threshold filtering
 * 2. Semantic reranking
 * 3. Quality-based chunk selection
 */
class RerankedRAG extends RAGAgent {
    constructor(options = {}) {
        super(options);
        
        // Filtering and reranking configuration
        this.filteringMode = options.filteringMode || 'none'; // 'none', 'threshold', 'rerank'
        this.similarityThreshold = options.similarityThreshold || 0.3;
        this.maxChunksAfterFiltering = options.maxChunksAfterFiltering || 3;
        this.rerankerType = options.rerankerType || 'cross_encoder'; // 'cross_encoder', 'semantic', 'hybrid'
        this.enableAdaptiveThreshold = options.enableAdaptiveThreshold || false;
        
        // Quality metrics
        this.metricsEnabled = options.metricsEnabled !== false;
        this.filteringMetrics = {
            chunksBeforeFiltering: 0,
            chunksAfterFiltering: 0,
            chunksFiltered: 0,
            avgSimilarityBefore: 0,
            avgSimilarityAfter: 0
        };
        
        if (this.verbose) {
            console.log(`🔄 Reranked RAG initialized`);
            console.log(`   Filtering mode: ${this.filteringMode}`);
            console.log(`   Similarity threshold: ${this.similarityThreshold}`);
            console.log(`   Max chunks: ${this.maxChunksAfterFiltering}`);
            console.log(`   Reranker type: ${this.rerankerType}`);
        }
    }
    
    /**
     * Enhanced RAG pipeline with filtering and reranking
     */
    async answerWithEnhancedRAG(question, options = {}) {
        if (this.verbose) console.log(`\n🔍 Enhanced RAG Pipeline: "${question}"`);
        
        const startTime = Date.now();
        const filteringMode = options.filteringMode || this.filteringMode;
        
        try {
            // Step 1: Initial retrieval (same as Day 14)
            if (this.verbose) console.log('📚 Step 1: Initial document retrieval...');
            const initialChunks = await this.retrieveRelevantChunks(question, {
                topK: 10, // Get more chunks for filtering
                minSimilarity: 0.1 // Lower threshold for initial retrieval
            });
            
            const retrievalTime = Date.now() - startTime;
            
            // Step 2: Apply filtering/reranking based on mode
            let finalChunks;
            let processingTime = 0;
            const processingStart = Date.now();
            
            switch (filteringMode) {
                case 'threshold':
                    if (this.verbose) console.log('🔧 Step 2: Applying similarity threshold filtering...');
                    finalChunks = await this.applyThresholdFiltering(initialChunks, question, options);
                    break;
                    
                case 'rerank':
                    if (this.verbose) console.log('🎯 Step 2: Applying semantic reranking...');
                    finalChunks = await this.applySemanticReranking(initialChunks, question, options);
                    break;
                    
                case 'none':
                default:
                    if (this.verbose) console.log('📋 Step 2: No filtering applied (baseline)');
                    finalChunks = initialChunks.slice(0, this.maxChunksAfterFiltering);
                    break;
            }
            
            processingTime = Date.now() - processingStart;
            
            // Update metrics
            if (this.metricsEnabled) {
                this.updateFilteringMetrics(initialChunks, finalChunks);
            }
            
            if (finalChunks.length === 0) {
                if (this.verbose) console.log('⚠️ No chunks passed filtering');
                return {
                    answer: "I don't have enough relevant information in my knowledge base to answer this question.",
                    chunks: [],
                    context: '',
                    retrievalTime,
                    processingTime,
                    generationTime: 0,
                    totalTime: Date.now() - startTime,
                    hasContext: false,
                    filteringMode,
                    metrics: this.filteringMetrics
                };
            }
            
            // Step 3: Merge chunks and generate answer
            if (this.verbose) console.log('🔗 Step 3: Merging filtered chunks with question...');
            const context = this.mergeChunksWithQuestion(question, finalChunks);
            
            if (this.verbose) console.log('🧠 Step 4: Generating answer with LLM...');
            const generationStart = Date.now();
            const answer = await this.generateAnswerWithContext(question, context);
            const generationTime = Date.now() - generationStart;
            
            const totalTime = Date.now() - startTime;
            
            if (this.verbose) {
                console.log(`✅ Enhanced RAG answer generated (${totalTime}ms total)`);
                console.log(`   Retrieval: ${retrievalTime}ms | Processing: ${processingTime}ms | Generation: ${generationTime}ms`);
                console.log(`   Chunks: ${initialChunks.length} → ${finalChunks.length} (${filteringMode})`);
            }
            
            return {
                answer,
                chunks: finalChunks,
                context,
                retrievalTime,
                processingTime,
                generationTime,
                totalTime,
                hasContext: true,
                filteringMode,
                metrics: this.filteringMetrics
            };
            
        } catch (error) {
            console.error('Enhanced RAG pipeline error:', error.message);
            return {
                answer: 'Error: Could not process the question with enhanced RAG.',
                chunks: [],
                context: '',
                retrievalTime: 0,
                processingTime: 0,
                generationTime: 0,
                totalTime: Date.now() - startTime,
                hasContext: false,
                filteringMode,
                error: error.message
            };
        }
    }
    
    /**
     * Apply similarity threshold filtering
     */
    async applyThresholdFiltering(chunks, question, options = {}) {
        const threshold = options.similarityThreshold || this.similarityThreshold;
        const maxChunks = options.maxChunks || this.maxChunksAfterFiltering;
        
        // Filter by similarity threshold
        let filteredChunks = chunks.filter(chunk => chunk.similarity >= threshold);
        
        // If adaptive threshold is enabled and we got too few results, lower the threshold
        if (this.enableAdaptiveThreshold && filteredChunks.length === 0 && chunks.length > 0) {
            const adaptiveThreshold = Math.max(0.1, threshold * 0.7);
            if (this.verbose) console.log(`   📉 Adaptive threshold: ${threshold} → ${adaptiveThreshold}`);
            filteredChunks = chunks.filter(chunk => chunk.similarity >= adaptiveThreshold);
        }
        
        // Apply max chunks limit
        filteredChunks = filteredChunks.slice(0, maxChunks);
        
        if (this.verbose) {
            console.log(`   📊 Threshold filtering: ${chunks.length} → ${filteredChunks.length} chunks`);
            if (filteredChunks.length > 0) {
                const avgSim = (filteredChunks.reduce((sum, c) => sum + c.similarity, 0) / filteredChunks.length).toFixed(3);
                console.log(`   📈 Average similarity after filtering: ${avgSim}`);
            }
        }
        
        return filteredChunks;
    }
    
    /**
     * Apply semantic reranking using cross-encoder simulation
     */
    async applySemanticReranking(chunks, question, options = {}) {
        if (chunks.length === 0) return chunks;
        
        const maxChunks = options.maxChunks || this.maxChunksAfterFiltering;
        
        // Step 1: Apply basic threshold filtering first
        const threshold = Math.max(0.15, this.similarityThreshold * 0.8); // Slightly lower threshold for reranking
        let candidateChunks = chunks.filter(chunk => chunk.similarity >= threshold);
        
        if (candidateChunks.length === 0) {
            candidateChunks = chunks.slice(0, Math.min(6, chunks.length)); // Keep top 6 for reranking
        }
        
        // Step 2: Calculate reranking scores
        if (this.verbose) console.log(`   🔄 Reranking ${candidateChunks.length} candidate chunks...`);
        
        const rerankedChunks = await Promise.all(
            candidateChunks.map(async (chunk) => {
                const rerankerScore = await this.calculateRerankerScore(question, chunk);
                return {
                    ...chunk,
                    originalSimilarity: chunk.similarity,
                    rerankerScore,
                    // Combined score: 60% reranker + 40% original similarity
                    combinedScore: rerankerScore * 0.6 + chunk.similarity * 0.4
                };
            })
        );
        
        // Step 3: Sort by combined score and apply final filtering
        rerankedChunks.sort((a, b) => b.combinedScore - a.combinedScore);
        
        // Apply final quality threshold based on combined score
        const finalThreshold = 0.25; // Threshold for combined score
        const qualityFiltered = rerankedChunks.filter(chunk => chunk.combinedScore >= finalThreshold);
        
        // Take top N chunks
        const finalChunks = qualityFiltered.slice(0, maxChunks);
        
        if (this.verbose) {
            console.log(`   🎯 Reranking results: ${chunks.length} → ${candidateChunks.length} → ${finalChunks.length} chunks`);
            if (finalChunks.length > 0) {
                const avgCombined = (finalChunks.reduce((sum, c) => sum + c.combinedScore, 0) / finalChunks.length).toFixed(3);
                const avgOriginal = (finalChunks.reduce((sum, c) => sum + c.originalSimilarity, 0) / finalChunks.length).toFixed(3);
                console.log(`   📊 Avg scores - Combined: ${avgCombined}, Original: ${avgOriginal}`);
            }
        }
        
        return finalChunks;
    }
    
    /**
     * Calculate reranker score using cross-encoder simulation
     */
    async calculateRerankerScore(question, chunk) {
        const chunkText = chunk.chunk?.content || chunk.content || '';
        
        // Simulate cross-encoder scoring based on various relevance signals
        let score = 0;
        
        // 1. Keyword overlap (normalized)
        const questionWords = this.tokenizeForScoring(question.toLowerCase());
        const chunkWords = this.tokenizeForScoring(chunkText.toLowerCase());
        const overlap = questionWords.filter(word => chunkWords.includes(word)).length;
        const keywordScore = Math.min(overlap / Math.max(questionWords.length, 1), 1.0);
        
        // 2. Exact phrase matching
        const questionPhrases = this.extractKeyPhrases(question.toLowerCase());
        let phraseScore = 0;
        for (const phrase of questionPhrases) {
            if (chunkText.toLowerCase().includes(phrase)) {
                phraseScore += 0.2; // Boost for exact phrase matches
            }
        }
        phraseScore = Math.min(phraseScore, 0.6);
        
        // 3. Question type matching
        const questionType = this.detectQuestionType(question);
        const typeScore = this.calculateTypeMatchScore(questionType, chunkText);
        
        // 4. Content quality signals
        const qualityScore = this.calculateContentQuality(chunkText);
        
        // 5. Length appropriateness (not too short, not too long)
        const lengthScore = this.calculateLengthScore(chunkText, question);
        
        // Combine scores with weights
        score = keywordScore * 0.3 + phraseScore * 0.25 + typeScore * 0.2 + qualityScore * 0.15 + lengthScore * 0.1;
        
        // Add some randomization to simulate model uncertainty (±5%)
        const randomFactor = 0.95 + Math.random() * 0.1;
        score *= randomFactor;
        
        return Math.max(0, Math.min(1, score)); // Clamp to [0,1]
    }
    
    /**
     * Extract key phrases from question for exact matching
     */
    extractKeyPhrases(text) {
        const phrases = [];
        
        // Extract quoted phrases
        const quotedPhrases = text.match(/"([^"]+)"/g);
        if (quotedPhrases) {
            phrases.push(...quotedPhrases.map(p => p.slice(1, -1)));
        }
        
        // Extract multi-word entities (simple approach)
        const words = text.split(/\s+/);
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i].length > 2 && words[i+1].length > 2) {
                phrases.push(words[i] + ' ' + words[i+1]);
            }
        }
        
        // Extract potential named entities (capitalized words)
        const entities = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
        if (entities) {
            phrases.push(...entities.map(e => e.toLowerCase()));
        }
        
        return [...new Set(phrases)]; // Remove duplicates
    }
    
    /**
     * Detect question type for better matching
     */
    detectQuestionType(question) {
        const lowerQ = question.toLowerCase();
        
        if (lowerQ.includes('how much') || lowerQ.includes('cost') || lowerQ.includes('price') || lowerQ.includes('budget')) return 'pricing';
        if (lowerQ.includes('who') || lowerQ.includes('lead') || lowerQ.includes('person') || lowerQ.includes('employee')) return 'person';
        if (lowerQ.includes('when') || lowerQ.includes('date') || lowerQ.includes('time') || lowerQ.includes('year')) return 'temporal';
        if (lowerQ.includes('how many') || lowerQ.includes('count') || lowerQ.includes('number') || /\d+/.test(lowerQ)) return 'quantitative';
        if (lowerQ.includes('what is') || lowerQ.includes('define') || lowerQ.includes('explain')) return 'definition';
        if (lowerQ.includes('how to') || lowerQ.includes('implement') || lowerQ.includes('steps')) return 'procedural';
        
        return 'general';
    }
    
    /**
     * Calculate type-specific matching score
     */
    calculateTypeMatchScore(questionType, chunkText) {
        const lowerChunk = chunkText.toLowerCase();
        
        switch (questionType) {
            case 'pricing':
                return lowerChunk.includes('$') || lowerChunk.includes('cost') || lowerChunk.includes('price') || lowerChunk.includes('budget') ? 0.8 : 0.2;
            case 'person':
                return /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(chunkText) || lowerChunk.includes('employee') || lowerChunk.includes('team') ? 0.7 : 0.2;
            case 'temporal':
                return /\b\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(chunkText) ? 0.8 : 0.3;
            case 'quantitative':
                return /\b\d+\b/.test(chunkText) ? 0.6 : 0.2;
            case 'definition':
                return lowerChunk.includes('is a') || lowerChunk.includes('refers to') || lowerChunk.includes('definition') ? 0.7 : 0.4;
            case 'procedural':
                return lowerChunk.includes('step') || lowerChunk.includes('first') || lowerChunk.includes('then') || lowerChunk.includes('process') ? 0.6 : 0.3;
            default:
                return 0.5;
        }
    }
    
    /**
     * Calculate content quality score
     */
    calculateContentQuality(text) {
        let score = 0.5; // Base score
        
        // Boost for structured content
        if (text.includes('•') || text.includes('-') || text.includes('1.') || text.includes('2.')) score += 0.1;
        
        // Boost for specific data
        if (/\$[\d,]+/.test(text) || /\d+%/.test(text) || /\d+\s*(days?|years?|months?)/.test(text)) score += 0.2;
        
        // Penalize very short content
        if (text.length < 50) score -= 0.2;
        
        // Penalize repetitive content
        const words = text.split(/\s+/);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        if (uniqueWords.size < words.length * 0.7) score -= 0.1;
        
        return Math.max(0, Math.min(1, score));
    }
    
    /**
     * Calculate length appropriateness score
     */
    calculateLengthScore(text, question) {
        const textLength = text.length;
        const questionLength = question.length;
        
        // Optimal length is roughly 2-5x the question length, with a minimum of 100 characters
        const optimalMin = Math.max(100, questionLength * 2);
        const optimalMax = questionLength * 5;
        
        if (textLength < optimalMin) {
            return textLength / optimalMin; // Penalty for too short
        } else if (textLength > optimalMax) {
            return Math.max(0.3, 1 - (textLength - optimalMax) / optimalMax); // Penalty for too long
        } else {
            return 1.0; // Perfect length
        }
    }
    
    /**
     * Tokenize text for scoring (removes stop words, punctuation)
     */
    tokenizeForScoring(text) {
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
        
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
    }
    
    /**
     * Update filtering metrics for analysis
     */
    updateFilteringMetrics(initialChunks, finalChunks) {
        this.filteringMetrics.chunksBeforeFiltering = initialChunks.length;
        this.filteringMetrics.chunksAfterFiltering = finalChunks.length;
        this.filteringMetrics.chunksFiltered = initialChunks.length - finalChunks.length;
        
        if (initialChunks.length > 0) {
            this.filteringMetrics.avgSimilarityBefore = initialChunks.reduce((sum, c) => sum + c.similarity, 0) / initialChunks.length;
        }
        
        if (finalChunks.length > 0) {
            this.filteringMetrics.avgSimilarityAfter = finalChunks.reduce((sum, c) => sum + c.similarity, 0) / finalChunks.length;
        }
    }
    
    /**
     * Compare different filtering approaches
     */
    async compareFilteringApproaches(question, options = {}) {
        console.log(`\n🔄 Comparing filtering approaches for: "${question}"`);
        
        const approaches = [
            { name: 'No Filtering', mode: 'none' },
            { name: 'Threshold Filtering', mode: 'threshold' },
            { name: 'Semantic Reranking', mode: 'rerank' }
        ];
        
        const results = {};
        
        for (const approach of approaches) {
            console.log(`\n📊 Testing: ${approach.name}`);
            const result = await this.answerWithEnhancedRAG(question, { 
                filteringMode: approach.mode,
                ...options 
            });
            results[approach.mode] = result;
        }
        
        // Display comparison
        this.displayFilteringComparison(question, results);
        
        return results;
    }
    
    /**
     * Display filtering comparison results
     */
    displayFilteringComparison(question, results) {
        console.log('\n' + '='.repeat(80));
        console.log('🔄 Filtering Approaches Comparison');
        console.log('='.repeat(80));
        
        console.log(`\n❓ Question: ${question}`);
        
        for (const [mode, result] of Object.entries(results)) {
            const modeName = mode === 'none' ? 'No Filtering' : 
                           mode === 'threshold' ? 'Threshold Filtering' : 'Semantic Reranking';
            
            console.log(`\n📊 ${modeName}:`);
            console.log('─'.repeat(50));
            console.log(result.answer.substring(0, 200) + (result.answer.length > 200 ? '...' : ''));
            
            if (result.metrics) {
                console.log(`\n📈 Metrics:`);
                console.log(`   Chunks: ${result.metrics.chunksBeforeFiltering} → ${result.metrics.chunksAfterFiltering}`);
                console.log(`   Avg Similarity: ${result.metrics.avgSimilarityBefore?.toFixed(3)} → ${result.metrics.avgSimilarityAfter?.toFixed(3)}`);
            }
            
            console.log(`⏱️ Time: ${result.totalTime}ms (Processing: ${result.processingTime}ms)`);
        }
        
        console.log('\n' + '='.repeat(80));
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
        console.log(`
🔄 Reranked RAG - Enhanced retrieval with filtering and reranking

Usage:
  node reranked-rag.js [options]

Options:
  --question <text>     Question to ask
  --mode <type>         Filtering mode: none|threshold|rerank (default: rerank)
  --threshold <num>     Similarity threshold for filtering (default: 0.3)
  --compare            Compare all filtering approaches
  --help               Show this help message

Examples:
  node reranked-rag.js --question "What is TechCorp's Q3 revenue?"
  node reranked-rag.js --question "How many vacation days?" --mode threshold --threshold 0.4
  node reranked-rag.js --question "Project Quantum budget?" --compare
        `);
        process.exit(0);
    }
    
    (async () => {
        const questionIndex = args.indexOf('--question');
        const question = questionIndex !== -1 ? args[questionIndex + 1] : "How many vacation days do TechCorp employees get?";
        
        const modeIndex = args.indexOf('--mode');
        const mode = modeIndex !== -1 ? args[modeIndex + 1] : 'rerank';
        
        const thresholdIndex = args.indexOf('--threshold');
        const threshold = thresholdIndex !== -1 ? parseFloat(args[thresholdIndex + 1]) : 0.3;
        
        const compare = args.includes('--compare');
        
        const rag = new RerankedRAG({
            verbose: true,
            filteringMode: mode,
            similarityThreshold: threshold,
            enableAdaptiveThreshold: true
        });
        
        try {
            if (compare) {
                await rag.compareFilteringApproaches(question);
            } else {
                const result = await rag.answerWithEnhancedRAG(question);
                console.log('\n📚 Enhanced RAG Answer:');
                console.log('─'.repeat(50));
                console.log(result.answer);
                
                if (result.chunks && result.chunks.length > 0) {
                    console.log(`\n📄 Sources (${result.chunks.length} chunks):`);
                    result.chunks.forEach((chunk, i) => {
                        const score = chunk.combinedScore ? `${(chunk.combinedScore * 100).toFixed(1)}%` : `${(chunk.similarity * 100).toFixed(1)}%`;
                        console.log(`   ${i + 1}. ${chunk.document?.filename || 'unknown'} (${score})`);
                    });
                }
                
                if (result.metrics) {
                    console.log(`\n📊 Processing Metrics:`);
                    console.log(`   Filtering: ${result.metrics.chunksBeforeFiltering} → ${result.metrics.chunksAfterFiltering} chunks`);
                    console.log(`   Mode: ${result.filteringMode}`);
                    console.log(`   Total time: ${result.totalTime}ms`);
                }
            }
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            await rag.close();
        }
    })();
}

module.exports = { RerankedRAG };