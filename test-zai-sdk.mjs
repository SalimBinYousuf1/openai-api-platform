// Test Z.ai API using the provided SDK
import ZAI from 'z-ai-web-dev-sdk';

async function testZaiWithSDK() {
  console.log('🔍 Testing Z.ai API with SDK...');
  
  try {
    const zai = await ZAI.create();
    console.log('✅ Z.ai client created successfully');
    
    // Test chat completions
    console.log('\n🧪 Testing chat completions...');
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with a brief greeting.',
        },
      ],
      model: 'glm4.5-flash',
    });

    console.log('✅ Chat completion successful!');
    console.log('Response:', completion.choices[0]?.message?.content);
    console.log('Full response:', JSON.stringify(completion, null, 2));
    
    // Test image generation
    console.log('\n🧪 Testing image generation...');
    const imageResponse = await zai.images.generations.create({
      prompt: 'A simple test image of a cat',
      size: '1024x1024',
    });

    console.log('✅ Image generation successful!');
    console.log('Image response:', JSON.stringify(imageResponse, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testZaiWithSDK();