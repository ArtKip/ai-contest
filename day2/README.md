# Day 2: Structured Response Formatting

An AI agent that returns structured, parseable JSON responses with detailed metadata including confidence levels, response types, sources, and follow-up questions.

## Features

- **Structured JSON responses** with predefined format
- **Confidence indicators** (high, medium, low)
- **Response type classification** (factual, opinion, creative, unknown)
- **Source attribution** for information
- **Follow-up question suggestions** for deeper exploration
- **Rich web interface** displaying all structured data
- **JSON parsing and validation** with fallback handling

## Response Format

Every AI response follows this structured JSON format:

```json
{
  "answer": "The main response to the user's question",
  "confidence": "high|medium|low",
  "type": "factual|opinion|creative|unknown",
  "sources": ["list of relevant sources or 'general knowledge'"],
  "follow_up": "A suggested follow-up question or null",
  "question": "Original user question",
  "structured": true
}
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your Anthropic API key:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-api03-your_key_here"
   ```
   
   Or create a `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and go to `http://localhost:3000`

## API Endpoints

### POST /api/ask
Send a question to get a structured response.

**Request:**
```json
{
  "question": "What is the capital of France?"
}
```

**Response:**
```json
{
  "answer": "The capital of France is Paris, located in the north-central part of the country.",
  "confidence": "high",
  "type": "factual",
  "sources": ["general knowledge"],
  "follow_up": "Would you like to know more about Paris's history or other French cities?",
  "question": "What is the capital of France?",
  "structured": true
}
```

### GET /api/health
Check server and API key status.

**Response:**
```json
{
  "status": "ok",
  "hasApiKey": true,
  "timestamp": "2023-11-13T16:07:31.123Z"
}
```

## Web Interface Features

- **Confidence badges**: Visual indicators for response confidence
- **Type indicators**: Shows whether the response is factual, opinion, etc.
- **Source display**: Shows information sources
- **Clickable follow-ups**: Click suggested questions to ask them automatically
- **Fallback handling**: Gracefully handles non-structured responses

## Implementation Details

### Prompt Engineering
- Explicit JSON format specification in the prompt
- Clear structure requirements and examples
- Instructions for confidence assessment and source attribution

### JSON Parsing & Validation
```javascript
// Validates and processes structured responses
const validatedResponse = {
    answer: parsedResponse.answer || rawResponse,
    confidence: parsedResponse.confidence || 'unknown',
    type: parsedResponse.type || 'unknown',
    sources: Array.isArray(parsedResponse.sources) ? parsedResponse.sources : ['general knowledge'],
    follow_up: parsedResponse.follow_up || null,
    question: question,
    structured: true
};
```

### Fallback Strategy
- If JSON parsing fails, returns unstructured response
- Maintains compatibility with basic text responses
- Logs parsing errors for debugging

## Goal Achievement ✅

**Day 2 Goal**: "The response from the LLM can be correctly parsed by your application."

- ✅ **Defined response format** with clear JSON structure specification
- ✅ **Specified output structure** directly in Claude prompts
- ✅ **Provided example format** in prompt instructions
- ✅ **Correct parsing** of LLM responses with validation
- ✅ **Fallback handling** for parsing failures
- ✅ **Rich display** of structured data in web interface

## Key Improvements over Day 1

- Structured data instead of plain text
- Confidence and type metadata
- Source attribution
- Interactive follow-up suggestions
- Better error handling and validation