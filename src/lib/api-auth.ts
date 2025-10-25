import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiKey } from '@prisma/client';
import { RateLimiter } from '@/lib/rate-limiter';

export interface AuthenticatedRequest extends NextRequest {
  apiKey: ApiKey;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export class ApiAuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

export async function authenticateApiRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    throw new ApiAuthError('Missing Authorization header', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiAuthError('Invalid authorization format. Expected: Bearer <api_key>', 401);
  }

  const apiKey = authHeader.substring(7);

  if (!apiKey) {
    throw new ApiAuthError('API key is required', 401);
  }

  // Find API key in database
  const keyRecord = await db.apiKey.findUnique({
    where: { key: apiKey },
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

  if (!keyRecord) {
    throw new ApiAuthError('Invalid API key', 401);
  }

  if (!keyRecord.isActive) {
    throw new ApiAuthError('API key is deactivated', 403);
  }

  // Check rate limiting using improved rate limiter
  const rateLimitResult = await RateLimiter.checkApiKeyRateLimit(keyRecord.id);
  
  if (!rateLimitResult.allowed) {
    throw new ApiAuthError(
      `Rate limit exceeded. Maximum ${keyRecord.rateLimit} requests per hour.`,
      429
    );
  }

  // Update last used timestamp
  await db.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  // Attach auth info to request
  (request as AuthenticatedRequest).apiKey = keyRecord;
  (request as AuthenticatedRequest).user = keyRecord.user;

  return request as AuthenticatedRequest;
}

export function createApiResponse(data: any, status: number = 200, rateLimitHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Add rate limit headers if provided
  if (rateLimitHeaders) {
    Object.assign(headers, rateLimitHeaders);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function createApiError(message: string, status: number = 400, code?: string) {
  return createApiResponse(
    {
      error: {
        message,
        type: 'invalid_request_error',
        code: code || 'invalid_request',
      },
    },
    status
  );
}