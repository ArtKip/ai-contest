/**
 * Day 18: Prompt & Style Systems Frontend
 * 
 * Web interface for brand-consistent image generation
 */

class StyleSystemUI {
    constructor() {
        this.currentTab = 'generate';
        this.profiles = [];
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadProfiles();
        this.setupTabNavigation();
        
        // Load initial data
        await this.loadHistory();
        await this.loadStats();
        
        console.log('🎨 Style System UI initialized');
    }
    
    setupEventListeners() {
        // Form submissions
        document.getElementById('generateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateImage();
        });
        
        document.getElementById('gridForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateGrid();
        });
        
        // Preview buttons
        document.getElementById('previewPrompt').addEventListener('click', () => {
            this.previewPrompt();
        });
        
        // Style profile selection
        document.getElementById('styleProfile').addEventListener('change', (e) => {
            this.showStylePreview(e.target.value);
        });
        
        // History actions
        document.getElementById('refreshHistory').addEventListener('click', () => {
            this.loadHistory();
        });
        
        document.getElementById('clearHistory').addEventListener('click', () => {
            this.clearHistory();
        });
        
        // Message close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('message-close')) {
                e.target.parentElement.style.display = 'none';
            }
        });
    }
    
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(tabName).classList.add('active');
                
                this.currentTab = tabName;
                
                // Load tab-specific data
                this.onTabChange(tabName);
            });
        });
    }
    
    async onTabChange(tabName) {
        switch (tabName) {
            case 'profiles':
                this.displayProfiles();
                break;
            case 'history':
                await this.loadHistory();
                break;
            case 'stats':
                await this.loadStats();
                break;
        }
    }
    
    async loadProfiles() {
        try {
            const response = await fetch('/api/profiles');
            const data = await response.json();
            
            if (data.success) {
                this.profiles = data.profiles;
                this.populateProfileSelects();
                this.setupGridStyleCheckboxes();
            } else {
                this.showError('Failed to load style profiles');
            }
        } catch (error) {
            this.showError('Failed to connect to style system');
            console.error('Error loading profiles:', error);
        }
    }
    
    populateProfileSelects() {
        const selects = document.querySelectorAll('#styleProfile');
        
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select a style profile...</option>';
            this.profiles.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.key;
                option.textContent = profile.name;
                select.appendChild(option);
            });
        });
    }
    
    setupGridStyleCheckboxes() {
        const container = document.getElementById('gridStyles');
        container.innerHTML = '';
        
        this.profiles.forEach(profile => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `style_${profile.key}`;
            checkbox.value = profile.key;
            
            const label = document.createElement('label');
            label.htmlFor = `style_${profile.key}`;
            label.textContent = profile.name;
            
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }
    
    async showStylePreview(profileKey) {
        if (!profileKey) {
            document.getElementById('stylePreview').style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`/api/profiles/${profileKey}`);
            const data = await response.json();
            
            if (data.success) {
                const profile = data.profile;
                this.displayStylePreview(profile);
            }
        } catch (error) {
            console.error('Error loading profile details:', error);
        }
    }
    
    displayStylePreview(profile) {
        document.getElementById('profileName').textContent = profile.name;
        document.getElementById('profileDescription').textContent = profile.description;
        document.getElementById('profileMood').textContent = profile.mood;
        document.getElementById('profileKeywords').textContent = profile.style_keywords;
        
        // Display color palette
        const paletteContainer = document.getElementById('colorPalette');
        paletteContainer.innerHTML = '';
        
        Object.entries(profile.color_palette).forEach(([name, color]) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = `${name}: ${color}`;
            paletteContainer.appendChild(swatch);
        });
        
        document.getElementById('stylePreview').style.display = 'block';
    }
    
    async previewPrompt() {
        const formData = new FormData(document.getElementById('generateForm'));
        const params = Object.fromEntries(formData);
        
        if (!params.baseSubject || !params.styleProfile) {
            this.showError('Please fill in base subject and style profile');
            return;
        }
        
        try {
            const response = await fetch('/api/preview-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayPromptPreview(data.promptData);
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to generate prompt preview');
            console.error('Error:', error);
        }
    }
    
    displayPromptPreview(promptData) {
        document.getElementById('positivePrompt').textContent = promptData.positive;
        document.getElementById('negativePrompt').textContent = promptData.negative;
        document.getElementById('promptLength').textContent = promptData.stats.positiveLength;
        document.getElementById('promptSize').textContent = promptData.size;
        document.getElementById('promptWords').textContent = promptData.stats.wordCount;
        
        document.getElementById('promptPreview').style.display = 'block';
    }
    
    async generateImage() {
        const formData = new FormData(document.getElementById('generateForm'));
        const params = Object.fromEntries(formData);
        
        if (!params.baseSubject || !params.styleProfile) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        this.showLoading('Generating styled image...');
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayGenerationResult(data);
                this.showSuccess('Image generated successfully!');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to generate image');
            console.error('Error:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    displayGenerationResult(data) {
        const result = data.result;
        
        document.getElementById('generatedImage').src = data.imageUrl;
        document.getElementById('resultStyle').textContent = result.styleProfile;
        document.getElementById('resultSize').textContent = result.result.size;
        document.getElementById('resultLatency').textContent = `${result.performance.latency}ms`;
        document.getElementById('resultRequestId').textContent = result.requestId;
        
        document.getElementById('generateResult').style.display = 'block';
        
        // Scroll to result
        document.getElementById('generateResult').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    async generateGrid() {
        const formData = new FormData(document.getElementById('gridForm'));
        const params = Object.fromEntries(formData);
        
        // Get selected style profiles
        const selectedStyles = Array.from(document.querySelectorAll('#gridStyles input:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedStyles.length > 0) {
            params.styleProfiles = selectedStyles;
        }
        
        if (!params.gridBaseSubject) {
            this.showError('Please fill in base subject');
            return;
        }
        
        this.showLoading('Generating style comparison grid...');
        
        try {
            const requestBody = {
                baseSubject: params.gridBaseSubject,
                aspectRatio: params.gridAspectRatio || '1:1',
                customAdditions: params.gridCustomAdditions || '',
                styleProfiles: params.styleProfiles || null
            };
            
            const response = await fetch('/api/generate-grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayGridResults(data.grid);
                this.showSuccess('Style grid generated successfully!');
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to generate style grid');
            console.error('Error:', error);
        } finally {
            this.hideLoading();
        }
    }
    
    displayGridResults(grid) {
        document.getElementById('gridSubject').textContent = grid.baseSubject;
        document.getElementById('gridRatio').textContent = grid.aspectRatio;
        document.getElementById('gridId').textContent = grid.gridId;
        
        const gridContainer = document.getElementById('styleGrid');
        gridContainer.innerHTML = '';
        
        Object.entries(grid.styles).forEach(([styleName, result]) => {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item';
            
            const title = document.createElement('h4');
            title.textContent = styleName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            gridItem.appendChild(title);
            
            if (result.error) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error';
                errorDiv.textContent = result.error;
                gridItem.appendChild(errorDiv);
            } else if (result.imageUrl) {
                const img = document.createElement('img');
                img.src = result.imageUrl;
                img.alt = `${styleName} style`;
                img.loading = 'lazy';
                gridItem.appendChild(img);
                
                const info = document.createElement('div');
                info.innerHTML = `
                    <small>
                        Size: ${result.result.size}<br>
                        Latency: ${result.performance.latency}ms
                    </small>
                `;
                gridItem.appendChild(info);
            }
            
            gridContainer.appendChild(gridItem);
        });
        
        document.getElementById('gridResults').style.display = 'block';
        
        // Scroll to results
        document.getElementById('gridResults').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
    
    displayProfiles() {
        const container = document.getElementById('profilesGrid');
        container.innerHTML = '';
        
        this.profiles.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            
            card.innerHTML = `
                <h3>${profile.name}</h3>
                <p class="description">${profile.description}</p>
                <div class="profile-details">
                    <div class="detail-row">
                        <strong>Mood:</strong>
                        <span>${profile.mood}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Colors:</strong>
                        <div class="color-palette">
                            ${profile.primaryColors.map(color => 
                                `<div class="color-swatch" style="background-color: ${color}" title="${color}"></div>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="detail-row">
                        <strong>Ratios:</strong>
                        <span>${profile.preferredRatios.join(', ')}</span>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    async loadHistory() {
        try {
            const response = await fetch('/api/history?limit=20');
            const data = await response.json();
            
            if (data.success) {
                this.displayHistory(data.history);
            } else {
                this.showError('Failed to load history');
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }
    
    displayHistory(history) {
        const container = document.getElementById('historyList');
        container.innerHTML = '';
        
        if (history.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No generation history yet</p>';
            return;
        }
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${item.success ? 'success' : 'error'}`;
            
            const imageHtml = item.imageUrl 
                ? `<img src="${item.imageUrl}" alt="Generated image" class="history-image">`
                : '<div class="history-image" style="background: var(--border-color); display: flex; align-items: center; justify-content: center;">❌</div>';
            
            historyItem.innerHTML = `
                ${imageHtml}
                <div class="history-details">
                    <h4>${item.baseSubject || 'Unknown Subject'}</h4>
                    <p><strong>Style:</strong> ${item.styleProfile || 'Unknown'}</p>
                    <p><strong>Ratio:</strong> ${item.aspectRatio || 'Unknown'}</p>
                    ${item.error ? `<p style="color: var(--danger-color);">${item.error}</p>` : ''}
                </div>
                <div class="history-meta">
                    <p>${new Date(item.timestamp).toLocaleString()}</p>
                    <p>${item.performance?.latency || 0}ms</p>
                    <p>${item.requestId?.substring(0, 8) || ''}...</p>
                </div>
            `;
            
            container.appendChild(historyItem);
        });
    }
    
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (data.success) {
                this.displayStats(data.stats);
            } else {
                this.showError('Failed to load statistics');
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    displayStats(stats) {
        const container = document.getElementById('statsGrid');
        container.innerHTML = '';
        
        // Basic stats
        const basicStats = [
            { label: 'Total Generations', value: stats.total },
            { label: 'Successful', value: stats.successful },
            { label: 'Failed', value: stats.failed },
            { label: 'Success Rate', value: `${stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0}%` },
            { label: 'Average Latency', value: `${Math.round(stats.avgLatency)}ms` }
        ];
        
        basicStats.forEach(stat => {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <h3>${stat.label}</h3>
                <div class="stat-value">${stat.value}</div>
            `;
            container.appendChild(card);
        });
        
        // Style breakdown
        if (Object.keys(stats.byStyle).length > 0) {
            const styleCard = document.createElement('div');
            styleCard.className = 'stat-card';
            styleCard.innerHTML = `
                <h3>By Style Profile</h3>
                <div style="text-align: left;">
                    ${Object.entries(stats.byStyle).map(([style, data]) => {
                        const successRate = data.count > 0 ? Math.round((data.successful / data.count) * 100) : 0;
                        return `<p><strong>${style}:</strong> ${data.successful}/${data.count} (${successRate}%)</p>`;
                    }).join('')}
                </div>
            `;
            container.appendChild(styleCard);
        }
        
        // Aspect ratio breakdown
        if (Object.keys(stats.byAspectRatio).length > 0) {
            const ratioCard = document.createElement('div');
            ratioCard.className = 'stat-card';
            ratioCard.innerHTML = `
                <h3>By Aspect Ratio</h3>
                <div style="text-align: left;">
                    ${Object.entries(stats.byAspectRatio).map(([ratio, data]) => {
                        const successRate = data.count > 0 ? Math.round((data.successful / data.count) * 100) : 0;
                        return `<p><strong>${ratio}:</strong> ${data.successful}/${data.count} (${successRate}%)</p>`;
                    }).join('')}
                </div>
            `;
            container.appendChild(ratioCard);
        }
    }
    
    async clearHistory() {
        if (!confirm('Are you sure you want to clear the generation history?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/clear-history', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clearFiles: false })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('History cleared successfully');
                await this.loadHistory();
                await this.loadStats();
            } else {
                this.showError(data.error);
            }
        } catch (error) {
            this.showError('Failed to clear history');
            console.error('Error:', error);
        }
    }
    
    showLoading(message = 'Loading...') {
        document.getElementById('loadingMessage').textContent = message;
        document.getElementById('loadingOverlay').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
    
    showSuccess(message) {
        this.showMessage(message, 'successMessage');
    }
    
    showError(message) {
        this.showMessage(message, 'errorMessage');
    }
    
    showMessage(message, elementId) {
        const messageEl = document.getElementById(elementId);
        messageEl.querySelector('.message-text').textContent = message;
        messageEl.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StyleSystemUI();
});