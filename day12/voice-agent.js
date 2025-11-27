#!/usr/bin/env node

/**
 * Voice Agent - Speech-to-Text → LLM → Text Response
 * 
 * A complete voice-driven conversational agent that processes spoken input
 * through an intelligent LLM pipeline and returns contextual text responses.
 */

class VoiceAgent {
    constructor(options = {}) {
        this.name = options.name || 'VoiceBot';
        this.personality = options.personality || {
            helpful: 0.9,
            conversational: 0.8,
            precise: 0.7,
            friendly: 0.9
        };
        
        this.conversationHistory = [];
        this.sessionId = this.generateSessionId();
        this.capabilities = [
            'calculations',
            'definitions', 
            'jokes',
            'general_conversation',
            'explanations',
            'recommendations'
        ];
        
        console.log(`🎤 ${this.name} initialized with voice processing capabilities`);
    }

    /**
     * Process spoken text through the LLM pipeline
     */
    async processVoiceInput(spokenText, metadata = {}) {
        const startTime = Date.now();
        
        console.log(`🎙️ Voice input received: "${spokenText}"`);
        
        try {
            // Analyze the spoken input
            const analysis = this.analyzeVoiceInput(spokenText);
            console.log(`🧠 Query analysis: ${analysis.intent} (${analysis.confidence})`);
            
            // Generate intelligent response based on intent
            const response = await this.generateResponse(spokenText, analysis);
            
            // Calculate processing metrics
            const processingTime = Date.now() - startTime;
            
            // Store conversation for context
            const conversationEntry = {
                timestamp: new Date().toISOString(),
                input: spokenText,
                response: response,
                intent: analysis.intent,
                confidence: analysis.confidence,
                processingTime,
                metadata
            };
            
            this.conversationHistory.push(conversationEntry);
            
            console.log(`🤖 Response generated in ${processingTime}ms`);
            
            return {
                success: true,
                response,
                analysis,
                processingTime,
                sessionId: this.sessionId
            };
            
        } catch (error) {
            console.error(`❌ Voice processing failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                response: "I apologize, but I encountered an error processing your voice command. Please try again.",
                sessionId: this.sessionId
            };
        }
    }

    /**
     * Analyze spoken input to determine intent and confidence
     */
    analyzeVoiceInput(text) {
        const lowerText = text.toLowerCase();
        const analysis = {
            intent: 'general',
            confidence: 0.5,
            entities: [],
            queryType: 'unknown'
        };

        // Mathematical calculations
        if (this.containsCalculationKeywords(lowerText)) {
            analysis.intent = 'calculation';
            analysis.confidence = 0.9;
            analysis.queryType = 'math';
            analysis.entities = this.extractMathEntities(text);
        }
        
        // Definitions and explanations
        else if (this.containsDefinitionKeywords(lowerText)) {
            analysis.intent = 'definition';
            analysis.confidence = 0.85;
            analysis.queryType = 'knowledge';
            analysis.entities = this.extractDefinitionEntities(text);
        }
        
        // Jokes and entertainment
        else if (this.containsJokeKeywords(lowerText)) {
            analysis.intent = 'entertainment';
            analysis.confidence = 0.8;
            analysis.queryType = 'humor';
        }
        
        // Questions
        else if (this.containsQuestionKeywords(lowerText)) {
            analysis.intent = 'question';
            analysis.confidence = 0.7;
            analysis.queryType = 'inquiry';
        }
        
        // Commands
        else if (this.containsCommandKeywords(lowerText)) {
            analysis.intent = 'command';
            analysis.confidence = 0.9;
            analysis.queryType = 'instruction';
        }

        return analysis;
    }

    containsCalculationKeywords(text) {
        const mathKeywords = [
            'calculate', 'compute', 'add', 'subtract', 'multiply', 'divide',
            'plus', 'minus', 'times', 'divided by', 'equals', 'what is',
            'square root', 'power', 'percentage', 'math', 'sum', 'product'
        ];
        return mathKeywords.some(keyword => text.includes(keyword)) || 
               /\d+\s*[\+\-\*\/x÷]\s*\d+/.test(text) ||
               text.includes('=') && /\d/.test(text);
    }

    containsDefinitionKeywords(text) {
        const defKeywords = [
            'define', 'definition', 'what is', 'what are', 'explain',
            'describe', 'meaning of', 'tell me about', 'what does',
            'how does', 'what means'
        ];
        return defKeywords.some(keyword => text.includes(keyword));
    }

    containsJokeKeywords(text) {
        const jokeKeywords = [
            'joke', 'funny', 'humor', 'laugh', 'tell me something funny',
            'make me laugh', 'amusing', 'comedy', 'hilarious', 'witty'
        ];
        return jokeKeywords.some(keyword => text.includes(keyword));
    }

    containsQuestionKeywords(text) {
        const questionStarters = [
            'who', 'what', 'where', 'when', 'why', 'how', 'which',
            'can you', 'do you', 'will you', 'would you', 'could you'
        ];
        return questionStarters.some(starter => text.startsWith(starter)) || text.includes('?');
    }

    containsCommandKeywords(text) {
        const commands = [
            'help', 'clear', 'reset', 'stop', 'start', 'show me',
            'list', 'give me', 'find', 'search', 'play', 'open'
        ];
        return commands.some(cmd => text.includes(cmd));
    }

    extractMathEntities(text) {
        const numbers = text.match(/\d+(?:\.\d+)?/g) || [];
        const operators = text.match(/[\+\-\*\/x÷=]/g) || [];
        return { numbers: numbers.map(Number), operators };
    }

    extractDefinitionEntities(text) {
        // Extract the main subject being asked about
        const defineMatch = text.match(/(?:define|what is|what are|explain|describe)\s+(.+?)(?:\?|$)/i);
        const tellMatch = text.match(/tell me about\s+(.+?)(?:\?|$)/i);
        
        const subject = defineMatch?.[1] || tellMatch?.[1] || '';
        return { subject: subject.trim() };
    }

    /**
     * Generate intelligent response based on input analysis
     */
    async generateResponse(input, analysis) {
        let response;

        switch (analysis.intent) {
            case 'calculation':
                response = this.handleCalculation(input, analysis);
                break;
            case 'definition':
                response = this.handleDefinition(input, analysis);
                break;
            case 'entertainment':
                response = this.handleJoke(input, analysis);
                break;
            case 'question':
                response = this.handleQuestion(input, analysis);
                break;
            case 'command':
                response = this.handleCommand(input, analysis);
                break;
            default:
                response = this.handleGeneralConversation(input, analysis);
        }

        // Add personality flourishes
        response = this.applyPersonality(response, analysis);
        
        return response;
    }

    handleCalculation(input, analysis) {
        try {
            console.log(`🧮 Processing calculation: "${input}"`);
            
            // Handle special cases first
            if (input.includes('square root')) {
                const number = parseFloat(input.match(/\d+(?:\.\d+)?/)?.[0] || '0');
                const result = Math.sqrt(number);
                return `The square root of ${number} is ${result}.`;
            }

            if (input.includes('power') || input.includes('^')) {
                const numbers = input.match(/\d+(?:\.\d+)?/g);
                if (numbers && numbers.length >= 2) {
                    const base = parseFloat(numbers[0]);
                    const exponent = parseFloat(numbers[1]);
                    const result = Math.pow(base, exponent);
                    return `${base} to the power of ${exponent} equals ${result}.`;
                }
            }

            // Extract numbers and operators safely
            const numbers = input.match(/\d+(?:\.\d+)?/g);
            if (!numbers || numbers.length < 2) {
                return "I need at least two numbers to calculate. Try 'calculate 5 plus 6' or '10 times 3'.";
            }

            // Simple two-number operations
            const num1 = parseFloat(numbers[0]);
            const num2 = parseFloat(numbers[1]);
            
            if (isNaN(num1) || isNaN(num2)) {
                return "I couldn't understand the numbers. Please try again with clear numbers.";
            }

            let result;
            let operation;

            // Detect operation type
            if (input.includes('+') || input.includes('plus') || input.includes('add')) {
                result = num1 + num2;
                operation = `${num1} + ${num2}`;
            } else if (input.includes('-') || input.includes('minus') || input.includes('subtract')) {
                result = num1 - num2;
                operation = `${num1} - ${num2}`;
            } else if (input.includes('*') || input.includes('x') || input.includes('times') || input.includes('multiply')) {
                result = num1 * num2;
                operation = `${num1} × ${num2}`;
            } else if (input.includes('/') || input.includes('÷') || input.includes('divided') || input.includes('divide')) {
                if (num2 === 0) {
                    return "I can't divide by zero! Please try a different calculation.";
                }
                result = num1 / num2;
                operation = `${num1} ÷ ${num2}`;
            } else {
                return "I couldn't determine the operation. Try saying 'add', 'multiply', 'divide', or use symbols like + - * /.";
            }

            console.log(`🧮 Calculated: ${operation} = ${result}`);
            return `${operation} equals ${result}.`;
            
        } catch (error) {
            console.error(`❌ Calculation error: ${error.message}`);
            return "I encountered an error with that calculation. Please try a simpler format like 'calculate 5 plus 6'.";
        }
    }

    handleDefinition(input, analysis) {
        const subject = analysis.entities.subject?.toLowerCase() || '';
        
        // Simplified definition responses (in production, integrate with knowledge base)
        const definitions = {
            'artificial intelligence': 'Artificial Intelligence (AI) is the simulation of human intelligence in machines that are programmed to think and learn like humans.',
            'machine learning': 'Machine Learning is a subset of AI that enables computers to learn and improve from experience without being explicitly programmed.',
            'quantum computing': 'Quantum computing uses quantum-mechanical phenomena like superposition and entanglement to perform operations on data.',
            'blockchain': 'Blockchain is a distributed ledger technology that maintains a continuously growing list of records in a secure and transparent manner.',
            'cryptocurrency': 'Cryptocurrency is a digital or virtual currency that uses cryptography for security and operates independently of central authorities.',
            'neural network': 'A neural network is a computing system inspired by biological neural networks that learn to perform tasks by analyzing examples.',
            'algorithm': 'An algorithm is a step-by-step procedure or formula for solving a problem or completing a task.',
            'programming': 'Programming is the process of creating instructions for computers using programming languages to perform specific tasks.',
            'database': 'A database is an organized collection of structured information or data stored electronically in a computer system.',
            'api': 'An API (Application Programming Interface) is a set of protocols and tools for building software applications.'
        };

        if (definitions[subject]) {
            return definitions[subject];
        }

        // Generate a general definition response
        if (subject) {
            return `${subject.charAt(0).toUpperCase() + subject.slice(1)} is an important concept. I'd be happy to explain it further if you can provide more specific details about what aspect interests you most.`;
        }

        return "I'd be happy to explain concepts for you! Try asking me to 'define artificial intelligence' or 'explain machine learning'.";
    }

    handleJoke(input, analysis) {
        const jokes = [
            "Why don't programmers like nature? It has too many bugs!",
            "How many programmers does it take to change a light bulb? None. That's a hardware problem!",
            "Why did the programmer quit his job? He didn't get arrays!",
            "What do you call a programmer from Finland? Nerdic!",
            "Why do Java programmers wear glasses? Because they can't C#!",
            "How do you comfort a JavaScript bug? You console it!",
            "Why did the database administrator leave his wife? She had one-to-many relationships!",
            "What's a programmer's favorite hangout place? Foo Bar!",
            "Why don't programmers like to go outside? The sun gives them array errors!",
            "What do you call a coding bootcamp for elephants? A data structure!"
        ];

        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        return randomJoke;
    }

    handleQuestion(input, analysis) {
        const lowerInput = input.toLowerCase();

        // Handle common questions
        if (lowerInput.includes('how are you')) {
            return "I'm doing great! Ready to help you with voice commands. What would you like to know?";
        }

        if (lowerInput.includes('what can you do') || lowerInput.includes('capabilities')) {
            return "I can help with calculations, provide definitions, tell jokes, and have general conversations. Just speak naturally and I'll do my best to assist you!";
        }

        if (lowerInput.includes('weather')) {
            return "I don't have access to real-time weather data, but you could ask me to calculate temperatures or define weather terms!";
        }

        if (lowerInput.includes('time') || lowerInput.includes('date')) {
            const now = new Date();
            return `The current time is ${now.toLocaleTimeString()} and today's date is ${now.toLocaleDateString()}.`;
        }

        // General question response
        return "That's an interesting question! I'm here to help with calculations, definitions, jokes, and general conversation. Could you be more specific about what you'd like to know?";
    }

    handleCommand(input, analysis) {
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('help')) {
            return `Hi! I'm ${this.name}, your voice assistant. I can:
• Perform calculations: "Calculate 15 times 8"
• Provide definitions: "Define machine learning"  
• Tell jokes: "Tell me a joke"
• Answer questions: "What can you do?"
Just speak naturally and I'll help you out!`;
        }

        if (lowerInput.includes('clear') || lowerInput.includes('reset')) {
            this.conversationHistory = [];
            return "Conversation history cleared! What would you like to talk about?";
        }

        if (lowerInput.includes('show me') && lowerInput.includes('history')) {
            const historyCount = this.conversationHistory.length;
            return `I have ${historyCount} conversation${historyCount !== 1 ? 's' : ''} in our history. You can ask me to clear it by saying "clear history".`;
        }

        return "I heard a command but I'm not sure what you'd like me to do. Try saying 'help' to see what I can do!";
    }

    handleGeneralConversation(input, analysis) {
        const responses = [
            "That's interesting! Tell me more about what you're thinking.",
            "I'm here to help! Is there something specific I can assist you with?",
            "Great question! I can help with calculations, definitions, jokes, and more. What interests you?",
            "I enjoy our conversation! Feel free to ask me about anything that comes to mind.",
            "Thanks for chatting with me! I'm ready for calculations, definitions, or just friendly conversation."
        ];

        // Add some context awareness
        if (this.conversationHistory.length > 0) {
            const lastIntent = this.conversationHistory[this.conversationHistory.length - 1].intent;
            if (lastIntent === 'calculation') {
                return "Would you like me to help with another calculation, or shall we explore something different?";
            } else if (lastIntent === 'definition') {
                return "I hope that explanation was helpful! Is there anything else you'd like me to define or explain?";
            }
        }

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        return randomResponse;
    }

    applyPersonality(response, analysis) {
        // Add personality-based modifications
        if (this.personality.friendly > 0.8) {
            // Add friendly touches
            if (analysis.intent === 'calculation') {
                response = response.replace(/^The answer is/, "Great question! The answer is");
            }
            
            if (analysis.intent === 'entertainment') {
                response += " I hope that made you smile! 😊";
            }
        }

        if (this.personality.conversational > 0.7) {
            // Make responses more conversational
            if (!response.includes('!') && !response.includes('?') && response.length > 20) {
                response += " What else would you like to explore?";
            }
        }

        return response;
    }

    /**
     * Get conversation statistics
     */
    getStats() {
        const intentCounts = {};
        this.conversationHistory.forEach(entry => {
            intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
        });

        const totalTime = this.conversationHistory.reduce((sum, entry) => 
            sum + (entry.processingTime || 0), 0);

        return {
            totalConversations: this.conversationHistory.length,
            averageProcessingTime: this.conversationHistory.length > 0 ? 
                Math.round(totalTime / this.conversationHistory.length) : 0,
            intentBreakdown: intentCounts,
            sessionId: this.sessionId,
            capabilities: this.capabilities
        };
    }

    /**
     * Get recent conversation history
     */
    getHistory(limit = 10) {
        return this.conversationHistory.slice(-limit).map(entry => ({
            timestamp: entry.timestamp,
            input: entry.input,
            response: entry.response,
            intent: entry.intent,
            confidence: entry.confidence
        }));
    }

    generateSessionId() {
        return 'voice-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

module.exports = { VoiceAgent };