import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { generateApiKey } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = `api-keys:${session.user.id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    const apiKeys = await db.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            usage: true
          }
        }
      }
    });

    const keysWithUsage = apiKeys.map(key => ({
      id: key.id,
      key: key.key,
      name: key.name,
      isActive: key.isActive,
      rateLimit: key.rateLimit,
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString(),
      usageCount: key._count.usage
    }));

    cache.set(cacheKey, keysWithUsage, 30 * 1000); // 30 seconds TTL

    return NextResponse.json({ success: true, data: keysWithUsage });
  } catch (error) {
    console.error('API Keys GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, rateLimit } = await request.json();

    if (!name || !rateLimit) {
      return NextResponse.json(
        { error: 'Name and rate limit are required' },
        { status: 400 }
      );
    }

    // Generate unique API key
    const key = generateApiKey();

    // Check if key already exists (very unlikely but just in case)
    const existingKey = await db.apiKey.findUnique({
      where: { key }
    });

    if (existingKey) {
      return NextResponse.json(
        { error: 'Key generation failed, please try again' },
        { status: 500 }
      );
    }

    const apiKey = await db.apiKey.create({
      data: {
        key,
        name,
        rateLimit: parseInt(rateLimit),
        userId: session.user.id
      }
    });

    // Clear cache
    cache.delete(`api-keys:${session.user.id}`);
    cache.delete(`overview:${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        isActive: apiKey.isActive,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('API Keys POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}