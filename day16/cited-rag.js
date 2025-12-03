#!/usr/bin/env node

require('dotenv').config({ path: '../day1/.env' });
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Import Day 15's enhanced RAG system as baseline
const { RerankedRAG } = require('../day15/reranked-rag');

/**
 * CitedRAG - RAG System with Mandatory Citations and Source References
 * 
 * Enhances the RAG pipeline to always include citations and source links:
 * 1. Enhanced chunk metadata with IDs, URLs, and file references
 * 2. Modified prompts to enforce "answer + citations" format
 * 3. Post-generation citation validation
 * 4. Hallucination reduction through source grounding
 */
class CitedRAG extends RerankedRAG {
    constructor(options = {}) {
        super(options);
        
        // Citation configuration
        this.citationStyle = options.citationStyle || 'numbered'; // 'numbered', 'named', 'inline'
        this.requireCitations = options.requireCitations !== false;
        this.sourceBaseUrl = options.sourceBaseUrl || 'https://docs.company.com/';
        this.enforceValidation = options.enforceValidation !== false;
        
        // Citation tracking
        this.citationMetrics = {
            responsesGenerated: 0,
            responsesWithCitations: 0,
            averageCitationsPerResponse: 0,
            hallucinations: 0,
            validationFailures: 0
        };
        
        if (this.verbose) {
            console.log(`📚 CitedRAG initialized`);
            console.log(`   Citation style: ${this.citationStyle}`);
            console.log(`   Require citations: ${this.requireCitations}`);
            console.log(`   Source base URL: ${this.sourceBaseUrl}`);
            console.log(`   Validation enabled: ${this.enforceValidation}`);
        }
    }
    
    /**
     * Enhanced chunk preparation with citation metadata
     */
    enhanceChunkWithCitations(chunk, index) {
        const chunkId = chunk.id || `chunk_${crypto.randomBytes(8).toString('hex')}`;
        const filename = chunk.document?.filename || 'unknown.md';
        const sourceUrl = `${this.sourceBaseUrl}${filename}#chunk-${chunkId}`;
        
        return {
            ...chunk,
            citationId: chunkId,
            citationNumber: index + 1,
            sourceUrl: sourceUrl,
            sourceReference: {
                filename: filename,
                title: chunk.document?.title || filename.replace(/\.[^.]+$/, ''),
                url: sourceUrl,
                chunkId: chunkId,
                citationKey: `[${index + 1}]`
            }
        };
    }
    
    /**
     * Generate citation-enforced context for LLM
     */
    buildCitationContext(question, relevantChunks) {
        const enhancedChunks = relevantChunks.map((chunk, index) => 
            this.enhanceChunkWithCitations(chunk, index)
        );
        
        let context = `Question: ${question}\n\nRelevant Source Materials:\n\n`;
        
        enhancedChunks.forEach((chunk, index) => {
            const ref = chunk.sourceReference;
            context += `[${ref.citationKey.replace(/[\[\]]/g, '')}] Source: ${ref.title} (${ref.filename})\n`;
            context += `URL: ${ref.url}\n`;
            context += `Content: ${chunk.chunk.content}\n\n`;
        });
        
        // Add citation requirements to context
        context += `IMPORTANT: You must cite your sources using the provided reference numbers [1], [2], etc. `;
        context += `Every fact, statement, or piece of information in your answer must be followed by the appropriate citation number(s). `;
        context += `Do not include any information that cannot be cited from the provided sources. `;
        context += `End your response with a "Sources:" section listing all cited references with their URLs.\n\n`;
        context += `Please answer the question using only the information provided above, with proper citations.`;
        
        return { context, enhancedChunks };
    }
    
    /**
     * Enhanced RAG with mandatory citations
     */
    async answerWithCitations(question, options = {}) {
        if (this.verbose) {
            console.log(`\n🔍 Generating cited answer for: "${question}"`);
        }
        
        try {
            // Use Day 15's enhanced retrieval (with reranking by default)
            const retrievalOptions = {
                filteringMode: options.filteringMode || 'rerank',
                similarityThreshold: options.similarityThreshold || 0.2,
                maxChunks: options.maxChunks || 4,
                ...options
            };
            
            const result = await this.answerWithEnhancedRAG(question, retrievalOptions);
            
            if (!result.chunks || result.chunks.length === 0) {
                return {
                    question,
                    answer: "I don't have sufficient information in my knowledge base to answer this question with proper citations.",
                    citations: [],
                    sourceReferences: [],
                    citationCount: 0,
                    hasValidCitations: false,
                    retrievalInfo: result
                };
            }
            
            // Build citation-enforced context
            const { context, enhancedChunks } = this.buildCitationContext(question, result.chunks);
            
            // Generate answer with citation enforcement
            const citedAnswer = await this.generateAnswerWithContext(question, context);
            
            // Extract source references
            const sourceReferences = enhancedChunks.map(chunk => chunk.sourceReference);
            
            // Validate citations in response
            const validation = this.validateCitations(citedAnswer, sourceReferences);
            
            // Update metrics
            this.updateCitationMetrics(validation);
            
            if (this.verbose) {
                console.log(`✅ Generated answer with ${validation.citationCount} citations`);
                console.log(`   Citation validation: ${validation.hasValidCitations ? 'PASS' : 'FAIL'}`);
            }
            
            return {
                question,
                answer: citedAnswer,
                citations: validation.foundCitations,
                sourceReferences,
                citationCount: validation.citationCount,
                hasValidCitations: validation.hasValidCitations,
                validationDetails: validation,
                retrievalInfo: result,
                enhancedChunks
            };
            
        } catch (error) {
            console.error('❌ Citation generation failed:', error.message);
            return {
                question,
                answer: `Error generating cited response: ${error.message}`,
                citations: [],
                sourceReferences: [],
                citationCount: 0,
                hasValidCitations: false,
                error: error.message
            };
        }
    }
    
    /**
     * Validate that response contains proper citations
     */
    validateCitations(response, sourceReferences) {
        const citationPattern = /\[(\d+)\]/g;
        const foundCitations = [];
        let match;
        
        while ((match = citationPattern.exec(response)) !== null) {
            const citationNum = parseInt(match[1]);
            foundCitations.push({
                number: citationNum,
                position: match.index,
                valid: citationNum <= sourceReferences.length && citationNum > 0
            });
        }
        
        // Check if Sources section exists
        const hasSourcesSection = response.toLowerCase().includes('sources:') || 
                                 response.toLowerCase().includes('references:');
        
        // Check for facts without citations (basic heuristic)
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const sentencesWithCitations = sentences.filter(s => /\[\d+\]/.test(s)).length;
        const citationCoverage = sentences.length > 0 ? sentencesWithCitations / sentences.length : 0;
        
        const validCitations = foundCitations.filter(c => c.valid);
        
        return {
            citationCount: foundCitations.length,
            validCitationCount: validCitations.length,
            invalidCitations: foundCitations.filter(c => !c.valid),
            hasValidCitations: validCitations.length > 0 && foundCitations.every(c => c.valid),
            hasSourcesSection,
            citationCoverage,
            foundCitations,
            qualityScore: (validCitations.length > 0 ? 0.4 : 0) + 
                         (hasSourcesSection ? 0.3 : 0) + 
                         (citationCoverage * 0.3)
        };
    }
    
    /**
     * Update citation metrics for analysis
     */
    updateCitationMetrics(validation) {
        this.citationMetrics.responsesGenerated++;
        
        if (validation.hasValidCitations) {
            this.citationMetrics.responsesWithCitations++;
        }
        
        if (!validation.hasValidCitations) {
            this.citationMetrics.validationFailures++;
        }
        
        // Update running average
        const total = this.citationMetrics.averageCitationsPerResponse * 
                     (this.citationMetrics.responsesGenerated - 1);
        this.citationMetrics.averageCitationsPerResponse = 
            (total + validation.citationCount) / this.citationMetrics.responsesGenerated;
    }
    
    /**
     * Get citation compliance metrics
     */
    getCitationMetrics() {
        const compliance = this.citationMetrics.responsesGenerated > 0 ? 
            (this.citationMetrics.responsesWithCitations / this.citationMetrics.responsesGenerated) * 100 : 0;
        
        return {
            ...this.citationMetrics,
            citationCompliance: compliance,
            avgCitations: Math.round(this.citationMetrics.averageCitationsPerResponse * 10) / 10
        };
    }
    
    /**
     * Generate comparison between cited and uncited responses
     */
    async compareWithAndWithoutCitations(question, options = {}) {
        if (this.verbose) {
            console.log(`\n🔍 Comparing cited vs uncited responses for: "${question}"`);
        }
        
        // Generate regular response (without citation enforcement)
        const regularResult = await this.answerWithEnhancedRAG(question, options);
        
        // Generate cited response
        const citedResult = await this.answerWithCitations(question, options);
        
        return {
            question,
            regular: {
                answer: regularResult.answer,
                chunks: regularResult.chunks,
                hasExplicitCitations: /\[\d+\]/.test(regularResult.answer)
            },
            cited: citedResult,
            comparison: {
                citedVersion: citedResult.hasValidCitations,
                hallucinations: this.detectPotentialHallucinations(regularResult.answer, citedResult.answer),
                lengthDifference: citedResult.answer.length - regularResult.answer.length,
                sourceTransparency: citedResult.sourceReferences.length
            }
        };
    }
    
    /**
     * Basic hallucination detection by comparing responses
     */
    detectPotentialHallucinations(regularAnswer, citedAnswer) {
        // Simple heuristic: if cited answer is significantly shorter or different,
        // regular might have hallucinated
        const lengthRatio = citedAnswer.length / regularAnswer.length;
        const potentialHallucination = lengthRatio < 0.7; // Cited version much shorter
        
        return {
            suspected: potentialHallucination,
            lengthRatio: Math.round(lengthRatio * 100) / 100,
            analysis: potentialHallucination ? 
                'Cited version significantly shorter - possible hallucination removal' :
                'Length difference acceptable'
        };
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        console.log(`
📚 CitedRAG - RAG System with Mandatory Citations

Usage:
  node cited-rag.js [question]
  node cited-rag.js --help
  
Features:
  • Mandatory source citations for every response
  • Enhanced chunk metadata with IDs and URLs
  • Citation validation and compliance checking
  • Hallucination reduction through source grounding
  • Comparison with uncited responses

Examples:
  node cited-rag.js "What is the company vacation policy?"
  node cited-rag.js "How does machine learning work?"
        `);
        process.exit(0);
    }
    
    const question = args.join(' ') || "What are vector embeddings?";
    
    (async () => {
        const rag = new CitedRAG({ verbose: true });
        
        try {
            const result = await rag.answerWithCitations(question);
            
            console.log('\n📚 CITED RESPONSE:');
            console.log('─'.repeat(60));
            console.log(result.answer);
            
            if (result.sourceReferences.length > 0) {
                console.log('\n📋 SOURCE VALIDATION:');
                console.log(`✅ Citations found: ${result.citationCount}`);
                console.log(`✅ Valid citations: ${result.hasValidCitations}`);
                console.log(`✅ Sources referenced: ${result.sourceReferences.length}`);
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        } finally {
            await rag.close();
        }
    })();
}

module.exports = { CitedRAG };