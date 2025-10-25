import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const usageQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('month'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = usageQuerySchema.parse({
      period: searchParams.get('period') || 'month',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    });

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (query.period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user's API keys
    const userApiKeys = await db.apiKey.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        key: true,
      },
    });

    const apiKeyIds = userApiKeys.map(key => key.id);

    if (apiKeyIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          period: query.period,
          totalRequests: 0,
          totalCost: 0,
          totalTokens: 0,
          avgResponseTime: 0,
          breakdown: [],
          recentUsage: [],
          summary: {
            successfulRequests: 0,
            failedRequests: 0,
            successRate: 0,
          },
        },
      });
    }

    // Get usage statistics
    const [usageStats, usageRecords] = await Promise.all([
      // Aggregated statistics
      db.apiUsage.aggregate({
        where: {
          apiKeyId: {
            in: apiKeyIds,
          },
          createdAt: {
            gte: startDate,
          },
        },
        _sum: {
          tokensUsed: true,
          cost: true,
          requestTime: true,
        },
        _count: {
          id: true,
        },
        where: {
          apiKeyId: {
            in: apiKeyIds,
          },
          createdAt: {
            gte: startDate,
          },
        },
      }),
      
      // Detailed records for breakdown
      db.apiUsage.findMany({
        where: {
          apiKeyId: {
            in: apiKeyIds,
          },
          createdAt: {
            gte: startDate,
          },
        },
        include: {
          apiKey: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
    ]);

    // Calculate success/failure rates
    const successfulRequests = await db.apiUsage.count({
      where: {
        apiKeyId: {
          in: apiKeyIds,
        },
        createdAt: {
          gte: startDate,
        },
        statusCode: {
          gte: 200,
          lt: 300,
        },
      },
    });

    const failedRequests = usageStats._count.id - successfulRequests;
    const successRate = usageStats._count.id > 0 ? (successfulRequests / usageStats._count.id) * 100 : 0;

    // Group by endpoint and model for breakdown
    const breakdown = new Map<string, {
      endpoint: string;
      model?: string;
      requests: number;
      tokensUsed: number;
      cost: number;
      totalResponseTime: number;
      successRate: number;
    }>();

    usageRecords.forEach(record => {
      const key = `${record.endpoint}:${record.model || 'unknown'}`;
      const existing = breakdown.get(key) || {
        endpoint: record.endpoint,
        model: record.model || undefined,
        requests: 0,
        tokensUsed: 0,
        cost: 0,
        totalResponseTime: 0,
        successRate: 0,
      };
      
      existing.requests += 1;
      existing.tokensUsed += record.tokensUsed || 0;
      existing.cost += record.cost || 0;
      existing.totalResponseTime += record.requestTime || 0;
      
      breakdown.set(key, existing);
    });

    // Convert to array and calculate averages
    const breakdownArray = Array.from(breakdown.values()).map(item => ({
      ...item,
      avgResponseTime: item.requests > 0 ? Math.round(item.totalResponseTime / item.requests) : 0,
    }));

    // Calculate overall averages
    const avgResponseTime = usageStats._count.id > 0 
      ? Math.round((usageStats._sum.requestTime || 0) / usageStats._count.id)
      : 0;

    const responseData = {
      period: query.period,
      totalRequests: usageStats._count.id,
      totalCost: usageStats._sum.cost || 0,
      totalTokens: usageStats._sum.tokensUsed || 0,
      avgResponseTime,
      breakdown: breakdownArray,
      recentUsage: usageRecords.map(record => ({
        id: record.id,
        endpoint: record.endpoint,
        model: record.model,
        tokensUsed: record.tokensUsed,
        cost: record.cost,
        requestTime: record.requestTime,
        statusCode: record.statusCode,
        ipAddress: record.ipAddress,
        apiKeyName: record.apiKey.name,
        createdAt: record.createdAt.toISOString(),
      })),
      summary: {
        successfulRequests,
        failedRequests,
        successRate: Math.round(successRate * 100) / 100,
      },
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Failed to fetch usage analytics:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage analytics' },
      { status: 500 }
    );
  }
}