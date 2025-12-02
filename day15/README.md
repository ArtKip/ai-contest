# Day 15: RAG Reranking & Filtering

## Overview

Enhances the RAG pipeline from Day 14 with a second-stage filtering and reranking system to improve answer quality by removing irrelevant chunks and reordering results by relevance.

## Problem Solved

Day 14 showed that basic TF-IDF retrieval has a 75% failure rate, often retrieving irrelevant content. This project adds:

1. **Similarity Threshold Filtering** - Drop chunks below relevance cutoff
2. **Semantic Reranking** - Reorder chunks by query-context relevance  
3. **Adaptive Thresholding** - Tune cutoffs for optimal performance

## Architecture

```
Query → Initial Retrieval → Filtering → Reranking → Context → LLM → Answer
        (TF-IDF)         (Threshold) (Cross-Encoder) (Merged)
```

## Key Features

### 🎯 **Three Pipeline Modes:**
- **No Filtering**: Basic RAG (Day 14 baseline)
- **Threshold Filtering**: Remove low-similarity chunks
- **Smart Reranking**: Reorder by semantic relevance

### 📊 **Threshold Tuning:**
- Automatic optimization of similarity cutoffs
- Performance metrics across different thresholds
- Quality vs quantity trade-offs

### 🔄 **Comparison System:**
- Side-by-side results from all three approaches
- Quality scoring and analysis
- Clear demonstration of improvements

## Usage

### Quick Demo
```bash
npm run demo
```

### Compare All Approaches
```bash
npm run compare
```

### Tune Optimal Thresholds
```bash
npm run tune
```

## Actual Results

Testing on 6 questions from Day 14 dataset:
- **Baseline (No Filtering)**: 33% success rate (2/6 questions)
- **Threshold Filtering**: 33% success rate (2/6 questions) 
- **Semantic Reranking**: 33% success rate (2/6 questions)

### Key Findings:
- **Filtering effectiveness limited by TF-IDF embedding quality**
- **All approaches found same successful answers** (vacation days, DataVault ARR)
- **Failed on same questions** due to poor initial retrieval
- **Reranking provides better relevance scoring** but can't fix missing documents
- **Threshold tuning shows optimal cutoff at 0.4** for precision/recall balance

## Components

- `reranked-rag.js` - Main RAG system with filtering/reranking
- `threshold-tuning.js` - Automatic threshold optimization
- `comparison-demo.js` - Side-by-side approach comparison
- `test-filtering.js` - Quality assessment suite
- `setup-knowledge-base.js` - Knowledge base initialization

## Technical Implementation

### Filtering Strategies
1. **Hard Threshold**: Drop chunks below X similarity
2. **Top-K Filtering**: Keep only N best chunks
3. **Dynamic Threshold**: Adjust based on query type

### Reranking Methods
1. **Cross-Encoder Simulation**: Query-context relevance scoring
2. **Semantic Distance**: Enhanced similarity calculations
3. **Hybrid Scoring**: Combine multiple relevance signals

### Quality Metrics
- Relevance accuracy (relevant chunks retrieved)
- Answer completeness (all facts found)
- Noise reduction (irrelevant chunks filtered)
- Response time impact

## Conclusions

### What We Learned:
1. **Post-retrieval filtering can't fix poor initial retrieval**
2. **TF-IDF embeddings are the bottleneck** - filtering quality is limited by what's initially found
3. **Threshold tuning provides systematic optimization** but gains are marginal with weak embeddings
4. **Semantic reranking adds quality scoring** even when overall success rate stays the same
5. **Need semantic embeddings** (OpenAI, BERT) for major RAG improvements

### Value Delivered:
- **Framework for filtering and reranking** ready for better embeddings
- **Comprehensive threshold tuning system** to optimize any similarity cutoffs
- **Quality metrics and analysis** to track filtering effectiveness
- **Demonstrates why embedding choice is critical** for RAG success

This system provides the infrastructure for dramatic improvements when upgraded to semantic embeddings, potentially increasing success rate from 33% to 80%+.