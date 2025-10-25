// Test script for Salim API Platform
// This script demonstrates how to use the OpenAI SDK with our API

import OpenAI from 'openai';

// Initialize the OpenAI client with our custom base URL
const openai = new OpenAI({
  apiKey: process.env.API_KEY || 'sk-test-api-key', // Replace with your actual API key
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
});

async function testChatCompletion() {
  console.log('\n🧪 Testing Chat Completions...');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides concise answers.',
        },
        {
          role: 'user',
          content: 'What is the capital of France and what is it famous for?',
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    console.log('✅ Chat completion successful!');
    console.log('Response:', response.choices[0].message.content);
    console.log('Tokens used:', response.usage.total_tokens);
    console.log('Model:', response.model);
    
  } catch (error) {
    console.error('❌ Chat completion failed:', error.message);
  }
}

async function testImageGeneration() {
  console.log('\n🎨 Testing Image Generation...');
  
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A cute robot reading a book in a cozy library',
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    console.log('✅ Image generation successful!');
    console.log('Image URL:', response.data[0].url);
    console.log('Revised prompt:', response.data[0].revised_prompt);
    
  } catch (error) {
    console.error('❌ Image generation failed:', error.message);
  }
}

async function testModelsList() {
  console.log('\n📋 Testing Models List...');
  
  try {
    const response = await openai.models.list();
    
    console.log('✅ Models list successful!');
    console.log('Available models:');
    response.data.forEach(model => {
      console.log(`  - ${model.id} (${model.owned_by})`);
    });
    
  } catch (error) {
    console.error('❌ Models list failed:', error.message);
  }
}

async function testStreamingChat() {
  console.log('\n🌊 Testing Streaming Chat...');
  
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Write a short story about a programmer discovering AI.',
        },
      ],
      stream: true,
    });

    console.log('✅ Streaming started!');
    process.stdout.write('Response: ');
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
    }
    
    console.log('\n✅ Streaming completed!');
    
  } catch (error) {
    console.error('❌ Streaming failed:', error.message);
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling...');
  
  try {
    // Test with invalid API key
    const invalidClient = new OpenAI({
      apiKey: 'sk-invalid-key',
      baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
    });

    await invalidClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    
  } catch (error) {
    console.log('✅ Error handling working correctly!');
    console.log('Error:', error.message);
    console.log('Error type:', error.type);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Salim API Platform Tests');
  console.log('=====================================');
  
  // Run all tests
  await testModelsList();
  await testChatCompletion();
  await testImageGeneration();
  await testStreamingChat();
  await testErrorHandling();
  
  console.log('\n✨ All tests completed!');
  console.log('\n📖 For more information, visit: /docs/API.md');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  testChatCompletion,
  testImageGeneration,
  testModelsList,
  testStreamingChat,
  testErrorHandling,
  runAllTests,
};