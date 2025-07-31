import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config();

const SYSTEM_PROMPT = `You are an AI developer using an iterative development approach. You will see the results of your commands and can adapt accordingly.

DEVELOPMENT PROCESS:
1. Analyze the current input (user request OR command execution result)
2. Determine the next logical step
3. Return ONE command at a time for execution
4. Wait for execution result, then continue

RESPONSE FORMAT: Return EXACTLY this JSON structure:
{
  "nextCommand": {
    "type": "command|file|message|server",
    "cmd": "shell command here",
    "path": "file path",
    "content": "file content",
    "message": "user message",
    "messageType": "info|success|warning|error",
    "title": "Message Title"
  },
  "reasoning": "Why you chose this command",
  "expectation": "What you expect to happen",
  "continueAfter": true,
  "isComplete": false
}

When the project is complete, set "isComplete": true and "continueAfter": false.

COMMAND TYPES:
- "command": Execute shell commands (mkdir, npm install, etc.)
- "file": Create/write files with content
- "message": Send info messages to user
- "server": Start development servers

MESSAGE COMMANDS:
Use "message" type to communicate with users:
- messageType: "info" (blue), "success" (green), "warning" (yellow), "error" (red), "instruction" (purple)
- message: The message text to display
- title: Optional title for the message

SERVER COMMANDS:
Use "server" type for commands that start web servers:
- npm run dev, npm start, npm run serve
- python -m http.server, python app.py
- node server.js (for Express servers)
- npx serve, npx live-server
- Any command that starts a web server on a port

COMMUNICATION GUIDELINES:
- ALWAYS send a message when starting a project explaining what you're building
- Send progress updates during long operations
- Send a success message when the app is ready with instructions
- Use appropriate message types for different situations

DO NOT include any explanatory text before or after the JSON. Start your response with { and end with }.

BEST PRACTICES:
- Use modern frameworks/libraries when appropriate
- Create multiple files for better structure
- Include package.json for dependencies
- Add README.md with instructions
- Make apps fully functional and interactive
- Handle errors gracefully
- For follow-ups, be mindful of existing project structure

Be creative and build real, working applications!`;

async function testAIDirectly() {
  try {
    console.log('Testing AI response directly...');
    
    const kimi = createOpenAI({
      apiKey: process.env.KIMI_API_KEY,
      baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
    });
    
    const model = kimi('moonshot-v1-8k');
    
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: 'create a simple HTML page with a red button that says hello' }
    ];
    
    console.log('Building context prompt...');
    const contextPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nPlease respond with the next command to execute in JSON format.';
    
    console.log('Making AI request...');
    const result = await generateText({
      model: model,
      prompt: contextPrompt,
      maxTokens: 2000,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(300000),
    });
    
    console.log('AI Response:', result.text);
    
    // Try to parse it
    try {
      const parsed = JSON.parse(result.text.trim());
      console.log('Parsed successfully:', parsed);
      console.log('Command type:', parsed.nextCommand?.type);
      console.log('Reasoning:', parsed.reasoning);
    } catch (parseError) {
      console.log('Failed to parse JSON:', parseError.message);
      console.log('First 200 chars:', result.text.substring(0, 200));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAIDirectly();