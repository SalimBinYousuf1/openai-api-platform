import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's API keys
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

    // Calculate date ranges for different periods
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get usage statistics for different periods
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

      // Recent usage records
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
        take: 10,
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
        take: 5,
      }),
    ]);

    // Calculate average response time
    const avgResponseTime = totalStats._count.id > 0 
      ? Math.round((totalStats._sum.requestTime || 0) / totalStats._count.id)
      : 0;

    // Calculate growth percentages
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