import { db } from '@/lib/db';
import { generateApiKey } from '@/lib/api-keys';

export async function setupTestApiKey() {
  try {
    // Create a test user if not exists
    const testUser = await db.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    // Create a test API key
    const apiKey = await db.apiKey.create({
      data: {
        key: 'sk-test-real-api-key-123456789',
        name: 'Test API Key - Real Z.ai Integration',
        userId: testUser.id,
        rateLimit: 1000,
        isActive: true,
      },
    });

    console.log('✅ Test API key created:', apiKey.key);
    console.log('📧 Test user:', testUser.email);
    
    return apiKey;
  } catch (error) {
    console.error('❌ Failed to setup test API key:', error);
    throw error;
  }
}

export async function getTestApiKey() {
  try {
    const apiKey = await db.apiKey.findFirst({
      where: { key: 'sk-test-real-api-key-123456789' },
      include: {
        user: true,
      },
    });

    if (!apiKey) {
      return await setupTestApiKey();
    }

    return apiKey;
  } catch (error) {
    console.error('❌ Failed to get test API key:', error);
    throw error;
  }
}