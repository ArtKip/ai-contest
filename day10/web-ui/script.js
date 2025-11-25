// Web UI for LLM-Driven MCP Orchestration Testing

class MCPTestUI {
    constructor() {
        this.currentMode = 'intelligent';
        this.testsRun = 0;
        this.totalSteps = 0;
        this.totalAdaptations = 0;
        this.serverStatus = {
            search: false,
            summarize: false,
            save: false
        };
        
        this.init();
    }

    init() {
        this.setupModeButtons();
        this.checkServerStatus();
        
        // Check server status periodically
        setInterval(() => this.checkServerStatus(), 10000);
    }

    setupModeButtons() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentMode = e.target.dataset.mode;
                this.logMessage(`🔄 Switched to ${this.currentMode} mode`, 'step');
            });
        });
    }

    async checkServerStatus() {
        try {
            // Use the Web UI server as a proxy to check MCP server status
            const response = await fetch('/api/status', { 
                method: 'GET'
            });
            
            if (response.ok) {
                const status = await response.json();
                
                // Update each server status based on the response
                this.updateServerStatus('search', status.search?.online || false);
                this.updateServerStatus('summarize', status.summarize?.online || false);
                this.updateServerStatus('save', status.save?.online || false);
            } else {
                // If API fails, mark all as offline
                this.updateServerStatus('search', false);
                this.updateServerStatus('summarize', false);
                this.updateServerStatus('save', false);
            }
        } catch (error) {
            console.log('Failed to check server status:', error);
            // If request fails, mark all as offline
            this.updateServerStatus('search', false);
            this.updateServerStatus('summarize', false);
            this.updateServerStatus('save', false);
        }
    }

    updateServerStatus(serverId, online) {
        this.serverStatus[serverId] = online;
        
        const statusCard = document.getElementById(`${serverId}-status`);
        const indicator = document.getElementById(`${serverId}-indicator`);
        
        if (online) {
            statusCard.classList.add('online');
            statusCard.classList.remove('offline');
            indicator.classList.add('online');
            indicator.classList.remove('offline');
        } else {
            statusCard.classList.add('offline');
            statusCard.classList.remove('online');
            indicator.classList.add('offline');
            indicator.classList.remove('online');
        }
    }

    areServersReady() {
        return Object.values(this.serverStatus).every(status => status);
    }

    logMessage(message, type = 'info', indent = 0) {
        const log = document.getElementById('execution-log');
        const timestamp = new Date().toLocaleTimeString();
        const indentSpaces = '  '.repeat(indent);
        
        let className = '';
        let emoji = '';
        
        switch (type) {
            case 'step':
                className = 'log-step';
                emoji = '📍';
                break;
            case 'reasoning':
                className = 'log-reasoning';
                emoji = '🧠';
                break;
            case 'tool':
                className = 'log-tool';
                emoji = '🛠️';
                break;
            case 'result':
                className = 'log-result';
                emoji = '✅';
                break;
            case 'adaptation':
                className = 'log-adaptation';
                emoji = '🔄';
                break;
            case 'error':
                className = 'log-adaptation';
                emoji = '❌';
                break;
            case 'success':
                className = 'log-result';
                emoji = '🎉';
                break;
        }
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${className}`;
        entry.textContent = `${timestamp} ${emoji} ${indentSpaces}${message}`;
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    async runTest() {
        const requestInput = document.getElementById('request-input');
        const testBtn = document.getElementById('test-btn');
        const request = requestInput.value.trim();
        
        if (!request) {
            alert('Please enter a request to test!');
            return;
        }
        
        if (!this.areServersReady()) {
            alert('MCP servers are not ready! Please start them first:\\n\\nnode start-all-servers.js');
            return;
        }

        // Disable button and show loading
        testBtn.disabled = true;
        testBtn.innerHTML = '<span class="loading"></span> Running LLM Orchestration...';
        
        this.logMessage('Starting LLM-driven MCP orchestration test', 'step');
        this.logMessage(`Mode: ${this.currentMode}`, 'info', 1);
        this.logMessage(`Request: "${request}"`, 'info', 1);
        
        try {
            if (this.currentMode === 'intelligent') {
                await this.runIntelligentTest(request);
            } else {
                await this.runAdaptiveTest(request);
            }
            
            this.testsRun++;
            this.updateStats();
            
        } catch (error) {
            this.logMessage(`Test failed: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            testBtn.disabled = false;
            testBtn.innerHTML = '🚀 Run LLM Orchestration Test';
        }
    }

    async runIntelligentTest(request) {
        this.logMessage('🧠 Starting Intelligent MCP Agent', 'step');
        
        try {
            const response = await fetch('/api/intelligent-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request, mode: 'intelligent' })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.displayTestResults(data);
            
        } catch (error) {
            // Fallback to simulated test if API not available
            this.logMessage('API not available, running simulated test', 'info', 1);
            await this.runSimulatedIntelligentTest(request);
        }
    }

    async runSimulatedIntelligentTest(request) {
        const steps = this.simulateIntelligentDecisions(request);
        let stepCount = 0;
        
        for (const step of steps) {
            stepCount++;
            
            this.logMessage(`Step ${stepCount}: ${step.action}`, 'step');
            this.logMessage(`Reasoning: ${step.reasoning}`, 'reasoning', 1);
            
            if (step.tool) {
                this.logMessage(`Using tool: ${step.tool}`, 'tool', 1);
                this.logMessage(`Parameters: ${JSON.stringify(step.parameters)}`, 'info', 2);
                
                // Simulate tool execution
                await this.simulateDelay(800, 1500);
                
                const result = await this.simulateToolExecution(step.tool, step.parameters);
                
                if (result.success) {
                    this.logMessage(`Tool executed successfully`, 'result', 1);
                    if (result.summary) {
                        this.logMessage(`Summary: ${result.summary}`, 'info', 2);
                    }
                    if (result.filename) {
                        this.logMessage(`File saved: ${result.filename}`, 'info', 2);
                    }
                } else {
                    this.logMessage(`Tool failed: ${result.error}`, 'error', 1);
                }
            }
            
            if (!step.shouldContinue) {
                break;
            }
        }
        
        this.totalSteps += stepCount;
        this.logMessage(`Intelligent orchestration completed in ${stepCount} steps`, 'success');
    }

    async runAdaptiveTest(request) {
        this.logMessage('🔄 Starting Adaptive Workflow Agent', 'step');
        
        try {
            const response = await fetch('/api/adaptive-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request, mode: 'adaptive' })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.displayTestResults(data);
            
        } catch (error) {
            // Fallback to simulated test
            this.logMessage('API not available, running simulated test', 'info', 1);
            await this.runSimulatedAdaptiveTest(request);
        }
    }

    async runSimulatedAdaptiveTest(request) {
        this.logMessage('Creating initial plan...', 'info', 1);
        
        let confidence = 0.7;
        let stepCount = 0;
        let adaptations = 0;
        
        const plan = this.createInitialPlan(request);
        this.logMessage(`Initial confidence: ${Math.round(confidence * 100)}%`, 'info', 1);
        
        while (stepCount < 5) {
            stepCount++;
            
            const decision = this.makeAdaptiveDecision(request, confidence, stepCount);
            
            this.logMessage(`Step ${stepCount}: ${decision.action}`, 'step');
            this.logMessage(`Reasoning: ${decision.reasoning}`, 'reasoning', 1);
            
            // Check for adaptation
            if (decision.adapted) {
                adaptations++;
                this.totalAdaptations++;
                this.logMessage(`ADAPTATION: ${decision.adaptationReason}`, 'adaptation');
            }
            
            if (decision.tool) {
                this.logMessage(`Using tool: ${decision.tool}`, 'tool', 1);
                
                await this.simulateDelay(600, 1200);
                
                const result = await this.simulateToolExecution(decision.tool, decision.parameters);
                
                if (result.success) {
                    confidence = Math.min(1.0, confidence + 0.1);
                    this.logMessage(`Tool executed successfully`, 'result', 1);
                    this.logMessage(`Confidence updated: ${Math.round(confidence * 100)}%`, 'info', 2);
                } else {
                    confidence = Math.max(0.1, confidence - 0.1);
                    this.logMessage(`Tool failed, confidence lowered: ${Math.round(confidence * 100)}%`, 'error', 1);
                }
            }
            
            if (decision.shouldStop || confidence > 0.85) {
                break;
            }
        }
        
        this.totalSteps += stepCount;
        this.logMessage(`Adaptive workflow completed with ${adaptations} adaptations`, 'success');
    }

    simulateIntelligentDecisions(request) {
        const steps = [];
        const hasInfo = request.toLowerCase().includes('find') || request.toLowerCase().includes('research');
        const needsSummary = request.toLowerCase().includes('summary') || request.toLowerCase().includes('overview');
        const needsSave = request.toLowerCase().includes('save') || request.toLowerCase().includes('report');
        
        if (hasInfo) {
            steps.push({
                action: 'search',
                tool: 'search_docs',
                reasoning: 'User is requesting information. Need to search for relevant content.',
                parameters: {
                    query: this.extractSearchTerms(request),
                    searchType: request.includes('comprehensive') ? 'semantic' : 'keyword',
                    maxResults: request.includes('detailed') ? 3 : 2,
                    includeContent: true
                },
                shouldContinue: true
            });
        }
        
        steps.push({
            action: 'summarize',
            tool: 'summarize',
            reasoning: 'Processing information to create digestible summary for user.',
            parameters: {
                summaryType: needsSummary ? 'bullet_points' : 'key_insights',
                length: request.includes('brief') ? 'brief' : 'medium',
                includeKeywords: true
            },
            shouldContinue: needsSave
        });
        
        if (needsSave) {
            steps.push({
                action: 'save',
                tool: 'save_to_file',
                reasoning: 'User requested saving results. Storing processed information.',
                parameters: {
                    filename: this.generateFilename(request),
                    format: request.includes('HTML') ? 'html' : 'md',
                    overwrite: true,
                    metadata: {
                        mode: 'intelligent',
                        request: request
                    }
                },
                shouldContinue: false
            });
        }
        
        return steps;
    }

    makeAdaptiveDecision(request, confidence, stepNumber) {
        const lowConfidence = confidence < 0.6;
        
        if (stepNumber === 1) {
            return {
                action: 'search',
                tool: 'search_docs',
                reasoning: 'Starting with information gathering',
                parameters: {
                    query: this.extractSearchTerms(request),
                    searchType: lowConfidence ? 'semantic' : 'keyword',
                    maxResults: lowConfidence ? 3 : 2
                },
                shouldStop: false,
                adapted: false
            };
        }
        
        if (stepNumber === 2 && confidence < 0.6) {
            return {
                action: 'search_more',
                tool: 'search_docs',
                reasoning: `Low confidence (${Math.round(confidence * 100)}%) - gathering additional information`,
                parameters: {
                    query: request + ' best practices',
                    searchType: 'semantic',
                    maxResults: 2
                },
                shouldStop: false,
                adapted: true,
                adaptationReason: 'Changed strategy due to low confidence'
            };
        }
        
        if (stepNumber <= 3) {
            return {
                action: 'summarize',
                tool: 'summarize',
                reasoning: confidence > 0.8 ? 'High confidence - creating brief summary' : 'Processing available information',
                parameters: {
                    summaryType: confidence > 0.8 ? 'bullet_points' : 'key_insights',
                    length: confidence > 0.8 ? 'brief' : 'detailed'
                },
                shouldStop: false,
                adapted: confidence > 0.8
            };
        }
        
        return {
            action: 'save',
            tool: 'save_to_file',
            reasoning: 'Saving processed results for user',
            parameters: {
                filename: this.generateFilename(request),
                format: confidence > 0.7 ? 'html' : 'txt'
            },
            shouldStop: true,
            adapted: false
        };
    }

    async simulateToolExecution(tool, parameters) {
        // Simulate tool execution with realistic responses
        switch (tool) {
            case 'search_docs':
                return {
                    success: true,
                    results: [
                        {
                            title: `Documentation about ${parameters.query}`,
                            content: `Relevant information about ${parameters.query} and best practices...`,
                            relevanceScore: 0.85
                        }
                    ],
                    totalResults: Math.floor(Math.random() * 3) + 1
                };
                
            case 'summarize':
                return {
                    success: true,
                    summary: `Key insights about ${parameters.content || 'the topic'}: This covers the main concepts and provides actionable information...`,
                    summaryType: parameters.summaryType,
                    keywords: ['key concept', 'best practice', 'implementation']
                };
                
            case 'save_to_file':
                return {
                    success: true,
                    filename: parameters.filename + '.' + parameters.format,
                    filePath: `outputs/${parameters.filename}.${parameters.format}`,
                    fileSize: Math.floor(Math.random() * 5000) + 1000
                };
                
            default:
                return { success: false, error: 'Unknown tool' };
        }
    }

    createInitialPlan(request) {
        return {
            strategy: request.includes('comprehensive') ? 'thorough_research' : 'adaptive_discovery',
            estimatedSteps: 3,
            confidence: 0.7
        };
    }

    extractSearchTerms(request) {
        return request.replace(/\\b(find|search|information about|create|make|save)\\b/gi, '').trim();
    }

    generateFilename(request) {
        const words = request.toLowerCase()
            .replace(/[^a-z0-9\\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2)
            .slice(0, 3)
            .join('_');
        return words || 'test_result';
    }

    simulateDelay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    updateStats() {
        document.getElementById('tests-run').textContent = this.testsRun;
        document.getElementById('avg-steps').textContent = this.testsRun > 0 ? 
            Math.round(this.totalSteps / this.testsRun * 10) / 10 : 0;
        document.getElementById('adaptations').textContent = this.totalAdaptations;
    }

    displayTestResults(data) {
        if (data.success) {
            this.logMessage(`Test completed successfully`, 'success');
            if (data.steps) {
                data.steps.forEach((step, index) => {
                    this.logMessage(`Step ${index + 1}: ${step.tool}`, 'step');
                    this.logMessage(`Result: ${step.result?.success ? 'Success' : 'Failed'}`, 'result', 1);
                    if (step.result?.success && step.result?.summary) {
                        this.logMessage(`Summary: ${step.result.summary}`, 'info', 2);
                    }
                    if (step.result?.success && step.result?.filename) {
                        this.logMessage(`File saved: ${step.result.filename}`, 'info', 2);
                    }
                });
                this.totalSteps += data.steps.length;
            }
            if (data.adaptations) {
                this.totalAdaptations += data.adaptations;
            }
        } else {
            this.logMessage(`Test failed: ${data.error}`, 'error');
        }
    }
}

// Global functions for UI interaction
function setRequest(text) {
    document.getElementById('request-input').value = text;
}

function clearLog() {
    document.getElementById('execution-log').innerHTML = '';
}

function runTest() {
    window.mcpUI.runTest();
}

// Initialize the UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.mcpUI = new MCPTestUI();
});