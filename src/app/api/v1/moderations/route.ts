import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { authenticateApiRequest, createApiError, createApiResponse } from '@/lib/api-auth';
import { recordApiUsage, calculateTokenCost } from '@/lib/api-usage';
import { v4 as uuidv4 } from 'uuid';

interface ModerationRequest {
  input: string | string[];
  model?: string;
}

interface ModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      sexual: boolean;
      hate: boolean;
      harassment: boolean;
      self_harm: boolean;
      sexual_minors: boolean;
      hate_threatening: boolean;
      violence_graphic: boolean;
      self_harm_intent: boolean;
      self_harm_instructions: boolean;
      harassment_threatening: boolean;
      violence: boolean;
    };
    category_scores: {
      sexual: number;
      hate: number;
      harassment: number;
      self_harm: number;
      sexual_minors: number;
      hate_threatening: number;
      violence_graphic: number;
      self_harm_intent: number;
      self_harm_instructions: number;
      harassment_threatening: number;
      violence: number;
    };
  }>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate request
    const authenticatedRequest = await authenticateApiRequest(request);
    const { apiKey } = authenticatedRequest;

    // Parse request body
    const body: ModerationRequest = await request.json();
    
    // Validate required fields
    if (!body.input) {
      return createApiError(
        'Missing required field: input is required',
        400,
        'invalid_request'
      );
    }

    // Prepare input for processing
    const inputs = Array.isArray(body.input) ? body.input : [body.input];
    const model = body.model || 'text-moderation-latest';
    
    // Create moderation results (in production, use real moderation API)
    const results = inputs.map(input => ({
      flagged: Math.random() > 0.8, // Random flagging for demo
      categories: {
        sexual: false,
        hate: false,
        harassment: false,
        self_harm: false,
        sexual_minors: false,
        hate_threatening: false,
        violence_graphic: false,
        self_harm_intent: false,
        self_harm_instructions: false,
        harassment_threatening: false,
        violence: false,
      },
      category_scores: {
        sexual: Math.random() * 0.1,
        hate: Math.random() * 0.1,
        harassment: Math.random() * 0.1,
        self_harm: Math.random() * 0.05,
        sexual_minors: 0,
        hate_threatening: 0,
        violence_graphic: Math.random() * 0.05,
        self_harm_intent: 0,
        self_harm_instructions: 0,
        harassment_threatening: 0,
        violence: Math.random() * 0.1,
      },
    }));

    // Calculate tokens
    const totalTokens = inputs.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);

    // Create OpenAI-compatible response
    const response_data: ModerationResponse = {
      id: `modr-${uuidv4()}`,
      model,
      results,
    };

    // Record usage
    const requestTime = Date.now() - startTime;
    const cost = calculateTokenCost(model, totalTokens);
    
    await recordApiUsage({
      apiKeyId: apiKey.id,
      endpoint: 'moderations',
      model,
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
    console.error('Moderation error:', error);
    
    const requestTime = Date.now() - startTime;
    
    // Try to get API key for usage tracking
    try {
      const authenticatedRequest = await authenticateApiRequest(request);
      await recordApiUsage({
        apiKeyId: authenticatedRequest.apiKey.id,
        endpoint: 'moderations',
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