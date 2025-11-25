#!/usr/bin/env node

const axios = require('axios');

/**
 * Real MCP Client that connects to separate MCP servers
 * This demonstrates true MCP architecture with separate processes
 */

class RealMCPClient {
    constructor() {
        this.servers = {
            search_docs: 'http://localhost:3001',
            summarize: 'http://localhost:3002', 
            save_to_file: 'http://localhost:3003'
        };
        this.connectedServers = new Set();
    }

    /**
     * Connect to all MCP servers
     */
    async connect() {
        console.log('🔗 Real MCP Client connecting to servers...\n');

        for (const [tool, url] of Object.entries(this.servers)) {
            try {
                console.log(`Connecting to ${tool} server at ${url}...`);
                const response = await axios.get(`${url}/mcp/info`, { timeout: 2000 });
                console.log(`✅ Connected to ${response.data.name}`);
                this.connectedServers.add(tool);
            } catch (error) {
                console.log(`❌ Failed to connect to ${tool}: ${error.message}`);
                console.log(`   Make sure server is running: node servers/${tool === 'search_docs' ? 'search' : tool === 'save_to_file' ? 'savetofile' : tool}-mcp-server.js`);
            }
        }

        console.log(`\n📊 Connected to ${this.connectedServers.size}/${Object.keys(this.servers).length} servers\n`);
        return this.connectedServers.size > 0;
    }

    /**
     * Execute a tool on its respective MCP server
     */
    async executeTool(toolName, arguments) {
        if (!this.connectedServers.has(toolName)) {
            throw new Error(`Tool '${toolName}' server not connected`);
        }

        const serverUrl = this.servers[toolName];
        console.log(`🛠️ Calling ${toolName} on ${serverUrl}`);

        try {
            const response = await axios.post(`${serverUrl}/mcp/tools/call`, {
                name: toolName,
                arguments: arguments
            }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });

            const result = JSON.parse(response.data.content[0].text);
            console.log(`✅ ${toolName} completed successfully`);
            return result;
        } catch (error) {
            console.error(`❌ ${toolName} failed:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Execute a complete pipeline across multiple MCP servers
     */
    async executePipeline(name, input) {
        console.log(`🔄 Executing Real MCP Pipeline: ${name}`);
        console.log('='.repeat(50));

        const startTime = Date.now();

        try {
            // Step 1: Search (Server on port 3001)
            console.log('\n📍 Step 1: SearchDocs');
            const searchResult = await this.executeTool('search_docs', {
                query: input.query,
                searchType: 'keyword',
                maxResults: 1,
                includeContent: true
            });

            if (!searchResult.success) {
                throw new Error(`Search failed: ${searchResult.error}`);
            }

            // Extract content for summarization
            const contentToSummarize = searchResult.results
                .map(item => item.content || item.excerpt || item.title)
                .filter(text => text && text.length > 0)
                .join('\n\n');

            if (!contentToSummarize) {
                throw new Error('No content found to summarize');
            }

            console.log(`   Found ${searchResult.results.length} results, content length: ${contentToSummarize.length}`);

            // Step 2: Summarize (Server on port 3002)  
            console.log('\n📍 Step 2: Summarize');
            const summaryResult = await this.executeTool('summarize', {
                content: contentToSummarize,
                summaryType: input.summaryType || 'key_insights',
                length: 'medium',
                includeKeywords: true
            });

            if (!summaryResult.success) {
                throw new Error(`Summarization failed: ${summaryResult.error}`);
            }

            console.log(`   Summary generated: ${summaryResult.summary.length} characters`);

            // Step 3: Save to File (Server on port 3003)
            console.log('\n📍 Step 3: SaveToFile');
            const saveResult = await this.executeTool('save_to_file', {
                content: summaryResult.summary,
                filename: `real_mcp_${name}`,
                format: 'md',
                overwrite: true,
                metadata: {
                    pipeline: name,
                    createdBy: 'Real MCP Pipeline',
                    query: input.query,
                    summaryType: input.summaryType,
                    servers: Object.keys(this.servers),
                    executionMode: 'distributed'
                }
            });

            if (!saveResult.success) {
                throw new Error(`Save failed: ${saveResult.error}`);
            }

            console.log(`   File saved: ${saveResult.filename}`);

            const totalTime = Date.now() - startTime;
            console.log(`\n🏁 Real MCP Pipeline completed successfully in ${totalTime}ms`);
            console.log(`📁 Output: ${saveResult.filePath}`);

            return {
                success: true,
                totalTime,
                searchResults: searchResult.totalResults,
                summaryLength: summaryResult.summary.length,
                outputFile: saveResult.filePath,
                servers: Array.from(this.connectedServers)
            };

        } catch (error) {
            const totalTime = Date.now() - startTime;
            console.error(`\n❌ Real MCP Pipeline failed after ${totalTime}ms:`, error.message);
            return {
                success: false,
                error: error.message,
                totalTime
            };
        }
    }

    /**
     * Check server health
     */
    async healthCheck() {
        console.log('🏥 Checking server health...\n');
        
        for (const [tool, url] of Object.entries(this.servers)) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 1000 });
                console.log(`✅ ${tool}: ${response.data.status}`);
            } catch (error) {
                console.log(`❌ ${tool}: unreachable`);
            }
        }
    }

    /**
     * List all available tools from all servers
     */
    async listAllTools() {
        console.log('🛠️ Available Tools Across All Servers:\n');

        for (const [tool, url] of Object.entries(this.servers)) {
            if (!this.connectedServers.has(tool)) {
                console.log(`❌ ${tool}: server not connected`);
                continue;
            }

            try {
                const response = await axios.get(`${url}/mcp/tools/list`);
                const tools = response.data.tools;
                console.log(`📋 Server: ${url}`);
                tools.forEach(tool => {
                    console.log(`   - ${tool.name}: ${tool.description}`);
                });
                console.log();
            } catch (error) {
                console.log(`❌ ${tool}: failed to list tools`);
            }
        }
    }
}

/**
 * Demo function for Real MCP Pipeline
 */
async function runRealMCPDemo() {
    const client = new RealMCPClient();

    // Check server health first
    await client.healthCheck();
    console.log();

    // Connect to servers
    const connected = await client.connect();
    if (!connected) {
        console.log('❌ No servers available. Start servers first:\n');
        console.log('Terminal 1: node servers/search-mcp-server.js');
        console.log('Terminal 2: node servers/summarize-mcp-server.js'); 
        console.log('Terminal 3: node servers/savetofile-mcp-server.js\n');
        return;
    }

    // List available tools
    await client.listAllTools();

    // Run pipeline tests
    const testCases = [
        {
            name: 'api_research',
            query: 'REST API design',
            summaryType: 'bullet_points'
        },
        {
            name: 'js_guide', 
            query: 'JavaScript programming',
            summaryType: 'executive'
        },
        {
            name: 'security_brief',
            query: 'web security',
            summaryType: 'key_insights'
        }
    ];

    for (const testCase of testCases) {
        await client.executePipeline(testCase.name, testCase);
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('🎉 All Real MCP Pipeline tests completed!');
    console.log('💡 This demonstrates true distributed MCP architecture!');
}

// Export for use as module
module.exports = { RealMCPClient };

// Run demo if executed directly
if (require.main === module) {
    runRealMCPDemo().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}