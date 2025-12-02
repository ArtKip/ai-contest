#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Setup Knowledge Base for Day 15 Reranking Demo
 * 
 * Copies the knowledge base from Day 14 to avoid rebuilding
 * and ensures we have the same test data for comparison.
 */

async function setupKnowledgeBase() {
    console.log('📚 Setting up knowledge base for reranking demo...');
    
    try {
        // Check if Day 14 knowledge base exists
        const day14DbPath = '../day14/rag_knowledge_base.db';
        const day14DocsPath = '../day14/rag-docs';
        
        await fs.access(day14DbPath);
        await fs.access(day14DocsPath);
        
        // Copy database
        console.log('💾 Copying knowledge base database...');
        await fs.copyFile(day14DbPath, './rag_knowledge_base.db');
        
        // Copy documents directory
        console.log('📄 Copying document collection...');
        await copyDirectory(day14DocsPath, './rag-docs');
        
        // Copy index backups if they exist
        const day14IndexPath = '../day14/index-backups';
        try {
            await fs.access(day14IndexPath);
            console.log('📋 Copying index backups...');
            await copyDirectory(day14IndexPath, './index-backups');
        } catch {
            console.log('📋 No index backups found, will create new ones');
        }
        
        console.log('✅ Knowledge base setup complete!');
        console.log('   Database: rag_knowledge_base.db');
        console.log('   Documents: ./rag-docs/');
        console.log('   Ready for reranking demonstrations');
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('❌ Day 14 knowledge base not found!');
            console.error('   Please run Day 14 demo first: cd ../day14 && npm run demo');
            console.error('   Then retry this setup.');
        } else {
            console.error('❌ Setup failed:', error.message);
        }
        process.exit(1);
    }
}

async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

// Run if called directly
if (require.main === module) {
    setupKnowledgeBase().catch(console.error);
}

module.exports = { setupKnowledgeBase };