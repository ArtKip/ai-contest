#!/usr/bin/env node

const { DocumentIndexer } = require('./document-indexer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Test suite for Document Indexer
 */

async function createTestDocuments() {
    const testDir = './test-docs';
    await fs.mkdir(testDir, { recursive: true });
    
    // Test markdown document
    await fs.writeFile(path.join(testDir, 'guide.md'), `
# Getting Started Guide

## Introduction

This is a comprehensive guide for using the document indexing system.

## Features

- **Vector Embeddings**: Creates semantic representations of text chunks
- **Smart Chunking**: Preserves document structure and meaning
- **Similarity Search**: Find relevant content using natural language queries

## Installation

\`\`\`bash
npm install
npm run demo
\`\`\`

## Code Example

Here's how to use the indexer:

\`\`\`javascript
const { DocumentIndexer } = require('./document-indexer');
const indexer = new DocumentIndexer();

// Index documents
await indexer.indexDirectory('./docs');

// Search
const results = await indexer.searchDocuments('machine learning');
\`\`\`
`);

    // Test code file
    await fs.writeFile(path.join(testDir, 'utils.js'), `
/**
 * Utility functions for document processing
 */

function preprocessText(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function calculateCosineSimilarity(vectorA, vectorB) {
    const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
    const magnitudeA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

module.exports = {
    preprocessText,
    calculateCosineSimilarity
};
`);

    // Test text file
    await fs.writeFile(path.join(testDir, 'article.txt'), `
Understanding Vector Embeddings in Document Search

Vector embeddings are mathematical representations of text that capture semantic meaning in numerical form. They enable computers to understand and compare the meaning of different pieces of text.

Key Benefits:

1. Semantic Similarity: Find documents that are related in meaning, not just by keywords
2. Contextual Understanding: The system understands context and relationships between concepts
3. Efficient Search: Fast similarity calculations using vector mathematics

Applications include document retrieval, recommendation systems, and content analysis. Modern search systems rely heavily on these techniques to provide relevant results.

The process involves tokenizing text, creating vocabulary mappings, and generating numerical vectors that represent the semantic content of each document chunk.
`);

    console.log(`📁 Created test documents in ${testDir}/`);
    return testDir;
}

async function runTests() {
    console.log('🧪 Starting Document Indexer Tests\n');
    
    let testsPassed = 0;
    let totalTests = 0;
    
    const indexer = new DocumentIndexer({
        storage: { dbPath: './test_index.db' }
    });
    
    try {
        // Test 1: Create test documents
        totalTests++;
        console.log('📝 Test 1: Creating test documents...');
        const testDir = await createTestDocuments();
        console.log('✅ Test 1 passed\n');
        testsPassed++;
        
        // Test 2: Index directory
        totalTests++;
        console.log('📂 Test 2: Indexing test directory...');
        const indexResult = await indexer.indexDirectory(testDir);
        
        if (indexResult.processedFiles > 0) {
            console.log(`✅ Test 2 passed - Indexed ${indexResult.processedFiles} files\n`);
            testsPassed++;
        } else {
            console.log('❌ Test 2 failed - No files indexed\n');
        }
        
        // Test 3: Get index statistics
        totalTests++;
        console.log('📊 Test 3: Getting index statistics...');
        const stats = await indexer.getIndexStats();
        
        if (stats.storage.documents > 0 && stats.storage.embeddings > 0) {
            console.log('✅ Test 3 passed - Index has content');
            console.log(`   Documents: ${stats.storage.documents}`);
            console.log(`   Chunks: ${stats.storage.chunks}`);
            console.log(`   Embeddings: ${stats.storage.embeddings}`);
            console.log(`   Vocabulary: ${stats.embedding.vocabularySize}\n`);
            testsPassed++;
        } else {
            console.log('❌ Test 3 failed - Index appears empty\n');
        }
        
        // Test 4: Search functionality
        totalTests++;
        console.log('🔍 Test 4: Testing search functionality...');
        
        const queries = [
            'vector embeddings',
            'installation guide',
            'cosine similarity',
            'document processing'
        ];
        
        let searchTests = 0;
        for (const query of queries) {
            try {
                const results = await indexer.searchDocuments(query, { topK: 3 });
                console.log(`   Query "${query}": ${results.length} results`);
                if (results.length > 0) {
                    searchTests++;
                    console.log(`      Best match: ${results[0].document.filename} (${(results[0].similarity * 100).toFixed(1)}%)`);
                }
            } catch (error) {
                console.log(`   Query "${query}": Error - ${error.message}`);
            }
        }
        
        if (searchTests >= queries.length / 2) {
            console.log('✅ Test 4 passed - Search functionality working\n');
            testsPassed++;
        } else {
            console.log('❌ Test 4 failed - Search functionality issues\n');
        }
        
        // Test 5: Edge cases
        totalTests++;
        console.log('⚠️ Test 5: Testing edge cases...');
        
        try {
            // Search with empty query
            const emptyResults = await indexer.searchDocuments('');
            console.log(`   Empty query: ${emptyResults.length} results`);
            
            // Search with very specific technical term
            const techResults = await indexer.searchDocuments('vectorA.reduce');
            console.log(`   Technical term: ${techResults.length} results`);
            
            console.log('✅ Test 5 passed - Edge cases handled\n');
            testsPassed++;
        } catch (error) {
            console.log(`❌ Test 5 failed - Edge case error: ${error.message}\n`);
        }
        
    } catch (error) {
        console.error('💥 Test suite failed with error:', error.message);
    } finally {
        await indexer.close();
    }
    
    // Results
    console.log('🎯 Test Results:');
    console.log(`   Passed: ${testsPassed}/${totalTests}`);
    console.log(`   Success rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);
    
    if (testsPassed === totalTests) {
        console.log('\n🎉 All tests passed! The document indexer is working correctly.');
    } else {
        console.log('\n⚠️ Some tests failed. Check the output above for details.');
    }
    
    // Cleanup
    try {
        await fs.rm('./test-docs', { recursive: true, force: true });
        await fs.rm('./test_index.db', { force: true });
        await fs.rm('./index-backups', { recursive: true, force: true });
        console.log('\n🧹 Cleaned up test files');
    } catch (error) {
        // Ignore cleanup errors
    }
}

// Performance test
async function performanceTest() {
    console.log('\n⚡ Performance Test');
    
    const indexer = new DocumentIndexer({
        storage: { dbPath: './perf_test.db' }
    });
    
    try {
        console.log('Creating large test document...');
        
        // Create a large document for performance testing
        const largeContent = Array(100).fill(0).map((_, i) => `
## Section ${i + 1}

This is section ${i + 1} of a large document for performance testing.
It contains various technical terms like algorithm, optimization, and data structure.
The content includes programming concepts, machine learning techniques, and software engineering practices.

Key points in this section:
- Performance optimization strategies
- Data processing algorithms  
- Vector embedding techniques
- Document chunking methods

Code example for section ${i + 1}:
\`\`\`javascript
function processSection${i + 1}(data) {
    return data.map(item => ({
        id: item.id,
        processed: true,
        section: ${i + 1}
    }));
}
\`\`\`
`).join('\n');

        await fs.writeFile('./large-test-doc.md', largeContent);
        
        console.log(`Document size: ${largeContent.length} characters`);
        
        // Time the indexing process
        const startTime = Date.now();
        await indexer.indexDocument('./large-test-doc.md');
        const indexTime = Date.now() - startTime;
        
        // Test search performance
        const searchStart = Date.now();
        const results = await indexer.searchDocuments('optimization algorithm', { topK: 10 });
        const searchTime = Date.now() - searchStart;
        
        console.log(`📈 Performance Results:`);
        console.log(`   Indexing time: ${indexTime}ms`);
        console.log(`   Search time: ${searchTime}ms`);
        console.log(`   Results found: ${results.length}`);
        
        // Get final stats
        const stats = await indexer.getIndexStats();
        console.log(`   Total chunks: ${stats.storage.chunks}`);
        console.log(`   Total embeddings: ${stats.storage.embeddings}`);
        
    } catch (error) {
        console.error('Performance test failed:', error.message);
    } finally {
        await indexer.close();
        
        // Cleanup
        try {
            await fs.rm('./large-test-doc.md', { force: true });
            await fs.rm('./perf_test.db', { force: true });
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// Main test execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--performance') || args.includes('-p')) {
        await performanceTest();
    } else {
        await runTests();
        
        if (args.includes('--with-performance')) {
            await performanceTest();
        }
    }
}

main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});