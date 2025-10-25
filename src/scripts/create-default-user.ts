import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

async function createDefaultUser() {
  try {
    // Check if default user already exists
    const existingUser = await db.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existingUser) {
      console.log('Default user already exists');
      return;
    }

    // Create default user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const user = await db.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
      }
    });

    console.log('Default user created:', user.email);
    console.log('Password: admin123');
    
    // Create a default API key for the user
    const generateApiKey = () => {
      const prefix = 'sk-'
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let result = prefix
      
      for (let i = 0; i < 48; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      return result
    };

    const apiKey = await db.apiKey.create({
      data: {
        key: generateApiKey(),
        name: 'Default API Key',
        rateLimit: 1000,
        userId: user.id,
      }
    });

    console.log('Default API key created:', apiKey.key);
  } catch (error) {
    console.error('Error creating default user:', error);
  } finally {
    await db.$disconnect();
  }
}

createDefaultUser();