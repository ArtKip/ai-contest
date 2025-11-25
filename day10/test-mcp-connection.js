#!/usr/bin/env node

const axios = require('axios');

/**
 * Test MCP server connections directly
 */

async function testMCPServers() {
    console.log('🔍 Testing MCP Server Connections...');
    console.log('═'.repeat(50));

    const servers = [
        { name: 'SearchDocs', url: 'http://localhost:3001' },
        { name: 'Summarize', url: 'http://localhost:3002' },
        { name: 'SaveToFile', url: 'http://localhost:3003' }
    ];

    // Test health endpoints
    console.log('📋 Health Check Results:');
    for (const server of servers) {
        try {
            const response = await axios.get(`${server.url}/health`, { timeout: 3000 });
            console.log(`✅ ${server.name}: ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`❌ ${server.name}: ${error.message}`);
        }
    }

    console.log('\n🛠️ Tool Execution Test:');
    
    // Test SearchDocs tool
    try {
        console.log('Testing SearchDocs tool...');
        const searchResponse = await axios.post('http://localhost:3001/mcp/tools/call', {
            name: 'search_docs',
            arguments: {
                query: 'REST API security',
                searchType: 'keyword',
                maxResults: 1,
                includeContent: true
            }
        }, { timeout: 5000 });
        
        console.log('✅ SearchDocs tool works!');
        const searchResult = JSON.parse(searchResponse.data.content[0].text);
        console.log(`   Found ${searchResult.totalResults} results`);
        
    } catch (error) {
        console.log('❌ SearchDocs tool failed:', error.message);
        if (error.response) {
            console.log('   Response:', error.response.data);
        }
    }

    // Test Summarize tool
    try {
        console.log('\nTesting Summarize tool...');
        const summarizeResponse = await axios.post('http://localhost:3002/mcp/tools/call', {
            name: 'summarize',
            arguments: {
                content: 'This is a test content for summarization.',
                summaryType: 'bullet_points',
                length: 'brief'
            }
        }, { timeout: 5000 });
        
        console.log('✅ Summarize tool works!');
        const summaryResult = JSON.parse(summarizeResponse.data.content[0].text);
        console.log(`   Summary: ${summaryResult.summary?.substring(0, 50)}...`);
        
    } catch (error) {
        console.log('❌ Summarize tool failed:', error.message);
    }

    // Test SaveToFile tool
    try {
        console.log('\nTesting SaveToFile tool...');
        const saveResponse = await axios.post('http://localhost:3003/mcp/tools/call', {
            name: 'save_to_file',
            arguments: {
                content: 'Test file content from connection test',
                filename: 'connection_test',
                format: 'txt',
                overwrite: true
            }
        }, { timeout: 5000 });
        
        console.log('✅ SaveToFile tool works!');
        const saveResult = JSON.parse(saveResponse.data.content[0].text);
        console.log(`   File saved: ${saveResult.filename}`);
        
    } catch (error) {
        console.log('❌ SaveToFile tool failed:', error.message);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('🎯 Test Complete!');
    console.log('\nIf tools are working here but failing in Web UI,');
    console.log('the issue is in the Web UI server connection logic.');
}

// Run the test
testMCPServers().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});