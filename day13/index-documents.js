#!/usr/bin/env node

const { DocumentIndexer } = require('./document-indexer');
const path = require('path');

/**
 * Command-line interface for indexing documents
 * 
 * Usage:
 * node index-documents.js --source ./docs
 * node index-documents.js --file README.md
 * node index-documents.js --source ./src --pattern "\.js$"
 */

async function main() {
    const args = parseArgs();
    
    if (args.help || (!args.source && !args.file)) {
        printUsage();
        return;
    }
    
    const indexer = new DocumentIndexer({
        chunking: {
            chunkSize: args.chunkSize || 500,
            overlap: args.overlap || 50
        },
        embedding: {
            dimensions: args.dimensions || 300
        },
        storage: {
            dbPath: args.dbPath || './document_index.db'
        }
    });
    
    console.log('🚀 Starting document indexing...');
    console.log(`   Source: ${args.source || args.file}`);
    console.log(`   Chunk size: ${args.chunkSize || 500}`);
    console.log(`   Overlap: ${args.overlap || 50}`);
    
    try {
        if (args.file) {
            // Index single file
            const result = await indexer.indexDocument(path.resolve(args.file));
            if (result) {
                console.log(`\n✅ Indexed 1 document successfully`);
            } else {
                console.log(`\n⚠️ Failed to index document`);
            }
        } else {
            // Index directory
            const result = await indexer.indexDirectory(path.resolve(args.source), {
                recursive: args.recursive !== false,
                pattern: args.pattern,
                maxFiles: args.maxFiles || 100,
                force: args.force
            });
            
            console.log(`\n✅ Indexing complete!`);
            console.log(`   Total files found: ${result.totalFiles}`);
            console.log(`   Successfully processed: ${result.processedFiles}`);
            console.log(`   Skipped: ${result.skippedFiles}`);
        }
        
        // Print final statistics
        await indexer.printStats();
        
        // Export to JSON if requested
        if (args.export) {
            console.log('\n📤 Exporting index to JSON...');
            await indexer.exportIndex();
            console.log('✅ Export complete');
        }
        
    } catch (error) {
        console.error('\n❌ Indexing failed:', error.message);
        process.exit(1);
    } finally {
        await indexer.close();
    }
}

function parseArgs() {
    const args = {};
    const argv = process.argv.slice(2);
    
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        
        switch (arg) {
            case '--source':
            case '-s':
                args.source = argv[++i];
                break;
            case '--file':
            case '-f':
                args.file = argv[++i];
                break;
            case '--pattern':
            case '-p':
                args.pattern = argv[++i];
                break;
            case '--chunk-size':
                args.chunkSize = parseInt(argv[++i]);
                break;
            case '--overlap':
                args.overlap = parseInt(argv[++i]);
                break;
            case '--dimensions':
                args.dimensions = parseInt(argv[++i]);
                break;
            case '--max-files':
                args.maxFiles = parseInt(argv[++i]);
                break;
            case '--db-path':
                args.dbPath = argv[++i];
                break;
            case '--no-recursive':
                args.recursive = false;
                break;
            case '--force':
                args.force = true;
                break;
            case '--export':
                args.export = true;
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
📚 Document Indexer - CLI Tool

Usage:
  node index-documents.js --source <directory>
  node index-documents.js --file <filepath>

Options:
  --source, -s <dir>     Directory to index (recursively)
  --file, -f <file>      Single file to index
  --pattern, -p <regex>  Filter files by pattern
  --chunk-size <num>     Chunk size in characters (default: 500)
  --overlap <num>        Overlap between chunks (default: 50)
  --dimensions <num>     Vector dimensions (default: 300)
  --max-files <num>      Maximum files to process (default: 100)
  --db-path <path>       SQLite database path (default: ./document_index.db)
  --no-recursive         Don't recurse into subdirectories
  --force               Force re-index existing documents
  --export              Export index to JSON after processing
  --help, -h            Show this help

Examples:
  node index-documents.js --source ./docs
  node index-documents.js --file README.md
  node index-documents.js --source ./src --pattern "\\.js$" --max-files 50
  node index-documents.js --source ./articles --chunk-size 300 --export
`);
}

// Create sample documents for testing
async function createSampleDocs() {
    const fs = require('fs').promises;
    const sampleDir = './sample-docs';
    
    try {
        await fs.mkdir(sampleDir, { recursive: true });
        
        // Sample README
        await fs.writeFile(path.join(sampleDir, 'README.md'), `
# Sample Project

This is a sample project for testing document indexing.

## Features

- Document chunking and embedding
- Vector similarity search
- Multiple file format support

## Installation

\`\`\`bash
npm install
npm start
\`\`\`

## Usage

The system processes documents into searchable chunks with embeddings.
`);
        
        // Sample code file
        await fs.writeFile(path.join(sampleDir, 'example.js'), `
/**
 * Example JavaScript code for indexing
 */

function calculateSimilarity(vector1, vector2) {
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
    
    return dotProduct / (magnitude1 * magnitude2);
}

module.exports = { calculateSimilarity };
`);
        
        // Sample text file
        await fs.writeFile(path.join(sampleDir, 'article.txt'), `
Machine Learning and Natural Language Processing

Machine learning has revolutionized how we process and understand text.
Modern NLP systems can perform tasks like translation, summarization,
and semantic search with remarkable accuracy.

Vector embeddings are a key component of these systems, allowing us to
represent text as numerical vectors that capture semantic meaning.
This enables similarity search and clustering of documents.

Document indexing systems use these techniques to make large collections
of text searchable and retrievable based on semantic similarity rather
than just keyword matching.
`);
        
        console.log(`📁 Created sample documents in ${sampleDir}/`);
        
    } catch (error) {
        console.error('Failed to create sample documents:', error.message);
    }
}

// Run main function or create samples
if (process.argv.includes('--create-samples')) {
    createSampleDocs();
} else {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}