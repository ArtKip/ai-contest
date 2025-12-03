#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Setup Knowledge Base for Day 16 Citations Demo
 * 
 * Copies the knowledge base from Day 15 to ensure we have consistent
 * test data for citation and source reference demonstrations.
 */

async function setupKnowledgeBase() {
    console.log('📚 Setting up knowledge base for citations demo...');
    
    try {
        // Check if Day 15 knowledge base exists
        const day15DbPath = '../day15/rag_knowledge_base.db';
        const day15DocsPath = '../day15/rag-docs';
        
        await fs.access(day15DbPath);
        await fs.access(day15DocsPath);
        
        // Copy database
        console.log('💾 Copying knowledge base database...');
        await fs.copyFile(day15DbPath, './rag_knowledge_base.db');
        
        // Copy documents directory
        console.log('📄 Copying document collection...');
        await copyDirectory(day15DocsPath, './rag-docs');
        
        // Copy index backups if they exist
        const day15IndexPath = '../day15/index-backups';
        try {
            await fs.access(day15IndexPath);
            console.log('📋 Copying index backups...');
            await copyDirectory(day15IndexPath, './index-backups');
        } catch {
            console.log('📋 No index backups found, will create new ones');
        }
        
        console.log('✅ Knowledge base setup complete!');
        console.log('   Database: rag_knowledge_base.db');
        console.log('   Documents: ./rag-docs/');
        console.log('   Ready for citation demonstrations');
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('❌ Day 15 knowledge base not found!');
            console.error('   Please run Day 15 demo first: cd ../day15 && npm run demo');
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