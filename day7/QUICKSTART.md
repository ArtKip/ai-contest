# Day 7 - Quick Start Guide 🚀

Get started with the Dialogue Compression system in 3 minutes!

## Prerequisites

- Node.js 14+ installed
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Installation

### 1. Navigate to Day 7 directory

```bash
cd day7
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your API key

Choose one method:

**Option A: Environment variable (temporary)**
```bash
export ANTHROPIC_API_KEY="your_api_key_here"
```

**Option B: .env file (persistent)**
```bash
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

### 4. Start the server

```bash
npm start
```

You should see:
```
Day 7 - Dialogue Compression running on port 3007
Visit http://localhost:3007 to test dialogue compression
API Key configured: true

Compression Settings:
  - Messages before compression: 10
  - Model: claude-3-haiku-20240307
  - Temperature: 0.3
```

### 5. Open in browser

Navigate to: **http://localhost:3007**

## Quick Demo

### Try the Interactive UI

1. **Start chatting**: Type a message in the input box at the bottom
2. **Watch the counter**: The stats bar shows message count
3. **Trigger compression**: Send 10+ messages to see automatic compression
4. **View analytics**: The right panel shows token savings in real-time
5. **Toggle compression**: Click the toggle to compare modes

### Example Conversation

Try having a conversation about planning a trip:

```
1. "I'm planning a trip to Japan. Can you help?"
2. "What's the best time to visit Tokyo?"
3. "What are the must-see attractions?"
4. "How much does food cost there?"
5. "Should I get a JR Pass?"
6. "What are good day trips from Tokyo?"
7. "How do I use the subway?"
8. "What's the temple etiquette?"
9. "Are credit cards accepted?"
10. "What should I pack for spring?"
11. "Can you summarize my trip plans?" ← Compression happens before this!
```

After message 10, you'll see a **yellow notification** that compression occurred!

## Running Tests

### Automated Test Suite

```bash
npm test
```

This will:
- Create a test session
- Send 12 messages automatically
- Trigger compression
- Show detailed statistics
- Display token savings

### Comparison Demo

```bash
npm run demo
```

This will:
- Run the same conversation twice (with and without compression)
- Compare token usage
- Show cost savings
- Display performance metrics

## What to Look For

### ✅ Success Indicators

1. **Compression Notice**: Yellow banner appears after 10 messages
2. **Token Savings**: Shows positive numbers in the stats panel
3. **Compression Events**: Log updates in the analytics panel
4. **Reduced History**: Compressed mode shows fewer messages

### 📊 Key Metrics

Watch these in the right panel:

- **Total Messages**: How many you've sent
- **Compressions**: Number of compression events
- **Tokens Saved**: Total tokens saved through compression
- **Percentage Saved**: Efficiency of compression (typically 40-70%)

## Common Issues

### Server won't start

**Problem**: Port 3007 already in use

**Solution**:
```bash
PORT=3008 npm start
```

### API errors

**Problem**: "Anthropic API key not configured"

**Solution**: Check your API key is set correctly
```bash
echo $ANTHROPIC_API_KEY
# Should show your key
```

**Problem**: Rate limit errors

**Solution**: The system has built-in rate limiting. Just wait a moment and try again.

### No compression occurring

**Problem**: Sent 10 messages but no compression

**Solution**:
- Check compression toggle is ON (green)
- Only user/assistant messages count toward threshold
- System messages don't trigger compression

## Tips for Best Results

### 💡 Getting Good Compression

1. **Longer conversations work better**: 15+ messages show more savings
2. **Topic continuity**: Conversations on one topic compress well
3. **Keep compression ON**: Toggle off only for comparison
4. **Check analytics**: Monitor the comparison section for real results

### 💡 Understanding the UI

- **Green toggle** = Compression ON
- **Gray toggle** = Compression OFF
- **Yellow banner** = Compression just happened
- **Purple mode indicator** = Current active mode

### 💡 Testing Quality

1. Have a detailed conversation (15+ messages)
2. Reference something from message #3 in message #15
3. See if the agent remembers with compression ON
4. This tests context preservation!

## Next Steps

### Experiment with Settings

Edit `server.js` to customize:

```javascript
const COMPRESSION_CONFIG = {
    messagesBeforeCompression: 10,  // Change this to 5 or 20
    model: 'claude-3-haiku-20240307',
    temperature: 0.3,  // Adjust for summary style
    maxTokens: 4000
};
```

### View Full History

Click **"View Full History"** button to see:
- All messages including compressed ones
- Complete conversation flow
- Compression summaries

### Compare Modes

1. Have a conversation with compression ON
2. Note the token usage
3. Click "New Session"
4. Turn compression OFF (toggle)
5. Have the same conversation
6. Compare the results!

## Understanding the Results

### Good Compression Signs ✅

- 40-70% token reduction
- Agent maintains context
- Responses stay relevant
- Quality doesn't degrade

### When Compression Helps Most

- **Customer support**: Long support conversations
- **Tutoring/Learning**: Extended educational sessions
- **Research**: Deep-dive investigative chats
- **Planning**: Multi-step planning conversations

### When Compression Helps Less

- **Very short chats**: < 10 messages (overhead > savings)
- **Single Q&A**: One question, one answer
- **Random topics**: Lots of context switching

## Support & Documentation

- **Full Documentation**: See [README.md](./README.md)
- **API Reference**: Check README for all endpoints
- **Test Scripts**: `test-compression.js` and `demo-comparison.js`

## Troubleshooting

### View Server Logs

The terminal shows detailed logs:
- Compression events
- Token usage
- API calls
- Errors

### Check Health Endpoint

```bash
curl http://localhost:3007/api/health
```

Should return:
```json
{
  "status": "ok",
  "hasApiKey": true,
  "activeSessions": 1,
  "compressionConfig": {...}
}
```

## Success Checklist

- [ ] Server starts without errors
- [ ] Can send messages in the UI
- [ ] Compression triggers after 10 messages
- [ ] Yellow notification appears
- [ ] Stats update in real-time
- [ ] Token savings show positive numbers
- [ ] Test script runs successfully
- [ ] Comparison demo completes

If all boxes are checked: **🎉 You're all set!**

## Questions?

1. Check the main [README.md](./README.md) for detailed documentation
2. Review the test scripts for usage examples
3. Inspect `server.js` for implementation details
4. Check browser console for client-side debugging

---

**Happy Testing! 🚀**

The dialogue compression system is now ready to demonstrate how AI agents can efficiently manage long conversations while maintaining quality and reducing costs.

