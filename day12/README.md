# Day 12 - Voice Agent (Speech → LLM → Text)

## Overview

A voice-driven conversational agent that processes spoken commands through a complete speech-to-text → LLM → text response pipeline. Users can speak naturally to the agent and receive intelligent text responses for various query types.

## Features

- **Browser Speech Recognition**: Uses Web Speech API for real-time voice input
- **Intelligent LLM Processing**: Advanced query understanding and response generation
- **Multiple Query Types**: Calculations, definitions, jokes, general conversation
- **Audio Visualization**: Real-time microphone input visualization
- **Voice Command Pipeline**: Complete speech → text → processing → response flow
- **Interactive Web Interface**: Beautiful, responsive voice interaction UI

## Architecture

```
Voice Agent Pipeline
├── Voice Input (Microphone)
├── Speech-to-Text (Web Speech API)
├── LLM Processing (Intelligent Agent)
├── Response Generation
└── Text Output (Display)
```

## Quick Start

```bash
# Install dependencies
npm install

# Start the voice agent server
npm start

# Open browser to http://localhost:3000
```

## Supported Query Types

### 🧮 Calculations
- "Calculate 25 times 37"
- "What's the square root of 144?"
- "Add 123 and 456"

### 📚 Definitions
- "Define artificial intelligence"
- "What is machine learning?"
- "Explain quantum computing"

### 😄 Entertainment  
- "Tell me a joke"
- "Give me a funny story"
- "Make me laugh"

### 💬 General Conversation
- "How are you today?"
- "What's the weather like?"
- "Tell me something interesting"

## Technical Implementation

### Speech Recognition
- Web Speech API for browser-based voice input
- Real-time audio processing with visual feedback
- Automatic silence detection and command completion

### LLM Integration
- Intelligent query classification and processing
- Context-aware response generation
- Multiple response formats based on query type

### User Interface
- Responsive voice interaction design
- Real-time transcription display
- Audio level visualization
- Command history and response logging

## Voice Commands

The agent responds to natural language commands:

**Start Recording**: Click microphone button or say "Hey Voice Agent"
**Stop Recording**: Automatic silence detection or click stop
**Clear History**: "Clear history" or use clear button
**Help**: "Help" or "What can you do?"