// Test Z.ai API directly to find correct endpoint
const API_KEY = '9796dd02e01a4d2ea224aafc59ae0922.oF50LFShuXR8VmZ7';

async function testZaiEndpoints() {
  console.log('🔍 Testing Z.ai API endpoints...');
  
  const endpoints = [
    'https://api.z.ai/v1/chat/completions',
    'https://api.z.ai/chat/completions',
    'https://api.z.ai/v1/models',
    'https://api.z.ai/models',
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🧪 Testing: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'glm4.5-flash',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success!', JSON.stringify(data, null, 2));
        break;
      } else {
        const error = await response.text();
        console.log(`❌ Error: ${error}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }
}

testZaiEndpoints();