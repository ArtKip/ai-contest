#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * Day 18: Prompt & Style Systems
 * 
 * A comprehensive system for generating brand-consistent visual content
 * using structured prompt templates and reusable style profiles.
 */
class StyleSystem {
    constructor(options = {}) {
        this.outputDir = options.outputDir || './generated-styles';
        this.logFile = options.logFile || './style-generation.log';
        this.verbose = options.verbose !== false;
        
        // Load style profiles
        this.styleProfiles = this.loadStyleProfiles();
        
        // Template structure
        this.templateStructure = {
            baseSubject: '',
            styleProfile: '',
            aspectRatio: '',
            technicalModifiers: '',
            customPromptAdditions: ''
        };
        
        // Initialize directories
        this.initializeDirectories();
        
        // Image generation API (using Together AI from Day 17)
        this.apiKey = process.env.TOGETHER_API_KEY;
        this.apiEndpoint = 'https://api.together.xyz/v1/images/generations';
        
        if (this.verbose) {
            console.log('🎨 Style System initialized');
            console.log(`   Output directory: ${this.outputDir}`);
            console.log(`   Style profiles loaded: ${Object.keys(this.styleProfiles.profiles).length}`);
            console.log(`   API configured: ${this.apiKey ? 'Yes' : 'No (will use mock generation)'}`);
        }
    }
    
    /**
     * Load style profiles from JSON file
     */
    loadStyleProfiles() {
        try {
            const profilePath = path.join(__dirname, 'style-profiles.json');
            const profiles = fs.readJsonSync(profilePath);
            return profiles;
        } catch (error) {
            console.error('Failed to load style profiles:', error.message);
            return { profiles: {}, template_structure: {} };
        }
    }
    
    /**
     * Initialize output directories
     */
    async initializeDirectories() {
        await fs.ensureDir(this.outputDir);
        await fs.ensureDir(path.join(this.outputDir, 'grids'));
        await fs.ensureDir(path.join(this.outputDir, 'individual'));
        await fs.ensureDir(path.join(this.outputDir, 'comparisons'));
    }
    
    /**
     * Build prompt from template and style profile
     */
    buildPrompt(baseSubject, styleProfileName, aspectRatio, customAdditions = '') {
        const profile = this.styleProfiles.profiles[styleProfileName];
        if (!profile) {
            throw new Error(`Style profile '${styleProfileName}' not found`);
        }
        
        // Convert aspect ratio to size
        const size = this.aspectRatioToSize(aspectRatio);
        
        // Build comprehensive prompt
        const promptParts = [
            // Base subject
            baseSubject,
            
            // Style description and mood
            profile.visual_style.composition,
            profile.mood,
            
            // Color palette instruction
            `using color palette: ${this.formatColorPalette(profile.color_palette)}`,
            
            // Visual style specifics
            profile.visual_style.lighting,
            profile.visual_style.texture,
            profile.visual_style.geometry,
            
            // Style keywords for reinforcement
            profile.style_keywords,
            
            // Technical specifications
            profile.technical_specs.render_style,
            profile.technical_specs.resolution,
            
            // Custom additions
            customAdditions
        ];
        
        // Join and clean up the prompt
        const fullPrompt = promptParts
            .filter(part => part && part.trim())
            .join(', ')
            .replace(/,+/g, ',')
            .replace(/,\\s*,/g, ',')
            .trim();
        
        // Add explicit do's and don'ts as negative prompts
        const negativePrompt = profile.donts.join(', ');
        
        return {
            positive: fullPrompt,
            negative: negativePrompt,
            size: size,
            styleProfile: styleProfileName,
            aspectRatio: aspectRatio
        };
    }
    
    /**
     * Format color palette for prompt inclusion
     */
    formatColorPalette(colorPalette) {
        const colors = Object.entries(colorPalette)
            .map(([name, hex]) => `${name} ${hex}`)
            .join(', ');
        return colors;
    }
    
    /**
     * Convert aspect ratio to image size
     */
    aspectRatioToSize(aspectRatio) {
        const ratioMap = {
            '1:1': '1024x1024',
            '16:9': '1024x576',
            '4:3': '1024x768',
            '3:4': '768x1024',
            '9:16': '576x1024',
            '4:5': '819x1024'
        };
        
        return ratioMap[aspectRatio] || '1024x1024';
    }
    
    /**
     * Generate single image with style system
     */
    async generateStyledImage(baseSubject, styleProfileName, aspectRatio = '1:1', customAdditions = '') {
        const startTime = Date.now();
        const requestId = uuidv4();
        
        if (this.verbose) {
            console.log(`\\n🎨 Generating styled image with ${styleProfileName}`);
            console.log(`   Subject: "${baseSubject}"`);
            console.log(`   Aspect ratio: ${aspectRatio}`);
            console.log(`   Request ID: ${requestId}`);
        }
        
        try {
            // Build prompt using style system
            const promptData = this.buildPrompt(baseSubject, styleProfileName, aspectRatio, customAdditions);
            
            if (this.verbose) {
                console.log(`   Full prompt: "${promptData.positive.substring(0, 100)}..."`);
            }
            
            // Generate image
            let result;
            if (this.apiKey) {
                result = await this.generateWithAPI(promptData, requestId);
            } else {
                result = await this.generateMockStyled(promptData, requestId);
            }
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            // Create response object
            const response = {
                requestId,
                success: true,
                baseSubject,
                styleProfile: styleProfileName,
                aspectRatio,
                promptData,
                result,
                performance: {
                    latency,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString()
                },
                timestamp: new Date().toISOString()
            };
            
            // Log the generation
            await this.logGeneration(response);
            
            if (this.verbose) {
                console.log(`✅ Style generation successful`);
                console.log(`   Latency: ${latency}ms`);
                console.log(`   File: ${result.filename}`);
            }
            
            return response;
            
        } catch (error) {
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            const errorResponse = {
                requestId,
                success: false,
                baseSubject,
                styleProfile: styleProfileName,
                aspectRatio,
                error: error.message,
                performance: {
                    latency,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString()
                },
                timestamp: new Date().toISOString()
            };
            
            await this.logGeneration(errorResponse);
            
            if (this.verbose) {
                console.error(`❌ Style generation failed: ${error.message}`);
                console.error(`   Latency: ${latency}ms`);
            }
            
            throw error;
        }
    }
    
    /**
     * Generate image via API (Together AI)
     */
    async generateWithAPI(promptData, requestId) {
        const requestBody = {
            model: "black-forest-labs/FLUX.1-schnell-Free",
            prompt: promptData.positive,
            width: parseInt(promptData.size.split('x')[0]),
            height: parseInt(promptData.size.split('x')[1]),
            steps: 4,
            n: 1,
            seed: Math.floor(Math.random() * 1000000)
        };
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };
        
        const response = await axios.post(this.apiEndpoint, requestBody, {
            headers,
            timeout: 120000
        });
        
        // Download and save the image
        const imageUrl = response.data.data[0].url;
        const filename = `styled_${promptData.styleProfile}_${requestId}.jpg`;
        const filepath = path.join(this.outputDir, 'individual', filename);
        
        // Download image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        await fs.writeFile(filepath, imageResponse.data);
        
        return {
            filename,
            filepath,
            imageUrl,
            size: promptData.size,
            promptUsed: promptData.positive
        };
    }
    
    /**
     * Generate mock styled image for testing
     */
    async generateMockStyled(promptData, requestId) {
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        
        const profile = this.styleProfiles.profiles[promptData.styleProfile];
        const [width, height] = promptData.size.split('x').map(Number);
        
        // Create style-appropriate mock image
        const colors = Object.values(profile.color_palette);
        const primaryColor = colors[0] || '#3498DB';
        const accentColor = colors[2] || '#E74C3C';
        
        // Create SVG with style characteristics
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="styleGrad${requestId}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.8" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#styleGrad${requestId})" />
            <text x="50%" y="30%" text-anchor="middle" font-family="Arial, sans-serif" 
                  font-size="${Math.min(width, height) / 20}" fill="white" opacity="0.9">
                ${profile.name}
            </text>
            <text x="50%" y="50%" text-anchor="middle" font-family="Arial, sans-serif" 
                  font-size="${Math.min(width, height) / 25}" fill="white" opacity="0.8">
                "${promptData.positive.substring(0, 40)}..."
            </text>
            <text x="50%" y="70%" text-anchor="middle" font-family="Arial, sans-serif" 
                  font-size="${Math.min(width, height) / 30}" fill="white" opacity="0.7">
                ${promptData.aspectRatio} • ${promptData.size}
            </text>
            <text x="50%" y="85%" text-anchor="middle" font-family="Arial, sans-serif" 
                  font-size="${Math.min(width, height) / 40}" fill="white" opacity="0.6">
                Style: ${profile.mood.split(',')[0].trim()}
            </text>
        </svg>`;
        
        const filename = `styled_${promptData.styleProfile}_${requestId}.svg`;
        const filepath = path.join(this.outputDir, 'individual', filename);
        await fs.writeFile(filepath, svg);
        
        return {
            filename,
            filepath,
            size: promptData.size,
            mockGenerated: true,
            styleProfile: promptData.styleProfile,
            promptUsed: promptData.positive
        };
    }
    
    /**
     * Generate comparison grid for multiple styles with same subject
     */
    async generateStyleGrid(baseSubject, styleProfiles = null, aspectRatio = '1:1', customAdditions = '') {
        if (!styleProfiles) {
            styleProfiles = Object.keys(this.styleProfiles.profiles);
        }
        
        console.log(`\\n🎯 Generating style comparison grid for: "${baseSubject}"`);
        console.log(`   Styles: ${styleProfiles.join(', ')}`);
        console.log(`   Aspect ratio: ${aspectRatio}`);
        
        const gridResults = {
            baseSubject,
            aspectRatio,
            customAdditions,
            styles: {},
            gridId: uuidv4(),
            timestamp: new Date().toISOString()
        };
        
        // Generate image for each style
        for (const styleProfile of styleProfiles) {
            try {
                console.log(`\\n  📸 Generating: ${styleProfile}...`);
                const result = await this.generateStyledImage(baseSubject, styleProfile, aspectRatio, customAdditions);
                gridResults.styles[styleProfile] = result;
            } catch (error) {
                console.error(`  ❌ Failed to generate ${styleProfile}: ${error.message}`);
                gridResults.styles[styleProfile] = { error: error.message };
            }
        }
        
        // Save grid metadata
        const gridMetadata = {
            ...gridResults,
            analysisNotes: this.analyzeStyleGrid(gridResults)
        };
        
        const gridFile = path.join(this.outputDir, 'grids', `grid_${gridResults.gridId}.json`);
        await fs.writeJson(gridFile, gridMetadata, { spaces: 2 });
        
        console.log(`\\n✅ Style grid complete!`);
        console.log(`   Grid ID: ${gridResults.gridId}`);
        console.log(`   Metadata saved: ${gridFile}`);
        
        return gridResults;
    }
    
    /**
     * Analyze style grid for consistency and distinctiveness
     */
    analyzeStyleGrid(gridResults) {
        const analysis = {
            consistency: {},
            distinctiveness: {},
            recommendations: []
        };
        
        const successfulStyles = Object.entries(gridResults.styles).filter(([_, result]) => !result.error);
        
        // Analyze each style for consistency markers
        successfulStyles.forEach(([styleName, result]) => {
            const profile = this.styleProfiles.profiles[styleName];
            
            analysis.consistency[styleName] = {
                promptLength: result.promptData?.positive?.length || 0,
                includesColorPalette: result.promptData?.positive?.includes('color palette') || false,
                includesMoodKeywords: profile.mood.split(',').some(mood => 
                    result.promptData?.positive?.toLowerCase().includes(mood.trim().toLowerCase())
                ) || false,
                includesStyleKeywords: profile.style_keywords.split(',').some(keyword => 
                    result.promptData?.positive?.toLowerCase().includes(keyword.trim().toLowerCase())
                ) || false,
                aspectRatioMatched: result.aspectRatio === gridResults.aspectRatio
            };
        });
        
        // Basic distinctiveness analysis
        analysis.distinctiveness.stylesGenerated = successfulStyles.length;
        analysis.distinctiveness.uniquePromptElements = new Set();
        
        successfulStyles.forEach(([_, result]) => {
            if (result.promptData?.positive) {
                const words = result.promptData.positive.toLowerCase().split(/[\\s,]+/);
                words.forEach(word => {
                    if (word.length > 4) {
                        analysis.distinctiveness.uniquePromptElements.add(word);
                    }
                });
            }
        });
        
        analysis.distinctiveness.uniquePromptElements = Array.from(analysis.distinctiveness.uniquePromptElements);
        
        // Generate recommendations
        if (successfulStyles.length < Object.keys(this.styleProfiles.profiles).length) {
            analysis.recommendations.push("Some style generations failed - check API limits or error logs");
        }
        
        if (successfulStyles.length >= 2) {
            analysis.recommendations.push("Good style variety achieved - compare visual results for brand differentiation");
        }
        
        analysis.recommendations.push("Review generated prompts for style keyword consistency");
        analysis.recommendations.push("Test with different subjects to validate style robustness");
        
        return analysis;
    }
    
    /**
     * Get available style profiles
     */
    getStyleProfiles() {
        return Object.entries(this.styleProfiles.profiles).map(([key, profile]) => ({
            key,
            name: profile.name,
            description: profile.description,
            mood: profile.mood,
            primaryColors: Object.values(profile.color_palette).slice(0, 3),
            preferredRatios: profile.technical_specs.preferred_ratios
        }));
    }
    
    /**
     * Log generation details
     */
    async logGeneration(result) {
        const logEntry = JSON.stringify(result) + '\\n';
        await fs.appendFile(this.logFile, logEntry);
    }
    
    /**
     * Get generation statistics
     */
    async getStats() {
        try {
            const logData = await fs.readFile(this.logFile, 'utf8');
            const lines = logData.trim().split('\\n').filter(line => line);
            const generations = lines.map(line => JSON.parse(line));
            
            const stats = {
                total: generations.length,
                successful: generations.filter(g => g.success).length,
                failed: generations.filter(g => !g.success).length,
                byStyle: {},
                byAspectRatio: {},
                avgLatency: 0,
                totalLatency: 0
            };
            
            generations.forEach(gen => {
                // By style profile
                if (gen.styleProfile) {
                    if (!stats.byStyle[gen.styleProfile]) {
                        stats.byStyle[gen.styleProfile] = { count: 0, successful: 0 };
                    }
                    stats.byStyle[gen.styleProfile].count++;
                    if (gen.success) {
                        stats.byStyle[gen.styleProfile].successful++;
                    }
                }
                
                // By aspect ratio
                if (gen.aspectRatio) {
                    if (!stats.byAspectRatio[gen.aspectRatio]) {
                        stats.byAspectRatio[gen.aspectRatio] = { count: 0, successful: 0 };
                    }
                    stats.byAspectRatio[gen.aspectRatio].count++;
                    if (gen.success) {
                        stats.byAspectRatio[gen.aspectRatio].successful++;
                    }
                }
                
                // Latency
                if (gen.performance?.latency) {
                    stats.totalLatency += gen.performance.latency;
                }
            });
            
            stats.avgLatency = generations.length > 0 ? stats.totalLatency / generations.length : 0;
            
            return stats;
        } catch (error) {
            return {
                total: 0,
                successful: 0,
                failed: 0,
                byStyle: {},
                byAspectRatio: {},
                avgLatency: 0
            };
        }
    }
}

module.exports = { StyleSystem };