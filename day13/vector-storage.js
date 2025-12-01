#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

/**
 * Vector Storage - Persistent storage for document embeddings
 * 
 * Provides dual storage with SQLite for performance and JSON for portability,
 * supporting efficient vector similarity search and document retrieval.
 */

class VectorStorage {
    constructor(options = {}) {
        this.dbPath = options.dbPath || './document_index.db';
        this.jsonBackupDir = options.jsonBackupDir || './index-backups';
        this.autoBackup = options.autoBackup !== false;
        this.batchSize = options.batchSize || 100;
        
        this.db = null;
        this.isInitialized = false;
        
        console.log(`💾 VectorStorage initialized with SQLite + JSON backup`);
    }

    /**
     * Initialize the storage system
     */
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🗄️ Initializing vector storage...');
        
        // Ensure backup directory exists
        try {
            await fs.mkdir(this.jsonBackupDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create backup directory:', error.message);
        }

        // Initialize SQLite database
        await this.initDatabase();
        
        this.isInitialized = true;
        console.log('✅ Vector storage ready');
    }

    initDatabase() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Failed to open database:', err.message);
                    reject(err);
                    return;
                }
                
                console.log('📊 Connected to SQLite database');
                this.createTables().then(resolve).catch(reject);
            });
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const schema = `
                -- Documents table: stores original document metadata
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    filepath TEXT NOT NULL,
                    content_type TEXT,
                    file_size INTEGER,
                    content_hash TEXT,
                    metadata TEXT, -- JSON string
                    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    chunk_count INTEGER DEFAULT 0
                );

                -- Chunks table: stores document chunks with content
                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    chunk_type TEXT,
                    chunk_index INTEGER,
                    start_position INTEGER,
                    end_position INTEGER,
                    metadata TEXT, -- JSON string  
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );

                -- Embeddings table: stores vector embeddings for chunks
                CREATE TABLE IF NOT EXISTS embeddings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chunk_id TEXT NOT NULL UNIQUE,
                    vector_json TEXT NOT NULL, -- JSON array of vector values
                    dimensions INTEGER,
                    magnitude REAL,
                    method TEXT DEFAULT 'tfidf',
                    metadata TEXT, -- JSON string
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
                );

                -- Vocabulary table: stores term vocabulary and IDF scores
                CREATE TABLE IF NOT EXISTS vocabulary (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    term TEXT NOT NULL UNIQUE,
                    term_index INTEGER,
                    idf_score REAL,
                    document_count INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                -- Search index for better query performance
                CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
                CREATE INDEX IF NOT EXISTS idx_documents_content_type ON documents(content_type);
                CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
                CREATE INDEX IF NOT EXISTS idx_chunks_type ON chunks(chunk_type);
                CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
                CREATE INDEX IF NOT EXISTS idx_embeddings_dimensions ON embeddings(dimensions);
                CREATE INDEX IF NOT EXISTS idx_vocabulary_term ON vocabulary(term);
            `;

            this.db.exec(schema, (err) => {
                if (err) {
                    console.error('❌ Failed to create tables:', err.message);
                    reject(err);
                } else {
                    console.log('📋 Database schema ready');
                    resolve();
                }
            });
        });
    }

    /**
     * Store a document and its metadata
     */
    async storeDocument(documentData) {
        await this.initialize();
        
        const {
            id,
            filename,
            filepath,
            contentType,
            fileSize,
            contentHash,
            metadata = {}
        } = documentData;

        const insertDoc = `
            INSERT OR REPLACE INTO documents 
            (id, filename, filepath, content_type, file_size, content_hash, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(insertDoc, [
                id,
                filename,
                filepath,
                contentType,
                fileSize,
                contentHash,
                JSON.stringify(metadata)
            ], function(err) {
                if (err) {
                    console.error('❌ Failed to store document:', err.message);
                    reject(err);
                } else {
                    console.log(`📄 Stored document: ${filename}`);
                    resolve(id);
                }
            });
        });
    }

    /**
     * Store chunks for a document
     */
    async storeChunks(documentId, chunks) {
        await this.initialize();
        
        console.log(`📝 Storing ${chunks.length} chunks for document ${documentId}...`);

        const insertChunk = `
            INSERT OR REPLACE INTO chunks 
            (id, document_id, content, chunk_type, chunk_index, start_position, end_position, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const promises = chunks.map((chunk, index) => {
            return new Promise((resolve, reject) => {
                this.db.run(insertChunk, [
                    chunk.id,
                    documentId,
                    chunk.content,
                    chunk.type,
                    chunk.metadata?.chunkIndex || index,
                    chunk.metadata?.startPosition || 0,
                    chunk.metadata?.endPosition || chunk.content.length,
                    JSON.stringify(chunk.metadata || {})
                ], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(chunk.id);
                    }
                });
            });
        });

        await Promise.all(promises);
        
        // Update chunk count in documents table
        await this.updateDocumentChunkCount(documentId, chunks.length);
        
        console.log(`✅ Stored ${chunks.length} chunks`);
        return chunks.map(chunk => chunk.id);
    }

    /**
     * Store embeddings for chunks
     */
    async storeEmbeddings(embeddings) {
        await this.initialize();
        
        console.log(`🔢 Storing ${embeddings.length} embeddings...`);

        const insertEmbedding = `
            INSERT OR REPLACE INTO embeddings 
            (chunk_id, vector_json, dimensions, magnitude, method, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        // Process in batches for better performance
        for (let i = 0; i < embeddings.length; i += this.batchSize) {
            const batch = embeddings.slice(i, i + this.batchSize);
            
            const promises = batch.map(embedding => {
                return new Promise((resolve, reject) => {
                    this.db.run(insertEmbedding, [
                        embedding.chunkId,
                        JSON.stringify(embedding.vector),
                        embedding.metadata.dimensions,
                        embedding.metadata.magnitude,
                        embedding.metadata.method,
                        JSON.stringify(embedding.metadata)
                    ], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(this.lastID);
                        }
                    });
                });
            });

            await Promise.all(promises);
            
            if (batch.length === this.batchSize) {
                console.log(`   Progress: ${i + batch.length}/${embeddings.length} embeddings stored`);
            }
        }

        console.log(`✅ Stored ${embeddings.length} embeddings`);
        return embeddings.length;
    }

    /**
     * Store vocabulary data
     */
    async storeVocabulary(vocabularyData) {
        await this.initialize();
        
        console.log('📚 Storing vocabulary data...');

        // Clear existing vocabulary
        await new Promise((resolve, reject) => {
            this.db.run('DELETE FROM vocabulary', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const insertTerm = `
            INSERT INTO vocabulary (term, term_index, idf_score, document_count)
            VALUES (?, ?, ?, ?)
        `;

        const promises = vocabularyData.vocabulary.map(([term, index]) => {
            const idfScore = vocabularyData.idfScores.find(([t]) => t === term)?.[1] || 0;
            
            return new Promise((resolve, reject) => {
                this.db.run(insertTerm, [
                    term,
                    index,
                    idfScore,
                    vocabularyData.documentCount
                ], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        });

        await Promise.all(promises);
        console.log(`✅ Stored vocabulary: ${vocabularyData.vocabulary.length} terms`);
    }

    /**
     * Get all embeddings for similarity search
     */
    async getAllEmbeddings() {
        await this.initialize();
        
        const query = `
            SELECT e.chunk_id, e.vector_json, e.metadata, c.content, c.metadata as chunk_metadata, d.filename
            FROM embeddings e
            JOIN chunks c ON e.chunk_id = c.id
            JOIN documents d ON c.document_id = d.id
            ORDER BY e.created_at
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('❌ Failed to retrieve embeddings:', err.message);
                    reject(err);
                } else {
                    const embeddings = rows.map(row => ({
                        chunkId: row.chunk_id,
                        vector: JSON.parse(row.vector_json),
                        metadata: JSON.parse(row.metadata),
                        chunk: {
                            content: row.content,
                            metadata: JSON.parse(row.chunk_metadata)
                        },
                        document: {
                            filename: row.filename
                        }
                    }));
                    
                    console.log(`📤 Retrieved ${embeddings.length} embeddings`);
                    resolve(embeddings);
                }
            });
        });
    }

    /**
     * Get embeddings by chunk IDs
     */
    async getEmbeddingsByChunkIds(chunkIds) {
        await this.initialize();
        
        if (chunkIds.length === 0) return [];
        
        const placeholders = chunkIds.map(() => '?').join(',');
        const query = `
            SELECT e.chunk_id, e.vector_json, e.metadata, c.content, c.metadata as chunk_metadata, d.filename
            FROM embeddings e
            JOIN chunks c ON e.chunk_id = c.id
            JOIN documents d ON c.document_id = d.id
            WHERE e.chunk_id IN (${placeholders})
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, chunkIds, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const embeddings = rows.map(row => ({
                        chunkId: row.chunk_id,
                        vector: JSON.parse(row.vector_json),
                        metadata: JSON.parse(row.metadata),
                        chunk: {
                            content: row.content,
                            metadata: JSON.parse(row.chunk_metadata)
                        },
                        document: {
                            filename: row.filename
                        }
                    }));
                    
                    resolve(embeddings);
                }
            });
        });
    }

    /**
     * Get vocabulary data
     */
    async getVocabulary() {
        await this.initialize();
        
        const query = `
            SELECT term, term_index, idf_score, document_count
            FROM vocabulary
            ORDER BY term_index
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const vocabularyData = {
                        vocabulary: rows.map(row => [row.term, row.term_index]),
                        idfScores: rows.map(row => [row.term, row.idf_score]),
                        documentCount: rows[0]?.document_count || 0
                    };
                    
                    resolve(vocabularyData);
                }
            });
        });
    }

    /**
     * Search documents by metadata or content
     */
    async searchDocuments(filters = {}) {
        await this.initialize();
        
        let query = 'SELECT * FROM documents WHERE 1=1';
        const params = [];
        
        if (filters.contentType) {
            query += ' AND content_type = ?';
            params.push(filters.contentType);
        }
        
        if (filters.filename) {
            query += ' AND filename LIKE ?';
            params.push(`%${filters.filename}%`);
        }
        
        query += ' ORDER BY indexed_at DESC';
        
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const documents = rows.map(row => ({
                        ...row,
                        metadata: JSON.parse(row.metadata || '{}')
                    }));
                    resolve(documents);
                }
            });
        });
    }

    /**
     * Get document statistics
     */
    async getStorageStats() {
        await this.initialize();
        
        const queries = {
            documentCount: 'SELECT COUNT(*) as count FROM documents',
            chunkCount: 'SELECT COUNT(*) as count FROM chunks', 
            embeddingCount: 'SELECT COUNT(*) as count FROM embeddings',
            vocabularySize: 'SELECT COUNT(*) as count FROM vocabulary',
            totalSize: 'SELECT SUM(file_size) as size FROM documents',
            avgChunksPerDoc: 'SELECT AVG(chunk_count) as avg FROM documents'
        };

        const results = {};
        
        for (const [key, query] of Object.entries(queries)) {
            results[key] = await new Promise((resolve, reject) => {
                this.db.get(query, (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count || row.size || row.avg || 0);
                });
            });
        }

        return {
            documents: Math.round(results.documentCount),
            chunks: Math.round(results.chunkCount),
            embeddings: Math.round(results.embeddingCount),
            vocabularySize: Math.round(results.vocabularySize),
            totalSizeBytes: Math.round(results.totalSize || 0),
            averageChunksPerDocument: Math.round(results.avgChunksPerDoc || 0),
            databasePath: this.dbPath
        };
    }

    /**
     * Export entire index to JSON
     */
    async exportToJSON() {
        if (!this.autoBackup) return;
        
        console.log('📤 Exporting index to JSON...');
        
        try {
            // Export all tables
            const tables = ['documents', 'chunks', 'embeddings', 'vocabulary'];
            const exports = {};

            for (const table of tables) {
                exports[table] = await new Promise((resolve, reject) => {
                    this.db.all(`SELECT * FROM ${table}`, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
            }

            // Create timestamped backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.jsonBackupDir, `index-backup-${timestamp}.json`);
            
            await fs.writeFile(backupPath, JSON.stringify({
                exportTime: new Date().toISOString(),
                stats: await this.getStorageStats(),
                ...exports
            }, null, 2));

            // Update current snapshot
            const snapshotPath = path.join(this.jsonBackupDir, 'current-index.json');
            await fs.writeFile(snapshotPath, JSON.stringify({
                exportTime: new Date().toISOString(),
                stats: await this.getStorageStats(),
                ...exports
            }, null, 2));

            console.log('✅ JSON backup completed');

        } catch (error) {
            console.error('❌ JSON export failed:', error.message);
        }
    }

    async updateDocumentChunkCount(documentId, chunkCount) {
        const updateDoc = 'UPDATE documents SET chunk_count = ? WHERE id = ?';
        
        return new Promise((resolve, reject) => {
            this.db.run(updateDoc, [chunkCount, documentId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Delete document and all associated chunks/embeddings
     */
    async deleteDocument(documentId) {
        await this.initialize();
        
        const deleteDoc = 'DELETE FROM documents WHERE id = ?';
        
        return new Promise((resolve, reject) => {
            this.db.run(deleteDoc, [documentId], function(err) {
                if (err) {
                    console.error('❌ Failed to delete document:', err.message);
                    reject(err);
                } else {
                    console.log(`🗑️ Deleted document: ${documentId}`);
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.autoBackup) {
            await this.exportToJSON();
        }

        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Error closing database:', err.message);
                    } else {
                        console.log('📊 Database connection closed');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = { VectorStorage };