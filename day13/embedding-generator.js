#!/usr/bin/env node

/**
 * Embedding Generator - Vector Embeddings for Document Chunks
 * 
 * Creates vector representations of text chunks using TF-IDF and other techniques
 * for semantic similarity search and document retrieval.
 */

class EmbeddingGenerator {
    constructor(options = {}) {
        this.dimensions = options.dimensions || 300;
        this.minTermFreq = options.minTermFreq || 1;
        this.maxTermFreq = options.maxTermFreq || 0.8;
        this.normalization = options.normalization !== false;
        
        // Vocabulary and IDF scores
        this.vocabulary = new Map();
        this.idfScores = new Map();
        this.documentCount = 0;
        
        // Stop words to ignore
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
            'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        ]);
        
        console.log(`🧮 EmbeddingGenerator initialized with ${this.dimensions}D vectors`);
    }

    /**
     * Generate embeddings for a batch of text chunks
     */
    async generateEmbeddings(chunks, options = {}) {
        console.log(`🔢 Generating embeddings for ${chunks.length} chunks...`);
        
        // First pass: build vocabulary from all chunks
        await this.buildVocabulary(chunks);
        
        // Second pass: generate TF-IDF vectors
        const embeddings = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = this.generateTFIDFEmbedding(chunk.content);
            
            embeddings.push({
                chunkId: chunk.id,
                vector: embedding,
                metadata: {
                    dimensions: this.dimensions,
                    method: 'tfidf',
                    magnitude: this.calculateMagnitude(embedding),
                    nonZeroElements: embedding.filter(x => x !== 0).length,
                    generatedAt: new Date().toISOString()
                }
            });
            
            if ((i + 1) % 100 === 0) {
                console.log(`   Progress: ${i + 1}/${chunks.length} embeddings generated`);
            }
        }
        
        console.log(`✅ Generated ${embeddings.length} embeddings`);
        return embeddings;
    }

    /**
     * Build vocabulary and calculate IDF scores from document corpus
     */
    async buildVocabulary(chunks) {
        console.log('📚 Building vocabulary from document corpus...');
        
        const termDocumentCounts = new Map();
        this.documentCount = chunks.length;
        
        // Count term occurrences across documents
        for (const chunk of chunks) {
            const terms = this.tokenize(chunk.content);
            const uniqueTerms = new Set(terms);
            
            uniqueTerms.forEach(term => {
                if (!this.stopWords.has(term) && term.length > 2) {
                    // Add to vocabulary
                    if (!this.vocabulary.has(term)) {
                        this.vocabulary.set(term, this.vocabulary.size);
                    }
                    
                    // Count document occurrences
                    termDocumentCounts.set(term, (termDocumentCounts.get(term) || 0) + 1);
                }
            });
        }
        
        // Calculate IDF scores
        for (const [term, docCount] of termDocumentCounts) {
            const idf = Math.log(this.documentCount / docCount);
            this.idfScores.set(term, idf);
        }
        
        // Limit vocabulary size to most important terms
        const maxVocabSize = Math.min(this.dimensions, 10000);
        if (this.vocabulary.size > maxVocabSize) {
            this.pruneVocabulary(maxVocabSize);
        }
        
        console.log(`📖 Vocabulary built: ${this.vocabulary.size} terms from ${chunks.length} documents`);
    }

    pruneVocabulary(maxSize) {
        // Keep terms with highest IDF scores
        const termsByIDF = Array.from(this.idfScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxSize);
            
        const newVocabulary = new Map();
        const newIdfScores = new Map();
        
        termsByIDF.forEach(([term, idf], index) => {
            newVocabulary.set(term, index);
            newIdfScores.set(term, idf);
        });
        
        this.vocabulary = newVocabulary;
        this.idfScores = newIdfScores;
        
        console.log(`🔧 Pruned vocabulary to ${maxSize} most important terms`);
    }

    /**
     * Generate TF-IDF embedding for a single text chunk
     */
    generateTFIDFEmbedding(text) {
        const terms = this.tokenize(text);
        const termCounts = new Map();
        
        // Count term frequencies
        terms.forEach(term => {
            if (this.vocabulary.has(term)) {
                termCounts.set(term, (termCounts.get(term) || 0) + 1);
            }
        });
        
        // Create vector
        const vector = new Array(this.vocabulary.size).fill(0);
        
        for (const [term, count] of termCounts) {
            if (this.vocabulary.has(term)) {
                const termIndex = this.vocabulary.get(term);
                const tf = count / terms.length;
                const idf = this.idfScores.get(term) || 0;
                vector[termIndex] = tf * idf;
            }
        }
        
        // Normalize vector if enabled
        if (this.normalization) {
            return this.normalizeVector(vector);
        }
        
        return vector;
    }

    /**
     * Enhanced embedding with semantic features
     */
    generateEnhancedEmbedding(text, metadata = {}) {
        let baseEmbedding = this.generateTFIDFEmbedding(text);
        
        // Add semantic features
        const semanticFeatures = this.extractSemanticFeatures(text, metadata);
        
        // Combine TF-IDF with semantic features
        const enhancedEmbedding = [...baseEmbedding, ...semanticFeatures];
        
        if (this.normalization) {
            return this.normalizeVector(enhancedEmbedding);
        }
        
        return enhancedEmbedding;
    }

    extractSemanticFeatures(text, metadata = {}) {
        const features = [];
        
        // Length-based features
        features.push(Math.log(text.length + 1) / 10);
        features.push(Math.log((text.match(/\w+/g) || []).length + 1) / 10);
        
        // Structural features
        features.push((text.match(/[.!?]+/g) || []).length / text.length);
        features.push((text.match(/[,;:]/g) || []).length / text.length);
        features.push((text.match(/\n/g) || []).length / text.length);
        
        // Content type features
        const contentType = metadata.contentType || 'text';
        features.push(contentType === 'code' ? 1 : 0);
        features.push(contentType === 'markdown' ? 1 : 0);
        features.push(contentType === 'text' ? 1 : 0);
        
        // Code-specific features
        if (contentType === 'code') {
            features.push((text.match(/function|def|class/g) || []).length / text.length * 10);
            features.push((text.match(/\{|\}|\[|\]/g) || []).length / text.length * 10);
            features.push((text.match(/\/\/|\/\*|\*/g) || []).length / text.length * 10);
        } else {
            features.push(0, 0, 0);
        }
        
        // Markdown-specific features
        if (contentType === 'markdown') {
            features.push((text.match(/^#{1,6}/gm) || []).length / text.length * 10);
            features.push((text.match(/\[.+?\]\(.+?\)/g) || []).length / text.length * 10);
            features.push((text.match(/```/g) || []).length / text.length * 10);
        } else {
            features.push(0, 0, 0);
        }
        
        // Ensure fixed feature count
        while (features.length < 15) features.push(0);
        
        return features;
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

    normalizeVector(vector) {
        const magnitude = this.calculateMagnitude(vector);
        if (magnitude === 0) return vector;
        
        return vector.map(value => value / magnitude);
    }

    calculateMagnitude(vector) {
        return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    calculateSimilarity(vector1, vector2) {
        if (vector1.length !== vector2.length) {
            throw new Error('Vectors must have same dimensions');
        }
        
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
            magnitude1 += vector1[i] * vector1[i];
            magnitude2 += vector2[i] * vector2[i];
        }
        
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        return dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Generate embedding for a search query
     */
    embedQuery(queryText, options = {}) {
        console.log(`🔍 Embedding search query: "${queryText}"`);
        
        if (this.vocabulary.size === 0) {
            throw new Error('Vocabulary not built yet. Run generateEmbeddings() first.');
        }
        
        const useEnhanced = options.enhanced || false;
        
        if (useEnhanced) {
            return this.generateEnhancedEmbedding(queryText, { contentType: 'text' });
        } else {
            return this.generateTFIDFEmbedding(queryText);
        }
    }

    /**
     * Find most similar embeddings to a query
     */
    findSimilar(queryEmbedding, embeddings, options = {}) {
        const topK = options.topK || 10;
        const minSimilarity = options.minSimilarity || 0.1;
        
        console.log(`🎯 Finding ${topK} most similar embeddings...`);
        
        const similarities = embeddings.map(embedding => ({
            chunkId: embedding.chunkId,
            similarity: this.calculateSimilarity(queryEmbedding, embedding.vector),
            metadata: embedding.metadata
        }));
        
        return similarities
            .filter(item => item.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * Get embedding statistics
     */
    getEmbeddingStats(embeddings) {
        if (embeddings.length === 0) {
            return { count: 0 };
        }
        
        const dimensions = embeddings[0].vector.length;
        let totalMagnitude = 0;
        let totalNonZero = 0;
        
        embeddings.forEach(embedding => {
            totalMagnitude += embedding.metadata.magnitude;
            totalNonZero += embedding.metadata.nonZeroElements;
        });
        
        return {
            count: embeddings.length,
            dimensions,
            vocabularySize: this.vocabulary.size,
            averageMagnitude: totalMagnitude / embeddings.length,
            averageNonZeroElements: totalNonZero / embeddings.length,
            sparsity: 1 - (totalNonZero / embeddings.length) / dimensions
        };
    }

    /**
     * Export vocabulary for persistence
     */
    exportVocabulary() {
        return {
            vocabulary: Array.from(this.vocabulary.entries()),
            idfScores: Array.from(this.idfScores.entries()),
            documentCount: this.documentCount,
            dimensions: this.dimensions,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import vocabulary from persistence
     */
    importVocabulary(vocabularyData) {
        this.vocabulary = new Map(vocabularyData.vocabulary);
        this.idfScores = new Map(vocabularyData.idfScores);
        this.documentCount = vocabularyData.documentCount;
        this.dimensions = vocabularyData.dimensions;
        
        console.log(`📥 Imported vocabulary: ${this.vocabulary.size} terms`);
    }
}

module.exports = { EmbeddingGenerator };