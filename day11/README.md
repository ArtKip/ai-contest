# Day 11 - External Memory for Conversations

## Overview

An intelligent agent with long-term memory that persists conversations and intermediate results across restarts. The system supports both SQLite database and JSON file storage, allowing agents to build upon previous interactions and maintain context over time.

## Features

- **Dual Storage**: SQLite database for robust queries + JSON files for portability
- **Conversation Persistence**: Full conversation history with metadata
- **Context Retrieval**: Smart context loading based on similarity and recency
- **Memory Search**: Find relevant past conversations and insights
- **Cross-Session Continuity**: Agents remember previous interactions
- **Intermediate Results**: Save and retrieve partial computation results

## Architecture

```
Memory System
├── SQLite Database
│   ├── conversations (id, session_id, timestamp, user_input, agent_response, metadata)
│   ├── sessions (session_id, start_time, end_time, summary, tags)
│   └── memories (id, type, content, context, relevance_score, created_at)
├── JSON Backups
│   ├── conversations.json
│   ├── sessions.json
│   └── memories.json
└── Agent Interface
    ├── Memory Storage
    ├── Context Retrieval
    └── Similarity Search
```

## Quick Start

```bash
# Install dependencies
npm install

# Start the memory-enabled agent
node memory-agent.js

# Test with web interface
node start-demo.js
```

## Memory Schema

### Conversations Table
- `id`: Unique conversation identifier
- `session_id`: Groups related conversations
- `timestamp`: When the conversation occurred
- `user_input`: User's message
- `agent_response`: Agent's response
- `metadata`: JSON with context, sentiment, topics
- `tokens_used`: Token count for cost tracking

### Sessions Table
- `session_id`: Unique session identifier
- `start_time`: Session start timestamp
- `end_time`: Session end timestamp
- `summary`: AI-generated session summary
- `tags`: Comma-separated topic tags
- `total_interactions`: Count of conversations in session

### Memories Table
- `id`: Unique memory identifier
- `type`: Memory type (fact, preference, instruction, result)
- `content`: The actual memory content
- `context`: Related context and conditions
- `relevance_score`: How important this memory is (0.0-1.0)
- `created_at`: When memory was created
- `last_accessed`: Last time memory was retrieved