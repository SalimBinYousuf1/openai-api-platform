// Setup script to initialize test data for the Salim API Platform
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

async function setupTestData() {
  console.log('🔧 Setting up test data for Salim API Platform...');
  
  try {
    // Create test user
    const testUser = await db.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    
    console.log(`✅ Test user created: ${testUser.email}`);
    
    // Create test API key
    const testApiKey = await db.apiKey.upsert({
      where: { key: 'sk-test-real-api-key-123456789' },
      update: {
        isActive: true,
        rateLimit: 1000,
      },
      create: {
        key: 'sk-test-real-api-key-123456789',
        name: 'Test API Key - Real Z.ai Integration',
        userId: testUser.id,
        rateLimit: 1000,
        isActive: true,
      },
    });
    
    console.log(`✅ Test API key created: ${testApiKey.key}`);
    console.log(`   Rate limit: ${testApiKey.rateLimit} requests/hour`);
    console.log(`   Status: ${testApiKey.isActive ? 'Active' : 'Inactive'}`);
    
    // Create additional test API keys for different scenarios
    const additionalKeys = [
      {
        key: 'sk-premium-user-key',
        name: 'Premium User Key',
        rateLimit: 5000,
      },
      {
        key: 'sk-basic-user-key',
        name: 'Basic User Key',
        rateLimit: 100,
      },
      {
        key: 'sk-enterprise-key',
        name: 'Enterprise Key',
        rateLimit: 10000,
      },
    ];
    
    for (const keyData of additionalKeys) {
      await db.apiKey.upsert({
        where: { key: keyData.key },
        update: {
          isActive: true,
          rateLimit: keyData.rateLimit,
        },
        create: {
          ...keyData,
          userId: testUser.id,
          isActive: true,
        },
      });
      
      console.log(`✅ Additional API key created: ${keyData.key} (${keyData.rateLimit}/hour)`);
    }
    
    // Create some sample usage data
    const sampleUsage = [
      {
        endpoint: 'chat/completions',
        model: 'gpt-3.5-turbo',
        tokensUsed: 150,
        cost: 0.0003,
        requestTime: 850,
        statusCode: 200,
      },
      {
        endpoint: 'chat/completions',
        model: 'gpt-4',
        tokensUsed: 320,
        cost: 0.0096,
        requestTime: 1200,
        statusCode: 200,
      },
      {
        endpoint: 'images/generations',
        model: 'dall-e-3',
        cost: 0.04,
        requestTime: 3400,
        statusCode: 200,
      },
    ];
    
    for (const usage of sampleUsage) {
      await db.apiUsage.create({
        data: {
          ...usage,
          apiKeyId: testApiKey.id,
          ipAddress: '127.0.0.1',
          userAgent: 'Test Script',
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        },
      });
    }
    
    console.log(`✅ Sample usage data created (${sampleUsage.length} records)`);
    
    console.log('\n🎉 Test data setup completed successfully!');
    console.log('\n📋 Available Test API Keys:');
    console.log('   • sk-test-real-api-key-123456789 (Standard - 1000/hour)');
    console.log('   • sk-premium-user-key (Premium - 5000/hour)');
    console.log('   • sk-basic-user-key (Basic - 100/hour)');
    console.log('   • sk-enterprise-key (Enterprise - 10000/hour)');
    console.log('\n🧪 Run tests with: node test-real-api.js');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupTestData();
}

module.exports = { setupTestData };