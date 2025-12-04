#!/usr/bin/env node

const { ImageGenerator } = require('./image-generator');

/**
 * Test Script for Day 17 Image Generation Models
 * 
 * Tests all available models with various parameters
 * to demonstrate capabilities and logging
 */

async function testModels() {
    console.log('🧪 Day 17: Image Generation Models Test');
    console.log('═'.repeat(60));
    
    const generator = new ImageGenerator({
        verbose: true
    });
    
    const testCases = [
        // Mock model tests
        {
            name: "Mock - Basic Test",
            params: {
                prompt: "A simple test image",
                model: "mock",
                size: "512x512",
                quality: "standard"
            }
        },
        {
            name: "Mock - High Quality",
            params: {
                prompt: "A detailed landscape with mountains",
                model: "mock",
                size: "1024x1024",
                quality: "high",
                steps: 50,
                seed: 42
            }
        },
        
        // DALL-E 3 tests (will work if API key is available)
        {
            name: "DALL-E 3 - Standard",
            params: {
                prompt: "A photorealistic image of a cat sitting in a garden",
                model: "dalle3",
                size: "1024x1024",
                quality: "standard",
                style: "natural"
            }
        },
        {
            name: "DALL-E 3 - HD Vivid",
            params: {
                prompt: "An artistic interpretation of artificial intelligence",
                model: "dalle3",
                size: "1024x1792",
                quality: "hd",
                style: "vivid"
            }
        },
        
        // Stable Diffusion XL tests
        {
            name: "SDXL - Basic",
            params: {
                prompt: "A majestic dragon flying over a medieval castle",
                model: "sdxl",
                size: "1024x1024",
                steps: 30,
                cfg_scale: 7,
                seed: 123456
            }
        },
        
        // Flux tests
        {
            name: "Flux - Quick Generation",
            params: {
                prompt: "A cyberpunk cityscape at night with neon lights",
                model: "flux",
                size: "1024x768",
                steps: 4,
                seed: 789
            }
        }
    ];
    
    const results = [];
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        console.log(`\\n${i + 1}/${testCases.length} Testing: ${testCase.name}`);
        console.log('─'.repeat(40));
        console.log(`Model: ${testCase.params.model}`);
        console.log(`Prompt: "${testCase.params.prompt}"`);
        console.log(`Size: ${testCase.params.size}`);
        
        const startTime = Date.now();
        
        try {
            const result = await generator.generateImage(testCase.params);
            const duration = Date.now() - startTime;
            
            console.log('✅ Success!');
            console.log(`   Duration: ${duration}ms`);
            console.log(`   Cost: $${result.cost.total.toFixed(4)}`);
            console.log(`   File: ${result.result.filename}`);
            
            results.push({
                ...testCase,
                success: true,
                duration,
                cost: result.cost.total,
                result
            });
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            console.log(`❌ Failed: ${error.message}`);
            console.log(`   Duration: ${duration}ms`);
            
            results.push({
                ...testCase,
                success: false,
                duration,
                error: error.message
            });
        }
    }
    
    // Display test summary
    console.log('\\n📊 TEST SUMMARY');
    console.log('═'.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Total tests: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Success rate: ${Math.round((successful.length / results.length) * 100)}%`);
    
    if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const totalCost = successful.reduce((sum, r) => sum + r.cost, 0);
        
        console.log(`Average duration: ${Math.round(avgDuration)}ms`);
        console.log(`Total cost: $${totalCost.toFixed(4)}`);
    }
    
    // Model breakdown
    console.log('\\n📋 BY MODEL:');
    const modelStats = {};
    
    results.forEach(result => {
        const model = result.params.model;
        if (!modelStats[model]) {
            modelStats[model] = { total: 0, success: 0, failed: 0, cost: 0 };
        }
        
        modelStats[model].total++;
        if (result.success) {
            modelStats[model].success++;
            modelStats[model].cost += result.cost || 0;
        } else {
            modelStats[model].failed++;
        }
    });
    
    Object.entries(modelStats).forEach(([model, stats]) => {
        const successRate = Math.round((stats.success / stats.total) * 100);
        console.log(`   ${model}: ${stats.success}/${stats.total} (${successRate}%) - $${stats.cost.toFixed(4)}`);
    });
    
    // Failed tests
    if (failed.length > 0) {
        console.log('\\n❌ FAILED TESTS:');
        failed.forEach(result => {
            console.log(`   ${result.name}: ${result.error}`);
        });
    }
    
    // System statistics
    console.log('\\n📈 SYSTEM STATISTICS:');
    const stats = await generator.getStats();
    console.log(`   Total requests logged: ${stats.total}`);
    console.log(`   Overall success rate: ${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%`);
    console.log(`   Total system cost: $${stats.totalCost.toFixed(4)}`);
    
    console.log('\\n🧪 Model testing complete!');
    console.log('💡 Check the generated-images directory for output files');
    console.log('📝 Check image-generation.log for detailed logs');
}

if (require.main === module) {
    testModels().catch(console.error);
}

module.exports = { testModels };