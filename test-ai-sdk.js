import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config();

async function testAISDK() {
  try {
    console.log('Testing AI SDK with Kimi...');
    
    const kimi = createOpenAI({
      apiKey: process.env.KIMI_API_KEY,
      baseURL: process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
    });
    
    const model = kimi('moonshot-v1-8k');
    
    console.log('Model created successfully');
    
    // Test with the exact same messages format as our server
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'test message' }
    ];
    
    console.log('Messages:', JSON.stringify(messages, null, 2));
    
    const result = await generateText({
      model: model,
      messages: messages,
      maxTokens: 10
    });
    
    console.log('Success:', result.text);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAISDK();