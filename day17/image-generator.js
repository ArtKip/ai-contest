#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * ImageGenerator - Multi-model image generation with comprehensive parameter control
 * 
 * Supports multiple image generation models:
 * - OpenAI DALL-E 3
 * - Stability AI SDXL
 * - Flux (via Replicate)
 * - Fallback mock generator for testing
 */
class ImageGenerator {
    constructor(options = {}) {
        this.defaultModel = options.defaultModel || 'together';
        this.outputDir = options.outputDir || './generated-images';
        this.logFile = options.logFile || './image-generation.log';
        this.verbose = options.verbose !== false;
        
        // API keys
        this.apiKeys = {
            together: process.env.TOGETHER_API_KEY || 'free', // Free credits available
            fal: process.env.FAL_API_KEY || 'free', // Free tier available
            huggingface: process.env.HUGGINGFACE_API_KEY || 'free', // Free tier available
            openai: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY, // Fallback for testing
            stability: process.env.STABILITY_API_KEY,
            replicate: process.env.REPLICATE_API_KEY
        };
        
        // Model configurations
        this.models = {
            together: {
                name: 'FLUX.1 Schnell (Together AI)',
                provider: 'Together AI',
                endpoint: 'https://api.together.xyz/v1/images/generations',
                supports: {
                    sizes: ['512x512', '768x768', '1024x1024'],
                    steps: { min: 1, max: 50, default: 4 }
                },
                pricing: { base: 0.000 }, // Free credits available
                free: true
            },
            fal: {
                name: 'FLUX.1 (Fal.ai)',
                provider: 'Fal.ai',
                endpoint: 'https://fal.run/fal-ai/fast-sdxl',
                supports: {
                    sizes: ['512x512', '768x768', '1024x1024'],
                    steps: { min: 1, max: 50, default: 20 }
                },
                pricing: { base: 0.000 }, // Free tier
                free: true
            },
            huggingface: {
                name: 'Stable Diffusion (Hugging Face)',
                provider: 'Hugging Face',
                endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
                supports: {
                    sizes: ['512x512', '768x768'],
                    steps: { min: 1, max: 50, default: 20 }
                },
                pricing: { base: 0.000 }, // Free tier
                free: true
            },
            dalle3: {
                name: 'DALL-E 3',
                provider: 'OpenAI',
                endpoint: 'https://api.openai.com/v1/images/generations',
                supports: {
                    sizes: ['1024x1024', '1024x1792', '1792x1024'],
                    quality: ['standard', 'hd'],
                    styles: ['vivid', 'natural']
                },
                pricing: { standard: 0.040, hd: 0.080 } // per image
            },
            sdxl: {
                name: 'Stable Diffusion XL',
                provider: 'Stability AI',
                endpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
                supports: {
                    sizes: ['1024x1024', '1152x896', '1216x832', '1344x768', '1536x640'],
                    steps: { min: 10, max: 150, default: 30 },
                    cfg_scale: { min: 0, max: 35, default: 7 }
                },
                pricing: { base: 0.01 } // per step
            },
            flux: {
                name: 'Flux',
                provider: 'Replicate',
                endpoint: 'https://api.replicate.com/v1/predictions',
                model: 'black-forest-labs/flux-schnell',
                supports: {
                    sizes: ['1024x1024', '1024x768', '768x1024'],
                    steps: { min: 1, max: 8, default: 4 }
                },
                pricing: { base: 0.003 } // per prediction
            },
            mock: {
                name: 'Mock Generator',
                provider: 'Local',
                endpoint: 'mock://local',
                supports: {
                    sizes: ['512x512', '1024x1024', '1024x768'],
                    quality: ['draft', 'standard', 'high'],
                    steps: { min: 1, max: 100, default: 20 }
                },
                pricing: { base: 0.001 }
            }
        };
        
        // Create output directory
        this.ensureOutputDirectory();
        
        if (this.verbose) {
            console.log('🎨 ImageGenerator initialized');
            console.log(`   Default model: ${this.defaultModel}`);
            console.log(`   Output directory: ${this.outputDir}`);
            console.log(`   Supported models: ${Object.keys(this.models).join(', ')}`);
        }
    }
    
    async ensureOutputDirectory() {
        await fs.ensureDir(this.outputDir);
        await fs.ensureDir(path.join(this.outputDir, 'thumbnails'));
    }
    
    /**
     * Generate image with specified parameters
     */
    async generateImage(params = {}) {
        const startTime = Date.now();
        const requestId = uuidv4();
        
        // Normalize parameters
        const normalizedParams = this.normalizeParameters(params);
        const model = this.models[normalizedParams.model];
        
        if (this.verbose) {
            console.log(`\\n🎨 Generating image with ${model.name}`);
            console.log(`   Prompt: "${normalizedParams.prompt}"`);
            console.log(`   Size: ${normalizedParams.size}`);
            console.log(`   Request ID: ${requestId}`);
        }
        
        try {
            let result;
            
            switch (normalizedParams.model) {
                case 'together':
                    result = await this.generateWithTogether(normalizedParams, requestId);
                    break;
                case 'fal':
                    result = await this.generateWithFal(normalizedParams, requestId);
                    break;
                case 'huggingface':
                    result = await this.generateWithHuggingFace(normalizedParams, requestId);
                    break;
                case 'dalle3':
                    result = await this.generateWithDALLE(normalizedParams, requestId);
                    break;
                case 'sdxl':
                    result = await this.generateWithSDXL(normalizedParams, requestId);
                    break;
                case 'flux':
                    result = await this.generateWithFlux(normalizedParams, requestId);
                    break;
                case 'mock':
                    result = await this.generateWithMock(normalizedParams, requestId);
                    break;
                default:
                    throw new Error(`Unsupported model: ${normalizedParams.model}`);
            }
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            // Calculate cost estimate
            const costEstimate = this.calculateCost(normalizedParams, model);
            
            // Create response object
            const response = {
                requestId,
                success: true,
                model: model.name,
                provider: model.provider,
                parameters: normalizedParams,
                result,
                performance: {
                    latency,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString()
                },
                cost: costEstimate,
                timestamp: new Date().toISOString()
            };
            
            // Log the request
            await this.logRequest(response);
            
            if (this.verbose) {
                console.log(`✅ Image generated successfully`);
                console.log(`   Latency: ${latency}ms`);
                console.log(`   Cost estimate: $${costEstimate.total.toFixed(4)}`);
                console.log(`   File: ${result.filename}`);
            }
            
            return response;
            
        } catch (error) {
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            const errorResponse = {
                requestId,
                success: false,
                model: model.name,
                provider: model.provider,
                parameters: normalizedParams,
                error: error.message,
                performance: {
                    latency,
                    startTime: new Date(startTime).toISOString(),
                    endTime: new Date(endTime).toISOString()
                },
                timestamp: new Date().toISOString()
            };
            
            await this.logRequest(errorResponse);
            
            if (this.verbose) {
                console.error(`❌ Image generation failed: ${error.message}`);
                console.error(`   Latency: ${latency}ms`);
            }
            
            throw error;
        }
    }
    
    /**
     * Normalize and validate parameters
     */
    normalizeParameters(params) {
        const model = params.model || this.defaultModel;
        const modelConfig = this.models[model];
        
        if (!modelConfig) {
            throw new Error(`Unsupported model: ${model}`);
        }
        
        const normalized = {
            model,
            prompt: params.prompt || 'A beautiful landscape',
            size: params.size || '1024x1024',
            seed: params.seed || Math.floor(Math.random() * 1000000),
            ...params
        };
        
        // Validate size
        if (modelConfig.supports.sizes && !modelConfig.supports.sizes.includes(normalized.size)) {
            normalized.size = modelConfig.supports.sizes[0];
            if (this.verbose) {
                console.warn(`⚠️ Size ${params.size} not supported, using ${normalized.size}`);
            }
        }
        
        // Model-specific parameter handling
        if (model === 'dalle3') {
            normalized.quality = params.quality || 'standard';
            normalized.style = params.style || 'vivid';
        } else if (model === 'sdxl' || model === 'flux') {
            normalized.steps = params.steps || modelConfig.supports.steps.default;
            if (model === 'sdxl') {
                normalized.cfg_scale = params.cfg_scale || 7;
            }
        } else if (model === 'mock') {
            normalized.quality = params.quality || 'standard';
            normalized.steps = params.steps || 20;
        }
        
        return normalized;
    }
    
    /**
     * Generate with Together AI (FREE)
     */
    async generateWithTogether(params, requestId) {
        const requestData = {
            model: "black-forest-labs/FLUX.1-schnell-Free",
            prompt: params.prompt,
            width: parseInt(params.size.split('x')[0]),
            height: parseInt(params.size.split('x')[1]),
            steps: params.steps || 4,
            n: 1,
            seed: params.seed
        };
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add API key if available (for higher rate limits)
        if (this.apiKeys.together && this.apiKeys.together !== 'free') {
            headers['Authorization'] = `Bearer ${this.apiKeys.together}`;
        }
        
        try {
            const response = await axios.post(
                this.models.together.endpoint,
                requestData,
                {
                    headers,
                    timeout: 120000 // 2 minutes for image generation
                }
            );
            
            // Together AI returns base64 or URL
            let filename;
            if (response.data.data && response.data.data[0]) {
                const imageData = response.data.data[0];
                if (imageData.url) {
                    filename = await this.downloadImage(imageData.url, requestId, 'together');
                } else if (imageData.b64_json) {
                    filename = await this.saveBase64Image(imageData.b64_json, requestId, 'together');
                }
            }
            
            return {
                filename,
                seed: params.seed,
                free: true
            };
            
        } catch (error) {
            if (error.response?.status === 429) {
                throw new Error('Together AI rate limit exceeded. Wait a moment and try again.');
            } else if (error.response?.status === 401) {
                throw new Error('Together AI authentication failed. Sign up for free at together.ai');
            } else if (error.response?.status >= 500) {
                throw new Error('Together AI service temporarily unavailable. Try again in a few minutes.');
            } else {
                throw new Error(`Together AI generation failed: ${error.response?.data?.error?.message || error.message}`);
            }
        }
    }

    /**
     * Generate with Fal.ai (FREE)
     */
    async generateWithFal(params, requestId) {
        const requestData = {
            prompt: params.prompt,
            image_size: params.size,
            num_inference_steps: params.steps || 20,
            seed: params.seed,
            enable_safety_checker: false
        };
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add API key if available
        if (this.apiKeys.fal && this.apiKeys.fal !== 'free') {
            headers['Authorization'] = `Key ${this.apiKeys.fal}`;
        }
        
        try {
            const response = await axios.post(
                this.models.fal.endpoint,
                requestData,
                {
                    headers,
                    timeout: 120000 // 2 minutes for image generation
                }
            );
            
            // Fal.ai returns URLs to generated images
            const imageUrl = response.data.images[0].url;
            const filename = await this.downloadImage(imageUrl, requestId, 'fal');
            
            return {
                imageUrl,
                filename,
                seed: params.seed,
                free: true
            };
            
        } catch (error) {
            // Provide helpful error messages
            if (error.response?.status === 429) {
                throw new Error('Fal.ai rate limit exceeded. Wait a moment and try again.');
            } else if (error.response?.status === 401) {
                throw new Error('Fal.ai authentication failed. Check your API key or use free tier.');
            } else if (error.response?.status >= 500) {
                throw new Error('Fal.ai service temporarily unavailable. Try again in a few minutes.');
            } else {
                throw new Error(`Fal.ai generation failed: ${error.response?.data?.detail || error.message}`);
            }
        }
    }

    /**
     * Generate with Hugging Face (FREE)
     */
    async generateWithHuggingFace(params, requestId) {
        // Simplified request format for better compatibility
        const requestData = {
            inputs: params.prompt
        };
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add API key if available (for higher rate limits)
        if (this.apiKeys.huggingface && this.apiKeys.huggingface !== 'free') {
            headers['Authorization'] = `Bearer ${this.apiKeys.huggingface}`;
        }
        
        try {
            const response = await axios.post(
                this.models.huggingface.endpoint,
                requestData,
                {
                    headers,
                    responseType: 'arraybuffer',
                    timeout: 60000 // Longer timeout for free tier
                }
            );
            
            // Check if we got an error response
            if (response.status !== 200) {
                throw new Error(`Hugging Face API returned status ${response.status}`);
            }
            
            // Save the image
            const filename = `huggingface_${requestId}.png`;
            const filepath = path.join(this.outputDir, filename);
            await fs.writeFile(filepath, response.data);
            
            return {
                filename,
                seed: params.seed,
                free: true
            };
            
        } catch (error) {
            // Provide helpful error messages for common issues
            if (error.response?.status === 410) {
                throw new Error('Hugging Face model temporarily unavailable. Try again in a few minutes or switch to Mock Generator.');
            } else if (error.response?.status === 503) {
                throw new Error('Hugging Face service overloaded. Try again later or switch to Mock Generator.');
            } else if (error.response?.status === 429) {
                throw new Error('Hugging Face rate limit exceeded. Wait a moment or switch to Mock Generator.');
            } else {
                throw new Error(`Hugging Face generation failed: ${error.message}`);
            }
        }
    }
    
    /**
     * Generate with DALL-E 3
     */
    async generateWithDALLE(params, requestId) {
        if (!this.apiKeys.openai) {
            throw new Error('OpenAI API key not configured');
        }
        
        const response = await axios.post(
            this.models.dalle3.endpoint,
            {
                model: 'dall-e-3',
                prompt: params.prompt,
                size: params.size,
                quality: params.quality,
                style: params.style,
                n: 1
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.openai}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );
        
        const imageUrl = response.data.data[0].url;
        const filename = await this.downloadImage(imageUrl, requestId, 'dalle3');
        
        return {
            imageUrl,
            filename,
            revisedPrompt: response.data.data[0].revised_prompt || params.prompt
        };
    }
    
    /**
     * Generate with Stability AI SDXL
     */
    async generateWithSDXL(params, requestId) {
        if (!this.apiKeys.stability) {
            throw new Error('Stability AI API key not configured');
        }
        
        const [width, height] = params.size.split('x').map(Number);
        
        const formData = new FormData();
        formData.append('text_prompts[0][text]', params.prompt);
        formData.append('text_prompts[0][weight]', '1');
        formData.append('cfg_scale', params.cfg_scale.toString());
        formData.append('width', width.toString());
        formData.append('height', height.toString());
        formData.append('steps', params.steps.toString());
        formData.append('samples', '1');
        if (params.seed) {
            formData.append('seed', params.seed.toString());
        }
        
        const response = await axios.post(
            this.models.sdxl.endpoint,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.stability}`,
                    'Accept': 'application/json'
                },
                timeout: 60000
            }
        );
        
        // SDXL returns base64 encoded image
        const imageData = response.data.artifacts[0].base64;
        const filename = await this.saveBase64Image(imageData, requestId, 'sdxl');
        
        return {
            filename,
            seed: response.data.artifacts[0].seed
        };
    }
    
    /**
     * Generate with Flux via Replicate
     */
    async generateWithFlux(params, requestId) {
        if (!this.apiKeys.replicate) {
            throw new Error('Replicate API key not configured');
        }
        
        const [width, height] = params.size.split('x').map(Number);
        
        // Create prediction
        const predictionResponse = await axios.post(
            this.models.flux.endpoint,
            {
                version: 'flux-schnell', // Using Flux Schnell for speed
                input: {
                    prompt: params.prompt,
                    width,
                    height,
                    num_inference_steps: params.steps,
                    seed: params.seed
                }
            },
            {
                headers: {
                    'Authorization': `Token ${this.apiKeys.replicate}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Poll for completion
        let prediction = predictionResponse.data;
        while (['starting', 'processing'].includes(prediction.status)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await axios.get(
                `https://api.replicate.com/v1/predictions/${prediction.id}`,
                {
                    headers: {
                        'Authorization': `Token ${this.apiKeys.replicate}`
                    }
                }
            );
            prediction = statusResponse.data;
        }
        
        if (prediction.status === 'failed') {
            throw new Error(`Flux generation failed: ${prediction.error}`);
        }
        
        const imageUrl = prediction.output[0];
        const filename = await this.downloadImage(imageUrl, requestId, 'flux');
        
        return {
            imageUrl,
            filename,
            seed: params.seed
        };
    }
    
    /**
     * Generate with mock generator (for testing)
     */
    async generateWithMock(params, requestId) {
        // Simulate API latency
        const simulatedLatency = Math.random() * 2000 + 1000; // 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, simulatedLatency));
        
        // Create a more artistic mock image based on prompt
        const [width, height] = params.size.split('x').map(Number);
        
        // Generate colors and patterns based on prompt and seed
        const promptWords = params.prompt.toLowerCase().split(' ');
        const colors = this.generateColorsFromPrompt(promptWords, params.seed);
        const shapes = this.generateShapesFromPrompt(promptWords, params.seed);
        
        // Create artistic SVG based on prompt
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="grad${params.seed}" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
                </radialGradient>
                <linearGradient id="linear${params.seed}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${colors.accent};stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.4" />
                </linearGradient>
            </defs>
            ${this.generateArtisticElements(promptWords, width, height, colors, params.seed)}
            <text x="50%" y="90%" text-anchor="middle" font-family="Arial, sans-serif" 
                  font-size="${Math.min(14, width/60)}" fill="${colors.text}" opacity="0.8">
                "${params.prompt.substring(0, 60)}" - Seed: ${params.seed}
            </text>
        </svg>`;
        
        const filename = `mock_${requestId}.svg`;
        const filepath = path.join(this.outputDir, filename);
        await fs.writeFile(filepath, svg);
        
        return {
            filename,
            mockGenerated: true,
            seed: params.seed,
            colors: colors
        };
    }
    
    /**
     * Generate colors based on prompt keywords and seed
     */
    generateColorsFromPrompt(promptWords, seed) {
        // Seed-based pseudo-random number generator
        let rng = seed;
        const random = () => {
            rng = (rng * 1664525 + 1013904223) % Math.pow(2, 32);
            return rng / Math.pow(2, 32);
        };
        
        // Color themes based on prompt keywords
        const colorThemes = {
            // Nature themes
            nature: ['#2ECC71', '#27AE60', '#F39C12', '#E67E22'],
            forest: ['#27AE60', '#229954', '#D4AF37', '#8B4513'],
            ocean: ['#3498DB', '#2980B9', '#48CAE4', '#0077BE'],
            sunset: ['#FF6B6B', '#FF8E53', '#FF6B35', '#FFD93D'],
            mountain: ['#8E9AAF', '#6C757D', '#9FBBCC', '#5A6C7D'],
            
            // Urban themes
            city: ['#34495E', '#2C3E50', '#95A5A6', '#BDC3C7'],
            futuristic: ['#9B59B6', '#8E44AD', '#3498DB', '#E74C3C'],
            neon: ['#FF073A', '#00F5FF', '#ADFF2F', '#FF1493'],
            
            // Abstract themes
            abstract: ['#E74C3C', '#F39C12', '#9B59B6', '#3498DB'],
            geometric: ['#1ABC9C', '#E67E22', '#9B59B6', '#F1C40F'],
            vibrant: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
            
            // Animal themes
            cat: ['#D2691E', '#8B4513', '#CD853F', '#F4A460'],
            dog: ['#8B4513', '#D2B48C', '#DEB887', '#F5DEB3'],
            bird: ['#87CEEB', '#4169E1', '#FFD700', '#FF6347'],
            
            // Default
            default: ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12']
        };
        
        // Find matching theme
        let theme = colorThemes.default;
        for (const [keyword, colors] of Object.entries(colorThemes)) {
            if (promptWords.some(word => word.includes(keyword) || keyword.includes(word))) {
                theme = colors;
                break;
            }
        }
        
        // Select colors using seeded random
        const primary = theme[Math.floor(random() * theme.length)];
        const secondary = theme[Math.floor(random() * theme.length)];
        const accent = theme[Math.floor(random() * theme.length)];
        
        // Generate complementary text color
        const textColor = this.getContrastColor(primary);
        
        return {
            primary,
            secondary,
            accent,
            text: textColor
        };
    }
    
    /**
     * Generate shapes and patterns based on prompt
     */
    generateShapesFromPrompt(promptWords, seed) {
        // Seed-based random
        let rng = seed;
        const random = () => {
            rng = (rng * 1664525 + 1013904223) % Math.pow(2, 32);
            return rng / Math.pow(2, 32);
        };
        
        const shapes = {
            geometric: ['circle', 'rectangle', 'triangle', 'polygon'],
            organic: ['wave', 'blob', 'spiral'],
            nature: ['leaf', 'flower', 'tree', 'cloud'],
            abstract: ['spiral', 'web', 'rays', 'particles']
        };
        
        // Determine shape category from prompt
        let category = 'geometric';
        if (promptWords.some(w => ['nature', 'forest', 'mountain', 'lake', 'tree', 'flower'].includes(w))) {
            category = 'nature';
        } else if (promptWords.some(w => ['abstract', 'pattern', 'artistic'].includes(w))) {
            category = 'abstract';
        } else if (promptWords.some(w => ['organic', 'flowing', 'smooth'].includes(w))) {
            category = 'organic';
        }
        
        return {
            primary: shapes[category][Math.floor(random() * shapes[category].length)],
            count: Math.floor(random() * 8) + 3,
            size: random() * 0.3 + 0.1
        };
    }
    
    /**
     * Generate artistic elements for the SVG
     */
    generateArtisticElements(promptWords, width, height, colors, seed) {
        let rng = seed;
        const random = () => {
            rng = (rng * 1664525 + 1013904223) % Math.pow(2, 32);
            return rng / Math.pow(2, 32);
        };
        
        let elements = '';
        
        // Background gradient
        elements += `<rect width="100%" height="100%" fill="url(#grad${seed})" />`;
        
        // Add artistic elements based on prompt
        if (promptWords.some(w => ['geometric', 'pattern', 'abstract'].includes(w))) {
            // Geometric patterns
            for (let i = 0; i < 8; i++) {
                const x = random() * width;
                const y = random() * height;
                const size = random() * Math.min(width, height) * 0.2;
                const rotation = random() * 360;
                
                elements += `<rect x="${x}" y="${y}" width="${size}" height="${size}" 
                    fill="${colors.accent}" opacity="${random() * 0.6 + 0.2}"
                    transform="rotate(${rotation} ${x + size/2} ${y + size/2})" />`;
            }
        } else if (promptWords.some(w => ['circle', 'sun', 'moon', 'bubble'].includes(w))) {
            // Circular elements
            for (let i = 0; i < 6; i++) {
                const x = random() * width;
                const y = random() * height;
                const r = random() * Math.min(width, height) * 0.15;
                
                elements += `<circle cx="${x}" cy="${y}" r="${r}" 
                    fill="${colors.accent}" opacity="${random() * 0.5 + 0.3}" />`;
            }
        } else if (promptWords.some(w => ['wave', 'water', 'ocean', 'flowing'].includes(w))) {
            // Wave patterns
            const waveCount = 4;
            for (let i = 0; i < waveCount; i++) {
                const y = (height / waveCount) * i + random() * 100;
                const amplitude = random() * 50 + 20;
                
                elements += `<path d="M 0 ${y} Q ${width/4} ${y - amplitude} ${width/2} ${y} Q ${width*3/4} ${y + amplitude} ${width} ${y}" 
                    stroke="${colors.accent}" stroke-width="3" fill="none" opacity="0.6" />`;
            }
        } else {
            // Default artistic elements - scattered shapes
            for (let i = 0; i < 12; i++) {
                const x = random() * width;
                const y = random() * height;
                const size = random() * 30 + 10;
                const shape = random() < 0.5 ? 'circle' : 'rect';
                
                if (shape === 'circle') {
                    elements += `<circle cx="${x}" cy="${y}" r="${size/2}" 
                        fill="${colors.accent}" opacity="${random() * 0.4 + 0.2}" />`;
                } else {
                    elements += `<rect x="${x}" y="${y}" width="${size}" height="${size}" 
                        fill="${colors.secondary}" opacity="${random() * 0.4 + 0.2}"
                        rx="${size/4}" />`;
                }
            }
        }
        
        // Add overlay pattern
        elements += `<rect width="100%" height="100%" fill="url(#linear${seed})" />`;
        
        return elements;
    }
    
    /**
     * Get contrasting text color
     */
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#333333' : '#FFFFFF';
    }
    
    /**
     * Download image from URL
     */
    async downloadImage(url, requestId, modelPrefix) {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const extension = url.includes('.png') ? 'png' : 'jpg';
        const filename = `${modelPrefix}_${requestId}.${extension}`;
        const filepath = path.join(this.outputDir, filename);
        
        await fs.writeFile(filepath, response.data);
        return filename;
    }
    
    /**
     * Save base64 encoded image
     */
    async saveBase64Image(base64Data, requestId, modelPrefix) {
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${modelPrefix}_${requestId}.png`;
        const filepath = path.join(this.outputDir, filename);
        
        await fs.writeFile(filepath, buffer);
        return filename;
    }
    
    /**
     * Calculate cost estimate
     */
    calculateCost(params, model) {
        const pricing = model.pricing || {};
        let total = 0;
        let breakdown = {};
        
        if (params.model === 'huggingface') {
            total = 0.000; // Free!
            breakdown = {
                base: 0,
                free: true,
                note: 'Hugging Face free tier'
            };
        } else if (params.model === 'dalle3') {
            const pricePerImage = pricing[params.quality] || pricing.standard || 0.04;
            total = pricePerImage;
            breakdown = {
                base: pricePerImage,
                quality: params.quality
            };
        } else if (params.model === 'sdxl') {
            const pricePerStep = pricing.base || 0.01;
            total = (params.steps || 30) * pricePerStep;
            breakdown = {
                steps: params.steps,
                pricePerStep,
                total
            };
        } else if (params.model === 'flux') {
            total = pricing.base || 0.003;
            breakdown = {
                base: total
            };
        } else {
            total = pricing.base || 0.001;
            breakdown = {
                base: total,
                mock: true
            };
        }
        
        return {
            total,
            currency: 'USD',
            breakdown
        };
    }
    
    /**
     * Log request details
     */
    async logRequest(response) {
        const logEntry = {
            timestamp: response.timestamp,
            requestId: response.requestId,
            success: response.success,
            model: response.model,
            provider: response.provider,
            parameters: response.parameters,
            performance: response.performance,
            cost: response.cost,
            error: response.error
        };
        
        const logLine = JSON.stringify(logEntry) + '\\n';
        await fs.appendFile(this.logFile, logLine);
    }
    
    /**
     * Get generation statistics
     */
    async getStats() {
        try {
            const logData = await fs.readFile(this.logFile, 'utf8');
            const lines = logData.trim().split('\\n').filter(line => line);
            const requests = lines.map(line => JSON.parse(line));
            
            const stats = {
                total: requests.length,
                successful: requests.filter(r => r.success).length,
                failed: requests.filter(r => !r.success).length,
                models: {},
                totalCost: 0,
                avgLatency: 0
            };
            
            requests.forEach(req => {
                if (!stats.models[req.model]) {
                    stats.models[req.model] = { count: 0, cost: 0 };
                }
                stats.models[req.model].count++;
                
                if (req.cost) {
                    stats.models[req.model].cost += req.cost.total;
                    stats.totalCost += req.cost.total;
                }
                
                if (req.performance) {
                    stats.avgLatency += req.performance.latency;
                }
            });
            
            stats.avgLatency = requests.length > 0 ? stats.avgLatency / requests.length : 0;
            
            return stats;
        } catch (error) {
            return {
                total: 0,
                successful: 0,
                failed: 0,
                models: {},
                totalCost: 0,
                avgLatency: 0
            };
        }
    }
    
    /**
     * Get available models and their capabilities
     */
    getModels() {
        return Object.entries(this.models).map(([key, model]) => ({
            key,
            name: model.name,
            provider: model.provider,
            supports: model.supports,
            pricing: model.pricing
        }));
    }
}

module.exports = { ImageGenerator };