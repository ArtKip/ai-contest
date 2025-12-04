#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { ImageGenerator } = require('./image-generator');

/**
 * Web Server for Day 17 Image Generation
 * 
 * Provides a web interface for interactive image generation with:
 * - Multi-model support (DALL-E, SDXL, Flux, Mock)
 * - Parameter controls
 * - Real-time progress tracking
 * - Generation history
 * - Statistics dashboard
 */

const app = express();
const port = process.env.PORT || 3017;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/images', express.static('generated-images'));

// Initialize image generator
const generator = new ImageGenerator({
    outputDir: './generated-images',
    verbose: true
});

// Routes

/**
 * Serve the web interface
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Get available models and their capabilities
 */
app.get('/api/models', (req, res) => {
    try {
        const models = generator.getModels();
        res.json({
            success: true,
            models,
            default: generator.defaultModel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Generate image with specified parameters
 */
app.post('/api/generate', async (req, res) => {
    try {
        const {
            prompt = 'A beautiful landscape',
            model = 'mock',
            size = '1024x1024',
            seed,
            quality,
            style,
            steps,
            cfg_scale
        } = req.body;
        
        console.log(`🎨 Received generation request: ${model} - "${prompt}"`);
        
        const params = {
            prompt,
            model,
            size,
            seed: seed || Math.floor(Math.random() * 1000000),
            quality,
            style,
            steps,
            cfg_scale
        };
        
        const result = await generator.generateImage(params);
        
        res.json({
            success: true,
            result,
            imageUrl: `/images/${result.result.filename}`
        });
        
    } catch (error) {
        console.error('❌ Generation failed:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.stack
        });
    }
});

/**
 * Get generation statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await generator.getStats();
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
        const logFile = generator.logFile;
        
        if (!await fs.pathExists(logFile)) {
            return res.json({
                success: true,
                history: []
            });
        }
        
        const logData = await fs.readFile(logFile, 'utf8');
        const lines = logData.trim().split('\\n').filter(line => line);
        const history = lines
            .map(line => JSON.parse(line))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 50); // Last 50 generations
        
        res.json({
            success: true,
            history
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Clear generation history
 */
app.delete('/api/history', async (req, res) => {
    try {
        await fs.remove(generator.logFile);
        res.json({
            success: true,
            message: 'History cleared'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`🎨 Day 17 Image Generation Server running on port ${port}`);
    console.log(`🌐 Web interface: http://localhost:${port}`);
    console.log(`📋 API endpoints:`);
    console.log(`   POST /api/generate - Generate image`);
    console.log(`   GET  /api/models - Get available models`);
    console.log(`   GET  /api/stats - Get generation statistics`);
    console.log(`   GET  /api/history - Get generation history`);
    console.log('\\n📚 Supported models:');
    
    const models = generator.getModels();
    models.forEach(model => {
        console.log(`   ${model.key}: ${model.name} (${model.provider})`);
    });
    
    console.log('\\n🚀 Ready for image generation!');
});

module.exports = app;