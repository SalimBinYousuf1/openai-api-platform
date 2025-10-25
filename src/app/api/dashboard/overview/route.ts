import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cacheKey = `overview:${session.user.id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Get user's API keys
    const apiKeys = await db.apiKey.findMany({
      where: { userId: session.user.id },
      select: { id: true, isActive: true }
    });

    const activeKeys = apiKeys.filter(key => key.isActive).length;
    const totalKeys = apiKeys.length;

    // Get usage statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageStats = await db.apiUsage.aggregate({
      where: {
        apiKey: {
          userId: session.user.id
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        requestTime: true,
        cost: true,
        tokensUsed: true
      },
      _count: {
        id: true
      }
    });

    const stats = {
      totalRequests: usageStats._count.id || 0,
      totalCost: usageStats._sum.cost || 0,
      totalTokens: usageStats._sum.tokensUsed || 0,
      avgResponseTime: usageStats._count.id ? 
        Math.round((usageStats._sum.requestTime || 0) / usageStats._count.id) : 0,
      activeKeys,
      totalKeys
    };

    cache.set(cacheKey, { stats }, 30 * 1000); // 30 seconds TTL

    return NextResponse.json({ success: true, data: { stats } });
  } catch (error) {
    console.error('Overview API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    );
  }
}