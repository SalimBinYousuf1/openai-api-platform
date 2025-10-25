import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
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

    // Generate a unique API key
    const generateKey = () => {
      const prefix = 'sk';
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      return `${prefix}_${timestamp}_${random}`;
    };

    const key = generateKey();

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