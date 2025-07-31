import fetch from 'node-fetch';

async function testSimpleAPI() {
  try {
    console.log('Testing simple generate endpoint...');
    
    const response = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'create a simple HTML page with a red button that says hello'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSimpleAPI();