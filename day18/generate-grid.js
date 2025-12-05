#!/usr/bin/env node

const { StyleSystem } = require('./style-system');

/**
 * Grid Generation Script for Day 18
 * 
 * Generates comparison grids to test style consistency and distinctiveness
 */

async function generateComparisonGrids() {
    console.log('🎯 Day 18: Style Comparison Grid Generator');
    console.log('═'.repeat(60));
    
    const styleSystem = new StyleSystem({ verbose: true });
    
    // Test subjects for brand consistency testing
    const testSubjects = [
        {
            subject: 'a modern office workspace with computer',
            description: 'Professional/Corporate Context',
            ratios: ['16:9', '4:3']
        },
        {
            subject: 'a creative artist painting at an easel',
            description: 'Creative/Artistic Context', 
            ratios: ['3:4', '1:1']
        },
        {
            subject: 'a luxury sports car in an elegant showroom',
            description: 'Premium/Luxury Context',
            ratios: ['4:5', '16:9']
        },
        {
            subject: 'a smartphone with a vibrant app interface',
            description: 'Tech/Digital Context',
            ratios: ['9:16', '1:1']
        },
        {
            subject: 'a steaming coffee cup on a wooden table',
            description: 'Lifestyle/Everyday Context',
            ratios: ['1:1', '4:3']
        }
    ];
    
    const allStyleProfiles = Object.keys(styleSystem.styleProfiles.profiles);
    
    console.log(`\\n📋 Will test ${testSubjects.length} subjects across ${allStyleProfiles.length} style profiles`);
    
    const gridResults = [];
    
    for (let i = 0; i < testSubjects.length; i++) {
        const test = testSubjects[i];
        
        console.log(`\\n\\n${i + 1}. ${test.description}`);
        console.log(`Subject: "${test.subject}"`);
        console.log('─'.repeat(50));
        
        // Test each aspect ratio for this subject
        for (const aspectRatio of test.ratios) {
            console.log(`\\n   Testing aspect ratio: ${aspectRatio}`);
            
            try {
                const gridResult = await styleSystem.generateStyleGrid(
                    test.subject,
                    allStyleProfiles,
                    aspectRatio
                );
                
                gridResults.push({
                    testCase: test.description,
                    subject: test.subject,
                    aspectRatio: aspectRatio,
                    gridId: gridResult.gridId,
                    timestamp: gridResult.timestamp,
                    stylesGenerated: Object.keys(gridResult.styles).length,
                    successfulStyles: Object.entries(gridResult.styles).filter(([_, result]) => !result.error).length
                });
                
                console.log(`   ✅ Grid generated: ${gridResult.gridId}`);
                console.log(`   📊 Styles: ${Object.keys(gridResult.styles).length} total, ${Object.entries(gridResult.styles).filter(([_, result]) => !result.error).length} successful`);
                
            } catch (error) {
                console.error(`   ❌ Grid generation failed: ${error.message}`);
                gridResults.push({
                    testCase: test.description,
                    subject: test.subject,
                    aspectRatio: aspectRatio,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Small delay between generations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Generate summary report
    console.log('\\n\\n📊 Grid Generation Summary Report');
    console.log('═'.repeat(60));
    
    const successfulGrids = gridResults.filter(result => !result.error);
    const failedGrids = gridResults.filter(result => result.error);
    
    console.log(`Total grids attempted: ${gridResults.length}`);
    console.log(`Successful grids: ${successfulGrids.length}`);
    console.log(`Failed grids: ${failedGrids.length}`);
    console.log(`Success rate: ${Math.round((successfulGrids.length / gridResults.length) * 100)}%`);
    
    if (successfulGrids.length > 0) {
        console.log('\\n✅ Successful Grids:');
        successfulGrids.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.testCase} (${result.aspectRatio})`);
            console.log(`      Grid ID: ${result.gridId}`);
            console.log(`      Styles: ${result.successfulStyles}/${result.stylesGenerated}`);
        });
    }
    
    if (failedGrids.length > 0) {
        console.log('\\n❌ Failed Grids:');
        failedGrids.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.testCase} (${result.aspectRatio})`);
            console.log(`      Error: ${result.error}`);
        });
    }
    
    // Analysis and recommendations
    console.log('\\n🔍 Style Consistency Analysis');
    console.log('═'.repeat(60));
    
    if (successfulGrids.length >= 3) {
        console.log('✅ Sufficient data for style consistency analysis');
        console.log('');
        console.log('📝 Next Steps for Brand Validation:');
        console.log('1. Review generated images for visual consistency within each style');
        console.log('2. Compare distinctiveness between different style profiles');
        console.log('3. Test with real brand content and gather stakeholder feedback');
        console.log('4. Iterate on style profiles based on results');
        console.log('5. Create style guide documentation from successful templates');
    } else {
        console.log('⚠️  Limited data - consider running more test cases');
        console.log('');
        console.log('💡 Recommendations:');
        console.log('1. Check API configuration and rate limits');
        console.log('2. Test with simpler subjects first');
        console.log('3. Verify style profile definitions');
    }
    
    // Save summary to file
    const summaryReport = {
        generatedAt: new Date().toISOString(),
        totalGrids: gridResults.length,
        successfulGrids: successfulGrids.length,
        failedGrids: failedGrids.length,
        successRate: Math.round((successfulGrids.length / gridResults.length) * 100),
        grids: gridResults,
        styleProfiles: allStyleProfiles,
        recommendations: [
            'Review visual consistency within each style profile',
            'Compare distinctiveness between style profiles',
            'Test with actual brand content for validation',
            'Iterate on style profiles based on results',
            'Document successful templates as brand guidelines'
        ]
    };
    
    const fs = require('fs-extra');
    const path = require('path');
    const summaryFile = path.join(styleSystem.outputDir, 'grid-generation-summary.json');
    await fs.writeJson(summaryFile, summaryReport, { spaces: 2 });
    
    console.log(`\\n📋 Summary report saved: ${summaryFile}`);
    console.log('\\n🚀 Grid generation complete!');
    console.log('💡 Review the generated images to evaluate style consistency');
    console.log('🎯 Use the web interface to compare results visually');
}

// Additional utility function for focused testing
async function generateFocusedTest(subject, styleProfile, aspectRatios = ['1:1', '16:9', '3:4']) {
    console.log(`\\n🎯 Focused Test: ${styleProfile}`);
    console.log(`Subject: "${subject}"`);
    console.log(`Testing ratios: ${aspectRatios.join(', ')}`);
    console.log('─'.repeat(50));
    
    const styleSystem = new StyleSystem({ verbose: true });
    
    const results = [];
    
    for (const ratio of aspectRatios) {
        try {
            console.log(`\\n   Generating ${ratio}...`);
            const result = await styleSystem.generateStyledImage(subject, styleProfile, ratio);
            results.push({
                aspectRatio: ratio,
                success: true,
                filename: result.result.filename,
                promptLength: result.promptData.positive.length
            });
            console.log(`   ✅ ${result.result.filename}`);
        } catch (error) {
            console.error(`   ❌ ${error.message}`);
            results.push({
                aspectRatio: ratio,
                success: false,
                error: error.message
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\\n📊 Focused Test Results:`);
    results.forEach(result => {
        if (result.success) {
            console.log(`   ${result.aspectRatio}: ✅ ${result.filename} (${result.promptLength} chars)`);
        } else {
            console.log(`   ${result.aspectRatio}: ❌ ${result.error}`);
        }
    });
    
    return results;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args[0] === 'focused' && args[1] && args[2]) {
        // Focused test: node generate-grid.js focused "subject" "style_profile"
        const subject = args[1];
        const styleProfile = args[2];
        const ratios = args.slice(3);
        
        generateFocusedTest(subject, styleProfile, ratios.length > 0 ? ratios : undefined)
            .catch(console.error);
    } else {
        // Full grid generation
        generateComparisonGrids().catch(console.error);
    }
}

module.exports = { generateComparisonGrids, generateFocusedTest };