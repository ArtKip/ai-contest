# Day 7 - Architecture & Design 🏗️

## System Architecture

### High-Level Overview

```
┌─────────────┐
│   Browser   │
│   Client    │
└──────┬──────┘
       │ HTTP/REST
       │
┌──────▼──────────────────────────────────────────┐
│          Express.js Server                      │
│  ┌───────────────────────────────────────────┐ │
│  │    Session Manager                        │ │
│  │  - Create/manage conversation sessions    │ │
│  │  - Track message history                  │ │
│  │  - Monitor compression thresholds         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │    Compression Engine                     │ │
│  │  - Detect when to compress                │ │
│  │  - Generate summaries via Claude          │ │
│  │  - Replace old messages with summaries    │ │
│  │  - Track token savings                    │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │    Chat Handler                           │ │
│  │  - Process user messages                  │ │
│  │  - Build context (compressed/full)        │ │
│  │  - Call Claude API                        │ │
│  │  - Return responses                       │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │    Analytics Engine                       │ │
│  │  - Calculate token usage                  │ │
│  │  - Compare modes                          │ │
│  │  - Generate statistics                    │ │
│  └───────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────┘
                 │
                 │ API Calls
                 │
        ┌────────▼─────────┐
        │  Claude API      │
        │  (Anthropic)     │
        └──────────────────┘
```

## Compression Flow

### Message Flow Without Compression

```
User Message 1  ──┐
User Message 2  ──┤
User Message 3  ──┤
User Message 4  ──┤
User Message 5  ──┼──► Full History ──► Claude API
User Message 6  ──┤     (All msgs)
User Message 7  ──┤
User Message 8  ──┤
User Message 9  ──┤
User Message 10 ──┘

Token Usage: HIGH (all messages sent every time)
Context Window: Grows linearly
API Cost: Increases with each message
```

### Message Flow With Compression

```
User Message 1  ──┐
User Message 2  ──┤
User Message 3  ──┤
User Message 4  ──┤
User Message 5  ──┼──► Messages 1-10
User Message 6  ──┤
User Message 7  ──┤
User Message 8  ──┤
User Message 9  ──┤
User Message 10 ──┘
                  │
                  ├──► Compression Triggered!
                  │
                  ▼
            ┌──────────────┐
            │ Summarization│ ◄── Claude API
            │    Process   │
            └──────┬───────┘
                   │
                   ▼
            [Summary 1-10] ──┐
            User Message 11 ──┼──► Compressed History ──► Claude API
            User Message 12 ──┘     (Summary + recent)

Token Usage: REDUCED (summary << full history)
Context Window: Stays manageable
API Cost: Significantly lower
```

## Data Structures

### ConversationSession

```javascript
{
  sessionId: "session_1234567890_abc123",

  messages: [
    // Only keeps recent messages after compression
    {
      role: "user",
      content: "Hello",
      timestamp: "2025-11-20T10:00:00.000Z"
    },
    {
      role: "assistant",
      content: "Hi there!",
      timestamp: "2025-11-20T10:00:01.000Z"
    }
  ],

  summaries: [
    // Stores all compression summaries
    {
      content: "User asked about X, discussed Y, decided Z...",
      originalMessageCount: 10,
      compressedAt: "2025-11-20T10:05:00.000Z",
      tokensInOriginal: 2500,
      tokensInSummary: 800
    }
  ],

  compressionEvents: [
    // Audit log of all compressions
    {
      timestamp: "2025-11-20T10:05:00.000Z",
      messageIndex: 10,
      messagesCompressed: 10,
      tokensBeforeCompression: 2500,
      tokensAfterCompression: 800,
      tokensSaved: 1700
    }
  ],

  stats: {
    totalMessages: 12,
    totalCompressions: 1,
    tokensBeforeCompression: 2500,
    tokensAfterCompression: 800,
    tokensSaved: 1700
  },

  useCompression: true,
  createdAt: "2025-11-20T09:55:00.000Z",
  lastActivity: "2025-11-20T10:07:00.000Z"
}
```

## Compression Algorithm

### Trigger Logic

```
Function: shouldCompress()

1. Count user/assistant messages (ignore system messages)
2. If count >= threshold (default: 10):
   └─► Return TRUE (trigger compression)
3. Else:
   └─► Return FALSE (continue collecting messages)
```

### Compression Process

```
Function: compress()

1. Gather all messages since last compression
   ├─► Build conversation text
   └─► Format: "USER: message\n\nASSISTANT: response\n\n..."

2. Create summarization prompt
   ├─► Include instructions to preserve:
   │   ├─► Main topics
   │   ├─► Key information
   │   ├─► Decisions made
   │   ├─► Important context
   │   └─► User preferences
   └─► Send to Claude API

3. Receive summary
   ├─► Store in summaries array
   └─► Track token usage

4. Update message history
   ├─► Clear old messages
   └─► Keep last 2 for continuity

5. Record compression event
   ├─► Log timestamp
   ├─► Track tokens saved
   └─► Update statistics

6. Return success
   └─► Notify client of compression
```

## History Building

### Full History Mode

```javascript
function getFullHistory() {
  // Simply return all messages
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
}

Result: [Msg1, Msg2, ..., MsgN]
Token Count: N × avg_message_tokens
```

### Compressed History Mode

```javascript
function getCompressedHistory() {
  const result = [];

  // 1. Add all summaries
  summaries.forEach(summary => {
    result.push({
      role: 'user',
      content: '[SUMMARY]\n' + summary.content
    });
  });

  // 2. Add recent messages (after last compression)
  const recentMessages = messages.slice(lastCompressionIndex);
  result.push(...recentMessages);

  return result;
}

Result: [Summary1, Summary2, ..., MsgN-2, MsgN-1, MsgN]
Token Count: (num_summaries × summary_tokens) + (recent_msgs × avg_msg_tokens)
Savings: Typically 40-70% reduction
```

## API Request Flow

### Chat Request Flow

```
Client                Server              Claude API
  │                     │                     │
  │─── POST /api/chat ──►                     │
  │                     │                     │
  │                     ├─ Add user message   │
  │                     │                     │
  │                     ├─ Check threshold    │
  │                     │                     │
  │                     ├─ Compress? YES      │
  │                     │                     │
  │                     ├──── Summarize ─────►│
  │                     │                     │
  │                     │◄─── Summary ────────┤
  │                     │                     │
  │                     ├─ Update history     │
  │                     │                     │
  │                     ├─ Build context      │
  │                     │   (compressed)      │
  │                     │                     │
  │                     ├──── Get response ──►│
  │                     │                     │
  │                     │◄─── AI response ────┤
  │                     │                     │
  │                     ├─ Add to history     │
  │                     │                     │
  │◄── Response ────────┤                     │
  │    + Compression    │                     │
  │    + Stats          │                     │
  │                     │                     │
```

## Token Economics

### Without Compression (20 messages)

```
Message 1:   100 tokens input → 100 total
Message 2:   200 tokens input → 200 total (100 + 100)
Message 3:   300 tokens input → 300 total (200 + 100)
...
Message 20: 2000 tokens input → 2000 total

Total Input Tokens: ~21,000 tokens
Cost at $0.25/1M input: $0.00525
```

### With Compression (20 messages)

```
Messages 1-10: Normal accumulation
  → Compression at message 10
  → 2000 tokens → 600 token summary

Messages 11-20:
  Message 11:  700 tokens input (600 summary + 100 new)
  Message 12:  800 tokens input (600 summary + 200 new)
  ...
  → Compression at message 20
  → 1200 tokens → 400 token summary

Total Input Tokens: ~8,500 tokens
Cost at $0.25/1M input: $0.00213
Savings: 60% ($0.00312 saved)
```

## Performance Characteristics

### Time Complexity

| Operation | Without Compression | With Compression |
|-----------|-------------------|------------------|
| Add Message | O(1) | O(1) |
| Get History | O(n) | O(s + r) where s=summaries, r=recent |
| Compress | N/A | O(n) + API call |
| Token Usage | O(n²) growth | O(n) linear growth |

### Space Complexity

| Component | Without Compression | With Compression |
|-----------|-------------------|------------------|
| Message Storage | O(n) | O(c × k) where c=compressions, k=messages kept |
| Summary Storage | O(1) (none) | O(c) where c=compressions |
| Total Memory | Growing | Bounded |

## Scalability Considerations

### Session Limits

```javascript
// Current implementation: In-memory storage
// Limitations:
- Max sessions: ~1000s (depends on RAM)
- Session lifetime: 1 hour (auto-cleanup)
- Max conversation: Unlimited with compression

// For production:
- Use Redis/database for persistence
- Implement session pagination
- Add user authentication
- Store summaries separately
```

### API Rate Limiting

```javascript
// Built-in protection:
- Min delay between requests: 500ms
- Max requests per minute: 50
- Automatic retry on 429 errors

// Compression impact:
- Extra API call per compression
- But significantly reduces subsequent calls
- Net benefit after ~5-10 messages
```

## Configuration Options

### Tunable Parameters

```javascript
const COMPRESSION_CONFIG = {
  // When to trigger compression
  messagesBeforeCompression: 10,

  // Model for summarization (affects cost/quality)
  model: 'claude-3-haiku-20240307',  // Fast, cheap
  // model: 'claude-3-sonnet-20240229',  // Balanced
  // model: 'claude-3-opus-20240229',     // Best quality

  // Summary style (lower = more focused)
  temperature: 0.3,

  // Max summary length
  maxTokens: 4000
};
```

### Trade-offs

| Setting | Low Value (5) | Default (10) | High Value (20) |
|---------|--------------|--------------|----------------|
| Compression Frequency | More frequent | Balanced | Less frequent |
| Token Savings | Lower per event | Medium | Higher per event |
| Summary Quality | May lose detail | Good | Excellent |
| API Overhead | Higher | Moderate | Lower |
| Latency Impact | More noticeable | Acceptable | Minimal |

## Security Considerations

### Data Privacy

```
✓ Sessions stored in memory (cleared on restart)
✓ No conversation logging to disk
✓ API keys in environment variables
✓ CORS enabled for client access

⚠ For production:
- Encrypt summaries at rest
- Implement user authentication
- Add rate limiting per user
- Audit log compression events
- Comply with data retention policies
```

### API Key Protection

```
✓ Keys in .env file (not committed)
✓ Server-side API calls only
✓ Client never sees API key

⚠ For production:
- Use secret management service (AWS Secrets, etc.)
- Rotate keys periodically
- Monitor API usage
- Set spending limits
```

## Testing Strategy

### Unit Tests (Conceptual)

```javascript
describe('CompressionEngine', () => {
  test('triggers at correct threshold', () => {
    // Add 9 messages → should NOT compress
    // Add 10th message → SHOULD compress
  });

  test('preserves recent messages', () => {
    // After compression → last 2 messages remain
  });

  test('calculates token savings correctly', () => {
    // Mock API response → verify math
  });
});
```

### Integration Tests

```javascript
describe('End-to-End', () => {
  test('full conversation with compression', async () => {
    // Create session
    // Send 15 messages
    // Verify compression occurred
    // Verify context maintained
    // Check token savings
  });
});
```

## Monitoring & Observability

### Key Metrics to Track

```
1. Compression Efficiency
   - Token savings per compression
   - Average reduction percentage
   - Cost savings

2. Performance
   - Response time (with/without compression)
   - API call latency
   - Compression overhead

3. Quality
   - Context preservation rate
   - User satisfaction
   - Error rate

4. Usage
   - Active sessions
   - Messages per session
   - Compressions per session
```

### Logging

```javascript
// Current logging:
console.log('🗜️ Compressing conversation...');
console.log('✅ Compression completed');
console.error('❌ Compression failed:', error);

// For production:
- Use structured logging (Winston, Bunyan)
- Log levels: INFO, WARN, ERROR
- Include session IDs and timestamps
- Aggregate logs for analysis
```

## Future Enhancements

### Planned Improvements

1. **Adaptive Compression**
   - Adjust threshold based on message complexity
   - Compress less important messages sooner

2. **Selective Compression**
   - Keep important messages, compress filler
   - User can mark messages as "important"

3. **Multi-Level Summaries**
   - Light/Medium/Heavy compression modes
   - User controls trade-off

4. **Cross-Session Memory**
   - Remember user across sessions
   - Long-term memory system

5. **Quality Metrics**
   - Automated quality assessment
   - A/B testing framework

---

This architecture provides a solid foundation for efficient dialogue management while maintaining conversation quality and reducing costs.

