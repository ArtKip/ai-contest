#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { DocumentChunker } = require('./document-chunker');
const { EmbeddingGenerator } = require('./embedding-generator');
const { VectorStorage } = require('./vector-storage');

/**
 * Document Indexer - Main orchestrator for document processing pipeline
 * 
 * Coordinates the complete workflow: ingestion → chunking → embedding → storage
 * for building a searchable document index with vector embeddings.
 */

class DocumentIndexer {
    constructor(options = {}) {
        this.chunker = new DocumentChunker(options.chunking || {});
        this.embedder = new EmbeddingGenerator(options.embedding || {});
        this.storage = new VectorStorage(options.storage || {});
        
        this.supportedExtensions = new Set([
            '.md', '.markdown', '.txt', '.text', '.js', '.javascript',
            '.py', '.python', '.java', '.cpp', '.c', '.h', '.cs', '.go',
            '.rs', '.php', '.rb', '.tsx', '.ts', '.json', '.xml', '.html',
            '.css', '.scss', '.less', '.yaml', '.yml', '.ini', '.conf'
        ]);
        
        this.processedFiles = new Set();
        this.stats = {
            filesProcessed: 0,
            documentsIndexed: 0,
            chunksCreated: 0,
            embeddingsGenerated: 0,
            errors: []
        };
        
        console.log('📚 DocumentIndexer initialized - ready to process documents');
    }

    /**
     * Index a single document file
     */
    async indexDocument(filePath, options = {}) {
        const force = options.force || false;
        
        try {
            console.log(`\n🔄 Processing: ${filePath}`);
            
            // Check if already processed
            if (!force && this.processedFiles.has(filePath)) {
                console.log(`⏭️ Skipping already processed file: ${filePath}`);
                return null;
            }
            
            // Validate file
            const fileStats = await fs.stat(filePath);
            if (!fileStats.isFile()) {
                throw new Error('Path is not a file');
            }
            
            const extension = path.extname(filePath).toLowerCase();
            if (!this.supportedExtensions.has(extension)) {
                console.log(`⚠️ Unsupported file type: ${extension}`);
                return null;
            }
            
            // Read and process file
            const content = await fs.readFile(filePath, 'utf-8');
            
            if (content.length === 0) {
                console.log(`⚠️ Empty file: ${filePath}`);
                return null;
            }
            
            // Create document metadata
            const documentData = {
                id: this.generateDocumentId(filePath),
                filename: path.basename(filePath),
                filepath: filePath,
                contentType: this.detectContentType(extension, content),
                fileSize: fileStats.size,
                contentHash: this.generateContentHash(content),
                metadata: {
                    extension,
                    lastModified: fileStats.mtime.toISOString(),
                    contentPreview: content.substring(0, 200)
                }
            };
            
            // Store document
            await this.storage.storeDocument(documentData);
            console.log(`📄 Stored document metadata`);
            
            // Chunk the document
            const chunks = await this.chunker.chunkDocument(content, {
                contentType: documentData.contentType,
                preserveStructure: true
            });
            
            if (chunks.length === 0) {
                console.log(`⚠️ No chunks generated for: ${filePath}`);
                return documentData;
            }
            
            // Store chunks
            await this.storage.storeChunks(documentData.id, chunks);
            console.log(`📝 Stored ${chunks.length} chunks`);
            
            // Generate embeddings for chunks
            const embeddings = await this.embedder.generateEmbeddings(chunks);
            
            // Store embeddings
            await this.storage.storeEmbeddings(embeddings);
            console.log(`🔢 Stored ${embeddings.length} embeddings`);
            
            // Store vocabulary if this is the first document or vocabulary needs updating
            const vocabularyData = this.embedder.exportVocabulary();
            await this.storage.storeVocabulary(vocabularyData);
            
            // Update statistics
            this.stats.filesProcessed++;
            this.stats.documentsIndexed++;
            this.stats.chunksCreated += chunks.length;
            this.stats.embeddingsGenerated += embeddings.length;
            
            this.processedFiles.add(filePath);
            
            console.log(`✅ Successfully indexed: ${filePath}`);
            console.log(`   Chunks: ${chunks.length} | Embeddings: ${embeddings.length}`);
            
            return {
                document: documentData,
                chunks: chunks.length,
                embeddings: embeddings.length
            };
            
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
            this.stats.errors.push({
                file: filePath,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    /**
     * Index all documents in a directory
     */
    async indexDirectory(directoryPath, options = {}) {
        const recursive = options.recursive !== false;
        const pattern = options.pattern || null;
        const maxFiles = options.maxFiles || 100;
        
        console.log(`\n📁 Indexing directory: ${directoryPath}`);
        console.log(`   Recursive: ${recursive} | Max files: ${maxFiles}`);
        
        const files = await this.findDocuments(directoryPath, {
            recursive,
            pattern,
            maxFiles
        });
        
        console.log(`📋 Found ${files.length} documents to process`);
        
        if (files.length === 0) {
            return {
                totalFiles: 0,
                processedFiles: 0,
                skippedFiles: 0
            };
        }
        
        // First pass: read all documents to build unified vocabulary
        console.log('📚 Reading all documents for vocabulary building...');
        const allChunks = [];
        const documentsData = [];
        
        for (const filePath of files) {
            try {
                const fileStats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf-8');
                
                if (content.length === 0) continue;
                
                const extension = path.extname(filePath).toLowerCase();
                const contentType = this.detectContentType(extension, content);
                
                const documentData = {
                    id: this.generateDocumentId(filePath),
                    filename: path.basename(filePath),
                    filepath: filePath,
                    contentType,
                    fileSize: fileStats.size,
                    contentHash: this.generateContentHash(content),
                    metadata: {
                        extension,
                        lastModified: fileStats.mtime.toISOString(),
                        contentPreview: content.substring(0, 200)
                    }
                };
                
                const chunks = await this.chunker.chunkDocument(content, {
                    contentType,
                    preserveStructure: true
                });
                
                documentsData.push({ documentData, chunks, content });
                allChunks.push(...chunks);
                
            } catch (error) {
                console.error(`❌ Error reading ${filePath}:`, error.message);
                this.stats.errors.push({
                    file: filePath,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        if (allChunks.length === 0) {
            console.log('⚠️ No valid chunks found in any documents');
            return {
                totalFiles: files.length,
                processedFiles: 0,
                skippedFiles: files.length
            };
        }
        
        // Second pass: generate embeddings with unified vocabulary
        console.log(`🔢 Building unified embeddings for ${allChunks.length} chunks...`);
        const allEmbeddings = await this.embedder.generateEmbeddings(allChunks);
        
        // Third pass: store documents, chunks, and embeddings
        console.log('💾 Storing documents and embeddings...');
        await this.storage.initialize();
        
        let processed = 0;
        let embeddingIndex = 0;
        
        for (const { documentData, chunks } of documentsData) {
            try {
                // Store document
                await this.storage.storeDocument(documentData);
                
                // Store chunks
                await this.storage.storeChunks(documentData.id, chunks);
                
                // Get embeddings for this document's chunks
                const docEmbeddings = allEmbeddings.slice(embeddingIndex, embeddingIndex + chunks.length);
                embeddingIndex += chunks.length;
                
                // Store embeddings
                await this.storage.storeEmbeddings(docEmbeddings);
                
                this.stats.filesProcessed++;
                this.stats.documentsIndexed++;
                this.stats.chunksCreated += chunks.length;
                this.stats.embeddingsGenerated += docEmbeddings.length;
                
                this.processedFiles.add(documentData.filepath);
                processed++;
                
                console.log(`✅ Stored: ${documentData.filename} (${chunks.length} chunks)`);
                
            } catch (error) {
                console.error(`❌ Error storing ${documentData.filepath}:`, error.message);
                this.stats.errors.push({
                    file: documentData.filepath,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Store unified vocabulary
        const vocabularyData = this.embedder.exportVocabulary();
        await this.storage.storeVocabulary(vocabularyData);
        
        console.log(`\n🎉 Directory indexing complete!`);
        console.log(`   Processed: ${processed}/${files.length} files`);
        
        return {
            totalFiles: files.length,
            processedFiles: processed,
            skippedFiles: files.length - processed
        };
    }

    /**
     * Search the indexed documents
     */
    async searchDocuments(query, options = {}) {
        const topK = options.topK || 10;
        const minSimilarity = options.minSimilarity || 0.1;
        const filters = options.filters || {};
        
        console.log(`\n🔍 Searching for: "${query}"`);
        
        // Initialize storage
        await this.storage.initialize();
        
        // Load vocabulary if not already loaded
        if (this.embedder.vocabulary.size === 0) {
            const vocabularyData = await this.storage.getVocabulary();
            if (vocabularyData.vocabulary.length > 0) {
                this.embedder.importVocabulary(vocabularyData);
            } else {
                throw new Error('No vocabulary found. Index some documents first.');
            }
        }
        
        // Generate query embedding
        const queryEmbedding = this.embedder.embedQuery(query);
        
        // Get all embeddings from storage
        const allEmbeddings = await this.storage.getAllEmbeddings();
        
        if (allEmbeddings.length === 0) {
            console.log('📭 No embeddings found in index');
            return [];
        }
        
        // Find similar embeddings
        const results = this.embedder.findSimilar(queryEmbedding, allEmbeddings, {
            topK,
            minSimilarity
        });
        
        // Enhance results with document context
        const enhancedResults = results.map(result => {
            const embedding = allEmbeddings.find(e => e.chunkId === result.chunkId);
            return {
                similarity: result.similarity,
                chunk: {
                    id: result.chunkId,
                    content: embedding.chunk.content,
                    metadata: embedding.chunk.metadata
                },
                document: embedding.document
            };
        });
        
        console.log(`🎯 Found ${enhancedResults.length} relevant chunks`);
        
        return enhancedResults;
    }

    /**
     * Find all supported document files in a directory
     */
    async findDocuments(directoryPath, options = {}) {
        const recursive = options.recursive !== false;
        const pattern = options.pattern;
        const maxFiles = options.maxFiles || 1000;
        
        const files = [];
        const supportedExtensions = this.supportedExtensions;
        
        async function scanDirectory(dirPath, depth = 0) {
            if (files.length >= maxFiles) return;
            
            try {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (files.length >= maxFiles) break;
                    
                    const fullPath = path.join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        if (recursive && !entry.name.startsWith('.') && !entry.name.startsWith('node_modules')) {
                            await scanDirectory(fullPath, depth + 1);
                        }
                    } else if (entry.isFile()) {
                        const extension = path.extname(entry.name).toLowerCase();
                        
                        // Check extension support
                        if (supportedExtensions.has(extension)) {
                            // Check pattern if specified
                            if (!pattern || entry.name.match(new RegExp(pattern, 'i'))) {
                                files.push(fullPath);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Cannot read directory ${dirPath}:`, error.message);
            }
        }
        
        await scanDirectory(directoryPath);
        return files.slice(0, maxFiles);
    }

    /**
     * Get indexing statistics
     */
    async getIndexStats() {
        const storageStats = await this.storage.getStorageStats();
        const embeddingStats = this.embedder.vocabulary.size > 0 
            ? { vocabularySize: this.embedder.vocabulary.size }
            : { vocabularySize: 0 };
        
        return {
            processing: this.stats,
            storage: storageStats,
            embedding: embeddingStats,
            lastUpdated: new Date().toISOString()
        };
    }

    async printStats() {
        const stats = await this.getIndexStats();
        
        console.log('\n📊 Indexing Statistics:');
        console.log(`   Files processed: ${stats.processing.filesProcessed}`);
        console.log(`   Documents indexed: ${stats.storage.documents}`);
        console.log(`   Chunks created: ${stats.storage.chunks}`);
        console.log(`   Embeddings: ${stats.storage.embeddings}`);
        console.log(`   Vocabulary size: ${stats.embedding.vocabularySize}`);
        console.log(`   Total size: ${Math.round(stats.storage.totalSizeBytes / 1024)}KB`);
        
        if (stats.processing.errors.length > 0) {
            console.log(`   Errors: ${stats.processing.errors.length}`);
        }
    }

    detectContentType(extension, content) {
        // Code file extensions
        const codeExtensions = ['.js', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php', '.rb'];
        if (codeExtensions.includes(extension)) {
            return 'code';
        }
        
        // Markdown extensions
        if (['.md', '.markdown'].includes(extension)) {
            return 'markdown';
        }
        
        // Check content for markdown indicators
        if (content.includes('# ') || content.includes('```') || content.includes('[](')) {
            return 'markdown';
        }
        
        return 'text';
    }

    generateDocumentId(filePath) {
        return crypto.createHash('sha256')
            .update(filePath)
            .digest('hex')
            .substring(0, 16);
    }

    generateContentHash(content) {
        return crypto.createHash('md5')
            .update(content)
            .digest('hex');
    }

    /**
     * Clear the entire index
     */
    async clearIndex() {
        console.log('🗑️ Clearing document index...');
        
        // Reset internal state
        this.processedFiles.clear();
        this.stats = {
            filesProcessed: 0,
            documentsIndexed: 0,
            chunksCreated: 0,
            embeddingsGenerated: 0,
            errors: []
        };
        
        // Clear embedder vocabulary
        this.embedder.vocabulary.clear();
        this.embedder.idfScores.clear();
        this.embedder.documentCount = 0;
        
        // TODO: Add method to clear storage if needed
        console.log('✅ Index cleared');
    }

    /**
     * Export index to JSON
     */
    async exportIndex() {
        await this.storage.exportToJSON();
        return await this.getIndexStats();
    }

    /**
     * Close the indexer and cleanup resources
     */
    async close() {
        console.log('🔒 Closing document indexer...');
        await this.storage.close();
        console.log('✅ Indexer closed');
    }
}

module.exports = { DocumentIndexer };