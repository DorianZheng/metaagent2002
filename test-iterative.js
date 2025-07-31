import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config();

async function testIterative() {
  try {
    console.log('Testing iterative system directly...');
    
    const kimi = createOpenAI({
      apiKey: process.env.KIMI_API_KEY,
      baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
    });
    
    const model = kimi('moonshot-v1-8k');
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'create a simple HTML page with a red button that says hello' }
    ];
    
    console.log('Messages:', JSON.stringify(messages, null, 2));
    
    // Build context prompt from conversation history
    const contextPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + '\n\nPlease respond with the next command to execute in JSON format.';
    
    console.log('Using simple prompt approach...');
    
    // Use simple prompt to avoid AI SDK _def error
    const result = await generateText({
      model: model,
      prompt: contextPrompt,
      maxTokens: 2000,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(300000),
    });
    
    console.log('Success:', result.text);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testIterative();