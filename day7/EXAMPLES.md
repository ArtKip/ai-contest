# Day 7 - Usage Examples 💡

## Example Conversations & Results

### Example 1: Travel Planning Conversation

#### Scenario
User plans a trip to Japan through a 15-message conversation.

#### Conversation Flow

```
Message 1:
User: "Hi, I'm planning a trip to Japan. Can you help me?"
Assistant: "I'd be happy to help you plan your trip to Japan! Japan is a wonderful destination with a rich culture, delicious food, and stunning landscapes..."

Message 2:
User: "What's the best time to visit Tokyo?"
Assistant: "The best times to visit Tokyo are during spring (March to May) and autumn (September to November)..."

Message 3-9: [Detailed discussion about attractions, food, transportation, accommodations, budget, etc.]

Message 10:
User: "Are credit cards widely accepted?"
Assistant: "While credit card acceptance has improved in Japan, it's still primarily a cash-based society..."

🗜️ COMPRESSION TRIGGERED!

[Summary Generated]
"User is planning a trip to Japan, specifically Tokyo. Discussed optimal visiting times (spring/fall recommended for weather and scenery). Covered must-see attractions: Tokyo Tower, Senso-ji Temple, Shibuya Crossing, Meiji Shrine, and Akihabara. Food budget typically 2000-4000 yen per day. JR Pass recommended for travel (¥29,650 for 7 days). Subway system is efficient but can be confusing; get a Suica/Pasmo card. Temple etiquette: bow at entrance, cleanse at fountain, pray quietly. Credit cards not universally accepted; carry cash."

Message 11:
User: "What should I pack for a spring visit?"
Assistant: [References summary] "For a spring visit to Tokyo, based on our discussion of visiting in March-May, here's what to pack..."

Message 12-15: [Continues naturally with full context from summary]
```

#### Results

| Metric | Value |
|--------|-------|
| **Total Messages** | 15 |
| **Compressions** | 1 |
| **Tokens Without Compression** | ~3,200 |
| **Tokens With Compression** | ~1,400 |
| **Tokens Saved** | 1,800 (56%) |
| **Cost Savings** | $0.0027 |
| **Quality** | Excellent - full context maintained |

---

### Example 2: Technical Learning Session

#### Scenario
Student learns about machine learning concepts over 20 messages.

#### Compression Timeline

```
Messages 1-10: Introduction to AI and ML basics
├─► Topics: What is AI, types of ML, supervised vs unsupervised
└─► Compression at message 10: 2,500 tokens → 750 tokens

Messages 11-20: Deep learning and neural networks
├─► Topics: Neural networks, deep learning, transformers
└─► Compression at message 20: 2,800 tokens → 850 tokens

Final State:
[Summary 1] + [Summary 2] + [Last 2 messages]
Total: ~2,000 tokens instead of ~5,300 tokens
```

#### Results

| Metric | Without Compression | With Compression | Savings |
|--------|-------------------|------------------|---------|
| **Total Tokens** | 5,300 | 2,000 | 62% |
| **API Cost** | $0.0080 | $0.0030 | $0.0050 |
| **Max Length** | 45 messages | 150+ messages | 3.3x |
| **Context Loss** | None | Minimal | ✅ |

---

### Example 3: Customer Support Conversation

#### Scenario
Customer troubleshoots a technical issue over an extended session.

#### Conversation Structure

```
Phase 1: Problem Description (Messages 1-10)
- Customer describes issue
- Agent asks diagnostic questions
- Initial troubleshooting steps
→ COMPRESSED to summary

Phase 2: Advanced Troubleshooting (Messages 11-20)
- Tried basic fixes, didn't work
- Move to advanced solutions
- Customer provides more details
→ COMPRESSED to summary

Phase 3: Resolution (Messages 21-25)
- Solution found
- Agent explains fix
- Follow-up questions
→ Active in history

Token Usage:
- Full history: 6,800 tokens
- Compressed: 2,300 tokens
- Savings: 66%
```

#### Key Benefit
Support session can continue indefinitely without hitting token limits, while maintaining full context of the issue and all attempted solutions.

---

## Visual Examples of UI Features

### Stats Bar (After Compression)

```
┌─────────────────────────────────────────────────────────┐
│ Messages: 12  Compressions: 1  Tokens Saved: 1,700     │
│ Mode: Compressed                                         │
└─────────────────────────────────────────────────────────┘
```

### Compression Notice

```
┌─────────────────────────────────────────────────────────┐
│ 🗜️  COMPRESSION APPLIED!                                │
│ Compressed 10 messages. Saved 1,700 tokens (68% reduction)│
└─────────────────────────────────────────────────────────┘
```

### Analytics Panel

```
╔═══════════════════════════════╗
║  📊 Analytics & Stats         ║
╠═══════════════════════════════╣
║  Session Info                 ║
║  - Session ID: sess_abc...    ║
║  - Threshold: 10 messages     ║
║  - Status: Active             ║
║                               ║
║  Performance Metrics          ║
║  ┌─────────────────────┐     ║
║  │       12            │     ║
║  │  Total Messages     │     ║
║  └─────────────────────┘     ║
║  ┌─────────────────────┐     ║
║  │        1            │     ║
║  │  Compressions       │     ║
║  └─────────────────────┘     ║
║  ┌─────────────────────┐     ║
║  │      1,700          │     ║
║  │  Tokens Saved       │     ║
║  └─────────────────────┘     ║
║                               ║
║  History Comparison           ║
║  Full: 3,200 tokens          ║
║  Compressed: 1,500 tokens    ║
║                               ║
║  ┌─────────────────────┐     ║
║  │      53%            │     ║
║  │  Tokens Saved!      │     ║
║  └─────────────────────┘     ║
╚═══════════════════════════════╝
```

### Compression Events Log

```
┌─────────────────────────────────────┐
│ Compression Events                  │
├─────────────────────────────────────┤
│ Nov 20, 2025 10:30:15 AM           │
│ Compressed 10 messages             │
│ 1,700 tokens saved                 │
├─────────────────────────────────────┤
│ Nov 20, 2025 10:15:30 AM           │
│ Compressed 10 messages             │
│ 1,850 tokens saved                 │
└─────────────────────────────────────┘
```

---

## Terminal Output Examples

### Running npm test

```bash
$ npm test

🧪 Starting Dialogue Compression Test

============================================================
📡 Step 1: Checking server status...
✅ Server is healthy
   Active sessions: 0
   Compression threshold: 10 messages

📝 Step 2: Creating conversation session...
✅ Session created: session_1700000000_abc123

💬 Step 3: Sending test messages...
   Sending 12 messages to test compression

   [1/12] Sending: "Hi, I'm planning a trip to Japan. Can you help me?"
   [2/12] Sending: "What's the best time to visit Tokyo?"
   ...
   [10/12] Sending: "What should I pack for a spring visit?"

   🗜️  COMPRESSION TRIGGERED!
       Messages compressed: 10
       Tokens before: 2,500
       Tokens after: 800
       Tokens saved: 1,700
       Reduction: 68%

   [11/12] Sending: "Can you summarize the key points about my trip..."
   [12/12] Sending: "What else should I know before my trip?"

📊 Step 4: Retrieving final statistics...
✅ Session statistics:
   Total messages: 12
   Compressions: 1
   Tokens saved: 1,700
   Avg response time: 1,243ms

📈 Step 5: Comparing compressed vs full history...
✅ Comparison results:

   Full History:
     Messages: 12
     Characters: 8,420
     Estimated tokens: 2,105

   Compressed History:
     Messages: 3
     Characters: 3,680
     Estimated tokens: 920

   Savings:
     Messages reduced: 9
     Characters reduced: 4,740
     Tokens saved: 1,185
     Percentage saved: 56.29%

============================================================
📋 TEST SUMMARY
============================================================
✅ SUCCESS: Compression system working correctly!
   • 1 compression(s) occurred
   • 1,700 total tokens saved
   • 56.29% token reduction achieved

🎉 Test completed successfully!

💡 Next steps:
   1. Open http://localhost:3007 in your browser
   2. Start a conversation and watch compression in action
   3. Toggle compression on/off to compare behavior
   4. View the Analytics panel for real-time stats
```

### Running npm run demo

```bash
$ npm run demo

🔬 Dialogue Compression Comparison Demo
============================================================
Testing with 14 messages
✅ Server is ready

============================================================
Running conversation in COMPRESSED mode
============================================================
Session created: session_1700000001_xyz789
[14/14] Processing messages...

============================================================
Running conversation in FULL mode
============================================================
Session created: session_1700000002_def456
[14/14] Processing messages...

============================================================
📊 COMPARISON RESULTS
============================================================

📈 Message Processing:
   Compressed Mode: 14 messages
   Full Mode:       14 messages

🪙 Token Usage:
   Compressed Mode:
     Input tokens:  2,450
     Output tokens: 3,200
     Total tokens:  5,650

   Full Mode:
     Input tokens:  4,820
     Output tokens: 3,200
     Total tokens:  8,020

   💰 Savings:
     Tokens saved:  2,370
     Percentage:    29.55%

💵 Estimated Cost (Claude Haiku rates):
   Compressed Mode: $0.0046
   Full Mode:       $0.0066
   Cost Savings:    $0.0020 (29.55%)

⏱️  Performance:
   Compressed Mode:
     Total time:    18,234ms
     Avg per msg:   1,302ms

   Full Mode:
     Total time:    16,890ms
     Avg per msg:   1,206ms

     ⚡ Full is 96ms faster per message

🗜️  Compression Events:
   Compressions triggered: 1
   Tokens saved directly:  1,700

✨ Recommendations:
   ✅ Compression is EFFECTIVE for this conversation length
   ✅ Saved 29.55% of tokens
   ✅ Recommended for conversations > 10 messages

============================================================
✅ Comparison completed successfully!

🌐 View detailed results in the web UI:
   http://localhost:3007
============================================================
```

---

## Real API Response Examples

### Chat Response (Normal)

```json
{
  "success": true,
  "message": "Tokyo is a fascinating city with a perfect blend of traditional and modern culture...",
  "usage": {
    "input_tokens": 150,
    "output_tokens": 200
  },
  "responseTime": 1234,
  "compressionOccurred": false,
  "sessionStats": {
    "totalMessages": 5,
    "totalCompressions": 0,
    "tokensSaved": 0,
    "currentHistorySize": 5,
    "useCompression": true
  }
}
```

### Chat Response (With Compression)

```json
{
  "success": true,
  "message": "Based on what we've discussed about your spring trip to Tokyo...",
  "usage": {
    "input_tokens": 180,
    "output_tokens": 220
  },
  "responseTime": 1456,
  "compressionOccurred": true,
  "compressionInfo": {
    "timestamp": "2025-11-20T10:30:15.000Z",
    "messageIndex": 10,
    "messagesCompressed": 10,
    "summaryLength": 842,
    "tokensBeforeCompression": 2500,
    "tokensAfterCompression": 800,
    "tokensSaved": 1700
  },
  "sessionStats": {
    "totalMessages": 11,
    "totalCompressions": 1,
    "tokensSaved": 1700,
    "currentHistorySize": 3,
    "useCompression": true
  }
}
```

### Comparison Response

```json
{
  "success": true,
  "comparison": {
    "full": {
      "messageCount": 15,
      "characterCount": 12500,
      "estimatedTokens": 3125
    },
    "compressed": {
      "messageCount": 5,
      "characterCount": 4800,
      "estimatedTokens": 1200
    },
    "savings": {
      "messageReduction": 10,
      "characterReduction": 7700,
      "estimatedTokenReduction": 1925,
      "percentageSaved": "61.60"
    }
  }
}
```

---

## Performance Under Different Conditions

### Short Conversation (5 messages)
- **Compression**: Not triggered
- **Benefit**: None (overhead would exceed savings)
- **Recommendation**: Keep compression OFF

### Medium Conversation (15 messages)
- **Compression**: 1 event
- **Token Savings**: 40-50%
- **Benefit**: Moderate
- **Recommendation**: Compression beneficial

### Long Conversation (50 messages)
- **Compression**: 4-5 events
- **Token Savings**: 60-70%
- **Benefit**: Significant
- **Recommendation**: Compression essential

### Extended Conversation (100+ messages)
- **Compression**: 10+ events
- **Token Savings**: 70-80%
- **Benefit**: Critical
- **Recommendation**: Cannot function without compression

---

## Quality Assessment Examples

### Test: Context Retention

**Setup**: 20-message conversation about AI, then ask about message #3

**Message 3**: "What are the main types of machine learning?"
**Response 3**: "The three main types are supervised, unsupervised, and reinforcement learning..."

**Message 20** (After compression): "Can you remind me what the three types of ML were?"
**Response 20**: "As we discussed earlier, the three main types of machine learning are:
1. Supervised learning - learning from labeled data
2. Unsupervised learning - finding patterns in unlabeled data
3. Reinforcement learning - learning through reward/punishment..."

**Result**: ✅ Context preserved through compression

### Test: Multi-Topic Handling

**Conversation Flow**:
1. Messages 1-10: Discuss travel to Japan
2. Messages 11-20: Switch to discussing Italian cuisine
3. Message 21: "Going back to Japan, what was that temple you mentioned?"

**Expected**: Agent should reference compressed Japan discussion
**Actual**: ✅ "From our earlier conversation about your Japan trip, I mentioned Senso-ji Temple..."

**Result**: ✅ Cross-topic context maintained

---

## Troubleshooting Examples

### Issue: Compression Not Triggering

**Symptoms**:
- Sent 15 messages
- No compression notice
- Stats show 0 compressions

**Diagnosis**:
```bash
# Check compression toggle
UI shows: Toggle is GRAY (OFF)
```

**Solution**: Click toggle to turn ON (green)

### Issue: High Token Usage Despite Compression

**Symptoms**:
- Compression occurring
- But token usage still high

**Diagnosis**:
```json
// Check comparison API
{
  "compressed": {
    "estimatedTokens": 2800
  },
  // Still high because messages are very long
}
```

**Solution**: Individual messages are long. Compression helps, but long messages always use more tokens. This is working as expected.

### Issue: Context Loss After Compression

**Symptoms**:
- Agent forgets details from early conversation

**Diagnosis**:
```javascript
// Check summary quality in events log
// Summary might be too brief
```

**Solution**:
1. Increase `maxTokens` in config (allow longer summaries)
2. Modify summarization prompt to be more detailed
3. Decrease compression threshold (compress more frequently with smaller chunks)

---

These examples demonstrate the dialogue compression system in action across various scenarios, showing both the benefits and considerations for different use cases.

