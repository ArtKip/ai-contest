# Day 17: Image Generation Fundamentals

## Overview

A comprehensive image generation pipeline supporting multiple AI models with parameter control, comprehensive logging, and an interactive web interface.

## Features

### 🎨 **Multi-Model Support**
- **OpenAI DALL-E 3**: High-quality photorealistic images
- **Stability AI SDXL**: Stable Diffusion XL for detailed artwork
- **Flux (Replicate)**: Fast generation with Flux Schnell
- **Mock Generator**: Local testing without API costs

### 📊 **Parameter Control**
- **Prompt**: Text description for image generation
- **Size**: Multiple aspect ratios (1024x1024, 1024x768, etc.)
- **Quality/Steps**: Control generation quality and detail
- **Seed**: Reproducible results with fixed random seeds
- **Model-specific parameters**: Style, CFG scale, inference steps

### 📝 **Comprehensive Logging**
- Request parameters and timestamps
- Response latency tracking
- Cost estimation per generation
- Model performance metrics
- Success/failure tracking with error details

### 🌐 **Interactive Web Interface**
- Real-time parameter adjustment
- Live image preview
- Generation history with thumbnails
- Statistics dashboard
- Model comparison tools

## Usage

### Quick Start

```bash
# Install dependencies
npm install

# Start web interface
npm start

# Visit http://localhost:3017
```

### Command Line Demo

```bash
# Run basic demo
npm run demo

# Test all models
npm run test
```

### Programmatic Usage

```javascript
const { ImageGenerator } = require('./image-generator');

const generator = new ImageGenerator();

const result = await generator.generateImage({
    prompt: "A beautiful landscape",
    model: "dalle3",
    size: "1024x1024",
    quality: "hd",
    seed: 12345
});

console.log(`Generated: ${result.result.filename}`);
console.log(`Cost: $${result.cost.total}`);
```

## Supported Models & Parameters

### DALL-E 3 (OpenAI)
```javascript
{
    model: "dalle3",
    prompt: "Your image description",
    size: "1024x1024", // "1024x1792", "1792x1024"
    quality: "standard", // "hd"
    style: "vivid", // "natural"
    seed: 12345 // Optional
}
```

**Pricing**: $0.040 (standard), $0.080 (HD) per image

### Stable Diffusion XL (Stability AI)
```javascript
{
    model: "sdxl",
    prompt: "Your image description",
    size: "1024x1024", // Various sizes supported
    steps: 30, // 10-150
    cfg_scale: 7, // 0-35
    seed: 12345
}
```

**Pricing**: ~$0.01 per step

### Flux (Replicate)
```javascript
{
    model: "flux",
    prompt: "Your image description", 
    size: "1024x1024",
    steps: 4, // 1-8
    seed: 12345
}
```

**Pricing**: ~$0.003 per prediction

### Mock Generator (Testing)
```javascript
{
    model: "mock",
    prompt: "Your image description",
    size: "1024x1024",
    quality: "standard", // "draft", "high"
    steps: 20,
    seed: 12345
}
```

**Pricing**: $0.001 (simulated)

## Web Interface

The web interface provides:

### Generation Controls
- **Model Selection**: Choose between available models
- **Parameter Inputs**: Prompt, size, quality, seed
- **Advanced Options**: Model-specific parameters
- **Real-time Validation**: Parameter compatibility checking

### Image Display
- **Large Preview**: Full-size generated image
- **Generation Details**: Parameters, cost, latency
- **Download Options**: Save generated images

### Statistics Dashboard
- **Request Counts**: Total, successful, failed
- **Performance Metrics**: Average latency, success rate
- **Cost Tracking**: Total and per-model costs
- **Model Usage**: Breakdown by model type

### Generation History
- **Recent Generations**: Last 50 requests
- **Request Details**: Parameters, timing, costs
- **Status Tracking**: Success/failure indicators
- **Quick Actions**: Clear history, refresh data

## API Endpoints

### Generate Image
```http
POST /api/generate
Content-Type: application/json

{
    "prompt": "A beautiful landscape",
    "model": "dalle3",
    "size": "1024x1024",
    "quality": "hd"
}
```

### Get Models
```http
GET /api/models
```

### Get Statistics
```http
GET /api/stats
```

### Get History
```http
GET /api/history
```

## Configuration

### Environment Variables

```bash
# Required for actual image generation
OPENAI_API_KEY=your_openai_key
STABILITY_API_KEY=your_stability_key
REPLICATE_API_KEY=your_replicate_key

# Optional
PORT=3017
```

### Model Configuration

Models are configured in the ImageGenerator class:

```javascript
const generator = new ImageGenerator({
    defaultModel: 'mock',     // Default model to use
    outputDir: './images',    // Output directory
    logFile: './requests.log', // Log file path
    verbose: true             // Enable console logging
});
```

## File Structure

```
day17/
├── image-generator.js     # Core generation system
├── server.js             # Web server and API
├── demo.js               # Command line demo
├── test-models.js        # Model testing script
├── public/               # Web interface
│   ├── index.html        # Main page
│   ├── style.css         # Styling
│   └── script.js         # Frontend JavaScript
├── generated-images/     # Output directory
└── image-generation.log  # Request log file
```

## Logging Format

Each generation is logged as JSON:

```json
{
    "timestamp": "2024-12-04T18:30:45.123Z",
    "requestId": "abc123",
    "success": true,
    "model": "DALL-E 3",
    "provider": "OpenAI",
    "parameters": {
        "prompt": "A beautiful landscape",
        "size": "1024x1024",
        "quality": "hd"
    },
    "performance": {
        "latency": 3420,
        "startTime": "2024-12-04T18:30:41.703Z",
        "endTime": "2024-12-04T18:30:45.123Z"
    },
    "cost": {
        "total": 0.08,
        "currency": "USD",
        "breakdown": {
            "base": 0.08,
            "quality": "hd"
        }
    }
}
```

## Development

### Adding New Models

1. Add model configuration to `image-generator.js`
2. Implement generation method (e.g., `generateWithNewModel`)
3. Update parameter handling and cost calculation
4. Test with `npm run test`

### Custom Parameters

Models can support custom parameters by:

1. Adding to model configuration `supports` object
2. Handling in `normalizeParameters` method
3. Using in model-specific generation method
4. Updating web interface parameter controls

## Testing

```bash
# Test with mock model (free)
npm run demo

# Test all configured models
npm run test

# Start web interface for manual testing
npm start
```

## Cost Management

- **Mock Model**: Free testing and development
- **Real Models**: Monitor costs in statistics dashboard
- **Cost Limits**: Implement usage limits as needed
- **Model Selection**: Choose appropriate model for use case

## Performance

- **DALL-E 3**: ~3-8 seconds, highest quality
- **SDXL**: ~2-15 seconds (depends on steps)
- **Flux**: ~1-4 seconds, fastest generation
- **Mock**: ~1-3 seconds, instant local generation

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure environment variables are set
   - Check API key validity and permissions

2. **Model Not Available**
   - Verify API credentials
   - Check model endpoint status
   - Use mock model for testing

3. **Parameter Validation**
   - Check supported sizes for each model
   - Verify parameter ranges (steps, CFG scale)
   - Use web interface for guided input

4. **Network Errors**
   - Check internet connection
   - Verify API endpoint accessibility
   - Increase timeout for slow connections

### Debugging

Enable verbose logging:

```javascript
const generator = new ImageGenerator({ verbose: true });
```

Check log file for detailed request/response data:

```bash
tail -f image-generation.log
```

## Future Enhancements

- **Batch Generation**: Multiple images per request
- **Style Presets**: Pre-configured parameter sets
- **Image Editing**: Inpainting and outpainting
- **Advanced Models**: Support for latest models
- **Workflow Management**: Multi-step generation pipelines

## Security

- **API Keys**: Store securely, never commit to version control
- **Input Validation**: Sanitize prompts and parameters
- **Rate Limiting**: Implement usage controls
- **File Security**: Validate uploaded files and generated content

This Day 17 implementation provides a solid foundation for image generation with comprehensive parameter control, logging, and a user-friendly web interface suitable for both development and production use.