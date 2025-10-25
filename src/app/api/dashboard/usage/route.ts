import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const cacheKey = `usage:${session.user.id}:${period}:${limit}:${offset}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get overall usage statistics
    const usageStats = await db.apiUsage.aggregate({
      where: {
        apiKey: {
          userId: session.user.id
        },
        createdAt: {
          gte: startDate
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

    // Get breakdown by endpoint and model
    const breakdown = await db.apiUsage.groupBy({
      by: ['endpoint', 'model'],
      where: {
        apiKey: {
          userId: session.user.id
        },
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        requestTime: true,
        cost: true,
        tokensUsed: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Get recent usage
    const recentUsage = await db.apiUsage.findMany({
      where: {
        apiKey: {
          userId: session.user.id
        },
        createdAt: {
          gte: startDate
        }
      },
      include: {
        apiKey: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Get success/failure statistics
    const successfulRequests = await db.apiUsage.count({
      where: {
        apiKey: {
          userId: session.user.id
        },
        createdAt: {
          gte: startDate
        },
        statusCode: {
          lt: 400
        }
      }
    });

    const failedRequests = await db.apiUsage.count({
      where: {
        apiKey: {
          userId: session.user.id
        },
        createdAt: {
          gte: startDate
        },
        statusCode: {
          gte: 400
        }
      }
    });

    const totalRequests = successfulRequests + failedRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    const data = {
      period,
      totalRequests: usageStats._count.id || 0,
      totalCost: usageStats._sum.cost || 0,
      totalTokens: usageStats._sum.tokensUsed || 0,
      avgResponseTime: usageStats._count.id ? 
        Math.round((usageStats._sum.requestTime || 0) / usageStats._count.id) : 0,
      breakdown: breakdown.map(item => ({
        endpoint: item.endpoint,
        model: item.model || undefined,
        requests: item._count.id,
        tokensUsed: item._sum.tokensUsed || 0,
        cost: item._sum.cost || 0,
        avgResponseTime: item._count.id ? 
          Math.round((item._sum.requestTime || 0) / item._count.id) : 0
      })),
      recentUsage: recentUsage.map(usage => ({
        id: usage.id,
        endpoint: usage.endpoint,
        model: usage.model || undefined,
        cost: usage.cost,
        statusCode: usage.statusCode,
        requestTime: usage.requestTime,
        apiKeyName: usage.apiKey.name,
        createdAt: usage.createdAt.toISOString()
      })),
      summary: {
        successfulRequests,
        failedRequests,
        successRate: Math.round(successRate * 100) / 100
      }
    };

    cache.set(cacheKey, data, 30 * 1000); // 30 seconds TTL

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}