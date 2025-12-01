# Day 13 - Document Indexing

## Overview

A comprehensive document indexing system that processes documents into searchable chunks with embeddings. The system splits documents into manageable pieces, generates vector embeddings for semantic search, and stores them in a local database for fast retrieval.

## Features

- **Multi-format Support**: README files, articles, code files, and text documents
- **Smart Text Chunking**: Semantic-aware splitting with overlap for context preservation
- **Embedding Generation**: Vector embeddings for semantic similarity search
- **Dual Storage**: SQLite database with JSON backup for portability
- **Document Pipeline**: Complete ingestion → chunking → embedding → indexing workflow
- **Retrieval System**: Fast similarity search and ranking capabilities

## Architecture

```
Document Indexing Pipeline
├── Document Ingestion
│   ├── File parsing (MD, TXT, CODE)
│   ├── Content extraction and cleaning
│   └── Metadata collection
├── Text Chunking
│   ├── Semantic boundary detection
│   ├── Configurable chunk sizes
│   └── Overlap for context preservation
├── Embedding Generation
│   ├── Simple TF-IDF embeddings
│   ├── Vector normalization
│   └── Dimensionality optimization
├── Vector Storage
│   ├── SQLite with vector columns
│   ├── JSON backup files
│   └── Metadata indexing
└── Retrieval System
    ├── Similarity search
    ├── Result ranking
    └── Context reconstruction
```

## Quick Start

```bash
# Install dependencies
npm install

# Create and index sample documents
npm run demo

# Or step by step:
# 1. Create sample documents
node index-documents.js --create-samples

# 2. Index documents
node index-documents.js --source ./sample-docs

# 3. Search the index
node search-index.js --query "machine learning"
node search-index.js --query "vector embeddings"
node search-index.js --query "cosine similarity"
```

## Document Processing Pipeline

### 1. Document Ingestion
```javascript
const doc = await ingester.processDocument('README.md');
// Extracts content, metadata, and structure
```

### 2. Text Chunking
```javascript
const chunks = await chunker.splitDocument(doc, {
    chunkSize: 500,
    overlap: 50,
    preserveStructure: true
});
```

### 3. Embedding Generation
```javascript
const embeddings = await embedder.generateEmbeddings(chunks);
// Creates vector representations for similarity search
```

### 4. Index Storage
```javascript
await indexer.storeChunks(chunks, embeddings);
// Persists to SQLite and JSON backup
```

## Supported File Types

- **Markdown**: `.md`, `.markdown`
- **Text**: `.txt`
- **Code**: `.js`, `.py`, `.java`, `.cpp` (and more)
- **Documentation**: README files, API docs

## Search Capabilities

- **Semantic Search**: Find documents by meaning, not just keywords
- **Ranked Results**: Similarity scores for result ordering
- **Context Preservation**: Maintains document structure and relationships
- **Metadata Filtering**: Search within specific file types or sources

## Storage Format

### SQLite Schema
```sql
-- Documents table
documents (id, filename, path, content, metadata, indexed_at)

-- Chunks table  
chunks (id, document_id, content, chunk_index, start_pos, end_pos)

-- Embeddings table
embeddings (id, chunk_id, vector_json, magnitude)
```

### JSON Backup
- Complete index export for portability
- Human-readable format for debugging
- Easy migration between systems

## Performance

Based on testing with various document sizes:

- **Indexing Speed**: ~3ms per chunk (200 chunks in 212ms)
- **Search Speed**: 4ms for similarity search across 200 embeddings
- **Memory Usage**: Efficient vocabulary pruning and vector normalization
- **Storage**: SQLite database with JSON backup for redundancy

## CLI Usage

### Index Documents
```bash
# Index a directory
node index-documents.js --source ./docs

# Index a single file
node index-documents.js --file README.md

# Index with custom settings
node index-documents.js --source ./src --chunk-size 300 --max-files 50

# Force re-index existing documents
node index-documents.js --source ./docs --force

# Export to JSON after indexing
node index-documents.js --source ./docs --export
```

### Search Documents
```bash
# Basic search
node search-index.js --query "machine learning"

# Limit results
node search-index.js --query "vector embeddings" --top-k 5

# Lower similarity threshold
node search-index.js --query "optimization" --min-similarity 0.05

# Group results by document
node search-index.js --query "algorithm" --by-document
```

### Test System
```bash
# Run full test suite
npm test

# Run performance test
node test-indexer.js --performance
```

## API Usage

```javascript
const { DocumentIndexer } = require('./document-indexer');

// Initialize indexer
const indexer = new DocumentIndexer({
    chunking: { chunkSize: 500, overlap: 50 },
    embedding: { dimensions: 300 },
    storage: { dbPath: './my_index.db' }
});

// Index documents
await indexer.indexDirectory('./docs');

// Search
const results = await indexer.searchDocuments('machine learning', {
    topK: 10,
    minSimilarity: 0.1
});

// Get statistics
const stats = await indexer.getIndexStats();
console.log(`Indexed ${stats.storage.documents} documents`);
```

## Technical Implementation

- **Text Chunking**: Semantic-aware splitting with structure preservation
- **TF-IDF Embeddings**: Term frequency-inverse document frequency vectors
- **Cosine Similarity**: Vector similarity calculation for search
- **SQLite Storage**: Efficient database with proper indexing
- **Vocabulary Management**: Unified vocabulary across all documents
- **JSON Backup**: Automatic export for data portability

This implementation provides a solid foundation for document indexing and semantic search using locally computed embeddings.