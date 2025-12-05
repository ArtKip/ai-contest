#!/usr/bin/env node

const { StyleSystem } = require('./style-system');

/**
 * Style System Testing Script
 * 
 * Comprehensive testing of brand consistency and style distinctiveness
 */

async function runStyleTests() {
    console.log('🧪 Day 18: Style System Testing Suite');
    console.log('═'.repeat(60));
    
    const styleSystem = new StyleSystem({ verbose: true });
    
    // Test cases for different scenarios
    const testCases = [
        {
            category: 'Business/Corporate',
            subjects: [
                'a modern office conference room',
                'a professional team meeting',
                'a sleek laptop on a desk',
                'a business handshake'
            ],
            expectedStyle: 'minimalist_corporate',
            aspectRatio: '16:9'
        },
        {
            category: 'Creative/Artistic', 
            subjects: [
                'an artist painting on canvas',
                'a creative workspace with supplies',
                'a colorful abstract artwork',
                'a designer working on graphics'
            ],
            expectedStyle: 'vibrant_creative',
            aspectRatio: '3:4'
        },
        {
            category: 'Luxury/Premium',
            subjects: [
                'a luxury watch on marble',
                'an elegant jewelry display',
                'a premium car interior',
                'a high-end restaurant setting'
            ],
            expectedStyle: 'luxury_premium',
            aspectRatio: '4:5'
        }
    ];
    
    const allStyleProfiles = Object.keys(styleSystem.styleProfiles.profiles);
    const testResults = {
        consistency: {},
        distinctiveness: {},
        performance: {},
        errors: []
    };
    
    console.log(`\\n📋 Running tests across ${allStyleProfiles.length} style profiles`);
    console.log(`Testing ${testCases.length} categories with ${testCases.reduce((sum, cat) => sum + cat.subjects.length, 0)} total subjects`);
    
    // Test 1: Style Consistency
    console.log('\\n\\n🎯 Test 1: Style Consistency within Profiles');
    console.log('═'.repeat(60));
    
    for (const testCase of testCases) {
        console.log(`\\n📂 Category: ${testCase.category}`);
        console.log(`Expected optimal style: ${testCase.expectedStyle}`);
        console.log(`Testing subjects: ${testCase.subjects.length}`);
        
        const categoryResults = {
            style: testCase.expectedStyle,
            subjects: testCase.subjects.length,
            successful: 0,
            failed: 0,
            avgLatency: 0,
            promptConsistency: [],
            totalLatency: 0
        };
        
        // Test each subject with the expected style
        for (let i = 0; i < testCase.subjects.length; i++) {
            const subject = testCase.subjects[i];
            console.log(`\\n  ${i + 1}. "${subject}"`);
            
            try {
                const result = await styleSystem.generateStyledImage(
                    subject,
                    testCase.expectedStyle,
                    testCase.aspectRatio
                );
                
                categoryResults.successful++;
                categoryResults.totalLatency += result.performance.latency;
                categoryResults.promptConsistency.push({
                    subject: subject,
                    promptLength: result.promptData.positive.length,
                    hasColorPalette: result.promptData.positive.includes('color palette'),
                    hasStyleKeywords: this.checkStyleKeywords(result.promptData.positive, testCase.expectedStyle, styleSystem)
                });
                
                console.log(`     ✅ Generated: ${result.result.filename} (${result.performance.latency}ms)`);
                
            } catch (error) {
                categoryResults.failed++;
                testResults.errors.push({
                    category: testCase.category,
                    subject: subject,
                    style: testCase.expectedStyle,
                    error: error.message
                });
                console.error(`     ❌ Failed: ${error.message}`);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        categoryResults.avgLatency = categoryResults.successful > 0 
            ? categoryResults.totalLatency / categoryResults.successful 
            : 0;
        
        testResults.consistency[testCase.category] = categoryResults;
        
        console.log(`\\n  📊 Category Results:`);
        console.log(`     Success rate: ${categoryResults.successful}/${categoryResults.subjects} (${Math.round((categoryResults.successful / categoryResults.subjects) * 100)}%)`);
        console.log(`     Average latency: ${Math.round(categoryResults.avgLatency)}ms`);
        
        if (categoryResults.promptConsistency.length > 0) {
            const avgPromptLength = categoryResults.promptConsistency.reduce((sum, p) => sum + p.promptLength, 0) / categoryResults.promptConsistency.length;
            const withColorPalette = categoryResults.promptConsistency.filter(p => p.hasColorPalette).length;
            const withStyleKeywords = categoryResults.promptConsistency.filter(p => p.hasStyleKeywords).length;
            
            console.log(`     Prompt consistency:`);
            console.log(`       Average length: ${Math.round(avgPromptLength)} chars`);
            console.log(`       Color palette included: ${withColorPalette}/${categoryResults.promptConsistency.length}`);
            console.log(`       Style keywords included: ${withStyleKeywords}/${categoryResults.promptConsistency.length}`);
        }
    }
    
    // Test 2: Style Distinctiveness
    console.log('\\n\\n🔍 Test 2: Style Distinctiveness between Profiles');
    console.log('═'.repeat(60));
    
    const distinctivenessSubject = 'a modern smartphone on a wooden table';
    console.log(`Testing subject: "${distinctivenessSubject}"`);
    console.log(`Across all ${allStyleProfiles.length} style profiles...`);
    
    const distinctivenessResults = {};
    
    for (const styleProfile of allStyleProfiles) {
        console.log(`\\n  🎨 Testing: ${styleProfile}`);
        
        try {
            const result = await styleSystem.generateStyledImage(
                distinctivenessSubject,
                styleProfile,
                '1:1'
            );
            
            distinctivenessResults[styleProfile] = {
                success: true,
                filename: result.result.filename,
                promptLength: result.promptData.positive.length,
                latency: result.performance.latency,
                promptSample: result.promptData.positive.substring(0, 150) + '...'
            };
            
            console.log(`     ✅ Generated: ${result.result.filename}`);
            console.log(`     📝 Prompt preview: "${distinctivenessResults[styleProfile].promptSample}"`);
            
        } catch (error) {
            distinctivenessResults[styleProfile] = {
                success: false,
                error: error.message
            };
            console.error(`     ❌ Failed: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    testResults.distinctiveness = distinctivenessResults;
    
    // Analyze distinctiveness
    const successfulDistinctiveness = Object.values(distinctivenessResults).filter(r => r.success);
    if (successfulDistinctiveness.length >= 2) {
        console.log(`\\n  📊 Distinctiveness Analysis:`);
        console.log(`     Successful generations: ${successfulDistinctiveness.length}/${allStyleProfiles.length}`);
        
        const promptLengthVariation = successfulDistinctiveness.map(r => r.promptLength);
        const minLength = Math.min(...promptLengthVariation);
        const maxLength = Math.max(...promptLengthVariation);
        const avgLength = promptLengthVariation.reduce((sum, len) => sum + len, 0) / promptLengthVariation.length;
        
        console.log(`     Prompt length variation: ${minLength} - ${maxLength} chars (avg: ${Math.round(avgLength)})`);
        console.log(`     Length variance: ${maxLength - minLength} chars`);
        
        if (maxLength - minLength > 100) {
            console.log(`     ✅ Good prompt distinctiveness detected`);
        } else {
            console.log(`     ⚠️  Limited prompt distinctiveness - styles may be similar`);
        }
    }
    
    // Test 3: Performance Benchmarks
    console.log('\\n\\n⚡ Test 3: Performance Benchmarks');
    console.log('═'.repeat(60));
    
    const performanceSubjects = [
        'simple object test',
        'complex scene with multiple elements and detailed environment',
        'medium complexity indoor scene'
    ];
    
    for (const subject of performanceSubjects) {
        console.log(`\\n  📊 Testing: "${subject}"`);
        
        const performanceResults = {};
        
        for (const styleProfile of allStyleProfiles.slice(0, 3)) { // Test first 3 styles for performance
            try {
                const startTime = Date.now();
                const result = await styleSystem.generateStyledImage(subject, styleProfile, '1:1');
                const endTime = Date.now();
                
                performanceResults[styleProfile] = {
                    latency: result.performance.latency,
                    totalTime: endTime - startTime,
                    success: true
                };
                
                console.log(`     ${styleProfile}: ${result.performance.latency}ms (total: ${endTime - startTime}ms)`);
                
            } catch (error) {
                performanceResults[styleProfile] = {
                    success: false,
                    error: error.message
                };
                console.error(`     ${styleProfile}: ❌ ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        testResults.performance[subject] = performanceResults;
    }
    
    // Generate Final Report
    console.log('\\n\\n📋 Final Test Report');
    console.log('═'.repeat(60));
    
    const totalTests = Object.values(testResults.consistency).reduce((sum, cat) => sum + cat.subjects, 0) + 
                       allStyleProfiles.length + 
                       (performanceSubjects.length * 3);
    
    const totalSuccessful = Object.values(testResults.consistency).reduce((sum, cat) => sum + cat.successful, 0) + 
                           Object.values(testResults.distinctiveness).filter(r => r.success).length + 
                           Object.values(testResults.performance).reduce((sum, subj) => {
                               return sum + Object.values(subj).filter(r => r.success).length;
                           }, 0);
    
    const totalFailed = testResults.errors.length + 
                       Object.values(testResults.distinctiveness).filter(r => !r.success).length + 
                       Object.values(testResults.performance).reduce((sum, subj) => {
                           return sum + Object.values(subj).filter(r => !r.success).length;
                       }, 0);
    
    console.log(`\\n📊 Overall Results:`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Successful: ${totalSuccessful}`);
    console.log(`   Failed: ${totalFailed}`);
    console.log(`   Success rate: ${Math.round((totalSuccessful / totalTests) * 100)}%`);
    
    console.log(`\\n🎯 Consistency Analysis:`);
    Object.entries(testResults.consistency).forEach(([category, results]) => {
        const successRate = Math.round((results.successful / results.subjects) * 100);
        console.log(`   ${category}: ${results.successful}/${results.subjects} (${successRate}%) - ${Math.round(results.avgLatency)}ms avg`);
    });
    
    console.log(`\\n🔍 Distinctiveness Analysis:`);
    const distinctivenessSuccess = Object.values(testResults.distinctiveness).filter(r => r.success).length;
    console.log(`   Cross-style generation: ${distinctivenessSuccess}/${allStyleProfiles.length} styles successful`);
    
    if (testResults.errors.length > 0) {
        console.log(`\\n❌ Errors Encountered:`);
        testResults.errors.slice(0, 5).forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.category} - ${error.subject}: ${error.error}`);
        });
        if (testResults.errors.length > 5) {
            console.log(`   ... and ${testResults.errors.length - 5} more errors`);
        }
    }
    
    console.log(`\\n💡 Recommendations:`);
    
    if (totalSuccessful / totalTests > 0.8) {
        console.log(`   ✅ Strong overall performance - system is ready for production use`);
    } else if (totalSuccessful / totalTests > 0.6) {
        console.log(`   ⚠️  Moderate performance - investigate failed cases and optimize`);
    } else {
        console.log(`   ❌ Poor performance - review API configuration and style profiles`);
    }
    
    // Specific recommendations based on results
    const consistencyRates = Object.values(testResults.consistency).map(c => c.successful / c.subjects);
    if (consistencyRates.some(rate => rate < 0.7)) {
        console.log(`   📝 Some style profiles have low consistency - review prompt templates`);
    }
    
    if (distinctivenessSuccess < allStyleProfiles.length * 0.8) {
        console.log(`   🎨 Consider expanding style profile definitions for better distinctiveness`);
    }
    
    console.log(`   📊 Review generated images manually to validate visual consistency`);
    console.log(`   🔄 Run tests with real brand content for final validation`);
    
    // Save detailed test results
    const testReport = {
        timestamp: new Date().toISOString(),
        summary: {
            totalTests,
            totalSuccessful,
            totalFailed,
            successRate: Math.round((totalSuccessful / totalTests) * 100)
        },
        consistency: testResults.consistency,
        distinctiveness: testResults.distinctiveness,
        performance: testResults.performance,
        errors: testResults.errors
    };
    
    const fs = require('fs-extra');
    const path = require('path');
    const reportFile = path.join(styleSystem.outputDir, 'style-test-report.json');
    await fs.writeJson(reportFile, testReport, { spaces: 2 });
    
    console.log(`\\n📋 Detailed test report saved: ${reportFile}`);
    console.log('\\n🚀 Style System testing complete!');
}

/**
 * Helper function to check for style keywords in prompt
 */
function checkStyleKeywords(prompt, styleProfile, styleSystem) {
    const profile = styleSystem.styleProfiles.profiles[styleProfile];
    if (!profile) return false;
    
    const keywords = profile.style_keywords.toLowerCase().split(',').map(k => k.trim());
    const promptLower = prompt.toLowerCase();
    
    return keywords.some(keyword => promptLower.includes(keyword));
}

// Focused test for single style profile
async function testSingleStyle(styleProfile, subjects = null) {
    console.log(`\\n🎯 Focused Style Test: ${styleProfile}`);
    console.log('─'.repeat(50));
    
    const styleSystem = new StyleSystem({ verbose: true });
    
    const testSubjects = subjects || [
        'a coffee cup on a table',
        'a person working on laptop',
        'a modern office space',
        'a product display'
    ];
    
    const results = [];
    
    for (const subject of testSubjects) {
        try {
            console.log(`\\n  Testing: "${subject}"`);
            const result = await styleSystem.generateStyledImage(subject, styleProfile, '1:1');
            
            results.push({
                subject,
                success: true,
                filename: result.result.filename,
                latency: result.performance.latency,
                promptLength: result.promptData.positive.length
            });
            
            console.log(`  ✅ ${result.result.filename} (${result.performance.latency}ms)`);
            
        } catch (error) {
            results.push({
                subject,
                success: false,
                error: error.message
            });
            console.error(`  ❌ ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const avgLatency = results.filter(r => r.success).reduce((sum, r) => sum + r.latency, 0) / successful;
    const avgPromptLength = results.filter(r => r.success).reduce((sum, r) => sum + r.promptLength, 0) / successful;
    
    console.log(`\\n📊 Results for ${styleProfile}:`);
    console.log(`   Success rate: ${successful}/${testSubjects.length} (${Math.round((successful / testSubjects.length) * 100)}%)`);
    console.log(`   Average latency: ${Math.round(avgLatency)}ms`);
    console.log(`   Average prompt length: ${Math.round(avgPromptLength)} characters`);
    
    return results;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args[0] === 'single' && args[1]) {
        // Single style test: node test-styles.js single "style_profile_name"
        const styleProfile = args[1];
        const subjects = args.slice(2);
        
        testSingleStyle(styleProfile, subjects.length > 0 ? subjects : undefined)
            .catch(console.error);
    } else {
        // Full test suite
        runStyleTests().catch(console.error);
    }
}

module.exports = { runStyleTests, testSingleStyle };