#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { DocumentIndexer } = require('../day13/document-indexer');

/**
 * Create Knowledge Base for RAG System
 * 
 * Uses Day 13's document indexer to create a searchable knowledge base
 * for the RAG system to retrieve from.
 */

async function createKnowledgeBase() {
    console.log('📚 Creating knowledge base for RAG system...');
    
    const indexer = new DocumentIndexer({
        storage: { dbPath: './rag_knowledge_base.db' }
    });
    
    try {
        // Create sample documents for testing RAG
        await createSampleDocuments();
        
        // Index the sample documents
        console.log('\n📖 Indexing sample documents...');
        const result = await indexer.indexDirectory('./rag-docs', {
            recursive: true,
            maxFiles: 20
        });
        
        console.log(`✅ Knowledge base created successfully!`);
        console.log(`   Documents indexed: ${result.processedFiles}`);
        
        // Show stats
        const stats = await indexer.getIndexStats();
        console.log(`   Total chunks: ${stats.storage.chunks}`);
        console.log(`   Total embeddings: ${stats.storage.embeddings}`);
        console.log(`   Vocabulary size: ${stats.embedding.vocabularySize}`);
        
    } catch (error) {
        console.error('❌ Failed to create knowledge base:', error.message);
    } finally {
        await indexer.close();
    }
}

async function createSampleDocuments() {
    console.log('📝 Creating sample documents for knowledge base...');
    
    const docsDir = './rag-docs';
    await fs.mkdir(docsDir, { recursive: true });
    
    // Machine Learning Overview
    await fs.writeFile(path.join(docsDir, 'machine-learning.md'), `
# Machine Learning Overview

Machine Learning (ML) is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. ML systems can identify patterns in data, make predictions, and adapt to new information.

## Key Concepts

### Supervised Learning
In supervised learning, algorithms learn from labeled training data to make predictions on new, unseen data. Examples include:
- Classification: Predicting categories (spam detection, image recognition)
- Regression: Predicting continuous values (stock prices, temperature)

### Unsupervised Learning
Unsupervised learning finds hidden patterns in data without labeled examples:
- Clustering: Grouping similar data points
- Dimensionality reduction: Simplifying complex data
- Anomaly detection: Identifying outliers

### Applications
Machine learning powers many modern technologies:
- Natural Language Processing (NLP)
- Computer Vision
- Recommendation Systems
- Autonomous Vehicles
- Medical Diagnosis

The field continues to evolve rapidly with advances in deep learning, neural networks, and large language models.
`);

    // Vector Embeddings Guide
    await fs.writeFile(path.join(docsDir, 'vector-embeddings.md'), `
# Vector Embeddings Guide

Vector embeddings are dense numerical representations that capture the semantic meaning of text, images, or other data types. They transform discrete data into continuous vector spaces where similar items are positioned close together.

## How Embeddings Work

### Text Embeddings
Text embeddings convert words, sentences, or documents into vectors:
- **Word Embeddings**: Represent individual words (Word2Vec, GloVe)
- **Sentence Embeddings**: Capture meaning of entire sentences
- **Document Embeddings**: Represent full documents or paragraphs

### Mathematical Foundation
Embeddings use various techniques:
- **TF-IDF**: Term frequency-inverse document frequency weighting
- **Neural Networks**: Learn representations through training
- **Transformer Models**: Attention-based contextual embeddings

## Applications

### Semantic Search
Vector embeddings enable semantic search that understands meaning rather than just keywords:
- Find documents with similar concepts
- Handle synonyms and related terms
- Understand context and intent

### Similarity Calculation
Common similarity metrics include:
- **Cosine Similarity**: Measures angle between vectors
- **Euclidean Distance**: Straight-line distance in vector space
- **Dot Product**: Simple multiplication and sum

### Use Cases
- Search engines and information retrieval
- Recommendation systems
- Content clustering and classification
- Machine translation
- Question answering systems

Vector embeddings are fundamental to modern AI applications, enabling machines to understand and process human language effectively.
`);

    // Similarity Search Technical Guide
    await fs.writeFile(path.join(docsDir, 'similarity-search.md'), `
# Similarity Search Technical Guide

Similarity search is the process of finding items in a database that are most similar to a given query. This is essential for information retrieval, recommendation systems, and AI applications.

## Core Concepts

### Vector Space Models
Similarity search typically operates in high-dimensional vector spaces:
- Documents and queries are represented as vectors
- Similarity is measured as distance or angle between vectors
- Efficient algorithms enable fast search over millions of vectors

### Similarity Metrics

#### Cosine Similarity
Measures the cosine of the angle between two vectors:
- Range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)
- Formula: cos(θ) = (A · B) / (||A|| × ||B||)
- Ideal for text and high-dimensional sparse data

#### Euclidean Distance
Straight-line distance between vectors:
- Range: 0 to infinity (0 = identical)
- Formula: √Σ(ai - bi)²
- Sensitive to vector magnitude

#### Jaccard Similarity
For set-based similarity:
- Measures overlap between sets
- Formula: |A ∩ B| / |A ∪ B|
- Good for categorical or binary data

## Implementation Strategies

### Exact Search
Linear scan through all vectors:
- Guaranteed to find the true nearest neighbors
- Time complexity: O(n)
- Impractical for large datasets

### Approximate Search
Trade accuracy for speed:
- **LSH (Locality-Sensitive Hashing)**: Hash similar items to same buckets
- **FAISS**: Facebook's library for efficient similarity search
- **Annoy**: Approximate nearest neighbors using trees

### Indexing Techniques
- **Inverted Index**: Map terms to documents containing them
- **Tree-based**: KD-trees, R-trees for spatial data
- **Graph-based**: Build graphs of similar items
- **Quantization**: Compress vectors for memory efficiency

## Practical Applications

### Search Engines
- Query-document matching
- Personalized search results
- Related content discovery

### Recommendation Systems
- User-item similarity
- Collaborative filtering
- Content-based recommendations

### Data Mining
- Clustering similar documents
- Duplicate detection
- Anomaly identification

The choice of similarity metric and search algorithm depends on your specific use case, data characteristics, and performance requirements.
`);

    // JavaScript Programming Guide
    await fs.writeFile(path.join(docsDir, 'javascript-functions.js'), `
/**
 * JavaScript Functions for Vector Operations
 * 
 * This file contains utility functions for working with vectors,
 * similarity calculations, and mathematical operations commonly
 * used in machine learning and data science applications.
 */

// Vector similarity calculation using cosine similarity
function calculateCosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same dimensions');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0; // Avoid division by zero
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
}

// Calculate Euclidean distance between two vectors
function calculateEuclideanDistance(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same dimensions');
    }
    
    let sumOfSquares = 0;
    for (let i = 0; i < vectorA.length; i++) {
        const diff = vectorA[i] - vectorB[i];
        sumOfSquares += diff * diff;
    }
    
    return Math.sqrt(sumOfSquares);
}

// Normalize a vector to unit length
function normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
        return vector.slice(); // Return copy of zero vector
    }
    
    return vector.map(val => val / magnitude);
}

// Calculate dot product of two vectors
function dotProduct(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have the same dimensions');
    }
    
    return vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
}

// Find the most similar vectors to a query vector
function findMostSimilar(queryVector, vectorDatabase, topK = 5) {
    const similarities = vectorDatabase.map((vector, index) => ({
        index,
        vector,
        similarity: calculateCosineSimilarity(queryVector, vector.data || vector)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Return top K results
    return similarities.slice(0, topK);
}

// Example usage and demonstration
function demonstrateVectorOperations() {
    const vector1 = [1, 2, 3, 4, 5];
    const vector2 = [2, 4, 6, 8, 10];
    const vector3 = [1, 0, 0, 0, 0];
    
    console.log('Vector Operations Demo:');
    console.log('Vector 1:', vector1);
    console.log('Vector 2:', vector2);
    console.log('Vector 3:', vector3);
    
    console.log('\\nSimilarity Calculations:');
    console.log('Cosine Similarity (1,2):', calculateCosineSimilarity(vector1, vector2));
    console.log('Cosine Similarity (1,3):', calculateCosineSimilarity(vector1, vector3));
    
    console.log('\\nDistance Calculations:');
    console.log('Euclidean Distance (1,2):', calculateEuclideanDistance(vector1, vector2));
    console.log('Euclidean Distance (1,3):', calculateEuclideanDistance(vector1, vector3));
    
    console.log('\\nNormalized Vectors:');
    console.log('Normalized Vector 1:', normalizeVector(vector1));
    console.log('Normalized Vector 2:', normalizeVector(vector2));
}

module.exports = {
    calculateCosineSimilarity,
    calculateEuclideanDistance,
    normalizeVector,
    dotProduct,
    findMostSimilar,
    demonstrateVectorOperations
};
`);

    // Document Processing Overview
    await fs.writeFile(path.join(docsDir, 'document-processing.md'), `
# Document Processing and Indexing

Document processing is the foundation of modern search systems and information retrieval. It involves converting unstructured text into structured, searchable formats.

## Processing Pipeline

### 1. Document Ingestion
- Read files from various formats (PDF, DOC, HTML, TXT, MD)
- Extract text content and metadata
- Handle encoding and character sets
- Validate and clean input data

### 2. Text Preprocessing
- **Tokenization**: Split text into words or phrases
- **Normalization**: Convert to lowercase, handle punctuation
- **Stop Word Removal**: Filter common words (the, and, or)
- **Stemming/Lemmatization**: Reduce words to root forms

### 3. Chunking Strategies
Breaking documents into manageable pieces:
- **Fixed-size Chunks**: Split by character or word count
- **Semantic Chunks**: Respect paragraph and sentence boundaries
- **Sliding Windows**: Overlapping chunks for context preservation
- **Structure-aware**: Maintain document hierarchy (headers, sections)

### 4. Feature Extraction
Transform text into numerical representations:
- **TF-IDF**: Term frequency-inverse document frequency
- **Word Embeddings**: Dense vector representations
- **N-grams**: Sequences of words for context
- **Named Entity Recognition**: Identify people, places, organizations

## Indexing Techniques

### Inverted Index
Maps terms to documents containing them:
\`\`\`
term1 -> [doc1, doc3, doc7]
term2 -> [doc2, doc3, doc5]
\`\`\`

### Vector Index
Stores document embeddings for similarity search:
- High-dimensional vectors represent document meaning
- Enables semantic search beyond keyword matching
- Supports ranking by relevance scores

### Hybrid Approaches
Combine multiple indexing methods:
- Keyword index for exact matches
- Vector index for semantic similarity
- Metadata index for filtering and faceting

## Performance Optimization

### Storage
- Compress indices to reduce disk usage
- Use appropriate data structures (B-trees, hash tables)
- Partition large indices for parallel processing

### Retrieval
- Cache frequently accessed documents
- Pre-compute common queries
- Use approximate search for large-scale systems

### Updates
- Incremental indexing for new documents
- Batch processing for efficiency
- Version control for index management

Modern document processing systems must balance accuracy, performance, and scalability to handle the ever-growing volume of digital content.
`);

    // AI and Search Integration
    await fs.writeFile(path.join(docsDir, 'ai-search-integration.md'), `
# AI and Search Integration

The integration of artificial intelligence with search systems has revolutionized how we find and interact with information. Modern search goes beyond keyword matching to understand intent and context.

## Evolution of Search

### Traditional Search
- Keyword-based matching
- Boolean queries and operators
- Statistical relevance scoring (TF-IDF, PageRank)
- Limited understanding of user intent

### AI-Enhanced Search
- Natural language understanding
- Semantic search and meaning extraction
- Personalized results based on user behavior
- Conversational search interfaces

## Key AI Technologies

### Natural Language Processing (NLP)
- **Query Understanding**: Parse and interpret user queries
- **Entity Recognition**: Identify names, places, concepts
- **Intent Classification**: Determine what users are looking for
- **Context Awareness**: Understand previous interactions

### Machine Learning Models
- **Ranking Models**: Learn optimal result ordering
- **Click-Through Prediction**: Estimate user engagement
- **Query Expansion**: Add related terms automatically
- **Personalization**: Adapt results to individual preferences

### Neural Information Retrieval
- **Dense Passage Retrieval**: Use neural networks for document matching
- **BERT and Transformers**: Understand context and relationships
- **Cross-modal Search**: Find images with text queries
- **Multi-lingual Search**: Handle queries in different languages

## Retrieval-Augmented Generation (RAG)

RAG combines search with language generation:

### Architecture
1. **Retrieval Component**: Find relevant documents
2. **Reader Component**: Generate answers from retrieved context
3. **Fusion Layer**: Combine multiple sources effectively

### Benefits
- **Factual Accuracy**: Ground responses in real documents
- **Up-to-date Information**: Access current data sources
- **Source Attribution**: Provide references for claims
- **Domain Adaptation**: Specialize for specific topics

### Implementation Challenges
- **Retrieval Quality**: Finding truly relevant documents
- **Context Length**: Balancing comprehensiveness with efficiency
- **Hallucination Control**: Preventing made-up facts
- **Latency Management**: Keeping response times acceptable

## Search User Experience

### Query Interfaces
- **Autocomplete**: Suggest completions as users type
- **Voice Search**: Speech-to-text integration
- **Visual Search**: Find items using images
- **Conversational AI**: Multi-turn dialogue systems

### Result Presentation
- **Rich Snippets**: Enhanced result displays
- **Knowledge Panels**: Structured information boxes
- **Faceted Search**: Filter and refine results
- **Recommendation Carousels**: Suggest related content

### Evaluation Metrics
- **Relevance**: How well results match queries
- **Diversity**: Variety in result types and sources
- **Freshness**: Recency of information
- **User Satisfaction**: Engagement and task completion

The future of search lies in creating more intelligent, context-aware systems that can understand and assist with complex information needs across multiple modalities and domains.
`);

    console.log(`✅ Created ${6} sample documents in ${docsDir}/`);
}

if (require.main === module) {
    createKnowledgeBase().catch(console.error);
}

module.exports = { createKnowledgeBase };