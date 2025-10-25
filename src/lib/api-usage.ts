import { db } from '@/lib/db';
import { ApiUsage } from '@prisma/client';

export interface UsageRecord {
  apiKeyId: string;
  endpoint: string;
  model?: string;
  tokensUsed?: number;
  cost?: number;
  requestTime: number;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordApiUsage(record: UsageRecord): Promise<void> {
  try {
    await db.apiUsage.create({
      data: {
        apiKeyId: record.apiKeyId,
        endpoint: record.endpoint,
        model: record.model,
        tokensUsed: record.tokensUsed,
        cost: record.cost,
        requestTime: record.requestTime,
        statusCode: record.statusCode,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to record API usage:', error);
    // Don't throw error to avoid affecting the main API response
  }
}

export function calculateTokenCost(model: string, tokens: number): number {
  // Pricing per 1K tokens (in USD)
  const pricing: Record<string, number> = {
    'gpt-3.5-turbo': 0.002,
    'gpt-3.5-turbo-16k': 0.003,
    'gpt-4': 0.03,
    'gpt-4-32k': 0.06,
    'gpt-4-turbo': 0.01,
    'gpt-4o': 0.005,
    'gpt-4o-mini': 0.00015,
    'text-davinci-003': 0.02,
    'text-curie-001': 0.002,
  };

  const pricePer1K = pricing[model] || 0.002; // Default to gpt-3.5-turbo pricing
  return (tokens / 1000) * pricePer1K;
}

export function calculateImageCost(model: string, size: string): number {
  // Pricing per image generation (in USD)
  const pricing: Record<string, Record<string, number>> = {
    'dall-e-3': {
      '1024x1024': 0.04,
      '1024x1792': 0.08,
      '1792x1024': 0.08,
    },
    'dall-e-2': {
      '256x256': 0.016,
      '512x512': 0.018,
      '1024x1024': 0.02,
    },
  };

  return pricing[model]?.[size] || 0.04; // Default to dall-e-3 1024x1024 pricing
}

export async function getUsageStats(apiKeyId: string, period: 'day' | 'week' | 'month' = 'month') {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const stats = await db.apiUsage.groupBy({
    by: ['endpoint', 'model'],
    where: {
      apiKeyId,
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
  });

  const totalRequests = await db.apiUsage.count({
    where: {
      apiKeyId,
      createdAt: {
        gte: startDate,
      },
    },
  });

  const totalCost = await db.apiUsage.aggregate({
    where: {
      apiKeyId,
      createdAt: {
        gte: startDate,
      },
    },
    _sum: {
      cost: true,
    },
  });

  return {
    period,
    totalRequests,
    totalCost: totalCost._sum.cost || 0,
    breakdown: stats.map(stat => ({
      endpoint: stat.endpoint,
      model: stat.model,
      requests: stat._count.id,
      tokensUsed: stat._sum.tokensUsed || 0,
      cost: stat._sum.cost || 0,
      avgResponseTime: stat._sum.requestTime ? stat._sum.requestTime / stat._count.id : 0,
    })),
  };
}