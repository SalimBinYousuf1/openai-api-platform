import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100, 'Name too long'),
  rateLimit: z.number().min(1, 'Rate limit must be at least 1').max(10000, 'Rate limit too high'),
});

// GET /api/dashboard/keys - Get user's API keys
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check cache first
    const cacheKey = `apikeys:${session.user.id}`;
    const cachedKeys = cache.get(cacheKey);
    
    if (cachedKeys) {
      return NextResponse.json({
        success: true,
        data: cachedKeys,
        cached: true,
      });
    }

    const apiKeys = await db.apiKey.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
        lastUsedAt: true,
        _count: {
          select: {
            apiUsage: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Don't expose full keys in list view
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      key: key.key.substring(0, 10) + '...',
      usageCount: key._count.apiUsage,
      _count: undefined,
    }));

    // Cache for 15 seconds
    cache.set(cacheKey, maskedKeys, 15000);

    return NextResponse.json({
      success: true,
      data: maskedKeys,
    });
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/dashboard/keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, rateLimit } = createKeySchema.parse(body);

    // Check user's current API key limit (max 5 keys per user)
    const existingKeyCount = await db.apiKey.count({
      where: {
        userId: session.user.id,
      },
    });

    if (existingKeyCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum API key limit reached (5 keys per user)' },
        { status: 400 }
      );
    }

    // Generate a unique API key with high entropy
    const generateKey = () => {
      const prefix = 'sk';
      const timestamp = Date.now().toString(36);
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      return `${prefix}_${timestamp}_${random1}${random2}`;
    };

    const key = generateKey();

    // Create API key with optimized query
    const apiKey = await db.apiKey.create({
      data: {
        key,
        name: name.trim(),
        rateLimit,
        userId: session.user.id,
      },
      select: {
        id: true,
        key: true,
        name: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
      },
    });

    // Invalidate cache for this user
    cache.delete(`apikeys:${session.user.id}`);
    cache.delete(`overview:${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: apiKey,
      message: 'API key created successfully',
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}