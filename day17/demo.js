#!/usr/bin/env node

const { ImageGenerator } = require('./image-generator');

/**
 * Demo for Day 17 Image Generation
 * 
 * Demonstrates basic image generation functionality
 * with parameter control and logging
 */

async function runDemo() {
    console.log('🎨 Day 17: Image Generation Fundamentals Demo');
    console.log('═'.repeat(60));
    
    const generator = new ImageGenerator({
        defaultModel: 'mock', // Use mock for demo
        verbose: true
    });
    
    console.log('\\n📋 Available Models:');
    const models = generator.getModels();
    models.forEach(model => {
        console.log(`   ${model.key}: ${model.name} (${model.provider})`);
        console.log(`      Supported sizes: ${model.supports.sizes?.join(', ') || 'N/A'}`);
        if (model.pricing) {
            console.log(`      Pricing: $${Object.values(model.pricing)[0]} base`);
        }
        console.log('');
    });
    
    const demoPrompts = [
        {
            prompt: "A futuristic city with flying cars at sunset",
            model: "mock",
            size: "1024x1024",
            seed: 12345
        },
        {
            prompt: "A serene mountain landscape with a crystal clear lake",
            model: "mock",
            size: "1024x768",
            quality: "high",
            steps: 50
        },
        {
            prompt: "An abstract geometric pattern in vibrant colors",
            model: "mock",
            size: "768x1024",
            seed: 67890
        }
    ];
    
    console.log('🎨 Generating demo images...');
    console.log('═'.repeat(60));
    
    for (let i = 0; i < demoPrompts.length; i++) {
        const params = demoPrompts[i];
        
        console.log(`\\n${i + 1}. Generating: "${params.prompt}"`);
        console.log(`   Parameters:`, JSON.stringify(params, null, 2));
        
        try {
            const result = await generator.generateImage(params);
            
            console.log('✅ Generation successful!');
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Model: ${result.model} (${result.provider})`);
            console.log(`   Latency: ${result.performance.latency}ms`);
            console.log(`   Cost: $${result.cost.total.toFixed(4)}`);
            console.log(`   File: ${result.result.filename}`);
            
            if (result.result.revisedPrompt) {
                console.log(`   Revised prompt: "${result.result.revisedPrompt}"`);
            }
            
        } catch (error) {
            console.error(`❌ Generation failed: ${error.message}`);
        }
        
        // Small delay between generations
        if (i < demoPrompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Display final statistics
    console.log('\\n📊 Final Statistics:');
    console.log('═'.repeat(60));
    
    const stats = await generator.getStats();
    console.log(`Total requests: ${stats.total}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Success rate: ${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%`);
    console.log(`Average latency: ${Math.round(stats.avgLatency)}ms`);
    console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
    
    if (Object.keys(stats.models).length > 0) {
        console.log('\\nModel usage:');
        Object.entries(stats.models).forEach(([model, data]) => {
            console.log(`   ${model}: ${data.count} requests ($${data.cost.toFixed(4)})`);
        });
    }
    
    console.log('\\n🚀 Demo complete!');
    console.log('💡 To try the web interface, run: npm start');
    console.log('🌐 Then visit: http://localhost:3017');
}

if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { runDemo };