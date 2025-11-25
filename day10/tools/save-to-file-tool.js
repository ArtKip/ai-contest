#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

/**
 * SaveToFile MCP Tool
 * 
 * Saves content to files with various formats and options.
 * Supports text, JSON, markdown, and other file types.
 */

class SaveToFileTool {
    constructor() {
        this.name = 'save_to_file';
        this.description = 'Save content to files with various formats and options';
        
        // Default output directory (can be changed)
        this.outputDir = path.join(process.cwd(), 'outputs');
        
        this.supportedFormats = ['txt', 'json', 'md', 'html', 'csv', 'log'];
        this.encodings = ['utf8', 'ascii', 'base64'];
        
        // Ensure output directory exists
        this.ensureOutputDirectory();
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
                        description: 'Content to save to file'
                    },
                    filename: {
                        type: 'string',
                        description: 'Name of the file (without path)'
                    },
                    format: {
                        type: 'string',
                        description: 'File format/extension',
                        enum: this.supportedFormats,
                        default: 'txt'
                    },
                    directory: {
                        type: 'string',
                        description: 'Output directory (relative to outputs folder)',
                        default: ''
                    },
                    overwrite: {
                        type: 'boolean',
                        description: 'Whether to overwrite existing files',
                        default: false
                    },
                    append: {
                        type: 'boolean',
                        description: 'Whether to append to existing file',
                        default: false
                    },
                    encoding: {
                        type: 'string',
                        description: 'File encoding',
                        enum: this.encodings,
                        default: 'utf8'
                    },
                    metadata: {
                        type: 'object',
                        description: 'Additional metadata to include',
                        properties: {
                            title: { type: 'string' },
                            description: { type: 'string' },
                            author: { type: 'string' },
                            tags: { type: 'array', items: { type: 'string' } },
                            createdBy: { type: 'string' }
                        }
                    },
                    formatOptions: {
                        type: 'object',
                        description: 'Format-specific options',
                        properties: {
                            jsonPretty: { type: 'boolean', description: 'Pretty-print JSON', default: true },
                            markdownToc: { type: 'boolean', description: 'Include table of contents for markdown', default: false },
                            htmlTemplate: { type: 'string', description: 'HTML template to use' },
                            csvDelimiter: { type: 'string', description: 'CSV delimiter', default: ',' }
                        }
                    }
                },
                required: ['content', 'filename']
            }
        };
    }

    /**
     * Execute the save to file tool
     */
    async execute(parameters) {
        try {
            console.log(`💾 SaveToFile executing with parameters:`, {
                filename: parameters.filename,
                format: parameters.format,
                contentLength: parameters.content?.length || 0,
                directory: parameters.directory
            });

            const {
                content,
                filename,
                format = 'txt',
                directory = '',
                overwrite = false,
                append = false,
                encoding = 'utf8',
                metadata = {},
                formatOptions = {}
            } = parameters;

            if (!content) {
                throw new Error('Content is required');
            }

            if (!filename || filename.trim() === '') {
                throw new Error('Filename is required');
            }

            // Sanitize filename
            const sanitizedFilename = this.sanitizeFilename(filename, format);
            
            // Determine full file path
            const targetDir = directory ? path.join(this.outputDir, directory) : this.outputDir;
            const filePath = path.join(targetDir, sanitizedFilename);

            // Ensure target directory exists
            await fs.ensureDir(targetDir);

            // Check if file exists
            const fileExists = await fs.pathExists(filePath);
            
            if (fileExists && !overwrite && !append) {
                throw new Error(`File already exists: ${sanitizedFilename}. Use overwrite or append option.`);
            }

            // Format content based on file type
            const formattedContent = await this.formatContent(
                content, 
                format, 
                metadata, 
                formatOptions, 
                sanitizedFilename
            );

            // Write file
            let writeOptions = { encoding };
            
            if (append && fileExists) {
                // Append to existing file
                await fs.appendFile(filePath, '\\n' + formattedContent, writeOptions);
            } else {
                // Write new file or overwrite
                await fs.writeFile(filePath, formattedContent, writeOptions);
            }

            // Get file stats
            const stats = await fs.stat(filePath);
            
            // Create result
            const result = {
                success: true,
                filename: sanitizedFilename,
                filePath: path.relative(process.cwd(), filePath),
                absolutePath: filePath,
                format: format,
                directory: directory || 'outputs',
                fileSize: stats.size,
                encoding: encoding,
                operation: fileExists ? (append ? 'appended' : 'overwritten') : 'created',
                contentLength: content.length,
                formattedLength: formattedContent.length,
                metadata: metadata,
                createdAt: new Date().toISOString(),
                lastModified: stats.mtime.toISOString(),
                checksum: this.calculateChecksum(formattedContent)
            };

            // Also save metadata file if metadata provided
            if (Object.keys(metadata).length > 0) {
                await this.saveMetadataFile(filePath, result, metadata);
            }

            console.log(`✅ File saved successfully: ${sanitizedFilename}`);
            return result;

        } catch (error) {
            console.error('SaveToFile execution error:', error);
            return {
                success: false,
                error: error.message,
                filename: parameters.filename || 'unknown',
                executedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Ensure output directory exists
     */
    async ensureOutputDirectory() {
        try {
            await fs.ensureDir(this.outputDir);
            console.log(`📁 Output directory ready: ${this.outputDir}`);
        } catch (error) {
            console.warn('Failed to create output directory:', error.message);
        }
    }

    /**
     * Sanitize filename to be filesystem-safe
     */
    sanitizeFilename(filename, format) {
        // Remove or replace invalid characters
        let sanitized = filename
            .replace(/[<>:"/\\\\|?*]/g, '_')  // Replace invalid chars
            .replace(/\\s+/g, '_')           // Replace spaces with underscores
            .replace(/\\.+/g, '.')           // Replace multiple dots with single dot
            .trim();

        // Remove leading/trailing dots and underscores
        sanitized = sanitized.replace(/^[._]+|[._]+$/g, '');

        // Ensure it has the correct extension
        const ext = `.${format}`;
        if (!sanitized.toLowerCase().endsWith(ext)) {
            sanitized = sanitized + ext;
        }

        // Ensure not empty
        if (sanitized === ext) {
            sanitized = `file_${Date.now()}${ext}`;
        }

        return sanitized;
    }

    /**
     * Format content based on file type
     */
    async formatContent(content, format, metadata, formatOptions, filename) {
        switch (format.toLowerCase()) {
            case 'json':
                return this.formatJSON(content, formatOptions, metadata);
            
            case 'md':
            case 'markdown':
                return this.formatMarkdown(content, formatOptions, metadata, filename);
            
            case 'html':
                return this.formatHTML(content, formatOptions, metadata, filename);
            
            case 'csv':
                return this.formatCSV(content, formatOptions);
            
            case 'log':
                return this.formatLog(content, metadata);
            
            case 'txt':
            default:
                return this.formatText(content, metadata);
        }
    }

    /**
     * Format as JSON
     */
    formatJSON(content, formatOptions, metadata) {
        let jsonData;
        
        try {
            // Try to parse content as JSON first
            jsonData = JSON.parse(content);
        } catch {
            // If not valid JSON, wrap content with metadata
            jsonData = {
                content: content,
                metadata: metadata,
                generatedAt: new Date().toISOString()
            };
        }

        // Add metadata if provided
        if (Object.keys(metadata).length > 0) {
            jsonData._metadata = metadata;
        }

        // Pretty print or compact
        return formatOptions.jsonPretty !== false 
            ? JSON.stringify(jsonData, null, 2)
            : JSON.stringify(jsonData);
    }

    /**
     * Format as Markdown
     */
    formatMarkdown(content, formatOptions, metadata, filename) {
        let md = '';

        // Add title if provided in metadata
        if (metadata.title) {
            md += `# ${metadata.title}\\n\\n`;
        } else {
            md += `# ${filename.replace(/\\.md$/i, '')}\\n\\n`;
        }

        // Add metadata section
        if (Object.keys(metadata).length > 0) {
            md += '## Metadata\\n\\n';
            Object.entries(metadata).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    md += `- **${key}**: ${value.join(', ')}\\n`;
                } else {
                    md += `- **${key}**: ${value}\\n`;
                }
            });
            md += '\\n';
        }

        // Add table of contents if requested
        if (formatOptions.markdownToc) {
            const headings = content.match(/^#{1,6}\\s+.+$/gm);
            if (headings && headings.length > 0) {
                md += '## Table of Contents\\n\\n';
                headings.forEach(heading => {
                    const level = heading.match(/^#+/)[0].length;
                    const text = heading.replace(/^#+\\s+/, '');
                    const link = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    md += `${'  '.repeat(level - 1)}- [${text}](#${link})\\n`;
                });
                md += '\\n';
            }
        }

        // Add main content
        md += '## Content\\n\\n';
        md += content;

        // Add generation footer
        md += `\\n\\n---\\n\\n*Generated on ${new Date().toISOString()}*\\n`;

        return md;
    }

    /**
     * Format as HTML
     */
    formatHTML(content, formatOptions, metadata, filename) {
        const title = metadata.title || filename.replace(/\\.html$/i, '');
        const description = metadata.description || '';
        
        let html = '';
        
        if (formatOptions.htmlTemplate === 'full') {
            html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${description ? `<meta name="description" content="${description}">` : ''}
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>${title}</h1>
`;

            if (Object.keys(metadata).length > 0) {
                html += '    <div class="metadata">\\n';
                html += '        <h3>Metadata</h3>\\n';
                Object.entries(metadata).forEach(([key, value]) => {
                    html += `        <p><strong>${key}:</strong> ${Array.isArray(value) ? value.join(', ') : value}</p>\\n`;
                });
                html += '    </div>\\n';
            }

            html += `    <div class="content">\\n        ${content.replace(/\\n/g, '<br>\\n        ')}\\n    </div>\\n`;
            html += `    <div class="footer">Generated on ${new Date().toISOString()}</div>\\n`;
            html += '</body>\\n</html>';
        } else {
            // Simple HTML fragment
            html = `<div class="generated-content">\\n`;
            html += `    <h2>${title}</h2>\\n`;
            html += `    <div class="content">${content.replace(/\\n/g, '<br>')}</div>\\n`;
            html += `</div>`;
        }

        return html;
    }

    /**
     * Format as CSV (simple implementation)
     */
    formatCSV(content, formatOptions) {
        const delimiter = formatOptions.csvDelimiter || ',';
        
        // If content is already CSV-like, return as-is
        if (content.includes(delimiter)) {
            return content;
        }

        // Convert simple content to CSV
        const lines = content.split('\\n').filter(line => line.trim());
        return lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\\n');
    }

    /**
     * Format as log file
     */
    formatLog(content, metadata) {
        const timestamp = new Date().toISOString();
        const source = metadata.createdBy || metadata.author || 'MCP-SaveToFile';
        
        let logContent = `[${timestamp}] [${source}] `;
        
        // Add content with proper line prefixes
        const lines = content.split('\\n');
        logContent += lines[0] + '\\n';
        
        if (lines.length > 1) {
            lines.slice(1).forEach(line => {
                logContent += `[${timestamp}] [${source}] ${line}\\n`;
            });
        }

        return logContent;
    }

    /**
     * Format as plain text
     */
    formatText(content, metadata) {
        let textContent = '';

        // Add header with metadata if provided
        if (Object.keys(metadata).length > 0) {
            textContent += '='.repeat(50) + '\\n';
            Object.entries(metadata).forEach(([key, value]) => {
                textContent += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\\n`;
            });
            textContent += '='.repeat(50) + '\\n\\n';
        }

        textContent += content;
        
        textContent += `\\n\\n--- Generated on ${new Date().toISOString()} ---`;

        return textContent;
    }

    /**
     * Save metadata file alongside main file
     */
    async saveMetadataFile(originalFilePath, result, metadata) {
        try {
            const metadataPath = originalFilePath.replace(/\.[^.]*$/, '.meta.json');
            const metadataContent = {
                file: result,
                metadata: metadata,
                generatedAt: new Date().toISOString()
            };
            
            await fs.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2));
            console.log(`📄 Metadata file saved: ${path.basename(metadataPath)}`);
        } catch (error) {
            console.warn('Failed to save metadata file:', error.message);
        }
    }

    /**
     * Calculate simple checksum for content verification
     */
    calculateChecksum(content) {
        // Simple hash function for verification
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * List files in output directory
     */
    async listOutputFiles(directory = '') {
        try {
            const targetDir = directory ? path.join(this.outputDir, directory) : this.outputDir;
            const files = await fs.readdir(targetDir);
            
            const fileDetails = await Promise.all(
                files.map(async (filename) => {
                    const filePath = path.join(targetDir, filename);
                    const stats = await fs.stat(filePath);
                    return {
                        filename,
                        path: path.relative(this.outputDir, filePath),
                        size: stats.size,
                        modified: stats.mtime.toISOString(),
                        isDirectory: stats.isDirectory()
                    };
                })
            );

            return {
                success: true,
                directory: directory || 'outputs',
                files: fileDetails.filter(f => !f.isDirectory),
                directories: fileDetails.filter(f => f.isDirectory),
                totalFiles: fileDetails.filter(f => !f.isDirectory).length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                directory: directory || 'outputs'
            };
        }
    }

    /**
     * Get output directory path
     */
    getOutputDirectory() {
        return this.outputDir;
    }

    /**
     * Set output directory path
     */
    setOutputDirectory(newPath) {
        this.outputDir = path.resolve(newPath);
        this.ensureOutputDirectory();
    }
}

module.exports = { SaveToFileTool };