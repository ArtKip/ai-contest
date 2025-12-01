#!/usr/bin/env node

/**
 * Document Chunker - Intelligent Text Splitting for Document Indexing
 * 
 * Implements smart text chunking strategies that preserve semantic meaning
 * while creating optimal chunks for embedding generation and retrieval.
 */

class DocumentChunker {
    constructor(options = {}) {
        this.defaultChunkSize = options.chunkSize || 500;
        this.defaultOverlap = options.overlap || 50;
        this.preserveStructure = options.preserveStructure !== false;
        this.minChunkSize = options.minChunkSize || 100;
        this.maxChunkSize = options.maxChunkSize || 1000;
        
        // Delimiters for different content types
        this.delimiters = {
            paragraph: /\n\s*\n/g,
            sentence: /[.!?]+\s+/g,
            clause: /[,;:]\s+/g,
            word: /\s+/g
        };
        
        this.structuralMarkers = {
            markdown: {
                header: /^#{1,6}\s+/gm,
                codeBlock: /```[\s\S]*?```/g,
                list: /^\s*[-*+]\s+/gm,
                numberedList: /^\s*\d+\.\s+/gm
            },
            code: {
                function: /(?:function|def|class|interface|struct)\s+\w+/g,
                comment: /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
                block: /\{[\s\S]*?\}/g
            }
        };
        
        console.log(`📄 DocumentChunker initialized with ${this.defaultChunkSize} char chunks`);
    }

    /**
     * Split document into chunks with smart boundary detection
     */
    async chunkDocument(content, options = {}) {
        const chunkSize = options.chunkSize || this.defaultChunkSize;
        const overlap = options.overlap || this.defaultOverlap;
        const preserveStructure = options.preserveStructure !== false;
        const contentType = options.contentType || this.detectContentType(content);

        console.log(`📝 Chunking document: ${content.length} chars → ${chunkSize} char chunks`);

        // Preprocess content
        const processedContent = this.preprocessContent(content, contentType);
        
        // Choose chunking strategy based on content type
        let chunks;
        switch (contentType) {
            case 'markdown':
                chunks = this.chunkMarkdown(processedContent, chunkSize, overlap);
                break;
            case 'code':
                chunks = this.chunkCode(processedContent, chunkSize, overlap);
                break;
            case 'text':
            default:
                chunks = this.chunkText(processedContent, chunkSize, overlap);
                break;
        }

        // Post-process chunks
        const finalChunks = this.postProcessChunks(chunks, content, contentType);
        
        console.log(`✅ Created ${finalChunks.length} chunks from document`);
        return finalChunks;
    }

    detectContentType(content) {
        // Markdown indicators
        if (content.includes('# ') || content.includes('## ') || 
            content.includes('```') || content.includes('[](')) {
            return 'markdown';
        }
        
        // Code indicators
        if (content.includes('function ') || content.includes('def ') ||
            content.includes('class ') || content.includes('import ') ||
            /\{[\s\S]*?\}/.test(content)) {
            return 'code';
        }
        
        return 'text';
    }

    preprocessContent(content, contentType) {
        // Clean up content while preserving structure
        let processed = content;
        
        // Normalize line endings
        processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Remove excessive whitespace while preserving intentional formatting
        processed = processed.replace(/\n{3,}/g, '\n\n');
        
        // Handle different content types
        if (contentType === 'markdown') {
            // Preserve markdown structure markers
            processed = this.preserveMarkdownStructure(processed);
        } else if (contentType === 'code') {
            // Preserve code structure
            processed = this.preserveCodeStructure(processed);
        }
        
        return processed.trim();
    }

    preserveMarkdownStructure(content) {
        // Add markers to preserve important structural elements
        let processed = content;
        
        // Mark headers with special indicators
        processed = processed.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
            return `\n[HEADER_${hashes.length}]${title}[/HEADER_${hashes.length}]\n`;
        });
        
        // Mark code blocks
        processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `\n[CODEBLOCK_${lang || 'text'}]${code.trim()}[/CODEBLOCK]\n`;
        });
        
        return processed;
    }

    preserveCodeStructure(content) {
        // Add markers for code structure
        let processed = content;
        
        // Mark function definitions
        processed = processed.replace(
            /((?:function|def|class|interface|struct)\s+\w+.*?(?:\{|:))/g,
            '\n[FUNCTION_DEF]$1[/FUNCTION_DEF]\n'
        );
        
        return processed;
    }

    chunkMarkdown(content, chunkSize, overlap) {
        const chunks = [];
        
        // First, try to split by major sections (headers)
        const sections = this.splitByHeaders(content);
        
        for (const section of sections) {
            if (section.content.length <= chunkSize) {
                // Section fits in one chunk
                chunks.push({
                    content: section.content,
                    type: 'section',
                    metadata: { header: section.header, level: section.level }
                });
            } else {
                // Section needs to be split further
                const subChunks = this.splitLargeSection(section, chunkSize, overlap);
                chunks.push(...subChunks);
            }
        }
        
        return chunks;
    }

    splitByHeaders(content) {
        const sections = [];
        const lines = content.split('\n');
        let currentSection = { header: null, level: 0, content: '', startLine: 0 };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headerMatch = line.match(/^\[HEADER_(\d+)\](.+?)\[\/HEADER_\d+\]$/);
            
            if (headerMatch) {
                // Save previous section if it has content
                if (currentSection.content.trim()) {
                    sections.push({ ...currentSection });
                }
                
                // Start new section
                currentSection = {
                    header: headerMatch[2].trim(),
                    level: parseInt(headerMatch[1]),
                    content: line + '\n',
                    startLine: i
                };
            } else {
                currentSection.content += line + '\n';
            }
        }
        
        // Add the last section
        if (currentSection.content.trim()) {
            sections.push(currentSection);
        }
        
        return sections;
    }

    splitLargeSection(section, chunkSize, overlap) {
        const chunks = [];
        const content = section.content;
        
        // Try splitting by paragraphs first
        const paragraphs = content.split(/\n\s*\n/);
        let currentChunk = '';
        
        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length <= chunkSize) {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            } else {
                // Save current chunk if it has content
                if (currentChunk.trim()) {
                    chunks.push({
                        content: currentChunk.trim(),
                        type: 'partial_section',
                        metadata: { 
                            header: section.header, 
                            level: section.level,
                            partIndex: chunks.length
                        }
                    });
                }
                
                // Start new chunk
                if (paragraph.length <= chunkSize) {
                    currentChunk = paragraph;
                } else {
                    // Paragraph is too long, split it by sentences
                    const sentenceChunks = this.splitBySentences(paragraph, chunkSize, overlap);
                    chunks.push(...sentenceChunks.map(chunk => ({
                        ...chunk,
                        metadata: { 
                            header: section.header, 
                            level: section.level,
                            partIndex: chunks.length + sentenceChunks.indexOf(chunk)
                        }
                    })));
                    currentChunk = '';
                }
            }
        }
        
        // Add remaining content
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                type: 'partial_section',
                metadata: { 
                    header: section.header, 
                    level: section.level,
                    partIndex: chunks.length
                }
            });
        }
        
        return chunks;
    }

    chunkCode(content, chunkSize, overlap) {
        const chunks = [];
        const lines = content.split('\n');
        
        let currentChunk = '';
        let currentFunction = null;
        let braceDepth = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Track function boundaries
            if (line.includes('[FUNCTION_DEF]')) {
                currentFunction = line.match(/\[FUNCTION_DEF\](.+?)\[\/FUNCTION_DEF\]/)?.[1];
            }
            
            // Track brace depth for logical boundaries
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;
            
            if ((currentChunk + line + '\n').length <= chunkSize) {
                currentChunk += line + '\n';
            } else {
                // Try to find a logical break point
                if (braceDepth === 0 && currentChunk.trim()) {
                    chunks.push({
                        content: currentChunk.trim(),
                        type: 'code_block',
                        metadata: { 
                            function: currentFunction,
                            language: this.detectCodeLanguage(currentChunk)
                        }
                    });
                    currentChunk = line + '\n';
                } else {
                    // Force split if no logical boundary found
                    currentChunk += line + '\n';
                    if (currentChunk.length > this.maxChunkSize) {
                        chunks.push({
                            content: currentChunk.trim(),
                            type: 'code_block_forced',
                            metadata: { 
                                function: currentFunction,
                                language: this.detectCodeLanguage(currentChunk)
                            }
                        });
                        currentChunk = '';
                    }
                }
            }
        }
        
        // Add remaining content
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                type: 'code_block',
                metadata: { 
                    function: currentFunction,
                    language: this.detectCodeLanguage(currentChunk)
                }
            });
        }
        
        return chunks;
    }

    detectCodeLanguage(code) {
        if (code.includes('function ') || code.includes('const ') || code.includes('let ')) return 'javascript';
        if (code.includes('def ') || code.includes('import ') || code.includes('class ')) return 'python';
        if (code.includes('public class') || code.includes('private ')) return 'java';
        if (code.includes('#include') || code.includes('int main')) return 'cpp';
        return 'unknown';
    }

    chunkText(content, chunkSize, overlap) {
        const chunks = [];
        
        // Split by paragraphs first
        const paragraphs = content.split(/\n\s*\n/);
        let currentChunk = '';
        
        for (const paragraph of paragraphs) {
            if ((currentChunk + paragraph).length <= chunkSize) {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            } else {
                // Save current chunk
                if (currentChunk.trim()) {
                    chunks.push({
                        content: currentChunk.trim(),
                        type: 'text_block',
                        metadata: { paragraphCount: currentChunk.split('\n\n').length }
                    });
                }
                
                // Handle long paragraphs
                if (paragraph.length > chunkSize) {
                    const sentenceChunks = this.splitBySentences(paragraph, chunkSize, overlap);
                    chunks.push(...sentenceChunks);
                    currentChunk = '';
                } else {
                    currentChunk = paragraph;
                }
            }
        }
        
        // Add remaining content
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                type: 'text_block',
                metadata: { paragraphCount: currentChunk.split('\n\n').length }
            });
        }
        
        return this.addOverlap(chunks, overlap);
    }

    splitBySentences(text, chunkSize, overlap) {
        const sentences = text.split(/[.!?]+\s+/);
        const chunks = [];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            const fullSentence = sentence.trim() + '. ';
            
            if ((currentChunk + fullSentence).length <= chunkSize) {
                currentChunk += fullSentence;
            } else {
                if (currentChunk.trim()) {
                    chunks.push({
                        content: currentChunk.trim(),
                        type: 'sentence_group',
                        metadata: { sentenceCount: currentChunk.split(/[.!?]+/).length - 1 }
                    });
                }
                
                if (fullSentence.length > chunkSize) {
                    // Split very long sentences by words
                    const wordChunks = this.splitByWords(fullSentence, chunkSize);
                    chunks.push(...wordChunks);
                    currentChunk = '';
                } else {
                    currentChunk = fullSentence;
                }
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                type: 'sentence_group',
                metadata: { sentenceCount: currentChunk.split(/[.!?]+/).length - 1 }
            });
        }
        
        return chunks;
    }

    splitByWords(text, chunkSize) {
        const words = text.split(/\s+/);
        const chunks = [];
        let currentChunk = '';
        
        for (const word of words) {
            if ((currentChunk + word + ' ').length <= chunkSize) {
                currentChunk += word + ' ';
            } else {
                if (currentChunk.trim()) {
                    chunks.push({
                        content: currentChunk.trim(),
                        type: 'word_group',
                        metadata: { wordCount: currentChunk.split(/\s+/).length }
                    });
                }
                currentChunk = word + ' ';
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                type: 'word_group',
                metadata: { wordCount: currentChunk.split(/\s+/).length }
            });
        }
        
        return chunks;
    }

    addOverlap(chunks, overlapSize) {
        if (chunks.length <= 1 || overlapSize <= 0) return chunks;
        
        const chunksWithOverlap = [chunks[0]];
        
        for (let i = 1; i < chunks.length; i++) {
            const prevChunk = chunks[i - 1];
            const currentChunk = chunks[i];
            
            // Get overlap from previous chunk
            const prevWords = prevChunk.content.split(/\s+/);
            const overlapWords = prevWords.slice(-Math.min(overlapSize, prevWords.length));
            const overlapText = overlapWords.join(' ');
            
            // Add overlap to current chunk
            const enhancedChunk = {
                ...currentChunk,
                content: overlapText + ' ' + currentChunk.content,
                metadata: {
                    ...currentChunk.metadata,
                    hasOverlap: true,
                    overlapWords: overlapWords.length
                }
            };
            
            chunksWithOverlap.push(enhancedChunk);
        }
        
        return chunksWithOverlap;
    }

    postProcessChunks(chunks, originalContent, contentType) {
        return chunks.map((chunk, index) => {
            // Clean up structural markers
            let cleanContent = chunk.content;
            cleanContent = cleanContent.replace(/\[HEADER_\d+\](.+?)\[\/HEADER_\d+\]/g, '$1');
            cleanContent = cleanContent.replace(/\[CODEBLOCK_\w*\](.+?)\[\/CODEBLOCK\]/g, '$1');
            cleanContent = cleanContent.replace(/\[FUNCTION_DEF\](.+?)\[\/FUNCTION_DEF\]/g, '$1');
            
            return {
                id: this.generateChunkId(index, cleanContent),
                content: cleanContent.trim(),
                type: chunk.type,
                metadata: {
                    ...chunk.metadata,
                    contentType,
                    chunkIndex: index,
                    length: cleanContent.length,
                    wordCount: cleanContent.split(/\s+/).length,
                    createdAt: new Date().toISOString()
                }
            };
        }).filter(chunk => chunk.content.length >= this.minChunkSize);
    }

    generateChunkId(index, content) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5')
            .update(`${index}-${content.substring(0, 100)}`)
            .digest('hex');
        return `chunk_${hash.substring(0, 12)}`;
    }

    /**
     * Get chunking statistics
     */
    getChunkingStats(chunks) {
        const stats = {
            totalChunks: chunks.length,
            averageLength: 0,
            averageWordCount: 0,
            typeDistribution: {},
            sizeDistribution: { small: 0, medium: 0, large: 0 }
        };

        if (chunks.length === 0) return stats;

        let totalLength = 0;
        let totalWords = 0;

        chunks.forEach(chunk => {
            totalLength += chunk.content.length;
            totalWords += chunk.metadata.wordCount;
            
            // Type distribution
            stats.typeDistribution[chunk.type] = (stats.typeDistribution[chunk.type] || 0) + 1;
            
            // Size distribution
            if (chunk.content.length < 300) stats.sizeDistribution.small++;
            else if (chunk.content.length < 700) stats.sizeDistribution.medium++;
            else stats.sizeDistribution.large++;
        });

        stats.averageLength = Math.round(totalLength / chunks.length);
        stats.averageWordCount = Math.round(totalWords / chunks.length);

        return stats;
    }
}

module.exports = { DocumentChunker };