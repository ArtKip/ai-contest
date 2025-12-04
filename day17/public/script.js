// Day 17 Image Generation - Web Interface JavaScript

class ImageGenerationUI {
    constructor() {
        this.currentGeneration = null;
        this.models = {};
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadModels();
        this.loadStats();
        this.loadHistory();
    }
    
    initializeElements() {
        // Forms and inputs
        this.form = document.getElementById('generationForm');
        this.generateBtn = document.getElementById('generateBtn');
        this.modelSelect = document.getElementById('model');
        this.promptInput = document.getElementById('prompt');
        this.sizeSelect = document.getElementById('size');
        this.seedInput = document.getElementById('seed');
        
        // Parameter groups
        this.qualityGroup = document.getElementById('qualityGroup');
        this.dalleParams = document.getElementById('dalleParams');
        this.diffusionParams = document.getElementById('diffusionParams');
        this.cfgScaleGroup = document.getElementById('cfgScaleGroup');
        
        // Progress
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.getElementById('progressText');
        
        // Image display
        this.imageContainer = document.getElementById('imageContainer');
        this.imageDetails = document.getElementById('imageDetails');
        
        // Statistics
        this.statsContainer = document.getElementById('statsContainer');
        
        // History
        this.historyContainer = document.getElementById('historyContainer');
        this.refreshHistoryBtn = document.getElementById('refreshHistory');
        this.clearHistoryBtn = document.getElementById('clearHistory');
    }
    
    attachEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.modelSelect.addEventListener('change', () => this.updateModelParams());
        this.refreshHistoryBtn.addEventListener('click', () => this.loadHistory());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Random seed button
        this.seedInput.addEventListener('dblclick', () => {
            this.seedInput.value = Math.floor(Math.random() * 1000000);
        });
        this.seedInput.placeholder = 'Double-click for random';
    }
    
    async loadModels() {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            
            if (data.success) {
                this.models = data.models.reduce((acc, model) => {
                    acc[model.key] = model;
                    return acc;
                }, {});
                
                this.populateModelSelect(data.models, data.default);
                this.updateModelParams();
            }
        } catch (error) {
            console.error('Failed to load models:', error);
            this.showError('Failed to load available models');
        }
    }
    
    populateModelSelect(models, defaultModel) {
        this.modelSelect.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.key;
            option.textContent = `${model.name} (${model.provider})`;
            option.selected = model.key === defaultModel;
            this.modelSelect.appendChild(option);
        });
    }
    
    updateModelParams() {
        const selectedModel = this.modelSelect.value;
        const modelConfig = this.models[selectedModel];
        
        if (!modelConfig) return;
        
        // Update size options
        this.updateSizeOptions(modelConfig.supports.sizes);
        
        // Show/hide parameter groups
        this.dalleParams.style.display = selectedModel === 'dalle3' ? 'block' : 'none';
        this.diffusionParams.style.display = ['sdxl', 'flux', 'mock'].includes(selectedModel) ? 'block' : 'none';
        this.cfgScaleGroup.style.display = selectedModel === 'sdxl' ? 'block' : 'none';
        
        // Update quality options for DALL-E
        if (selectedModel === 'dalle3') {
            this.updateQualityOptions(['standard', 'hd']);
        } else if (selectedModel === 'mock') {
            this.updateQualityOptions(['draft', 'standard', 'high']);
        } else {
            this.qualityGroup.style.display = 'none';
        }
        
        // Update steps range
        if (modelConfig.supports.steps) {
            const stepsInput = document.getElementById('steps');
            stepsInput.min = modelConfig.supports.steps.min;
            stepsInput.max = modelConfig.supports.steps.max;
            stepsInput.value = modelConfig.supports.steps.default;
        }
    }
    
    updateSizeOptions(sizes) {
        const currentValue = this.sizeSelect.value;
        this.sizeSelect.innerHTML = '';
        
        sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size;
            option.selected = size === currentValue;
            this.sizeSelect.appendChild(option);
        });
        
        // If current value not available, select first option
        if (!sizes.includes(currentValue)) {
            this.sizeSelect.value = sizes[0];
        }
    }
    
    updateQualityOptions(qualities) {
        const qualitySelect = document.getElementById('quality');
        const currentValue = qualitySelect.value;
        
        qualitySelect.innerHTML = '';
        qualities.forEach(quality => {
            const option = document.createElement('option');
            option.value = quality;
            option.textContent = quality.charAt(0).toUpperCase() + quality.slice(1);
            option.selected = quality === currentValue;
            qualitySelect.appendChild(option);
        });
        
        this.qualityGroup.style.display = 'block';
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.currentGeneration) {
            this.showError('Generation in progress, please wait');
            return;
        }
        
        const formData = new FormData(this.form);
        const params = Object.fromEntries(formData.entries());
        
        // Convert numeric fields
        if (params.seed) params.seed = parseInt(params.seed);
        if (params.steps) params.steps = parseInt(params.steps);
        if (params.cfg_scale) params.cfg_scale = parseFloat(params.cfg_scale);
        
        // Remove empty values
        Object.keys(params).forEach(key => {
            if (params[key] === '' || params[key] === null) {
                delete params[key];
            }
        });
        
        await this.generateImage(params);
    }
    
    async generateImage(params) {
        try {
            this.startGeneration();
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayGeneratedImage(data);
                this.loadStats(); // Refresh stats
                this.loadHistory(); // Refresh history
            } else {
                throw new Error(data.error || 'Generation failed');
            }
            
        } catch (error) {
            console.error('Generation error:', error);
            this.showError(error.message);
        } finally {
            this.endGeneration();
        }
    }
    
    startGeneration() {
        this.currentGeneration = true;
        this.generateBtn.disabled = true;
        this.generateBtn.textContent = '🔄 Generating...';
        
        this.progressContainer.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Preparing generation...';
        
        // Simulate progress
        let progress = 0;
        this.progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            this.progressFill.style.width = progress + '%';
            
            if (progress < 30) {
                this.progressText.textContent = 'Sending request to model...';
            } else if (progress < 60) {
                this.progressText.textContent = 'Generating image...';
            } else {
                this.progressText.textContent = 'Finalizing image...';
            }
        }, 500);
    }
    
    endGeneration() {
        this.currentGeneration = null;
        this.generateBtn.disabled = false;
        this.generateBtn.textContent = '🎨 Generate Image';
        
        clearInterval(this.progressInterval);
        this.progressFill.style.width = '100%';
        this.progressText.textContent = 'Complete!';
        
        setTimeout(() => {
            this.progressContainer.style.display = 'none';
        }, 1000);
    }
    
    displayGeneratedImage(data) {
        const { result, imageUrl } = data;
        
        // Create image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = result.parameters.prompt;
        img.onload = () => {
            this.imageContainer.innerHTML = '';
            this.imageContainer.appendChild(img);
            this.imageContainer.classList.add('has-image');
        };
        
        // Update image details
        this.updateImageDetails(result);
        this.imageDetails.style.display = 'block';
    }
    
    updateImageDetails(result) {
        const details = {
            detailModel: result.model,
            detailSize: result.parameters.size,
            detailSeed: result.result.seed || result.parameters.seed,
            detailLatency: `${result.performance.latency}ms`,
            detailCost: `$${result.cost.total.toFixed(4)}`,
            detailRequestId: result.requestId.substring(0, 8) + '...'
        };
        
        Object.entries(details).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.success) {
                this.displayStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    
    displayStats(stats) {
        // Update main stats
        document.getElementById('totalRequests').textContent = stats.total;
        document.getElementById('successRate').textContent = 
            stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) + '%' : '0%';
        document.getElementById('avgLatency').textContent = Math.round(stats.avgLatency) + 'ms';
        document.getElementById('totalCost').textContent = '$' + stats.totalCost.toFixed(4);
        
        // Update model stats
        const modelStatsContent = document.getElementById('modelStatsContent');
        
        if (Object.keys(stats.models).length === 0) {
            modelStatsContent.innerHTML = 'No data yet';
            return;
        }
        
        modelStatsContent.innerHTML = '';
        Object.entries(stats.models).forEach(([model, data]) => {
            const modelStat = document.createElement('div');
            modelStat.className = 'model-stat';
            modelStat.innerHTML = `
                <span>${model}</span>
                <span>${data.count} requests ($${data.cost.toFixed(4)})</span>
            `;
            modelStatsContent.appendChild(modelStat);
        });
    }
    
    async loadHistory() {
        try {
            const response = await fetch('/api/history');
            const data = await response.json();
            
            if (data.success) {
                this.displayHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    displayHistory(history) {
        if (history.length === 0) {
            this.historyContainer.innerHTML = '<p>No generations yet</p>';
            return;
        }
        
        this.historyContainer.innerHTML = '';
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${item.success ? 'success' : 'failed'}`;
            
            const time = new Date(item.timestamp).toLocaleTimeString();
            const prompt = item.parameters.prompt.substring(0, 60) + 
                          (item.parameters.prompt.length > 60 ? '...' : '');
            
            historyItem.innerHTML = `
                <div class="history-header">
                    <span class="history-model">${item.model}</span>
                    <span class="history-time">${time}</span>
                </div>
                <div class="history-prompt">${prompt}</div>
                <div class="history-details">
                    ${item.parameters.size} • 
                    ${item.performance ? item.performance.latency + 'ms' : 'N/A'} • 
                    ${item.cost ? '$' + item.cost.total.toFixed(4) : 'N/A'}
                    ${item.success ? '' : ' • Failed: ' + item.error}
                </div>
            `;
            
            this.historyContainer.appendChild(historyItem);
        });
    }
    
    async clearHistory() {
        if (!confirm('Are you sure you want to clear the generation history?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/history', { method: 'DELETE' });
            const data = await response.json();
            
            if (data.success) {
                this.loadHistory();
                this.loadStats();
                this.showSuccess('History cleared');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Failed to clear history:', error);
            this.showError('Failed to clear history');
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Set background color based on type
        const colors = {
            error: '#e53e3e',
            success: '#48bb78',
            info: '#667eea'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ImageGenerationUI();
});