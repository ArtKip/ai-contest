#!/usr/bin/env node

const { MCPIntegration } = require('./mcp-client.js');

/**
 * Test script for MCP integration
 * Tests different scenarios and edge cases
 */

async function runTests() {
    console.log('🧪 Running MCP Integration Tests');
    console.log('================================');

    const tests = [
        {
            name: 'Basic Connection Test',
            test: testBasicConnection
        },
        {
            name: 'Tools Listing Test',
            test: testToolsListing
        },
        {
            name: 'Tool Execution Test',
            test: testToolExecution
        },
        {
            name: 'Error Handling Test',
            test: testErrorHandling
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of tests) {
        console.log(`\n🔬 Running: ${testCase.name}`);
        console.log('-'.repeat(40));
        
        try {
            const result = await testCase.test();
            if (result) {
                console.log(`✅ PASSED: ${testCase.name}`);
                passed++;
            } else {
                console.log(`❌ FAILED: ${testCase.name}`);
                failed++;
            }
        } catch (error) {
            console.log(`💥 ERROR in ${testCase.name}: ${error.message}`);
            failed++;
        }
    }

    console.log('\n📊 Test Results');
    console.log('================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);

    return failed === 0;
}

async function testBasicConnection() {
    const client = new MCPIntegration();
    
    try {
        const connected = await client.initializeClient('stdio', {
            command: 'node',
            args: ['mcp-server-simple.js']
        });
        
        await client.disconnect();
        return connected;
    } catch (error) {
        console.error('Connection test failed:', error.message);
        return false;
    }
}

async function testToolsListing() {
    const client = new MCPIntegration();
    
    try {
        await client.initializeClient('stdio', {
            command: 'node',
            args: ['mcp-server-simple.js']
        });
        
        const tools = await client.getAvailableTools();
        const hasTools = Array.isArray(tools) && tools.length > 0;
        
        console.log(`Found ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
        
        await client.disconnect();
        return hasTools;
    } catch (error) {
        console.error('Tools listing test failed:', error.message);
        return false;
    }
}

async function testToolExecution() {
    const client = new MCPIntegration();
    
    try {
        await client.initializeClient('stdio', {
            command: 'node',
            args: ['mcp-server-simple.js']
        });
        
        // Test multiple tools
        const tests = [
            { name: 'echo', args: { message: 'Test message' } },
            { name: 'get_time', args: { format: 'iso' } },
            { name: 'calculate', args: { operation: 'add', a: 10, b: 5 } }
        ];
        
        let allPassed = true;
        for (const test of tests) {
            try {
                const result = await client.testTool(test.name, test.args);
                console.log(`  ✓ ${test.name} tool executed successfully`);
            } catch (error) {
                console.error(`  ✗ ${test.name} tool failed: ${error.message}`);
                allPassed = false;
            }
        }
        
        await client.disconnect();
        return allPassed;
    } catch (error) {
        console.error('Tool execution test failed:', error.message);
        return false;
    }
}

async function testErrorHandling() {
    const client = new MCPIntegration();
    
    try {
        await client.initializeClient('stdio', {
            command: 'node',
            args: ['mcp-server-simple.js']
        });
        
        // Test calling non-existent tool
        try {
            await client.testTool('nonexistent_tool', {});
            console.log('  ✗ Should have thrown error for non-existent tool');
            await client.disconnect();
            return false;
        } catch (error) {
            console.log('  ✓ Correctly handled non-existent tool error');
        }
        
        // Test invalid arguments
        try {
            await client.testTool('calculate', { operation: 'divide', a: 10, b: 0 });
            console.log('  ✗ Should have thrown error for division by zero');
            await client.disconnect();
            return false;
        } catch (error) {
            console.log('  ✓ Correctly handled division by zero error');
        }
        
        await client.disconnect();
        return true;
    } catch (error) {
        console.error('Error handling test failed:', error.message);
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests };