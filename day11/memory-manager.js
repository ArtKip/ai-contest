#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

/**
 * Memory Manager - Handles both SQLite and JSON persistence for agent conversations
 * 
 * Provides dual storage:
 * - SQLite for structured queries and performance
 * - JSON for portability and backups
 */

class MemoryManager {
    constructor(options = {}) {
        this.dbPath = options.dbPath || './memory.db';
        this.jsonBackupDir = options.jsonBackupDir || './memory-backups';
        this.db = null;
        this.autoBackup = options.autoBackup !== false;
        this.maxMemories = options.maxMemories || 10000;
        
        this.init();
    }

    async init() {
        console.log('🧠 Initializing Memory Manager...');
        
        // Ensure backup directory exists
        try {
            await fs.mkdir(this.jsonBackupDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create backup directory:', error.message);
        }

        // Initialize SQLite database
        await this.initDatabase();
        
        console.log('✅ Memory Manager ready');
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
                -- Conversations: Individual message exchanges
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_input TEXT NOT NULL,
                    agent_response TEXT NOT NULL,
                    metadata TEXT, -- JSON string with context, sentiment, topics
                    tokens_used INTEGER DEFAULT 0,
                    response_time_ms INTEGER DEFAULT 0
                );

                -- Sessions: Groups of related conversations
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME,
                    summary TEXT,
                    tags TEXT, -- Comma-separated
                    total_interactions INTEGER DEFAULT 0,
                    total_tokens INTEGER DEFAULT 0
                );

                -- Memories: Important facts, preferences, and learnings
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL, -- 'fact', 'preference', 'instruction', 'result'
                    content TEXT NOT NULL,
                    context TEXT, -- When/how this memory applies
                    relevance_score REAL DEFAULT 0.5, -- 0.0 to 1.0
                    source_session_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 0
                );

                -- Indexes for better query performance
                CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
                CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);
                CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
                CREATE INDEX IF NOT EXISTS idx_memories_relevance ON memories(relevance_score);
                CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(last_accessed);
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
     * Store a conversation exchange
     */
    async storeConversation(sessionId, userInput, agentResponse, metadata = {}) {
        const insertConversation = `
            INSERT INTO conversations (session_id, user_input, agent_response, metadata, tokens_used, response_time_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const metadataJson = JSON.stringify(metadata);
        const tokensUsed = metadata.tokensUsed || 0;
        const responseTime = metadata.responseTime || 0;

        return new Promise((resolve, reject) => {
            this.db.run(insertConversation, [
                sessionId, 
                userInput, 
                agentResponse, 
                metadataJson, 
                tokensUsed, 
                responseTime
            ], function(err) {
                if (err) {
                    console.error('❌ Failed to store conversation:', err.message);
                    reject(err);
                } else {
                    console.log(`💾 Stored conversation (ID: ${this.lastID})`);
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Create or update a session
     */
    async updateSession(sessionId, updates = {}) {
        const insertOrUpdate = `
            INSERT INTO sessions (session_id, summary, tags, total_interactions, total_tokens)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                end_time = CURRENT_TIMESTAMP,
                summary = COALESCE(excluded.summary, sessions.summary),
                tags = COALESCE(excluded.tags, sessions.tags),
                total_interactions = excluded.total_interactions,
                total_tokens = excluded.total_tokens
        `;

        return new Promise((resolve, reject) => {
            this.db.run(insertOrUpdate, [
                sessionId,
                updates.summary || null,
                updates.tags || null,
                updates.totalInteractions || 0,
                updates.totalTokens || 0
            ], (err) => {
                if (err) {
                    console.error('❌ Failed to update session:', err.message);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Store a memory (fact, preference, learning, etc.)
     */
    async storeMemory(type, content, context = '', relevanceScore = 0.5, sourceSessionId = null) {
        const insertMemory = `
            INSERT INTO memories (type, content, context, relevance_score, source_session_id)
            VALUES (?, ?, ?, ?, ?)
        `;

        return new Promise((resolve, reject) => {
            this.db.run(insertMemory, [type, content, context, relevanceScore, sourceSessionId], function(err) {
                if (err) {
                    console.error('❌ Failed to store memory:', err.message);
                    reject(err);
                } else {
                    console.log(`🧩 Stored ${type} memory (ID: ${this.lastID})`);
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Retrieve conversation history for a session
     */
    async getSessionHistory(sessionId, limit = 50) {
        const query = `
            SELECT * FROM conversations 
            WHERE session_id = ? 
            ORDER BY timestamp ASC 
            LIMIT ?
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, [sessionId, limit], (err, rows) => {
                if (err) {
                    console.error('❌ Failed to retrieve session history:', err.message);
                    reject(err);
                } else {
                    const conversations = rows.map(row => ({
                        ...row,
                        metadata: row.metadata ? JSON.parse(row.metadata) : {}
                    }));
                    resolve(conversations);
                }
            });
        });
    }

    /**
     * Get relevant context for a new conversation
     */
    async getRelevantContext(query, sessionId, limit = 5) {
        // Get recent conversations from current session
        const recentQuery = `
            SELECT user_input, agent_response, timestamp 
            FROM conversations 
            WHERE session_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `;

        // Get relevant memories
        const memoryQuery = `
            SELECT type, content, context, relevance_score 
            FROM memories 
            WHERE relevance_score > 0.3
            ORDER BY relevance_score DESC, last_accessed DESC 
            LIMIT ?
        `;

        const [recentConversations, relevantMemories] = await Promise.all([
            new Promise((resolve, reject) => {
                this.db.all(recentQuery, [sessionId, limit], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            }),
            new Promise((resolve, reject) => {
                this.db.all(memoryQuery, [limit], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            })
        ]);

        return {
            recentConversations,
            relevantMemories,
            sessionId
        };
    }

    /**
     * Search conversations by content
     */
    async searchConversations(searchTerm, limit = 10) {
        const query = `
            SELECT c.*, s.summary, s.tags
            FROM conversations c
            LEFT JOIN sessions s ON c.session_id = s.session_id
            WHERE c.user_input LIKE ? OR c.agent_response LIKE ?
            ORDER BY c.timestamp DESC
            LIMIT ?
        `;

        const searchPattern = `%${searchTerm}%`;

        return new Promise((resolve, reject) => {
            this.db.all(query, [searchPattern, searchPattern, limit], (err, rows) => {
                if (err) {
                    console.error('❌ Failed to search conversations:', err.message);
                    reject(err);
                } else {
                    resolve(rows.map(row => ({
                        ...row,
                        metadata: row.metadata ? JSON.parse(row.metadata) : {}
                    })));
                }
            });
        });
    }

    /**
     * Get memory statistics
     */
    async getMemoryStats() {
        const queries = {
            totalConversations: 'SELECT COUNT(*) as count FROM conversations',
            totalSessions: 'SELECT COUNT(*) as count FROM sessions', 
            totalMemories: 'SELECT COUNT(*) as count FROM memories',
            topMemories: 'SELECT type, COUNT(*) as count FROM memories GROUP BY type ORDER BY count DESC'
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            results[key] = await new Promise((resolve, reject) => {
                if (key === 'topMemories') {
                    this.db.all(query, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    this.db.get(query, (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    });
                }
            });
        }

        return results;
    }

    /**
     * Export data to JSON files for backup
     */
    async exportToJSON() {
        if (!this.autoBackup) return;

        console.log('📤 Exporting memory data to JSON...');

        try {
            // Export all tables
            const tables = ['conversations', 'sessions', 'memories'];
            const exports = {};

            for (const table of tables) {
                exports[table] = await new Promise((resolve, reject) => {
                    this.db.all(`SELECT * FROM ${table}`, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                });
            }

            // Write to JSON files
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            for (const [table, data] of Object.entries(exports)) {
                const filePath = path.join(this.jsonBackupDir, `${table}-${timestamp}.json`);
                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            }

            // Write current snapshot
            const snapshotPath = path.join(this.jsonBackupDir, 'current-snapshot.json');
            await fs.writeFile(snapshotPath, JSON.stringify({
                exportTime: new Date().toISOString(),
                ...exports
            }, null, 2));

            console.log('✅ JSON backup completed');

        } catch (error) {
            console.error('❌ JSON export failed:', error.message);
        }
    }

    /**
     * Clean up old memories to prevent database bloat
     */
    async cleanup() {
        const cleanupQuery = `
            DELETE FROM memories 
            WHERE relevance_score < 0.1 
            AND datetime(last_accessed, '+30 days') < datetime('now')
            AND access_count < 2
        `;

        return new Promise((resolve, reject) => {
            this.db.run(cleanupQuery, function(err) {
                if (err) {
                    console.error('❌ Memory cleanup failed:', err.message);
                    reject(err);
                } else {
                    console.log(`🧹 Cleaned up ${this.changes} low-relevance memories`);
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
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('📊 Database connection closed');
                }
                resolve();
            });
        });
    }
}

module.exports = { MemoryManager };