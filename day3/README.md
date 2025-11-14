# Day 3: AI Interaction - Conversation-Driven Requirements Gathering

## Overview

Day 3 implements an interactive AI agent that gathers software project requirements through natural conversation and automatically generates a comprehensive technical specification document when sufficient information is collected.

## Key Features

- **Conversation State Management**: Tracks conversation phases and automatically transitions between greeting, gathering, finalizing, and complete states
- **Requirements Extraction**: Intelligently extracts project details from natural language conversations
- **Automatic Stopping**: Stops gathering requirements when sufficient information is available and generates final specification
- **Real-time Progress Tracking**: Visual progress indicators showing conversation phase and requirements checklist
- **Technical Specification Generation**: Creates professional technical documentation automatically
- **Session Management**: Maintains conversation state with automatic cleanup

## Architecture

### Conversation Phases

1. **Greeting**: Welcome user and understand basic project concept
2. **Gathering**: Collect detailed requirements through questions
3. **Finalizing**: Generate comprehensive technical specification
4. **Complete**: Present final document with download option

### Requirements Tracked

- Project name and description
- Project type (web, mobile, desktop)
- Key functionality and features
- Technology stack preferences
- Timeline expectations
- Team size and deployment needs

## Technical Implementation

### Backend (`server.js`)

- **ConversationSession Class**: Manages conversation state and requirements
- **Phase-based System Prompts**: Dynamic prompts based on conversation phase
- **Requirements Extraction**: Pattern matching to extract information from user messages
- **Automatic Phase Transitions**: Logic to move between conversation phases
- **Session Cleanup**: Removes old sessions every hour

### Frontend (`public/index.html`)

- **Two-column Layout**: Chat interface with progress tracking sidebar
- **Real-time Updates**: Progress indicators update as requirements are gathered
- **Professional UI**: Clean, modern interface with proper formatting
- **Download Feature**: Save final technical specification as text file

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
   echo "ANTHROPIC_API_KEY=sk-ant-api03-your_key_here" > .env
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. Open your browser and go to `http://localhost:3000`

## API Endpoints

- `POST /api/conversation` - Send message and get AI response
- `POST /api/new-conversation` - Start new conversation session
- `GET /api/conversation/:sessionId` - Get session status
- `GET /api/health` - Check server health and API configuration

## Usage Flow

1. Start the server and visit `http://localhost:3000`
2. Begin conversation about your software project
3. The AI will guide you through requirements gathering
4. Progress tracker shows which requirements are complete
5. When sufficient info is gathered, AI generates technical specification
6. Download the final document

## Example Conversation

```
User: I want to build a task management app
AI: Great! What type of application are you thinking - web, mobile, or desktop?

User: A web application using React
AI: Excellent choice! What are the key features you want in your task management app?

User: Users should be able to create tasks, set deadlines, and collaborate with teams
AI: Perfect! What's your timeline for this project?

User: About 3 months
AI: [Generates comprehensive technical specification document]
```

## Goal Achievement ✅

**Day 3 Goal**: "Set a constraint so the model stops by itself at the right moment."

- ✅ **Conversation State Management** with automatic phase transitions
- ✅ **Requirements Tracking** to know when sufficient information is gathered
- ✅ **Automatic Stopping** when `hasRequiredInfo()` returns true
- ✅ **Constraint-based Logic** that moves from gathering to finalizing phase
- ✅ **Self-directed Completion** without user intervention
- ✅ **Professional Output** with comprehensive technical specification generation

## Key Improvements over Day 2

- Stateful conversation management vs stateless requests
- Multi-turn interaction with automatic progression
- Requirements extraction from natural language
- Automatic stopping based on information completeness
- Professional document generation as final output