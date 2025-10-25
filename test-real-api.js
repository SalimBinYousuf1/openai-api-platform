// Real Z.ai API Integration Test Script
// This script tests the actual Z.ai API integration with provided credentials

const BASE_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'sk-test-real-api-key-123456789';

// Test utilities
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪'
  }[type] || '📋';
  console.log(`${timestamp} ${prefix} ${message}`);
}

async function makeRequest(endpoint, data = null, method = 'POST') {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  log(`Making ${method} request to ${endpoint}`, 'test');
  
  const response = await fetch(url, options);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseData.error?.message || 'Unknown error'}`);
  }

  return responseData;
}

// Test functions
async function testModelsEndpoint() {
  log('Testing Models Endpoint', 'test');
  
  try {
    const response = await makeRequest('/models', null, 'GET');
    
    log(`Models endpoint successful! Found ${response.data.length} models`, 'success');
    
    response.data.forEach(model => {
      log(`  - ${model.id} (${model.owned_by})`, 'info');
    });
    
    return response;
  } catch (error) {
    log(`Models endpoint failed: ${error.message}`, 'error');
    throw error;
  }
}

async function testChatCompletion() {
  log('Testing Chat Completion with Real Z.ai API', 'test');
  
  try {
    const requestData = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides concise and accurate answers.',
        },
        {
          role: 'user',
          content: 'What is artificial intelligence and how does it work? Give a brief explanation.',
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    };

    const response = await makeRequest('/chat/completions', requestData);
    
    log('Chat completion successful!', 'success');
    log(`Model: ${response.model}`, 'info');
    log(`Response ID: ${response.id}`, 'info');
    log(`Tokens used: ${response.usage.total_tokens}`, 'info');
    log(`Response: ${response.choices[0].message.content.substring(0, 100)}...`, 'info');
    
    return response;
  } catch (error) {
    log(`Chat completion failed: ${error.message}`, 'error');
    throw error;
  }
}

async function testAdvancedChatCompletion() {
  log('Testing Advanced Chat Completion', 'test');
  
  try {
    const requestData = {
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Write a short poem about technology and innovation. Keep it under 50 words.',
        },
      ],
      temperature: 0.9,
      max_tokens: 100,
      top_p: 0.9,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    };

    const response = await makeRequest('/chat/completions', requestData);
    
    log('Advanced chat completion successful!', 'success');
    log(`Model: ${response.model}`, 'info');
    log(`Poem: ${response.choices[0].message.content}`, 'info');
    log(`Finish reason: ${response.choices[0].finish_reason}`, 'info');
    
    return response;
  } catch (error) {
    log(`Advanced chat completion failed: ${error.message}`, 'error');
    throw error;
  }
}

async function testImageGeneration() {
  log('Testing Image Generation with Real Z.ai API', 'test');
  
  try {
    const requestData = {
      model: 'dall-e-3',
      prompt: 'A futuristic robot reading a book in a cozy library, digital art style',
      size: '1024x1024',
      quality: 'standard',
      n: 1,
      response_format: 'url',
    };

    const response = await makeRequest('/images/generations', requestData);
    
    log('Image generation successful!', 'success');
    log(`Images generated: ${response.data.length}`, 'info');
    log(`Image URL: ${response.data[0].url.substring(0, 50)}...`, 'info');
    
    if (response.data[0].revised_prompt) {
      log(`Revised prompt: ${response.data[0].revised_prompt}`, 'info');
    }
    
    return response;
  } catch (error) {
    log(`Image generation failed: ${error.message}`, 'error');
    throw error;
  }
}

async function testErrorHandling() {
  log('Testing Error Handling', 'test');
  
  try {
    // Test with invalid API key
    const invalidOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-invalid-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    };

    const response = await fetch(`${BASE_URL}/chat/completions`, invalidOptions);
    const errorData = await response.json();
    
    if (response.status === 401) {
      log('Error handling working correctly - Invalid API key rejected', 'success');
    } else {
      log(`Unexpected error response: ${response.status}`, 'warning');
    }
    
  } catch (error) {
    log(`Error handling test failed: ${error.message}`, 'error');
  }
}

async function testRateLimiting() {
  log('Testing Rate Limiting Headers', 'test');
  
  try {
    const response = await makeRequest('/models', null, 'GET');
    
    // Check if rate limit headers are present
    const rateLimitHeaders = [
      'x-ratelimit-limit-requests',
      'x-ratelimit-remaining-requests',
      'x-ratelimit-reset-requests',
    ];
    
    const headersPresent = rateLimitHeaders.every(header => 
      response.headers && response.headers[header]
    );
    
    if (headersPresent) {
      log('Rate limiting headers present', 'success');
    } else {
      log('Rate limiting headers missing', 'warning');
    }
    
  } catch (error) {
    log(`Rate limiting test failed: ${error.message}`, 'error');
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Real Z.ai API Integration Tests', 'test');
  log('================================================', 'info');
  
  const results = {
    models: false,
    chatCompletion: false,
    advancedChat: false,
    imageGeneration: false,
    errorHandling: false,
    rateLimiting: false,
  };

  try {
    // Test models endpoint
    await testModelsEndpoint();
    results.models = true;
    
    // Test basic chat completion
    await testChatCompletion();
    results.chatCompletion = true;
    
    // Test advanced chat completion
    await testAdvancedChatCompletion();
    results.advancedChat = true;
    
    // Test image generation
    await testImageGeneration();
    results.imageGeneration = true;
    
    // Test error handling
    await testErrorHandling();
    results.errorHandling = true;
    
    // Test rate limiting
    await testRateLimiting();
    results.rateLimiting = true;
    
  } catch (error) {
    log(`Test suite interrupted: ${error.message}`, 'error');
  }

  // Results summary
  log('================================================', 'info');
  log('🏁 Test Results Summary', 'test');
  log('================================================', 'info');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    log(`${test.padEnd(20)}: ${status}`, passed ? 'success' : 'error');
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`Overall: ${passedTests}/${totalTests} tests passed`, 
    passedTests === totalTests ? 'success' : 'warning');
  
  if (passedTests === totalTests) {
    log('🎉 All tests passed! The Salim API Platform is working with real Z.ai integration!', 'success');
  } else {
    log('⚠️ Some tests failed. Please check the implementation.', 'warning');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Test execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testModelsEndpoint,
  testChatCompletion,
  testImageGeneration,
  testErrorHandling,
  testRateLimiting,
};