# AI Agent Contest

A progressive AI agent implementation showcasing different capabilities across multiple days.

## Project Structure

- **day1/**: Basic AI agent with simple HTTP API and Claude integration
- **day2/**: Enhanced agent with structured JSON responses and rich metadata
- **day3/**: Tool integration and function calling capabilities
- **day4/**: Streaming responses with real-time updates
- **day5/**: Conversation context and memory management
- **day6/**: Multi-agent collaboration with validation pipeline
- **day7/**: Dialogue compression for efficient token usage

## Day-by-Day Progress

### Day 1: Basic AI Agent ✅
**Goal**: "The agent correctly accepts user input, makes a call to the selected model/tool, and returns the response."

- ✅ HTTP API with `/api/ask` endpoint
- ✅ Web interface for chat interaction
- ✅ Anthropic Claude API integration
- ✅ Error handling and retry logic

[View Day 1 Implementation →](./day1/)

### Day 2: Structured Response Formatting ✅
**Goal**: "The response from the LLM can be correctly parsed by your application."

- ✅ Structured JSON response format with metadata
- ✅ Confidence levels (high/medium/low)
- ✅ Response types (factual/opinion/creative/unknown)
- ✅ Source attribution and follow-up suggestions
- ✅ Rich web interface with interactive elements

[View Day 2 Implementation →](./day2/)

### Day 7: Dialogue Compression ✅
**Goal**: "The agent works with compressed history and can still perform the same tasks while using fewer tokens."

- ✅ Automatic conversation history compression
- ✅ Configurable compression threshold (every N messages)
- ✅ Intelligent summarization that preserves context
- ✅ Token usage tracking and comparison
- ✅ Real-time analytics dashboard
- ✅ Toggle between compressed and full history modes
- ✅ Compression event logging
- ✅ Side-by-side comparison metrics

[View Day 7 Implementation →](./day7/)

## Quick Start

Choose which implementation to run:

### Run Day 1 (Basic Agent)
```bash
cd day1
npm install
export ANTHROPIC_API_KEY="your_key_here"
npm start
# Visit http://localhost:3000
```

### Run Day 2 (Structured Responses)
```bash
cd day2
npm install
export ANTHROPIC_API_KEY="your_key_here"
npm start
# Visit http://localhost:3000
```

### Run Day 7 (Dialogue Compression)
```bash
cd day7
npm install
export ANTHROPIC_API_KEY="your_key_here"
npm start
# Visit http://localhost:3007

# Run automated tests
npm test

# Run comparison demo
npm run demo
```

## Key Features Comparison

| Feature | Day 1 | Day 2 |
|---------|-------|-------|
| Basic HTTP API | ✅ | ✅ |
| Web Interface | ✅ | ✅ Enhanced |
| Claude API Integration | ✅ | ✅ |
| Structured Responses | ❌ | ✅ JSON Format |
| Confidence Levels | ❌ | ✅ High/Medium/Low |
| Response Types | ❌ | ✅ Factual/Opinion/Creative |
| Source Attribution | ❌ | ✅ |
| Follow-up Suggestions | ❌ | ✅ Interactive |
| JSON Parsing | ❌ | ✅ With Validation |

## API Documentation

Both implementations share the same basic API structure:

### POST /api/ask
Send a question to the AI agent.

**Day 1 Response:**
```json
{
  "question": "What is the capital of France?",
  "answer": "The capital of France is Paris."
}
```

**Day 2 Response:**
```json
{
  "answer": "The capital of France is Paris, located in the north-central part of the country.",
  "confidence": "high",
  "type": "factual",
  "sources": ["general knowledge"],
  "follow_up": "Would you like to know more about Paris's history?",
  "question": "What is the capital of France?",
  "structured": true
}
```

### GET /api/health
Check server and API key status (same for both days).

## Requirements

- Node.js 14+
- Anthropic API key
