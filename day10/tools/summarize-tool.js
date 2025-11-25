#!/usr/bin/env node

/**
 * Summarize MCP Tool
 * 
 * Summarizes text content using various summarization techniques:
 * extractive, abstractive, bullet points, key insights.
 */

class SummarizeTool {
    constructor() {
        this.name = 'summarize';
        this.description = 'Summarize text content using various summarization techniques';
        
        this.summaryTypes = ['extractive', 'abstractive', 'bullet_points', 'key_insights', 'executive'];
        this.summaryLengths = ['brief', 'medium', 'detailed'];
    }

    /**
     * Get tool schema for MCP registration
     */
    getToolSchema() {
        return {
            name: this.name,
            description: this.description,
            inputSchema: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'Text content to summarize'
                    },
                    summaryType: {
                        type: 'string',
                        description: 'Type of summary to generate',
                        enum: this.summaryTypes,
                        default: 'abstractive'
                    },
                    length: {
                        type: 'string',
                        description: 'Desired summary length',
                        enum: this.summaryLengths,
                        default: 'medium'
                    },
                    focus: {
                        type: 'string',
                        description: 'Specific aspect to focus on (optional)',
                        examples: ['key features', 'benefits', 'technical details', 'implementation']
                    },
                    maxSentences: {
                        type: 'number',
                        description: 'Maximum number of sentences in summary',
                        minimum: 1,
                        maximum: 20,
                        default: 5
                    },
                    includeKeywords: {
                        type: 'boolean',
                        description: 'Whether to extract and include key keywords',
                        default: true
                    }
                },
                required: ['content']
            }
        };
    }

    /**
     * Execute the summarize tool
     */
    async execute(parameters) {
        try {
            console.log(`📝 Summarize tool executing with parameters:`, {
                summaryType: parameters.summaryType,
                length: parameters.length,
                contentLength: parameters.content?.length || 0
            });

            const { 
                content, 
                summaryType = 'abstractive', 
                length = 'medium', 
                focus = null,
                maxSentences = 5,
                includeKeywords = true
            } = parameters;

            if (!content || content.trim() === '') {
                throw new Error('Content to summarize is required');
            }

            // Clean and prepare content
            const cleanContent = this.cleanContent(content);
            const sentences = this.extractSentences(cleanContent);
            
            if (sentences.length === 0) {
                throw new Error('No valid sentences found in content');
            }

            // Generate summary based on type
            let summary;
            switch (summaryType) {
                case 'extractive':
                    summary = this.generateExtractiveSummary(sentences, length, maxSentences);
                    break;
                case 'abstractive':
                    summary = this.generateAbstractiveSummary(cleanContent, length, focus);
                    break;
                case 'bullet_points':
                    summary = this.generateBulletPointSummary(cleanContent, length);
                    break;
                case 'key_insights':
                    summary = this.generateKeyInsights(cleanContent);
                    break;
                case 'executive':
                    summary = this.generateExecutiveSummary(cleanContent, focus);
                    break;
                default:
                    summary = this.generateAbstractiveSummary(cleanContent, length, focus);
            }

            // Extract keywords if requested
            const keywords = includeKeywords ? this.extractKeywords(cleanContent) : [];

            // Calculate summary metrics
            const metrics = this.calculateSummaryMetrics(content, summary);

            return {
                success: true,
                summary: summary,
                summaryType: summaryType,
                length: length,
                focus: focus,
                keywords: keywords,
                metrics: metrics,
                originalLength: content.length,
                summaryLength: summary.length,
                compressionRatio: (1 - (summary.length / content.length)).toFixed(2),
                executedAt: new Date().toISOString(),
                processingInfo: {
                    sentencesAnalyzed: sentences.length,
                    keywordsExtracted: keywords.length,
                    summaryMethod: summaryType
                }
            };

        } catch (error) {
            console.error('Summarize tool execution error:', error);
            return {
                success: false,
                error: error.message,
                summaryType: parameters.summaryType || 'unknown',
                executedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Clean and normalize content for processing
     */
    cleanContent(content) {
        return content
            .replace(/\\s+/g, ' ')          // Normalize whitespace
            .replace(/\\n+/g, ' ')          // Remove newlines
            .replace(/[\\u00A0]/g, ' ')     // Replace non-breaking spaces
            .trim();
    }

    /**
     * Extract sentences from content
     */
    extractSentences(content) {
        // Split on sentence endings, but handle abbreviations
        const sentences = content
            .split(/(?<=[.!?])\\s+/)
            .filter(sentence => sentence.trim().length > 10) // Filter out very short "sentences"
            .map(sentence => sentence.trim());

        return sentences;
    }

    /**
     * Generate extractive summary (select most important existing sentences)
     */
    generateExtractiveSummary(sentences, length, maxSentences) {
        // Score sentences based on various factors
        const scoredSentences = sentences.map(sentence => ({
            sentence: sentence,
            score: this.scoreSentence(sentence, sentences)
        }));

        // Sort by score and take top sentences
        scoredSentences.sort((a, b) => b.score - a.score);
        
        const numSentences = this.getNumSentences(length, maxSentences);
        const topSentences = scoredSentences.slice(0, numSentences);

        // Reorder sentences to maintain original flow
        const originalOrder = topSentences.sort((a, b) => 
            sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
        );

        return originalOrder.map(item => item.sentence).join(' ');
    }

    /**
     * Generate abstractive summary (create new sentences)
     */
    generateAbstractiveSummary(content, length, focus) {
        const keyPoints = this.extractKeyPoints(content, focus);
        const summaryLength = this.getSummaryWordTarget(length);
        
        // Generate coherent summary from key points
        let summary = '';
        
        if (focus) {
            summary = `Focusing on ${focus}: `;
        }

        if (keyPoints.mainTopic) {
            summary += `${keyPoints.mainTopic}. `;
        }

        if (keyPoints.keyFeatures.length > 0) {
            summary += `Key features include: ${keyPoints.keyFeatures.slice(0, 3).join(', ')}. `;
        }

        if (keyPoints.benefits.length > 0) {
            summary += `Main benefits are: ${keyPoints.benefits.slice(0, 2).join(' and ')}. `;
        }

        if (keyPoints.technicalDetails.length > 0 && length !== 'brief') {
            summary += `Technical aspects: ${keyPoints.technicalDetails.slice(0, 2).join(', ')}. `;
        }

        if (keyPoints.conclusion) {
            summary += keyPoints.conclusion;
        }

        return this.truncateToWordLimit(summary, summaryLength);
    }

    /**
     * Generate bullet point summary
     */
    generateBulletPointSummary(content, length) {
        const keyPoints = this.extractKeyPoints(content);
        const numPoints = length === 'brief' ? 3 : length === 'medium' ? 5 : 7;
        
        let bullets = [];
        
        if (keyPoints.mainTopic) {
            bullets.push(`• Overview: ${keyPoints.mainTopic}`);
        }

        keyPoints.keyFeatures.slice(0, Math.ceil(numPoints * 0.4)).forEach(feature => {
            bullets.push(`• ${feature}`);
        });

        keyPoints.benefits.slice(0, Math.ceil(numPoints * 0.3)).forEach(benefit => {
            bullets.push(`• Benefit: ${benefit}`);
        });

        if (length !== 'brief' && keyPoints.technicalDetails.length > 0) {
            keyPoints.technicalDetails.slice(0, Math.ceil(numPoints * 0.3)).forEach(detail => {
                bullets.push(`• Technical: ${detail}`);
            });
        }

        return bullets.slice(0, numPoints).join('\\n');
    }

    /**
     * Generate key insights summary
     */
    generateKeyInsights(content) {
        const insights = [];
        
        // Extract different types of insights
        const patterns = {
            principles: /principle[s]?:|core concept[s]?:|fundamental[s]?:/gi,
            bestPractices: /best practice[s]?:|guideline[s]?:|recommendation[s]?:/gi,
            benefits: /benefit[s]?:|advantage[s]?:|improvement[s]?:/gi,
            challenges: /challenge[s]?:|issue[s]?:|problem[s]?:|limitation[s]?:/gi,
            features: /feature[s]?:|capabilit(y|ies):|function[s]?:/gi
        };

        Object.entries(patterns).forEach(([type, pattern]) => {
            const matches = content.match(new RegExp(`${pattern.source}[^.!?]*[.!?]`, 'gi'));
            if (matches && matches.length > 0) {
                insights.push(`**${type.charAt(0).toUpperCase() + type.slice(1)}:** ${matches[0].replace(pattern, '').trim()}`);
            }
        });

        if (insights.length === 0) {
            // Fallback to general key points
            const keyPoints = this.extractKeyPoints(content);
            insights.push(`**Main Topic:** ${keyPoints.mainTopic}`);
            keyPoints.keyFeatures.slice(0, 2).forEach(feature => {
                insights.push(`**Key Point:** ${feature}`);
            });
        }

        return insights.join('\\n\\n');
    }

    /**
     * Generate executive summary
     */
    generateExecutiveSummary(content, focus) {
        const keyPoints = this.extractKeyPoints(content, focus);
        
        let execSummary = `**Executive Summary**\\n\\n`;
        
        if (keyPoints.mainTopic) {
            execSummary += `**Overview:** ${keyPoints.mainTopic}\\n\\n`;
        }

        if (keyPoints.keyFeatures.length > 0) {
            execSummary += `**Key Features:** ${keyPoints.keyFeatures.slice(0, 3).join(', ')}.\\n\\n`;
        }

        if (keyPoints.benefits.length > 0) {
            execSummary += `**Strategic Benefits:** ${keyPoints.benefits.slice(0, 2).join(' and ')}.\\n\\n`;
        }

        if (keyPoints.conclusion) {
            execSummary += `**Conclusion:** ${keyPoints.conclusion}`;
        }

        return execSummary;
    }

    /**
     * Score individual sentences for extractive summarization
     */
    scoreSentence(sentence, allSentences) {
        let score = 0;
        
        // Length factor (prefer medium-length sentences)
        const words = sentence.split(' ').length;
        if (words >= 10 && words <= 25) score += 10;
        
        // Position factor (earlier sentences often more important)
        const position = allSentences.indexOf(sentence);
        const positionScore = Math.max(0, 10 - (position / allSentences.length) * 10);
        score += positionScore;
        
        // Keyword density
        const importantWords = ['key', 'important', 'main', 'primary', 'core', 'fundamental', 'essential'];
        importantWords.forEach(word => {
            if (sentence.toLowerCase().includes(word)) score += 5;
        });
        
        // Numerical data (often important)
        if (/\\d+/.test(sentence)) score += 3;
        
        // Question or statement strength
        if (sentence.includes('?')) score += 2;
        if (sentence.includes(':')) score += 3;
        
        return score;
    }

    /**
     * Extract key points from content
     */
    extractKeyPoints(content, focus = null) {
        const keyPoints = {
            mainTopic: '',
            keyFeatures: [],
            benefits: [],
            technicalDetails: [],
            conclusion: ''
        };

        // Extract main topic (first substantial sentence)
        const sentences = this.extractSentences(content);
        if (sentences.length > 0) {
            keyPoints.mainTopic = sentences[0];
        }

        // Extract features (look for lists and feature descriptions)
        const featurePatterns = [
            /(?:feature[s]?|capabilit(?:y|ies)|function[s]?).*?:([^.!?]*)/gi,
            /^[•\\-\\*]\\s*([^\\n]+)/gm,
            /include[s]?:?\\s*([^.!?]*)/gi
        ];

        featurePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = match.replace(/^[•\\-\\*\\s:]+|feature[s]?|capabilit(y|ies)|function[s]?|include[s]?/gi, '').trim();
                    if (cleaned.length > 10 && cleaned.length < 100) {
                        keyPoints.keyFeatures.push(cleaned);
                    }
                });
            }
        });

        // Extract benefits
        const benefitPatterns = [
            /(?:benefit[s]?|advantage[s]?).*?:([^.!?]*)/gi,
            /(?:improve[s]?|enhance[s]?|optimize[s]?)([^.!?]*)/gi
        ];

        benefitPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = match.replace(/^[•\\-\\*\\s:]+|benefit[s]?|advantage[s]?/gi, '').trim();
                    if (cleaned.length > 10 && cleaned.length < 100) {
                        keyPoints.benefits.push(cleaned);
                    }
                });
            }
        });

        // Extract technical details (words with technical terms)
        const technicalTerms = ['API', 'HTTP', 'JSON', 'SQL', 'protocol', 'algorithm', 'architecture', 'implementation'];
        sentences.forEach(sentence => {
            technicalTerms.forEach(term => {
                if (sentence.includes(term) && sentence.length < 150) {
                    keyPoints.technicalDetails.push(sentence);
                }
            });
        });

        // Extract conclusion (last substantial sentence)
        if (sentences.length > 1) {
            keyPoints.conclusion = sentences[sentences.length - 1];
        }

        // Remove duplicates
        keyPoints.keyFeatures = [...new Set(keyPoints.keyFeatures)].slice(0, 5);
        keyPoints.benefits = [...new Set(keyPoints.benefits)].slice(0, 3);
        keyPoints.technicalDetails = [...new Set(keyPoints.technicalDetails)].slice(0, 3);

        return keyPoints;
    }

    /**
     * Extract keywords from content
     */
    extractKeywords(content) {
        // Remove common stop words
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
            'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their'
        ]);

        // Extract words and count frequency
        const words = content.toLowerCase()
            .replace(/[^\\w\\s]/g, ' ')
            .split(/\\s+/)
            .filter(word => word.length > 3 && !stopWords.has(word));

        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Return top keywords sorted by frequency
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }

    /**
     * Calculate summary metrics
     */
    calculateSummaryMetrics(originalContent, summary) {
        const originalSentences = this.extractSentences(originalContent).length;
        const summarySentences = this.extractSentences(summary).length;
        const originalWords = originalContent.split(/\\s+/).length;
        const summaryWords = summary.split(/\\s+/).length;

        return {
            originalSentences,
            summarySentences,
            originalWords,
            summaryWords,
            sentenceReduction: ((1 - summarySentences / originalSentences) * 100).toFixed(1) + '%',
            wordReduction: ((1 - summaryWords / originalWords) * 100).toFixed(1) + '%',
            compressionRatio: (originalWords / summaryWords).toFixed(1) + ':1'
        };
    }

    /**
     * Get number of sentences based on length setting
     */
    getNumSentences(length, maxSentences) {
        const limits = {
            brief: Math.min(3, maxSentences),
            medium: Math.min(5, maxSentences),
            detailed: Math.min(8, maxSentences)
        };
        return limits[length] || limits.medium;
    }

    /**
     * Get target word count based on length setting
     */
    getSummaryWordTarget(length) {
        const targets = {
            brief: 50,
            medium: 100,
            detailed: 200
        };
        return targets[length] || targets.medium;
    }

    /**
     * Truncate summary to word limit
     */
    truncateToWordLimit(text, wordLimit) {
        const words = text.split(' ');
        if (words.length <= wordLimit) {
            return text;
        }
        return words.slice(0, wordLimit).join(' ') + '...';
    }
}

module.exports = { SummarizeTool };