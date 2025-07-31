import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    
    const response = await fetch('http://localhost:3001/api/generate/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'create a simple HTML page with a red button that says hello'
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log('Stream completed');
          return;
        }

        try {
          const parsed = JSON.parse(data);
          console.log('Received:', parsed);
        } catch (parseError) {
          console.warn('Failed to parse:', data);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();