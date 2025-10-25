import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check cache first for extreme performance
    const cacheKey = `overview:${session.user.id}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    }

    // Get user's API keys with optimized query
    const userApiKeys = await db.apiKey.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    const apiKeyIds = userApiKeys.map(key => key.id);

    if (apiKeyIds.length === 0) {
      const emptyData = {
        stats: {
          totalRequests: 0,
          totalCost: 0,
          totalTokens: 0,
          avgResponseTime: 0,
          activeKeys: 0,
          totalKeys: 0,
        },
        growth: {
          requests: 0,
          last24Hours: 0,
          last7Days: 0,
        },
        recentUsage: [],
        topEndpoints: [],
        apiKeys: [],
      };
      
      // Cache empty result
      cache.set(cacheKey, emptyData, 30000); // 30 seconds
      
      return NextResponse.json({
        success: true,
        data: emptyData,
      });
    }

    // Calculate date ranges
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel for maximum speed
    const [
      totalStats,
      last7DaysStats,
      last24HoursStats,
      recentUsage,
      topEndpoints
    ] = await Promise.all([
      // Last 30 days stats
      db.apiUsage.aggregate({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: last30Days },
        },
        _sum: {
          cost: true,
          requestTime: true,
          tokensUsed: true,
        },
        _count: { id: true },
      }),

      // Last 7 days stats
      db.apiUsage.aggregate({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: last7Days },
        },
        _sum: { cost: true },
        _count: { id: true },
      }),

      // Last 24 hours stats
      db.apiUsage.aggregate({
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: last24Hours },
        },
        _count: { id: true },
      }),

      // Recent usage records (limited for performance)
      db.apiUsage.findMany({
        where: {
          apiKeyId: { in: apiKeyIds },
        },
        include: {
          apiKey: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5, // Reduced for better performance
      }),

      // Top endpoints by usage
      db.apiUsage.groupBy({
        by: ['endpoint', 'model'],
        where: {
          apiKeyId: { in: apiKeyIds },
          createdAt: { gte: last30Days },
        },
        _sum: {
          cost: true,
          tokensUsed: true,
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 3, // Reduced for better performance
      }),
    ]);

    // Calculate metrics
    const avgResponseTime = totalStats._count.id > 0 
      ? Math.round((totalStats._sum.requestTime || 0) / totalStats._count.id)
      : 0;

    const periodGrowth = last7DaysStats._count.id > 0 
      ? Math.round(((last24HoursStats._count.id * 7) / last7DaysStats._count.id - 1) * 100)
      : 0;

    const overviewData = {
      stats: {
        totalRequests: totalStats._count.id,
        totalCost: totalStats._sum.cost || 0,
        totalTokens: totalStats._sum.tokensUsed || 0,
        avgResponseTime,
        activeKeys: userApiKeys.filter(key => key.isActive).length,
        totalKeys: userApiKeys.length,
      },
      growth: {
        requests: periodGrowth,
        last24Hours: last24HoursStats._count.id,
        last7Days: last7DaysStats._count.id,
      },
      recentUsage: recentUsage.map(record => ({
        id: record.id,
        endpoint: record.endpoint,
        model: record.model,
        cost: record.cost,
        statusCode: record.statusCode,
        requestTime: record.requestTime,
        apiKeyName: record.apiKey.name,
        createdAt: record.createdAt.toISOString(),
      })),
      topEndpoints: topEndpoints.map(item => ({
        endpoint: item.endpoint,
        model: item.model,
        requests: item._count.id,
        cost: item._sum.cost || 0,
        tokensUsed: item._sum.tokensUsed || 0,
      })),
      apiKeys: userApiKeys.map(key => ({
        id: key.id,
        name: key.name,
        isActive: key.isActive,
        createdAt: key.createdAt.toISOString(),
        lastUsedAt: key.lastUsedAt?.toISOString(),
      })),
    };

    // Cache the result for 30 seconds
    cache.set(cacheKey, overviewData, 30000);

    return NextResponse.json({
      success: true,
      data: overviewData,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard overview' },
      { status: 500 }
    );
  }
}