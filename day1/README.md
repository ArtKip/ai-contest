# Day 1: Basic AI Agent

A simple AI agent that accepts questions via HTTP and returns AI-generated responses using Anthropic's Claude API.

## Features

- HTTP API endpoint for asking questions (`/api/ask`)
- Web interface with real-time chat functionality
- Anthropic Claude API integration with retry logic
- Rate limiting and error handling
- Health check endpoint (`/api/health`)

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
Send a question to the AI agent.

**Request:**
```json
{
  "question": "What is the capital of France?"
}
```

**Response:**
```json
{
  "question": "What is the capital of France?",
  "answer": "The capital of France is Paris."
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

## Implementation Notes

- Uses **axios** as HTTP client for making requests to Claude API
- Implements exponential backoff retry logic for rate limiting
- Simple prompt format - sends user question directly to Claude
- Returns plain text responses in JSON format
- Web interface displays responses in a chat-like format

## Goal Achievement ✅

**Day 1 Goal**: "The agent correctly accepts user input, makes a call to the selected model/tool, and returns the response."

- ✅ Accepts user input via web interface and HTTP API
- ✅ Makes HTTP calls to Anthropic Claude API using axios
- ✅ Returns AI-generated responses successfully
- ✅ Implements proper error handling and retry logic