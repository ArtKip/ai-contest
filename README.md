# AI Agent

A simple AI agent that accepts questions via HTTP and returns AI-generated responses.

## Features

- HTTP API endpoint for asking questions
- Web interface for easy interaction
- OpenAI GPT-3.5 integration
- Real-time chat interface
- Health check endpoint

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your_api_key_here"
   ```
   
   Or create a `.env` file (copy from `.env.example`):
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
  "timestamp": "2023-11-12T16:07:31.123Z"
}
```

## Usage

1. **Web Interface**: Visit `http://localhost:3000` and type questions in the chat interface
2. **HTTP API**: Send POST requests to `/api/ask` with your questions
3. **Health Check**: GET `/api/health` to verify the service is running

## Requirements

- Node.js 14+
- OpenAI API key
