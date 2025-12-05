#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { StyleSystem } = require('./style-system');

/**
 * Day 18: Prompt & Style Systems Web Server
 * 
 * Web interface for brand-consistent image generation and style testing
 */

const app = express();
const port = process.env.PORT || 3018;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Serve generated images
app.use('/generated-styles', express.static(path.join(__dirname, 'generated-styles')));

// Initialize Style System
const styleSystem = new StyleSystem({ 
    verbose: false  // Reduce console output for web server
});

console.log('🎨 Style System Web Server Initializing...');

// API Routes

/**
 * Get available style profiles
 */
app.get('/api/profiles', (req, res) => {
    try {
        const profiles = styleSystem.getStyleProfiles();
        res.json({ 
            success: true, 
            profiles,
            count: profiles.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Get detailed style profile information
 */
app.get('/api/profiles/:profileKey', (req, res) => {
    try {
        const { profileKey } = req.params;
        const profile = styleSystem.styleProfiles.profiles[profileKey];
        
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: `Style profile '${profileKey}' not found`
            });
        }
        
        res.json({
            success: true,
            profile: {
                key: profileKey,
                ...profile
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Generate single styled image
 */
app.post('/api/generate', async (req, res) => {
    try {
        const { 
            baseSubject, 
            styleProfile, 
            aspectRatio = '1:1', 
            customAdditions = '' 
        } = req.body;
        
        if (!baseSubject || !styleProfile) {
            return res.status(400).json({
                success: false,
                error: 'baseSubject and styleProfile are required'
            });
        }
        
        console.log(`🎨 Received generation request: ${styleProfile} - "${baseSubject}"`);
        
        const result = await styleSystem.generateStyledImage(
            baseSubject,
            styleProfile,
            aspectRatio,
            customAdditions
        );
        
        console.log(`✅ Generation successful: ${result.result.filename}`);
        
        res.json({
            success: true,
            result,
            imageUrl: `/generated-styles/individual/${result.result.filename}`
        });
        
    } catch (error) {
        console.error(`❌ Generation failed: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Generate style comparison grid
 */
app.post('/api/generate-grid', async (req, res) => {
    try {
        const {
            baseSubject,
            styleProfiles = null,
            aspectRatio = '1:1',
            customAdditions = ''
        } = req.body;
        
        if (!baseSubject) {
            return res.status(400).json({
                success: false,
                error: 'baseSubject is required'
            });
        }
        
        console.log(`🎯 Received grid request: "${baseSubject}" (${aspectRatio})`);
        console.log(`   Styles: ${styleProfiles ? styleProfiles.join(', ') : 'all'}`);
        
        const gridResult = await styleSystem.generateStyleGrid(
            baseSubject,
            styleProfiles,
            aspectRatio,
            customAdditions
        );
        
        // Add image URLs to the results
        const enhancedResults = {};
        Object.entries(gridResult.styles).forEach(([styleName, result]) => {
            enhancedResults[styleName] = {
                ...result,
                imageUrl: result.result?.filename 
                    ? `/generated-styles/individual/${result.result.filename}`
                    : null
            };
        });
        
        console.log(`✅ Grid generation successful: ${gridResult.gridId}`);
        
        res.json({
            success: true,
            grid: {
                ...gridResult,
                styles: enhancedResults
            }
        });
        
    } catch (error) {
        console.error(`❌ Grid generation failed: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get generation statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await styleSystem.getStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get generation history
 */
app.get('/api/history', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        
        const logData = await fs.readFile(styleSystem.logFile, 'utf8').catch(() => '');
        const lines = logData.trim().split('\\n').filter(line => line);
        const history = lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            })
            .filter(item => item)
            .reverse() // Most recent first
            .slice(0, parseInt(limit));
        
        // Add image URLs to history items
        const enhancedHistory = history.map(item => ({
            ...item,
            imageUrl: item.result?.filename 
                ? `/generated-styles/individual/${item.result.filename}`
                : null
        }));
        
        res.json({
            success: true,
            history: enhancedHistory,
            total: history.length
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Build prompt preview (without generating image)
 */
app.post('/api/preview-prompt', (req, res) => {
    try {
        const {
            baseSubject,
            styleProfile,
            aspectRatio = '1:1',
            customAdditions = ''
        } = req.body;
        
        if (!baseSubject || !styleProfile) {
            return res.status(400).json({
                success: false,
                error: 'baseSubject and styleProfile are required'
            });
        }
        
        const promptData = styleSystem.buildPrompt(
            baseSubject,
            styleProfile,
            aspectRatio,
            customAdditions
        );
        
        res.json({
            success: true,
            promptData: {
                positive: promptData.positive,
                negative: promptData.negative,
                size: promptData.size,
                styleProfile: promptData.styleProfile,
                aspectRatio: promptData.aspectRatio,
                stats: {
                    positiveLength: promptData.positive.length,
                    negativeLength: promptData.negative.length,
                    wordCount: promptData.positive.split(' ').length
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Clear generation history and files
 */
app.delete('/api/clear-history', async (req, res) => {
    try {
        // Clear log file
        await fs.writeFile(styleSystem.logFile, '');
        
        // Optional: Clear generated files
        const { clearFiles = false } = req.body;
        if (clearFiles) {
            await fs.emptyDir(path.join(styleSystem.outputDir, 'individual'));
            await fs.emptyDir(path.join(styleSystem.outputDir, 'grids'));
        }
        
        res.json({
            success: true,
            message: 'History cleared successfully',
            filesCleared: clearFiles
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve the web interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /api/profiles',
            'GET /api/profiles/:profileKey',
            'POST /api/generate',
            'POST /api/generate-grid',
            'GET /api/stats',
            'GET /api/history',
            'POST /api/preview-prompt',
            'DELETE /api/clear-history'
        ]
    });
});

// Start server
app.listen(port, () => {
    console.log('🎨 Day 18 Style System Server running on port', port);
    console.log('🌐 Web interface: http://localhost:' + port);
    console.log('📋 API endpoints:');
    console.log('   GET  /api/profiles - Get available style profiles');
    console.log('   POST /api/generate - Generate styled image');
    console.log('   POST /api/generate-grid - Generate style comparison grid');
    console.log('   GET  /api/stats - Get generation statistics');
    console.log('   GET  /api/history - Get generation history');
    console.log('   POST /api/preview-prompt - Preview generated prompt');
    
    console.log('\\n📚 Available Style Profiles:');
    const profiles = styleSystem.getStyleProfiles();
    profiles.forEach(profile => {
        console.log(`   ${profile.key}: ${profile.name}`);
    });
    
    console.log('\\n🚀 Ready for brand-consistent image generation!');
});