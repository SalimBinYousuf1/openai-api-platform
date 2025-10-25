import { db } from '@/lib/db';
import { ApiKey } from '@prisma/client';
import { randomBytes } from 'crypto';

export function generateApiKey(): string {
  const bytes = randomBytes(32);
  return `sk-${bytes.toString('hex')}`;
}

export async function createApiKey(userId: string, name: string, rateLimit: number = 1000): Promise<ApiKey> {
  const key = generateApiKey();
  
  return await db.apiKey.create({
    data: {
      key,
      name,
      userId,
      rateLimit,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  return await db.apiKey.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeApiKey(apiKeyId: string, userId: string): Promise<ApiKey> {
  const apiKey = await db.apiKey.findFirst({
    where: { 
      id: apiKeyKeyId,
      userId 
    },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  return await db.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false },
  });
}

export async function updateApiKeyRateLimit(apiKeyId: string, userId: string, rateLimit: number): Promise<ApiKey> {
  const apiKey = await db.apiKey.findFirst({
    where: { 
      id: apiKeyKeyId,
      userId 
    },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  return await db.apiKey.update({
    where: { id: apiKeyId },
    data: { rateLimit },
  });
}