#!/usr/bin/env node

const { DocumentIndexer } = require('./document-indexer');

/**
 * Command-line interface for searching indexed documents
 * 
 * Usage:
 * node search-index.js --query "machine learning"
 * node search-index.js --query "function definition" --top-k 5
 */

async function main() {
    const args = parseArgs();
    
    if (args.help || !args.query) {
        printUsage();
        return;
    }
    
    const indexer = new DocumentIndexer({
        storage: {
            dbPath: args.dbPath || './document_index.db'
        }
    });
    
    console.log('🔍 Searching document index...');
    console.log(`   Query: "${args.query}"`);
    console.log(`   Top results: ${args.topK || 10}`);
    console.log(`   Min similarity: ${args.minSimilarity || 0.1}`);
    
    try {
        const results = await indexer.searchDocuments(args.query, {
            topK: args.topK || 10,
            minSimilarity: args.minSimilarity || 0.1
        });
        
        if (results.length === 0) {
            console.log('\n📭 No relevant documents found');
            console.log('Try:');
            console.log('  - Using different keywords');
            console.log('  - Lowering minimum similarity (--min-similarity 0.05)');
            console.log('  - Indexing more documents first');
            return;
        }
        
        console.log(`\n🎯 Found ${results.length} relevant chunks:\n`);
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.document.filename} (${(result.similarity * 100).toFixed(1)}% match)`);
            console.log(`   📄 Content: ${truncateText(result.chunk.content, 150)}`);
            
            if (result.chunk.metadata.header) {
                console.log(`   📝 Section: ${result.chunk.metadata.header}`);
            }
            
            if (result.chunk.metadata.function) {
                console.log(`   ⚙️ Function: ${result.chunk.metadata.function}`);
            }
            
            console.log(`   📊 Score: ${result.similarity.toFixed(4)} | Chunk: ${result.chunk.id}`);
            console.log('');
        });
        
        // Show aggregated results by document
        if (args.byDocument) {
            console.log('📋 Results by document:');
            const byDocument = aggregateResultsByDocument(results);
            
            byDocument.forEach(doc => {
                console.log(`\n📄 ${doc.filename} (${doc.chunks.length} relevant chunks)`);
                console.log(`   Best match: ${(doc.bestScore * 100).toFixed(1)}%`);
                console.log(`   Avg score: ${(doc.avgScore * 100).toFixed(1)}%`);
            });
        }
        
    } catch (error) {
        console.error('\n❌ Search failed:', error.message);
        
        if (error.message.includes('No vocabulary found')) {
            console.log('\n💡 Try indexing some documents first:');
            console.log('   node index-documents.js --source ./docs');
        }
        
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
            case '--query':
            case '-q':
                args.query = argv[++i];
                break;
            case '--top-k':
            case '-k':
                args.topK = parseInt(argv[++i]);
                break;
            case '--min-similarity':
            case '-m':
                args.minSimilarity = parseFloat(argv[++i]);
                break;
            case '--db-path':
                args.dbPath = argv[++i];
                break;
            case '--by-document':
                args.byDocument = true;
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
🔍 Document Search - CLI Tool

Usage:
  node search-index.js --query <search terms>

Options:
  --query, -q <text>        Search query text
  --top-k, -k <num>         Number of top results (default: 10)
  --min-similarity, -m <f>  Minimum similarity score (default: 0.1)
  --db-path <path>          SQLite database path (default: ./document_index.db)
  --by-document            Group results by document
  --help, -h               Show this help

Examples:
  node search-index.js --query "machine learning"
  node search-index.js --query "function definition" --top-k 5
  node search-index.js --query "vector embeddings" --min-similarity 0.2
  node search-index.js --query "install dependencies" --by-document
`);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function aggregateResultsByDocument(results) {
    const documentMap = new Map();
    
    results.forEach(result => {
        const filename = result.document.filename;
        
        if (!documentMap.has(filename)) {
            documentMap.set(filename, {
                filename,
                chunks: [],
                bestScore: 0,
                totalScore: 0
            });
        }
        
        const doc = documentMap.get(filename);
        doc.chunks.push(result);
        doc.bestScore = Math.max(doc.bestScore, result.similarity);
        doc.totalScore += result.similarity;
    });
    
    return Array.from(documentMap.values())
        .map(doc => ({
            ...doc,
            avgScore: doc.totalScore / doc.chunks.length
        }))
        .sort((a, b) => b.bestScore - a.bestScore);
}

// Interactive search mode
async function interactiveSearch() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const indexer = new DocumentIndexer();
    
    console.log('🔍 Interactive Search Mode');
    console.log('Type your queries (or "exit" to quit)\n');
    
    const search = async (query) => {
        try {
            const results = await indexer.searchDocuments(query, { topK: 5 });
            
            if (results.length === 0) {
                console.log('📭 No results found\n');
                return;
            }
            
            console.log(`\n🎯 Top ${results.length} results:`);
            results.forEach((result, index) => {
                console.log(`${index + 1}. ${result.document.filename} (${(result.similarity * 100).toFixed(1)}%)`);
                console.log(`   ${truncateText(result.chunk.content, 100)}`);
            });
            console.log('');
        } catch (error) {
            console.log(`❌ Error: ${error.message}\n`);
        }
    };
    
    const askQuestion = () => {
        rl.question('🔍 Search: ', async (query) => {
            if (query.toLowerCase() === 'exit') {
                await indexer.close();
                rl.close();
                return;
            }
            
            if (query.trim()) {
                await search(query);
            }
            
            askQuestion();
        });
    };
    
    askQuestion();
}

// Check for interactive mode
if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
    interactiveSearch();
} else {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}