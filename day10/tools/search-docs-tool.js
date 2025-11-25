#!/usr/bin/env node

/**
 * SearchDocs MCP Tool
 * 
 * Searches through documentation and knowledge bases to find relevant information.
 * Supports various search modes: keyword, semantic, exact match.
 */

class SearchDocsTool {
    constructor() {
        this.name = 'search_docs';
        this.description = 'Search through documentation and knowledge bases to find relevant information';
        
        // Mock documentation database
        this.documentDatabase = {
            'mcp': {
                title: 'Model Context Protocol (MCP) Documentation',
                content: `
                Model Context Protocol (MCP) is a standardized communication protocol that enables AI applications to securely connect to external systems and data sources. 

                Key Features:
                - Tool Registration: Register custom tools with schema validation
                - Resource Access: Access files, databases, and APIs through standardized interfaces
                - Prompt Templates: Define reusable prompt templates for common tasks
                - Security: Built-in authentication and permission management
                
                Architecture:
                MCP operates on a client-server model where:
                - Servers provide tools, resources, and prompts
                - Clients consume these capabilities through standardized requests
                - Transport layer handles communication (stdio, HTTP, WebSocket)
                
                Tool Definition:
                Tools are defined with JSON schema for input validation:
                {
                  "name": "tool_name",
                  "description": "Tool description", 
                  "inputSchema": {
                    "type": "object",
                    "properties": { ... },
                    "required": [...]
                  }
                }
                
                Common Use Cases:
                - Database queries and updates
                - File system operations
                - API integrations
                - Data processing pipelines
                - Automated workflows
                `,
                category: 'protocol',
                tags: ['mcp', 'protocol', 'tools', 'ai', 'integration'],
                lastUpdated: '2024-11-24'
            },
            'javascript': {
                title: 'JavaScript Programming Guide',
                content: `
                JavaScript is a versatile programming language used for web development, server-side applications, and more.
                
                Key Concepts:
                - Variables: var, let, const
                - Functions: function declaration, arrow functions, async/await
                - Objects: object literals, classes, prototypes
                - Arrays: map, filter, reduce, forEach
                - Promises: async operations, error handling
                
                Modern Features:
                - ES6+ syntax: destructuring, template literals, modules
                - Async/Await: cleaner asynchronous code
                - Modules: import/export for code organization
                - Classes: object-oriented programming support
                
                Best Practices:
                - Use strict mode ("use strict")
                - Prefer const over let, avoid var
                - Handle errors with try/catch
                - Write descriptive variable names
                - Use JSDoc for documentation
                
                Common Patterns:
                - Module pattern for code organization
                - Observer pattern for event handling
                - Factory pattern for object creation
                - Singleton pattern for global state
                `,
                category: 'programming',
                tags: ['javascript', 'programming', 'web', 'nodejs'],
                lastUpdated: '2024-11-20'
            },
            'apis': {
                title: 'REST API Design Guide',
                content: `
                REST (Representational State Transfer) is an architectural style for designing web APIs.
                
                Core Principles:
                - Stateless: Each request contains all necessary information
                - Cacheable: Responses should be cacheable when appropriate
                - Uniform Interface: Consistent API design patterns
                - Layered System: Architecture can be composed of hierarchical layers
                
                HTTP Methods:
                - GET: Retrieve data (idempotent)
                - POST: Create new resources
                - PUT: Update entire resource (idempotent)
                - PATCH: Partial resource updates
                - DELETE: Remove resources (idempotent)
                
                Status Codes:
                - 200 OK: Request successful
                - 201 Created: Resource created successfully
                - 400 Bad Request: Invalid request syntax
                - 401 Unauthorized: Authentication required
                - 404 Not Found: Resource not found
                - 500 Internal Server Error: Server-side error
                
                Best Practices:
                - Use nouns for resource URLs (/users, not /getUsers)
                - Version your API (/v1/users)
                - Include pagination for large datasets
                - Use consistent naming conventions
                - Provide comprehensive error messages
                - Document endpoints with OpenAPI/Swagger
                `,
                category: 'api-design',
                tags: ['rest', 'api', 'web', 'http', 'design'],
                lastUpdated: '2024-11-18'
            },
            'databases': {
                title: 'Database Design and Management',
                content: `
                Databases are structured collections of data that can be easily accessed, managed, and updated.
                
                Types of Databases:
                - Relational (SQL): MySQL, PostgreSQL, SQLite
                - Document: MongoDB, CouchDB
                - Key-Value: Redis, DynamoDB
                - Graph: Neo4j, Amazon Neptune
                - Time-Series: InfluxDB, TimescaleDB
                
                SQL Fundamentals:
                - SELECT: Query data from tables
                - INSERT: Add new records
                - UPDATE: Modify existing records  
                - DELETE: Remove records
                - JOIN: Combine data from multiple tables
                
                Design Principles:
                - Normalization: Reduce data redundancy
                - Indexing: Improve query performance
                - Constraints: Ensure data integrity
                - ACID Properties: Atomicity, Consistency, Isolation, Durability
                
                Performance Optimization:
                - Use appropriate indexes
                - Optimize query structure
                - Monitor slow queries
                - Consider partitioning for large datasets
                - Cache frequently accessed data
                
                Security:
                - Use parameterized queries to prevent SQL injection
                - Implement proper authentication and authorization
                - Encrypt sensitive data
                - Regular backups and disaster recovery
                `,
                category: 'database',
                tags: ['database', 'sql', 'nosql', 'design', 'performance'],
                lastUpdated: '2024-11-15'
            },
            'security': {
                title: 'Web Application Security Guide',
                content: `
                Security is critical for protecting web applications and user data from various threats.
                
                Common Vulnerabilities:
                - SQL Injection: Use parameterized queries
                - Cross-Site Scripting (XSS): Sanitize user input
                - Cross-Site Request Forgery (CSRF): Use CSRF tokens
                - Authentication Bypass: Implement proper session management
                - Data Exposure: Encrypt sensitive information
                
                Authentication:
                - Password hashing with bcrypt or Argon2
                - Multi-factor authentication (MFA)
                - OAuth 2.0 and OpenID Connect
                - JWT tokens for stateless authentication
                - Session management best practices
                
                Authorization:
                - Role-based access control (RBAC)
                - Principle of least privilege
                - Resource-level permissions
                - API key management
                
                HTTPS and Encryption:
                - SSL/TLS certificates
                - Encrypt data in transit and at rest
                - Secure key management
                - Certificate pinning for mobile apps
                
                Security Headers:
                - Content Security Policy (CSP)
                - X-Frame-Options
                - X-Content-Type-Options
                - Strict-Transport-Security
                `,
                category: 'security',
                tags: ['security', 'web', 'authentication', 'encryption', 'vulnerabilities'],
                lastUpdated: '2024-11-22'
            }
        };

        this.searchTypes = ['keyword', 'semantic', 'exact', 'category', 'tags'];
    }

    /**
     * Get tool schema for MCP registration
     */
    getToolSchema() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query or keywords to find relevant documentation'
                    },
                    searchType: {
                        type: 'string',
                        description: 'Type of search to perform',
                        enum: this.searchTypes,
                        default: 'keyword'
                    },
                    category: {
                        type: 'string',
                        description: 'Filter by document category (optional)',
                        enum: ['protocol', 'programming', 'api-design', 'database', 'security']
                    },
                    maxResults: {
                        type: 'number',
                        description: 'Maximum number of results to return',
                        minimum: 1,
                        maximum: 10,
                        default: 5
                    },
                    includeContent: {
                        type: 'boolean',
                        description: 'Whether to include full document content in results',
                        default: true
                    }
                },
                required: ['query']
            }
        };
    }

    /**
     * Execute the search docs tool
     */
    async execute(parameters) {
        try {
            console.log(`🔍 SearchDocs executing with parameters:`, parameters);

            const { 
                query, 
                searchType = 'keyword', 
                category = null, 
                maxResults = 5, 
                includeContent = true 
            } = parameters;

            if (!query || query.trim() === '') {
                throw new Error('Search query is required');
            }

            const searchQuery = query.toLowerCase().trim();
            const results = [];

            // Filter documents by category if specified
            const docsToSearch = category 
                ? Object.entries(this.documentDatabase).filter(([_, doc]) => doc.category === category)
                : Object.entries(this.documentDatabase);

            for (const [docId, document] of docsToSearch) {
                const score = this.calculateRelevanceScore(document, searchQuery, searchType);
                
                if (score > 0) {
                    results.push({
                        id: docId,
                        title: document.title,
                        category: document.category,
                        tags: document.tags,
                        lastUpdated: document.lastUpdated,
                        relevanceScore: score,
                        content: includeContent ? document.content.trim() : null,
                        excerpt: this.generateExcerpt(document.content, searchQuery)
                    });
                }
            }

            // Sort by relevance score (descending) and limit results
            results.sort((a, b) => b.relevanceScore - a.relevanceScore);
            const limitedResults = results.slice(0, maxResults);

            return {
                success: true,
                searchQuery: query,
                searchType: searchType,
                category: category,
                totalResults: results.length,
                returnedResults: limitedResults.length,
                results: limitedResults,
                executedAt: new Date().toISOString(),
                summary: `Found ${limitedResults.length} relevant documents for "${query}" using ${searchType} search`
            };

        } catch (error) {
            console.error('SearchDocs execution error:', error);
            return {
                success: false,
                error: error.message,
                searchQuery: parameters.query || '',
                executedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Calculate relevance score based on search type
     */
    calculateRelevanceScore(document, searchQuery, searchType) {
        const content = (document.title + ' ' + document.content + ' ' + document.tags.join(' ')).toLowerCase();
        
        switch (searchType) {
            case 'exact':
                return content.includes(searchQuery) ? 100 : 0;
            
            case 'keyword':
                const keywords = searchQuery.split(/\\s+/);
                let score = 0;
                keywords.forEach(keyword => {
                    if (document.title.toLowerCase().includes(keyword)) {
                        score += 30; // Title matches are highly relevant
                    }
                    if (document.tags.some(tag => tag.toLowerCase().includes(keyword))) {
                        score += 20; // Tag matches are very relevant
                    }
                    if (document.content.toLowerCase().includes(keyword)) {
                        score += 10; // Content matches are relevant
                    }
                });
                return score;
            
            case 'semantic':
                // Simple semantic matching based on related terms
                const semanticTerms = this.getSemanticTerms(searchQuery);
                let semanticScore = 0;
                semanticTerms.forEach(term => {
                    if (content.includes(term)) {
                        semanticScore += 15;
                    }
                });
                return semanticScore + this.calculateRelevanceScore(document, searchQuery, 'keyword') * 0.5;
            
            case 'category':
                return document.category.includes(searchQuery) ? 100 : 0;
            
            case 'tags':
                return document.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ? 100 : 0;
            
            default:
                return this.calculateRelevanceScore(document, searchQuery, 'keyword');
        }
    }

    /**
     * Get semantically related terms for better search results
     */
    getSemanticTerms(query) {
        const semanticMap = {
            'api': ['rest', 'endpoint', 'http', 'json', 'request', 'response'],
            'database': ['sql', 'query', 'table', 'data', 'storage', 'record'],
            'security': ['authentication', 'authorization', 'encryption', 'vulnerability', 'attack'],
            'javascript': ['js', 'node', 'function', 'variable', 'object', 'array'],
            'mcp': ['protocol', 'tool', 'client', 'server', 'schema', 'integration']
        };

        const relatedTerms = [];
        const queryLower = query.toLowerCase();
        
        Object.entries(semanticMap).forEach(([key, terms]) => {
            if (queryLower.includes(key)) {
                relatedTerms.push(...terms);
            }
            terms.forEach(term => {
                if (queryLower.includes(term)) {
                    relatedTerms.push(key, ...terms.filter(t => t !== term));
                }
            });
        });

        return [...new Set(relatedTerms)]; // Remove duplicates
    }

    /**
     * Generate an excerpt around the search query
     */
    generateExcerpt(content, query, maxLength = 200) {
        const contentLower = content.toLowerCase();
        const queryLower = query.toLowerCase();
        const queryIndex = contentLower.indexOf(queryLower);
        
        if (queryIndex === -1) {
            // If exact query not found, return first part of content
            return content.substring(0, maxLength).trim() + (content.length > maxLength ? '...' : '');
        }

        // Extract text around the query match
        const start = Math.max(0, queryIndex - Math.floor(maxLength / 2));
        const end = Math.min(content.length, start + maxLength);
        
        let excerpt = content.substring(start, end).trim();
        
        if (start > 0) {
            excerpt = '...' + excerpt;
        }
        if (end < content.length) {
            excerpt = excerpt + '...';
        }

        return excerpt;
    }

    /**
     * Add a new document to the search database
     */
    addDocument(id, document) {
        this.documentDatabase[id] = {
            title: document.title,
            content: document.content,
            category: document.category || 'general',
            tags: document.tags || [],
            lastUpdated: new Date().toISOString().split('T')[0]
        };
    }

    /**
     * Get all available categories
     */
    getCategories() {
        const categories = [...new Set(Object.values(this.documentDatabase).map(doc => doc.category))];
        return categories.sort();
    }

    /**
     * Get all available tags
     */
    getTags() {
        const tags = [...new Set(Object.values(this.documentDatabase).flatMap(doc => doc.tags))];
        return tags.sort();
    }

    /**
     * Get statistics about the document database
     */
    getStats() {
        const docs = Object.values(this.documentDatabase);
        return {
            totalDocuments: docs.length,
            categories: this.getCategories().length,
            tags: this.getTags().length,
            lastUpdated: Math.max(...docs.map(doc => new Date(doc.lastUpdated))).toISOString().split('T')[0],
            averageContentLength: Math.round(docs.reduce((sum, doc) => sum + doc.content.length, 0) / docs.length)
        };
    }
}

module.exports = { SearchDocsTool };