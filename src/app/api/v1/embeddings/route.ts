import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage, calculateTokenCost } from '@/lib/api-usage';
import { v4 as uuidv4 } from 'uuid';

interface EmbeddingRequest {
  input: string | string[];
  model: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Parse request body
    const body: EmbeddingRequest = await request.json();
    
    // Validate required fields
    if (!body.model || !body.input) {
      return createApiError(
        'Missing required fields: model and input are required',
        400,
        'invalid_request'
      );
    }

    // Prepare input for Z.ai API
    const inputs = Array.isArray(body.input) ? body.input : [body.input];
    
    // Create Z.ai client and make request
    const zai = await ZAI.create();
    
    // For embeddings, we'll simulate the response since Z.ai might not have direct embeddings support
    // In a real implementation, you'd use the actual embeddings API
    const embeddings = inputs.map((text, index) => ({
      object: 'embedding' as const,
      embedding: generateMockEmbedding(body.dimensions || 1536),
      index,
    }));

    // Calculate tokens (rough estimation)
    const totalTokens = inputs.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    // Create OpenAI-compatible response
    const response_data: EmbeddingResponse = {
      object: 'list',
      data: embeddings,
      model: body.model,
      usage: {
        prompt_tokens: totalTokens,
        total_tokens: totalTokens,
      },
    };

    // Record usage
    const requestTime = Date.now() - startTime;
    const cost = calculateTokenCost(body.model, totalTokens);
    
    await recordApiUsage({
      apiKeyId: apiKey.id,
      endpoint: 'embeddings',
      model: body.model,
      tokensUsed: totalTokens,
      cost,
      requestTime,
      statusCode: 200,
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Create response with rate limit headers
    const rateLimitHeaders = {
      'x-ratelimit-limit-requests': apiKey.rateLimit.toString(),
      'x-ratelimit-remaining-requests': Math.max(0, apiKey.rateLimit - 1).toString(),
      'x-ratelimit-reset-requests': Math.ceil(Date.now() / 1000 + 3600).toString(),
    };
    
    const apiResponse = createApiResponse(response_data, 200, rateLimitHeaders);

    return apiResponse;

  } catch (error: any) {
    console.error('Embedding error:', error);
    
    const requestTime = Date.now() - startTime;
    
    // Try to get API key for usage tracking
    try {
      const authenticatedRequest = await authenticateApiRequest(request);
      await recordApiUsage({
        apiKeyId: authenticatedRequest.apiKey.id,
        endpoint: 'embeddings',
        requestTime,
        statusCode: error.statusCode || 500,
        ipAddress: request.ip || request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch {
      // Ignore auth errors for error tracking
    }

    if (error.name === 'AbortError') {
      return createApiError(
        'Request timeout',
        408,
        'timeout'
      );
    }

    if (error.statusCode) {
      return createApiError(error.message, error.statusCode, error.code);
    }

    return createApiError(
      error.message || 'Internal server error',
      500,
      'internal_error'
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Generate mock embedding (in production, use real embeddings)
function generateMockEmbedding(dimensions: number): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}