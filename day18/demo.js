#!/usr/bin/env node

const { StyleSystem } = require('./style-system');

/**
 * Day 18 Demo: Prompt & Style Systems
 * 
 * Demonstrates brand-consistent image generation using style profiles
 */

async function runDemo() {
    console.log('🎨 Day 18: Prompt & Style Systems Demo');
    console.log('═'.repeat(60));
    
    const styleSystem = new StyleSystem({ verbose: true });
    
    console.log('\\n📋 Available Style Profiles:');
    console.log('═'.repeat(60));
    
    const profiles = styleSystem.getStyleProfiles();
    profiles.forEach(profile => {
        console.log(`\\n🎯 ${profile.name} (${profile.key})`);
        console.log(`   Description: ${profile.description}`);
        console.log(`   Mood: ${profile.mood}`);
        console.log(`   Colors: ${profile.primaryColors.join(', ')}`);
        console.log(`   Preferred ratios: ${profile.preferredRatios.join(', ')}`);
    });
    
    // Demo subjects to test style consistency
    const testSubjects = [
        'a modern coffee cup on a wooden table',
        'a smartphone displaying a dashboard',
        'a person working at a laptop'
    ];
    
    const aspectRatios = ['1:1', '16:9', '4:3'];
    const styleProfiles = Object.keys(styleSystem.styleProfiles.profiles);
    
    console.log('\\n🎯 Testing Style Consistency');
    console.log('═'.repeat(60));
    
    // Test single generations first
    console.log('\\n1. Single Style Generations:');
    
    for (let i = 0; i < Math.min(3, testSubjects.length); i++) {
        const subject = testSubjects[i];
        const style = styleProfiles[i % styleProfiles.length];
        const ratio = aspectRatios[i % aspectRatios.length];
        
        console.log(`\\n   Testing: "${subject}" with ${style} (${ratio})`);
        
        try {
            const result = await styleSystem.generateStyledImage(subject, style, ratio);
            console.log(`   ✅ Generated: ${result.result.filename}`);
            console.log(`   📝 Prompt length: ${result.promptData.positive.length} chars`);
            
        } catch (error) {
            console.error(`   ❌ Failed: ${error.message}`);
        }
        
        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Test style grid generation
    console.log('\\n\\n2. Style Grid Generation:');
    console.log('   Generating same subject across all style profiles...');
    
    const gridSubject = 'a premium wristwatch on a marble surface';
    
    try {
        const gridResult = await styleSystem.generateStyleGrid(
            gridSubject,
            styleProfiles.slice(0, 3), // Test with first 3 styles
            '1:1'
        );
        
        console.log('\\n   📊 Grid Analysis:');
        const analysis = gridResult.styles;
        
        Object.entries(analysis).forEach(([styleName, result]) => {
            if (!result.error) {
                console.log(`   ${styleName}:`);
                console.log(`     ✅ Generated: ${result.result.filename}`);
                console.log(`     📏 Size: ${result.result.size}`);
                console.log(`     🎨 Profile: ${result.styleProfile}`);
            } else {
                console.log(`   ${styleName}: ❌ ${result.error}`);
            }
        });
        
    } catch (error) {
        console.error(`   ❌ Grid generation failed: ${error.message}`);
    }
    
    // Show statistics
    console.log('\\n\\n📊 Generation Statistics:');
    console.log('═'.repeat(60));
    
    const stats = await styleSystem.getStats();
    console.log(`Total generations: ${stats.total}`);
    console.log(`Successful: ${stats.successful}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Success rate: ${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%`);
    console.log(`Average latency: ${Math.round(stats.avgLatency)}ms`);
    
    if (Object.keys(stats.byStyle).length > 0) {
        console.log('\\nBy style profile:');
        Object.entries(stats.byStyle).forEach(([style, data]) => {
            const successRate = data.count > 0 ? Math.round((data.successful / data.count) * 100) : 0;
            console.log(`   ${style}: ${data.successful}/${data.count} (${successRate}%)`);
        });
    }
    
    if (Object.keys(stats.byAspectRatio).length > 0) {
        console.log('\\nBy aspect ratio:');
        Object.entries(stats.byAspectRatio).forEach(([ratio, data]) => {
            const successRate = data.count > 0 ? Math.round((data.successful / data.count) * 100) : 0;
            console.log(`   ${ratio}: ${data.successful}/${data.count} (${successRate}%)`);
        });
    }
    
    console.log('\\n🚀 Demo complete!');
    console.log('💡 To start the web interface: npm start');
    console.log('🎯 To generate comparison grids: npm run grid');
    console.log('📊 To run style tests: npm run test');
    
    // Show example of how to reuse styles
    console.log('\\n📝 Example: Reusing Style Templates');
    console.log('═'.repeat(60));
    console.log('// Generate consistent brand images:');
    console.log('const styleSystem = new StyleSystem();');
    console.log('');
    console.log('// Corporate style for business content');
    console.log('await styleSystem.generateStyledImage(');
    console.log('  "business meeting in conference room",');
    console.log('  "minimalist_corporate",');
    console.log('  "16:9"');
    console.log(');');
    console.log('');
    console.log('// Creative style for marketing content');
    console.log('await styleSystem.generateStyledImage(');
    console.log('  "creative team brainstorming session",');
    console.log('  "vibrant_creative",');
    console.log('  "3:4"');
    console.log(');');
    console.log('');
    console.log('// Luxury style for premium products');
    console.log('await styleSystem.generateStyledImage(');
    console.log('  "elegant jewelry display",');
    console.log('  "luxury_premium",');
    console.log('  "4:5"');
    console.log(');');
}

if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { runDemo };