# Day 6 - Subagent Interaction 🤝

A multi-agent collaboration system where two AI agents work together in a pipeline. Agent 1 generates content, and Agent 2 validates and refines it.

## Features

### Agent Pipeline

**Agent 1: Content Generator** 🎨
- Model: Claude 3 Haiku
- Temperature: 0.8 (creative)
- Role: Generate creative content based on user tasks
- Output: Structured JSON with title, content, and metadata

**Agent 2: Content Validator & Refiner** 🔍
- Model: Claude 3.5 Sonnet
- Temperature: 0.3 (focused)
- Role: Validate quality and refine Agent 1's output
- Output: Validation report with quality score, issues, suggestions, and refined content

### Interaction Flow

```
User Task → Agent 1 (Generate) → Structured Output → Agent 2 (Validate) → Final Result
```

1. **Agent 1** receives the task and generates content in structured JSON format
2. **Agent 2** receives Agent 1's output and:
   - Validates content quality
   - Identifies issues
   - Provides improvement suggestions
   - Generates refined version
   - Assigns quality score (0-100)

### Key Features

- **Different Models**: Each agent uses a different Claude model optimized for its task
- **Different Temperatures**: Generator uses higher temperature (0.8) for creativity, Validator uses lower temperature (0.3) for consistency
- **Structured Communication**: Agents communicate via JSON format
- **Quality Assessment**: Validator provides quantitative quality score
- **Refinement Process**: Validator improves the initial output
- **Visual Pipeline**: Clear visualization of agent collaboration
- **Execution Metrics**: Track time, tokens, and performance

## Usage

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env file in day6 directory
ANTHROPIC_API_KEY=your_api_key_here
```

3. Start the server:
```bash
npm start
```

4. Open browser:
```
http://localhost:3006
```

## Example Tasks

### Creative Writing
- "Write a short story about a time traveler who gets stuck in the year 1850"
- "Create a product description for a smart coffee mug"
- "Write a motivational speech for aspiring entrepreneurs"

### Technical Content
- "Explain how blockchain technology works to a 10-year-old"
- "Write a tutorial on setting up a Node.js REST API"
- "Describe the benefits of microservices architecture"

### Business
- "Write an email announcing a new product launch"
- "Create a job description for a Senior Software Engineer"
- "Draft a press release about reaching 1 million users"

## API Endpoints

### `POST /api/run-agents`
Run the complete agent pipeline.

**Request:**
```json
{
  "task": "Write a blog post about AI ethics"
}
```

**Response:**
```json
{
  "success": true,
  "task": "Write a blog post about AI ethics",
  "pipeline": {
    "step1_generator": {
      "agent": {...},
      "result": {...},
      "output": {
        "title": "...",
        "content": "...",
        "metadata": {...}
      }
    },
    "step2_validator": {
      "agent": {...},
      "result": {...},
      "validation": {
        "validation_status": "pass",
        "quality_score": 85,
        "issues": [],
        "suggestions": [],
        "refined_content": {...}
      }
    }
  },
  "summary": {
    "totalExecutionTime": 5234,
    "totalTokensUsed": {...},
    "validationStatus": "pass",
    "qualityScore": 85
  }
}
```

### `GET /api/agents`
Get agent configurations and workflow information.

### `GET /api/example-tasks`
Get example tasks organized by category.

## How It Demonstrates Subagent Interaction

1. **Separate Configurations**: Each agent has distinct model, temperature, and system prompts
2. **Sequential Execution**: Agent 2 waits for Agent 1 to complete
3. **Data Passing**: Agent 1's output becomes Agent 2's input
4. **Structured Format**: JSON ensures reliable communication between agents
5. **Validation & Refinement**: Agent 2 evaluates and improves Agent 1's work
6. **Complementary Roles**: Generator focuses on creativity, Validator focuses on quality

## Benefits of This Architecture

- **Separation of Concerns**: Each agent specializes in one task
- **Quality Improvement**: Two-step process catches issues and refines output
- **Flexibility**: Easy to add more agents or modify pipeline
- **Transparency**: Each agent's contribution is visible
- **Reliability**: Structured format prevents communication errors

## Technologies Used

- Node.js + Express
- Anthropic Claude API (Haiku & Sonnet models)
- JSON for structured agent communication
- Async/await for sequential execution

